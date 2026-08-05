import { beforeEach, describe, expect, test } from 'vitest';
import {
  buildProject, clearDraft, deleteProject, duplicateProject, getProject, importProjectJson,
  KEYS, loadDraft, loadFavorites, loadProjects, loadSettings, renameProject, saveDraft, saveFavorites,
  saveProject, saveSettings, validateProject
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
    saveSettings({ defaultFont: 'Roboto', exportFormat: 'zip', autosave: false, aiEnabled: true, mediaLimitsMb: { image: 5, audio: 20, video: 50, svg: 1 } });
    saveFavorites(new Set(['accordion', 'tab-blocks']));
    saveDraft(validProject({ uiTheme: 'dark' }));
    expect(loadSettings()).toEqual({
      defaultFont: 'Roboto', exportFormat: 'zip', autosave: false, aiEnabled: true,
      mediaLimitsMb: { image: 5, audio: 20, video: 50, svg: 1 }, completionParentOrigin: ''
    });
    expect(loadFavorites()).toEqual(['accordion', 'tab-blocks']);
    expect(loadDraft().theme.id).toBe(cleanTheme.id);
    expect(loadDraft().uiTheme).toBe('dark');
    clearDraft();
    expect(loadDraft()).toBeNull();
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
    expect(getProject(project.id).config.items[0].content).toEqual(reference);
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
