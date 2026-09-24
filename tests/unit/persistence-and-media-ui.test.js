// @vitest-environment jsdom
// P2 audit findings: a draft that equals the saved project was still offered as an "unsaved
// working draft"; the media "In Use" count must stay accurate through save/reload/duplicate/
// delete; and an uploaded asset's byte size must survive a refresh instead of reading "0 B".
import { beforeEach, describe, expect, test } from 'vitest';
import { clearDraft, compareDraftToSaved, loadDraft, saveDraft, saveProject, loadProjects } from '../../js/storage.js';
import { getMediaAssetUsage } from '../../js/media-usage.js';
import { buildProjectSchemaV3, createComponentInstance, createSection } from '../../js/project-schema.js';
import { createMediaUploadControl } from '../../js/media-upload.js';
import { createIndexedDBMediaStore, saveMediaRecord } from '../../js/media-storage.js';
import { createEmptyItemMedia } from '../../js/item-media.js';
import { createFakeIndexedDB, memoryLocalStorage } from '../fixtures/index.js';

const accordionConfig = (headline, media) => ({
  blockTitle: 'M', blockHeadline: headline,
  items: [{ title: 'One', content: 'Body', ...(media ? { media } : {}) }],
  colorPrimary: '#00388F', colorAccent: '#009FDB', colorBg: '#FFFFFF', colorText: '#000000',
  borderRadius: '8', shadowDepth: 'none', iconStyle: 'chevron'
});

const mediaDescriptor = mediaId => ({ ...createEmptyItemMedia('image'), sourceType: 'upload', mediaId, fileName: 'a.png', mimeType: 'image/png', alt: 'x' });

beforeEach(() => {
  globalThis.localStorage = memoryLocalStorage();
});

describe('recovery draft is only offered when it differs from the saved project', () => {
  function course(headline = 'Overview') {
    const comp = createComponentInstance({ id: 'c1', name: 'Lesson', type: 'accordion', config: accordionConfig(headline) });
    return buildProjectSchemaV3({ id: 'p1', name: 'Course', unsectionedComponentOrder: ['c1'], components: { c1: comp } });
  }

  test('a draft identical to the saved project is not recoverable', () => {
    const saved = saveProject(course());
    saveDraft(structuredClone(saved));
    const status = compareDraftToSaved(loadDraft(), loadProjects());
    expect(status).toMatchObject({ recoverable: false, reason: 'identical' });
  });

  test('a draft with edits the saved project lacks is recoverable and names what it differs from', () => {
    const saved = saveProject(course());
    const edited = structuredClone(saved);
    edited.components.c1.config.blockHeadline = 'Edited but not saved';
    saveDraft(edited);
    expect(compareDraftToSaved(loadDraft(), loadProjects())).toMatchObject({ recoverable: true, reason: 'differs', savedName: 'Course' });
  });

  test('a draft for something that was never saved is recoverable as "never-saved"', () => {
    saveProject(course());
    const scratch = buildProjectSchemaV3({ id: 'never-saved', name: 'Scratch', unsectionedComponentOrder: ['c9'], components: { c9: createComponentInstance({ id: 'c9', name: 'Scratch block', type: 'accordion', config: accordionConfig('Scratch') }) } });
    saveDraft(scratch);
    expect(compareDraftToSaved(loadDraft(), loadProjects())).toMatchObject({ recoverable: true, reason: 'never-saved' });
  });

  test('no draft at all is not recoverable, and clearing removes it', () => {
    expect(compareDraftToSaved(null, []).recoverable).toBe(false);
    saveDraft(course());
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  test('key order and timestamps do not make an identical draft look different', () => {
    const saved = saveProject(course());
    const reordered = structuredClone(saved);
    reordered.updatedAt = '2030-01-01T00:00:00.000Z';
    reordered.components.c1.config = Object.fromEntries(Object.entries(reordered.components.c1.config).reverse());
    saveDraft(reordered);
    expect(compareDraftToSaved(loadDraft(), loadProjects()).recoverable).toBe(false);
  });
});

describe('media "In Use" stays accurate through save, reload, duplicate and delete', () => {
  const build = components => buildProjectSchemaV3({
    id: 'p1', name: 'Course', sectionOrder: ['s1'],
    sections: { s1: createSection({ id: 's1', name: 'S', componentOrder: Object.keys(components) }) },
    components
  });
  const inst = (id, mediaId) => createComponentInstance({ id, name: id, type: 'accordion', config: accordionConfig('H', mediaId ? mediaDescriptor(mediaId) : null) });

  test('counts uses after save and after a fresh read from storage', () => {
    expect(getMediaAssetUsage('m1').totalUses).toBe(0);
    saveProject(build({ c1: inst('c1', 'm1') }));
    expect(getMediaAssetUsage('m1')).toMatchObject({ totalUses: 1, isInUse: true });
    // "Reload": nothing cached in memory, only what storage returns.
    const reread = loadProjects()[0];
    expect(getMediaAssetUsage('m1', { activeProject: reread }).totalUses).toBe(1);
  });

  test('duplicating a block adds a use, deleting one removes it, deleting all frees the asset', () => {
    saveProject(build({ c1: inst('c1', 'm1') }));
    saveProject(build({ c1: inst('c1', 'm1'), c2: inst('c2', 'm1') }));
    expect(getMediaAssetUsage('m1').totalUses).toBe(2);
    saveProject(build({ c2: inst('c2', 'm1') }));
    expect(getMediaAssetUsage('m1').totalUses).toBe(1);
    saveProject(build({ c2: inst('c2', null) }));
    expect(getMediaAssetUsage('m1')).toMatchObject({ totalUses: 0, isInUse: false });
  });

  test('an in-memory active project is used instead of a stale saved copy, not counted twice', () => {
    saveProject(build({ c1: inst('c1', 'm1') }));
    const live = build({ c1: inst('c1', null) }); // edited, media removed, not yet saved
    expect(getMediaAssetUsage('m1', { activeProject: live }).totalUses).toBe(0);
  });
});

describe('uploaded asset size survives a refresh', () => {
  test('the size is read back from the stored record instead of showing 0 B', async () => {
    const store = createIndexedDBMediaStore(createFakeIndexedDB());
    const blob = new Blob([new Uint8Array(2048)], { type: 'image/png' });
    await saveMediaRecord({ id: 'img-1', kind: 'image', name: 'a.png', sanitizedName: 'a.png', mimeType: 'image/png', size: 2048, blob, createdAt: new Date().toISOString() }, store);

    // What item media hands the control after a reload: identity and type, no size.
    const control = createMediaUploadControl({
      field: { id: 'media', type: 'image', uploadKind: 'image', label: 'Image' },
      controlId: 'c',
      value: { mediaId: 'img-1', assetId: 'img-1', source: 'upload', sourceType: 'library', kind: 'image', mediaType: 'image', name: 'a.png', fileName: 'a.png', mimeType: 'image/png' },
      limits: undefined,
      store,
      onChange: () => {}
    });
    document.body.appendChild(control.element);

    const metaText = () => control.element.querySelector('.media-file-metadata')?.textContent || '';
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(metaText()).not.toMatch(/\b0 B\b/);
    expect(metaText()).toMatch(/2(\.0)? ?KB/i);
  });
});
