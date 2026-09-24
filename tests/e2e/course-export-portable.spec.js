import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { readZip } from '../../js/zip.js';

// P0 release blocker: the full-course ZIP must work with no Builder, no IndexedDB and no
// browser session. This builds the ZIP in a real browser against the real IndexedDB store,
// unzips it into a clean directory, serves it from a DIFFERENT origin, and checks the media
// actually loads in the exported page.

const TYPES = { '.html': 'text/html', '.png': 'image/png', '.wav': 'audio/wav', '.json': 'application/json' };

async function serve(root) {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const data = await readFile(join(root, path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

// Seeds two media files and a two-component course through the app's own modules, so the
// data goes through the same IndexedDB + localStorage paths the editor uses.
async function seedCourse(page) {
  return page.evaluate(async () => {
    const { saveMediaRecord } = await import('/js/media-storage.js');
    const { createEmptyItemMedia } = await import('/js/item-media.js');
    const { buildProjectSchemaV3, createComponentInstance, createSection } = await import('/js/project-schema.js');
    const { saveProject } = await import('/js/storage.js');

    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 16;
    canvas.getContext('2d').fillRect(0, 0, 24, 16);
    const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    // 0.2 s of 8 kHz mono 8-bit silence.
    const samples = 1600;
    const wav = new DataView(new ArrayBuffer(44 + samples));
    const text = (o, s) => [...s].forEach((c, i) => wav.setUint8(o + i, c.charCodeAt(0)));
    text(0, 'RIFF'); wav.setUint32(4, 36 + samples, true); text(8, 'WAVE'); text(12, 'fmt ');
    wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true);
    wav.setUint32(24, 8000, true); wav.setUint32(28, 8000, true); wav.setUint16(32, 1, true); wav.setUint16(34, 8, true);
    text(36, 'data'); wav.setUint32(40, samples, true);
    for (let i = 0; i < samples; i++) wav.setUint8(44 + i, 128);
    const audio = new Blob([wav], { type: 'audio/wav' });

    const record = (id, kind, name, mimeType, blob) => ({
      id, kind, name, sanitizedName: name, mimeType, size: blob.size, blob, createdAt: new Date().toISOString()
    });
    await saveMediaRecord(record('img-1', 'image', 'diagram.png', 'image/png', png));
    await saveMediaRecord(record('aud-1', 'audio', 'welcome.wav', 'audio/wav', audio));

    const media = (type, mediaId, fileName, mimeType, extra = {}) => ({
      ...createEmptyItemMedia(type), sourceType: 'upload', mediaId, fileName, mimeType,
      alt: 'Network diagram', caption: 'Figure', ...extra
    });
    const base = items => ({
      blockTitle: 'Module', blockHeadline: 'Overview', items, colorPrimary: '#00388F', colorAccent: '#009FDB',
      colorBg: '#FFFFFF', colorText: '#000000', borderRadius: '8', shadowDepth: 'none', iconStyle: 'chevron'
    });
    const project = buildProjectSchemaV3({
      name: 'Portable Course',
      sectionOrder: ['s1'],
      sections: { s1: createSection({ id: 's1', name: 'Module One', componentOrder: ['c1'] }) },
      unsectionedComponentOrder: ['c2'],
      components: {
        c1: createComponentInstance({ id: 'c1', name: 'Lesson', type: 'accordion', config: base([
          { title: 'Picture', content: 'Body', media: media('image', 'img-1', 'diagram.png', 'image/png') }
        ]) }),
        c2: createComponentInstance({ id: 'c2', name: 'Loose', type: 'accordion', config: base([
          { title: 'Picture again', content: 'Body', media: media('image', 'img-1', 'diagram.png', 'image/png') },
          { title: 'Listen', content: 'Body', media: media('audio', 'aud-1', 'welcome.wav', 'audio/wav', { alt: '', caption: '' }) }
        ]) })
      }
    });
    return saveProject(project).id;
  });
}

async function exportCourse(page, id) {
  const bytes = await page.evaluate(async projectId => {
    const { buildCourseProjectZip } = await import('/js/dashboard/project-export.js');
    const blob = await buildCourseProjectZip(projectId);
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, id);
  return new Blob([Uint8Array.from(bytes)], { type: 'application/zip' });
}

test('the full course ZIP works from a clean directory on another origin, with media loading', async ({ page, browser }) => {
  await page.goto('/?dashboard');
  const id = await seedCourse(page);

  // Save-and-refresh first: the preview's runtime blob: URLs are gone after a reload.
  await page.reload();

  const zip = await exportCourse(page, id);
  const entries = await readZip(zip);
  const paths = entries.map(e => e.path);

  const root = await mkdtemp(join(tmpdir(), 'course-zip-'));
  let served;
  try {
    for (const entry of entries) {
      const target = join(root, entry.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(entry.data));
    }

    expect(paths).toContain('01-module-one/01-lesson/assets/diagram.png');
    expect(paths).toContain('unsectioned-components/01-loose/assets/diagram.png');
    expect(paths).toContain('unsectioned-components/01-loose/assets/welcome.wav');
    for (const entry of entries) {
      if (entry.path === 'project-backup.json') continue;
      expect(Buffer.from(entry.data).toString('utf8'), entry.path).not.toMatch(/\bblob:https?:/i);
    }

    served = await serve(root);
    const context = await browser.newContext();
    const clean = await context.newPage();

    // Component 1 (sectioned): the image loads and decodes.
    await clean.goto(`${served.origin}/01-module-one/01-lesson/index.html`);
    await clean.locator('.accordion-trigger').first().click();
    const image = clean.locator('img.item-media-img').first();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth)).toBe(24);

    // Component 2 (unsectioned): reused image AND audio both resolve.
    await clean.goto(`${served.origin}/unsectioned-components/01-loose/index.html`);
    await clean.locator('.accordion-trigger').nth(0).click();
    await expect.poll(() => clean.locator('img.item-media-img').first().evaluate(el => el.complete && el.naturalWidth)).toBe(24);
    await clean.locator('.accordion-trigger').nth(1).click();
    const audio = clean.locator('audio.item-media-audio-player').first();
    await expect.poll(() => audio.evaluate(el => el.readyState)).toBeGreaterThanOrEqual(1);
    expect(await audio.evaluate(el => el.error === null)).toBe(true);

    await context.close();
  } finally {
    if (served) await new Promise(resolve => served.server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
