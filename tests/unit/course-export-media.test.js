// @vitest-environment node
// P0 regression: the full-course ZIP used to serialise the preview's session-only `blob:` URLs
// and ship no media. These tests assert the ARCHIVE itself (not a success toast): every local
// media reference resolves to a member of the ZIP, no temporary URL survives, and an export
// with missing media is refused with an error that names the component.
import { beforeEach, describe, expect, test } from 'vitest';
import { buildCourseProjectZip, CourseExportError } from '../../js/dashboard/project-export.js';
import { createIndexedDBMediaStore, saveMediaRecord } from '../../js/media-storage.js';
import { createEmptyItemMedia } from '../../js/item-media.js';
import { createMediaReference } from '../../js/media.js';
import { buildProjectSchemaV3, createComponentInstance, createSection } from '../../js/project-schema.js';
import { saveProject } from '../../js/storage.js';
import { readZip } from '../../js/zip.js';
import { createFakeIndexedDB, memoryLocalStorage } from '../fixtures/index.js';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const WAV = new TextEncoder().encode('RIFF0000WAVEfmt data');

function blobFile(name, type, bytes) {
  const blob = new Blob([bytes], { type });
  Object.defineProperty(blob, 'name', { value: name });
  return blob;
}

const baseAccordion = items => ({
  blockTitle: 'Module',
  blockHeadline: 'Overview',
  items,
  colorPrimary: '#0057B8',
  colorAccent: '#00A8E0',
  colorBg: '#FFFFFF',
  colorText: '#000000',
  borderRadius: '8',
  shadowDepth: 'none',
  iconStyle: 'chevron'
});

function itemMedia(record, type, extra = {}) {
  const ref = createMediaReference(record);
  // Start from the editor's own descriptor so the fixture has the exact persisted shape.
  return {
    ...createEmptyItemMedia(type),
    sourceType: 'upload',
    // Mirrors what the editor persists after a refresh: the runtime preview URL rides along with the id.
    src: 'blob:https://authoring.example/abc-123',
    mediaId: ref.mediaId,
    fileName: ref.name,
    mimeType: ref.mimeType,
    alt: 'Diagram of the network',
    caption: 'Figure 1',
    ...extra
  };
}

// jsdom cannot decode images, so build the stored record directly (same shape prepareMediaFile saves).
function mediaRecord(id, kind, name, mimeType, bytes) {
  return {
    id, kind, name, sanitizedName: name, mimeType, size: bytes.byteLength,
    blob: blobFile(name, mimeType, bytes), createdAt: new Date().toISOString()
  };
}

// A real session-only URL is blob:<origin>/<id>; a bare `blob:` in the CSP is a legitimate source keyword.
const TRANSIENT_URL = /\b(?:blob|filesystem):(?:https?:|null\/|file:)/i;

const decode = data => new TextDecoder().decode(data);

async function setup() {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const image = await saveMediaRecord(mediaRecord('img-1', 'image', 'diagram.png', 'image/png', PNG), store);
  const audio = await saveMediaRecord(mediaRecord('aud-1', 'audio', 'welcome.wav', 'audio/wav', WAV), store);

  const sectioned = createComponentInstance({
    id: 'c1', name: 'Lesson Accordion', type: 'accordion',
    config: baseAccordion([{ title: 'One', content: 'Body', media: itemMedia(image, 'image') }])
  });
  // Reuses the SAME image and adds an audio file, in a different location (unsectioned).
  const loose = createComponentInstance({
    id: 'c2', name: 'Loose Accordion', type: 'accordion',
    config: baseAccordion([
      { title: 'Two', content: 'Body', media: itemMedia(image, 'image') },
      { title: 'Three', content: 'Body', media: itemMedia(audio, 'audio', { alt: '', caption: '' }) }
    ])
  });
  const project = buildProjectSchemaV3({
    name: 'Media Course',
    sectionOrder: ['s1'],
    sections: { s1: createSection({ id: 's1', name: 'Module One', componentOrder: ['c1'] }) },
    unsectionedComponentOrder: ['c2'],
    components: { c1: sectioned, c2: loose }
  });
  saveProject(project);
  return { store, project, image, audio };
}

async function unzip(blob) {
  const entries = await readZip(blob);
  return new Map(entries.map(e => [e.path, e.data]));
}

// Resolves a relative reference from a component's index.html the way a static host would.
function resolveFrom(htmlPath, ref) {
  const parts = htmlPath.split('/').slice(0, -1);
  for (const seg of ref.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.' && seg !== '') parts.push(seg);
  }
  return parts.join('/');
}

describe('full course ZIP is portable (P0)', () => {
  beforeEach(() => {
    globalThis.localStorage = memoryLocalStorage();
  });

  test('every local media reference resolves to an archive member and no temporary URL survives', async () => {
    const { store, project } = await setup();
    const files = await unzip(await buildCourseProjectZip(project.id, { store }));

    const htmlPaths = [...files.keys()].filter(p => p.endsWith('/index.html'));
    expect(htmlPaths).toHaveLength(2);

    let checked = 0;
    for (const path of htmlPaths) {
      const html = decode(files.get(path));
      expect(html).not.toMatch(TRANSIENT_URL);
      const refs = [...html.matchAll(/(?:src|href|poster)="(assets\/[^"]+)"/g)].map(m => m[1]);
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) {
        const target = resolveFrom(path, ref);
        expect(files.has(target), `${path} -> ${ref} (${target}) is missing from the ZIP`).toBe(true);
        expect(files.get(target).byteLength).toBeGreaterThan(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(3);

    // Distributable files (everything but the editable backup) carry no temporary URL at all.
    for (const [path, data] of files) {
      if (path === 'project-backup.json') continue;
      expect(decode(data), path).not.toMatch(TRANSIENT_URL);
    }
  });

  test('bytes, filenames and alt text survive; a reused asset is not ambiguous', async () => {
    const { store, project } = await setup();
    const files = await unzip(await buildCourseProjectZip(project.id, { store }));

    const sectionedHtml = decode(files.get('01-module-one/01-lesson-accordion/index.html'));
    const looseHtml = decode(files.get('unsectioned-components/01-loose-accordion/index.html'));

    const png = files.get('01-module-one/01-lesson-accordion/assets/diagram.png');
    expect(Array.from(png)).toEqual(Array.from(PNG));
    expect(Array.from(files.get('unsectioned-components/01-loose-accordion/assets/diagram.png'))).toEqual(Array.from(PNG));
    expect(files.has('unsectioned-components/01-loose-accordion/assets/welcome.wav')).toBe(true);

    expect(sectionedHtml).toContain('alt="Diagram of the network"');
    expect(looseHtml).toContain('assets/diagram.png');
    expect(looseHtml).toContain('assets/welcome.wav');

    const compManifest = JSON.parse(decode(files.get('unsectioned-components/01-loose-accordion/assets/manifest.json')));
    expect(compManifest.assets.map(a => a.filename).sort()).toEqual(['diagram.png', 'welcome.wav']);
    expect(compManifest.assets.find(a => a.filename === 'welcome.wav').mimeType).toBe('audio/wav');

    const courseManifest = JSON.parse(decode(files.get('manifest.json')));
    expect(courseManifest.totalAssets).toBe(3);
    const listed = courseManifest.sections.flatMap(s => s.components).flatMap(c => c.assets);
    expect(listed).toHaveLength(3);
    for (const path of listed) expect(files.has(path), path).toBe(true);
  });

  test('README describes the real format, hosting needs, and the three export types', async () => {
    const { store, project } = await setup();
    const files = await unzip(await buildCourseProjectZip(project.id, { store }));
    const readme = decode(files.get('README.md'));
    expect(readme).toMatch(/HTTPS/);
    expect(readme).toMatch(/not\*\* a Rise course export/i);
    expect(readme).toMatch(/Web Package ZIP/);
    expect(readme).toMatch(/Copy for Rise/);
    expect(readme).toMatch(/assets\//);
    expect(readme).not.toMatch(/WCAG 2\.2 AA accessibility support/);
  });

  test('a component whose media is gone stops the export and names the component and asset', async () => {
    const { store, project } = await setup();
    await store.delete('img-1');
    let error;
    try {
      await buildCourseProjectZip(project.id, { store });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CourseExportError);
    expect(error.componentName).toBe('Lesson Accordion');
    expect(error.message).toMatch(/Lesson Accordion/);
    expect(error.message).toMatch(/diagram\.png|img-1/);
    expect(error.assets.length).toBeGreaterThan(0);
  });

  test('a stray temporary URL with no media record is refused, not shipped', async () => {
    const store = createIndexedDBMediaStore(createFakeIndexedDB());
    const comp = createComponentInstance({
      id: 'c1', name: 'Stale Accordion', type: 'accordion',
      config: baseAccordion([{
        title: 'One', content: 'Body',
        media: { ...createEmptyItemMedia('image'), src: 'blob:https://authoring.example/dead', mediaId: '', alt: 'x' }
      }])
    });
    const project = buildProjectSchemaV3({ name: 'Stale', unsectionedComponentOrder: ['c1'], components: { c1: comp } });
    saveProject(project);
    await expect(buildCourseProjectZip(project.id, { store })).rejects.toThrow(/Stale Accordion.*temporary/s);
  });
});
