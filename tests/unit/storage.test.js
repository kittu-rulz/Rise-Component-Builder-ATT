import { beforeEach, describe, expect, test } from 'vitest';
import {
  buildProject, clearDraft, deleteProject, duplicateProject, getProject, importProjectJson,
  KEYS, loadDraft, loadFavorites, loadProjects, loadRecentlyUsed, loadSettings, RECENTLY_USED_LIMIT,
  renameProject, saveDraft, saveFavorites, saveProject, saveRecentlyUsed, saveSettings, validateProject,
  withRecentlyUsedEntry
} from '../../js/storage.js';
import { createMediaReference } from '../../js/media.js';
import { cleanTheme, componentConfig, memoryLocalStorage, validProject } from '../fixtures/index.js';

describe('versioned project persistence', () => {
  beforeEach(() => { globalThis.localStorage = memoryLocalStorage(); });

  test('new, save, update, open, rename, duplicate, and delete lifecycle', () => {
    const created = buildProject({ name: 'New Project', componentId: 'accordion', config: componentConfig(), activeTheme: cleanTheme });
    expect(loadProjects()).toEqual([]);
    saveProject(created);
    expect(getProject(created.id).name).toBe('New Project');
    saveProject({ ...created, name: 'Updated', updatedAt: new Date().toISOString() });
    expect(getProject(created.id).name).toBe('Updated');
    expect(renameProject(created.id, 'Renamed').name).toBe('Renamed');
    const duplicate = duplicateProject(created.id);
    expect(duplicate.id).not.toBe(created.id);
    expect(duplicate.name).toContain('Copy');
    expect(deleteProject(created.id)).toBe(true);
    expect(getProject(created.id)).toBeNull();
  });

  test('valid JSON imports with a new identity and invalid JSON is rejected', () => {
    const imported = importProjectJson(JSON.stringify(validProject()));
    expect(imported.id).not.toBe('fixture-project');
    expect(getProject(imported.id)).not.toBeNull();
    expect(() => importProjectJson('{bad')).toThrow(/not valid JSON/i);
    expect(() => importProjectJson(JSON.stringify({ schemaVersion: 2 }))).toThrow();
  });

  test('unsupported project schema versions are rejected', () => {
    const result = validateProject({ ...validProject(), schemaVersion: 999 });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/supports version/i);
  });

  test('settings, favorites, themes, and drafts survive serialization', () => {
    saveSettings({ defaultFont: 'Roboto', exportFormat: 'zip', autosave: false, mediaLimitsMb: { image: 5, audio: 20, video: 50, svg: 1 } });
    saveFavorites(new Set(['accordion', 'tab-blocks']));
    saveDraft(validProject({ uiTheme: 'dark' }));
    expect(loadSettings()).toEqual({
      defaultFont: 'Roboto', exportFormat: 'zip', autosave: false,
      mediaLimitsMb: { image: 5, audio: 20, video: 50, svg: 1 }, completionParentOrigin: ''
    });
    expect(loadFavorites()).toEqual(['accordion', 'tab-blocks']);
    expect(loadDraft().theme.id).toBe(cleanTheme.id);
    expect(loadDraft().uiTheme).toBe('dark');
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  test('recently-used persists in order and round-trips', () => {
    saveRecentlyUsed(['accordion', 'tabs']);
    expect(loadRecentlyUsed()).toEqual(['accordion', 'tabs']);
  });

  test('media size limit settings are clamped to safe bounds and invalid values fall back to defaults', () => {
    saveSettings({ mediaLimitsMb: { image: 0, audio: 999, video: 40, svg: 'not-a-number' } });
    expect(loadSettings().mediaLimitsMb).toEqual({ image: 10, audio: 30, video: 40, svg: 2 });
  });

  test('completion parent-origin setting accepts a valid scheme://host origin and rejects everything else', () => {
    saveSettings({ completionParentOrigin: 'https://example.com' });
    expect(loadSettings().completionParentOrigin).toBe('https://example.com');

    saveSettings({ completionParentOrigin: 'https://example.com/some/path' });
    expect(loadSettings().completionParentOrigin).toBe(''); // paths are not a valid origin

    saveSettings({ completionParentOrigin: 'not-a-url' });
    expect(loadSettings().completionParentOrigin).toBe('');

    saveSettings({ completionParentOrigin: '  https://trimmed.example.com  ' });
    expect(loadSettings().completionParentOrigin).toBe('https://trimmed.example.com');
  });

  test('media references remain JSON-safe when projects are reopened', () => {
    const reference = createMediaReference({
      id: 'media-1', schemaVersion: 1, kind: 'image', name: 'image.png', mimeType: 'image/png',
      size: 100, createdAt: '2026-01-01T00:00:00.000Z', duration: null
    });
    const project = validProject({ config: componentConfig([{ title: 'Image', content: reference }]) });
    saveProject(project);
    // A saved legacy (v2) project reopens as a v3 course project; its item lives on the one component.
    expect(Object.values(getProject(project.id).components)[0].config.items[0].content).toEqual(reference);
    expect(JSON.stringify(getProject(project.id))).not.toContain('objectUrl');
  });

  test('version-1 projects migrate their visual settings into theme overrides', () => {
    const current = validProject();
    const legacy = { ...current, schemaVersion: 1, theme: 'dark' };
    delete legacy.uiTheme;
    delete legacy.componentOverrides;
    expect(validateProject(legacy)).toMatchObject({
      valid: true,
      project: { schemaVersion: 2, uiTheme: 'dark', componentOverrides: { primary: current.config.colorPrimary } }
    });
  });

  // P03: the Builder Settings font picker is gone from the UI, but a version-1 project
  // saved back when it existed can still carry a non-AT&T font choice in its embedded
  // settings snapshot — that legacy data must keep migrating into componentOverrides.fontFamily
  // exactly as before, even though nothing can create a new project shaped like this anymore.
  test('a version-1 project carrying a legacy (pre-brand-lock) font choice still migrates it into componentOverrides.fontFamily', () => {
    const current = validProject();
    const legacy = { ...current, schemaVersion: 1, theme: 'light', settings: { ...current.settings, defaultFont: 'Roboto' } };
    delete legacy.uiTheme;
    delete legacy.componentOverrides;
    expect(validateProject(legacy)).toMatchObject({
      valid: true,
      project: { schemaVersion: 2, componentOverrides: { fontFamily: 'Roboto' } }
    });
  });

  // Settings no longer send defaultFont at all (the UI field is gone) — normalizeSettings
  // must still parse a legacy stored settings blob that has one without throwing, and simply
  // stop surfacing it as a live, user-facing choice going forward.
  test('a stored settings blob with a legacy defaultFont value still loads without error', () => {
    globalThis.localStorage.setItem(KEYS.settings, JSON.stringify({
      defaultFont: 'Montserrat', exportFormat: 'web', autosave: true,
      mediaLimitsMb: { image: 10, audio: 30, video: 100, svg: 2 }
    }));
    expect(() => loadSettings()).not.toThrow();
    expect(loadSettings().exportFormat).toBe('web');
  });

  test('version-0 (pre-versioning) projects migrate all the way through v1 to the current schema', () => {
    const current = validProject();
    // Pre-versioning projects had no schemaVersion field at all and used `title` instead of `name`.
    const legacy = { ...current, title: current.name };
    delete legacy.schemaVersion;
    delete legacy.name;
    delete legacy.uiTheme;
    delete legacy.componentOverrides;
    const result = validateProject(legacy);
    expect(result).toMatchObject({
      valid: true,
      project: { schemaVersion: 2, name: current.name, componentOverrides: { primary: current.config.colorPrimary } }
    });
  });
});

describe('withRecentlyUsedEntry', () => {
  test('a new id is added to the front', () => {
    expect(withRecentlyUsedEntry(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
  });

  test('re-selecting an existing id moves it to the front instead of duplicating it', () => {
    expect(withRecentlyUsedEntry(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  test('the list never grows past RECENTLY_USED_LIMIT', () => {
    const full = Array.from({ length: RECENTLY_USED_LIMIT }, (_, i) => `id-${i}`);
    const result = withRecentlyUsedEntry(full, 'new-id');
    expect(result.length).toBe(RECENTLY_USED_LIMIT);
    expect(result[0]).toBe('new-id');
    expect(result).not.toContain(`id-${RECENTLY_USED_LIMIT - 1}`);
  });
});

describe('recovery from corrupted or unavailable storage', () => {
  beforeEach(() => { globalThis.localStorage = memoryLocalStorage(); });

  test('one corrupted entry in the stored projects array does not take down the rest of the list', () => {
    const good1 = buildProject({ name: 'Keeps Working 1', componentId: 'accordion', config: componentConfig(), activeTheme: cleanTheme });
    const good2 = buildProject({ name: 'Keeps Working 2', componentId: 'accordion', config: componentConfig(), activeTheme: cleanTheme });
    const corrupted = { id: 'corrupted-1', schemaVersion: 2, name: 'Corrupted', config: { items: 'not-an-array' } };
    globalThis.localStorage.setItem(KEYS.projects, JSON.stringify([good1, good2, corrupted]));

    const projects = loadProjects();
    expect(projects.map(project => project.name).sort()).toEqual(['Keeps Working 1', 'Keeps Working 2']);
    expect(projects.some(project => project.id === 'corrupted-1')).toBe(false);
  });

  test('a non-JSON string in the projects key is treated as empty rather than throwing', () => {
    globalThis.localStorage.setItem(KEYS.projects, 'not valid json{{{');
    expect(() => loadProjects()).not.toThrow();
    expect(loadProjects()).toEqual([]);
  });

  test('the stored projects value being the wrong shape (not an array) is treated as empty', () => {
    globalThis.localStorage.setItem(KEYS.projects, JSON.stringify({ not: 'an array' }));
    expect(loadProjects()).toEqual([]);
  });

  test('a corrupted draft is treated as no draft, rather than throwing on load', () => {
    globalThis.localStorage.setItem(KEYS.draft, JSON.stringify({ schemaVersion: 2, config: {} })); // missing required fields
    expect(() => loadDraft()).not.toThrow();
    expect(loadDraft()).toBeNull();
  });

  test('a project config carrying a prototype-pollution-shaped key ("__proto__", "constructor") is rejected', () => {
    // JSON.parse turns a "__proto__" object key into a genuine own enumerable property
    // (not a live prototype reassignment) — this is exactly the shape a hand-edited or
    // maliciously crafted imported project file would carry it as.
    const hostileItem = JSON.parse('{"title":"x","content":"y","__proto__":{"polluted":true}}');
    const projectWithHostileItem = { ...validProject(), config: componentConfig([hostileItem]) };
    expect(validateProject(projectWithHostileItem).valid).toBe(false);

    const hostileConfig = JSON.parse('{"constructor":{"polluted":true}}');
    const projectWithHostileConfig = { ...validProject(), config: { ...validProject().config, ...hostileConfig } };
    expect(validateProject(projectWithHostileConfig).valid).toBe(false);
  });

  // Regression, found 2026-09-24: every accordion/flip-card item that had ever rendered a
  // media control carried js/item-media.js's initialised-but-empty descriptor, and saving
  // the project failed outright with "Project item data is invalid." isSafeProjectValue
  // keyed its media-reference check off source/sourceType alone, and the descriptor
  // defaults to sourceType: 'upload' while still holding no media — a shape
  // isMediaReference deliberately rejects, since it excludes anything carrying
  // `placement` next to `aspectRatio`/`fit`.
  test('an item-media descriptor that holds no media yet does not block saving the project', () => {
    const emptyDescriptor = {
      type: 'none', sourceType: 'upload', src: '', mediaId: '', fileName: '', mimeType: '',
      alt: '', decorative: false, caption: '', transcript: '', placement: 'above',
      aspectRatio: 'original', fit: 'contain', focalPosition: 'center center',
      posterSrc: '', posterMediaId: '', captionsSrc: '', preload: 'metadata'
    };
    const item = { title: 'Has a media control', content: 'body', media: emptyDescriptor };
    const result = validateProject({ ...validProject(), config: componentConfig([item]) });
    expect(result.valid).toBe(true);
    expect(result.project.config.items[0].media).toEqual(emptyDescriptor);
  });

  test('a value that does point at stored media is still held to the media-reference shape', () => {
    // Same descriptor, but now claiming an actual asset while carrying the descriptor-only
    // placement/aspectRatio pair that isMediaReference rejects — the guard must still bite.
    const malformed = {
      sourceType: 'upload', mediaId: 'asset-123', placement: 'above', aspectRatio: 'original'
    };
    const item = { title: 'x', content: 'y', media: malformed };
    expect(validateProject({ ...validProject(), config: componentConfig([item]) }).valid).toBe(false);
  });

  test('a media handle carrying a live object URL or blob is still refused', () => {
    const withObjectUrl = { title: 'x', content: 'y', media: { mediaId: 'a1', objectUrl: 'blob:http://x/y' } };
    expect(validateProject({ ...validProject(), config: componentConfig([withObjectUrl]) }).valid).toBe(false);
    const withBlob = { title: 'x', content: 'y', media: { mediaId: 'a1', blob: {} } };
    expect(validateProject({ ...validProject(), config: componentConfig([withBlob]) }).valid).toBe(false);
  });

  test('a full storage quota surfaces a specific, user-actionable error rather than a generic failure', () => {
    globalThis.localStorage.setItem = () => {
      const error = new Error('quota exceeded');
      error.name = 'QuotaExceededError';
      throw error;
    };
    const project = buildProject({ name: 'Too Big', componentId: 'accordion', config: componentConfig(), activeTheme: cleanTheme });
    expect(() => saveProject(project)).toThrow(/storage is full/i);
  });

  test('an unrelated storage failure still surfaces a clear (if generic) error', () => {
    globalThis.localStorage.setItem = () => { throw new Error('some other browser restriction'); };
    const project = buildProject({ name: 'Blocked', componentId: 'accordion', config: componentConfig(), activeTheme: cleanTheme });
    expect(() => saveProject(project)).toThrow(/could not save data locally/i);
  });
});

describe('legacy (pre-v3) projects are upgraded to schema v3 on load', () => {
  beforeEach(() => { globalThis.localStorage = memoryLocalStorage(); });

  const legacyRecord = (over = {}) => ({ ...buildProject({ name: 'Old Project', componentId: 'accordion', config: componentConfig(), activeTheme: cleanTheme }), ...over });

  test('a stored v2 project loads as a v3 course project holding its single component', () => {
    const v2 = legacyRecord();
    globalThis.localStorage.setItem(KEYS.projects, JSON.stringify([v2]));
    const [loaded] = loadProjects();
    expect(loaded.schemaVersion).toBe(3);
    expect(loaded.id).toBe(v2.id);
    expect(loaded.name).toBe('Old Project');
    const components = Object.values(loaded.components);
    expect(components).toHaveLength(1);
    expect(components[0].type).toBe('accordion');
    expect(components[0].config.items).toEqual(v2.config.items);
    expect(loaded.unsectionedComponentOrder).toEqual([components[0].id]);
  });

  test('a stored v1 project (no theme/overrides) loads as v3 with its content intact', () => {
    const v1 = { ...legacyRecord(), schemaVersion: 1 };
    for (const key of ['theme', 'componentOverrides', 'uiTheme']) delete v1[key];
    globalThis.localStorage.setItem(KEYS.projects, JSON.stringify([v1]));
    const [loaded] = loadProjects();
    expect(loaded.schemaVersion).toBe(3);
    expect(Object.values(loaded.components)[0].config.items).toEqual(v1.config.items);
  });

  test('the upgrade is stable: component ids do not change between reads', () => {
    globalThis.localStorage.setItem(KEYS.projects, JSON.stringify([legacyRecord()]));
    const first = Object.keys(loadProjects()[0].components);
    const second = Object.keys(loadProjects()[0].components);
    expect(second).toEqual(first);
  });

  test('the original records are backed up once, before anything rewrites them', () => {
    const v2 = legacyRecord();
    globalThis.localStorage.setItem(KEYS.projects, JSON.stringify([v2]));
    loadProjects();
    const backup = JSON.parse(globalThis.localStorage.getItem('rise-builder-projects-backup-v2'));
    expect(backup).toHaveLength(1);
    expect(backup[0].schemaVersion).toBe(2);
    expect(backup[0].config.items).toEqual(v2.config.items);
    // Loading does not rewrite storage by itself.
    expect(JSON.parse(globalThis.localStorage.getItem(KEYS.projects))[0].schemaVersion).toBe(2);
  });

  test('a legacy project can be edited and saved after upgrade (add a component, save, reload)', () => {
    globalThis.localStorage.setItem(KEYS.projects, JSON.stringify([legacyRecord()]));
    const [loaded] = loadProjects();
    const extraId = 'comp-extra';
    const saved = saveProject({
      ...loaded,
      components: { ...loaded.components, [extraId]: { ...Object.values(loaded.components)[0], id: extraId, name: 'Second' } },
      unsectionedComponentOrder: [...loaded.unsectionedComponentOrder, extraId]
    });
    expect(saved.schemaVersion).toBe(3);
    const reloaded = loadProjects()[0];
    expect(Object.keys(reloaded.components)).toHaveLength(2);
    expect(JSON.parse(globalThis.localStorage.getItem(KEYS.projects))[0].schemaVersion).toBe(3);
  });

  test('v3 projects and unrelated stored data are untouched and create no backup', () => {
    globalThis.localStorage.setItem(KEYS.projects, JSON.stringify([legacyRecord()]));
    const upgraded = loadProjects()[0];
    globalThis.localStorage.removeItem('rise-builder-projects-backup-v2');
    globalThis.localStorage.setItem(KEYS.projects, JSON.stringify([upgraded]));
    expect(loadProjects()[0]).toEqual(upgraded);
    expect(globalThis.localStorage.getItem('rise-builder-projects-backup-v2')).toBeNull();
  });
});
