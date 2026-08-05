import { test } from 'vitest';
import assert from 'node:assert/strict';

import { prepareMediaFile } from '../js/media.js';
import { createIndexedDBMediaStore, saveMediaRecord } from '../js/media-storage.js';
import { buildRiseProjectZip, prepareMediaExport } from '../js/export.js';
import { createZip, readZip } from '../js/zip.js';
import { createFakeIndexedDB } from './fixtures/index.js';

// Object-URL revocation for this pipeline is covered by tests/media.test.mjs (the runtime
// object-URL cache this ZIP export reads from is the same one every other export/preview
// path uses — see js/media-storage.js#ensureMediaObjectURL/releaseMediaObjectURL) rather
// than duplicated here. The one *new* create+revoke pair this pass adds is
// js/export.js#downloadZipFile's synchronous download trigger, which — like the
// pre-existing downloadHtml/downloadProjectJson/downloadAssetManifest it mirrors — needs a
// real `document` (this suite runs in plain Node, no jsdom) and was verified directly in a
// real browser instead: see docs/MEDIA-ASSET-PIPELINE.md.

function fileBlob(name, type, content) {
  const blob = new Blob([content], { type });
  Object.defineProperty(blob, 'name', { value: name });
  return blob;
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const wav = 'RIFF0000WAVEfmt ';

function baseConfig(items) {
  return {
    blockTitle: 'MEDIA', blockHeadline: 'Media test', blockDesc: 'Test content',
    colorPrimary: '#2563EB', colorAccent: '#B45309', colorBg: '#FFFFFF', colorText: '#1F2937',
    borderRadius: '12', shadowDepth: 'soft', borderOutline: true, accordionMulti: true,
    accordionAnimation: true, iconStyle: 'chevron', trackCompletion: false,
    completionMsg: 'Complete', items
  };
}

async function uploadImage(store, id, name = 'photo.png') {
  const record = await prepareMediaFile(fileBlob(name, 'image/png', png), 'image', { id });
  return saveMediaRecord(record, store);
}

async function uploadAudio(store, id, name = 'clip.wav') {
  const record = await prepareMediaFile(fileBlob(name, 'audio/wav', wav), 'audio', { id });
  return saveMediaRecord(record, store);
}

test('index.html sits at the ZIP root, not inside a wrapper directory', async () => {
  const zip = createZip([{ path: 'index.html', data: '<html></html>' }, { path: 'assets/x.png', data: new Uint8Array([1]) }]);
  const entries = await readZip(zip);
  assert.deepEqual(entries.map(entry => entry.path), ['index.html', 'assets/x.png']);
  assert.ok(!entries.some(entry => entry.path.includes('/index.html')), 'index.html must not be nested in a subdirectory');
});

test('an uploaded image is referenced by a relative path and packaged under assets/ in the ZIP', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const image = await uploadImage(store, 'img-1');
  const prepared = await prepareMediaExport(baseConfig([{ content: image }]), { store, mode: 'package' });
  assert.equal(prepared.config.items[0].content, 'assets/photo.png');
  assert.equal(prepared.missing.length, 0);

  const { blob } = await buildRiseProjectZip({ html: '<html></html>', assets: prepared.assets, manifest: prepared.manifest });
  const entries = await readZip(blob);
  const asset = entries.find(entry => entry.path === 'assets/photo.png');
  assert.ok(asset, 'the image must actually be present in the ZIP at its referenced path');
  assert.deepEqual([...asset.data], [...png]);
});

test('an uploaded audio file is referenced by a relative path and packaged under assets/ in the ZIP', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const audio = await uploadAudio(store, 'audio-1');
  const prepared = await prepareMediaExport(baseConfig([{ content: audio }]), { store, mode: 'package' });
  assert.equal(prepared.config.items[0].content, 'assets/clip.wav');

  const { blob } = await buildRiseProjectZip({ html: '<html></html>', assets: prepared.assets, manifest: prepared.manifest });
  const entries = await readZip(blob);
  const asset = entries.find(entry => entry.path === 'assets/clip.wav');
  assert.ok(asset, 'the audio file must actually be present in the ZIP at its referenced path');
});

test('an asset no longer referenced by the config is excluded from the ZIP', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const used = await uploadImage(store, 'used-img', 'used.png');
  await uploadImage(store, 'orphan-img', 'orphan.png'); // uploaded once, then removed from the item before export
  const prepared = await prepareMediaExport(baseConfig([{ content: used }]), { store, mode: 'package' });
  assert.equal(prepared.assets.length, 1);
  assert.equal(prepared.assets[0].filename, 'used.png');

  const { blob } = await buildRiseProjectZip({ html: '<html></html>', assets: prepared.assets, manifest: prepared.manifest });
  const entries = await readZip(blob);
  assert.ok(!entries.some(entry => entry.path.includes('orphan')), 'an asset the config no longer references must not be packaged');
});

test('two uploads that sanitize to the same filename do not collide in the ZIP', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const first = await uploadImage(store, 'dup-a', 'Report (Final).png'); // sanitizes to "report-final-.png"-shaped name
  const second = await uploadImage(store, 'dup-b', 'Report (Final).png'); // identical original filename, different id/content position
  const prepared = await prepareMediaExport(baseConfig([{ content: first }, { content: second }]), { store, mode: 'package' });
  const paths = prepared.config.items.map(item => item.content);
  assert.notEqual(paths[0], paths[1], 'two distinct uploads sharing a sanitized filename must not resolve to the same path');
  assert.equal(new Set(prepared.manifest.map(entry => entry.filename)).size, 2);

  const { blob } = await buildRiseProjectZip({ html: '<html></html>', assets: prepared.assets, manifest: prepared.manifest });
  const entries = await readZip(blob);
  const assetPaths = entries.map(entry => entry.path).filter(path => path.startsWith('assets/') && !path.endsWith('manifest.json'));
  assert.equal(new Set(assetPaths).size, assetPaths.length, 'no two packaged asset paths may be identical');
});

test('createZip itself rejects an attempt to write two entries at the same path', () => {
  assert.throws(() => createZip([{ path: 'a.txt', data: '1' }, { path: 'a.txt', data: '2' }]), /Duplicate ZIP entry path/);
});

test('createZip rejects an entry whose data is not a Uint8Array, ArrayBuffer, or string', () => {
  assert.throws(() => createZip([{ path: 'a.txt', data: 12345 }]), /must be a Uint8Array, ArrayBuffer, or string/);
});

test('readZip rejects a blob that is not a valid ZIP archive', async () => {
  await assert.rejects(() => readZip(new Blob(['not a zip file'])));
});

test('a missing (deleted) required asset blocks the ZIP export rather than shipping a dangling reference', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const image = await uploadImage(store, 'will-be-deleted');
  // Simulate the record having been cleared from IndexedDB (different browser/profile,
  // cleared site data) between when the reference was created and export time.
  const emptyStore = createIndexedDBMediaStore(createFakeIndexedDB());
  const prepared = await prepareMediaExport(baseConfig([{ content: image }]), { store: emptyStore, mode: 'package' });
  assert.deepEqual(prepared.missing, [image.name]);
  assert.equal(prepared.assets.length, 0);
  // app.js#prepareRiseZipBundle only calls buildRiseProjectZip when prepared.missing is
  // empty — this asserts the upstream signal that blocking decision is keyed off actually
  // fires, not just that the doomed asset happens to be absent from the manifest.
});

test('the same project input compiles to a byte-for-byte identical ZIP every time (deterministic export)', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const image = await uploadImage(store, 'stable-id');
  const config = baseConfig([{ content: image }]);

  const first = await prepareMediaExport(config, { store, mode: 'package' });
  const firstZip = await buildRiseProjectZip({ html: '<html>same</html>', assets: first.assets, manifest: first.manifest });

  const second = await prepareMediaExport(config, { store, mode: 'package' });
  const secondZip = await buildRiseProjectZip({ html: '<html>same</html>', assets: second.assets, manifest: second.manifest });

  const firstBytes = Buffer.from(await firstZip.blob.arrayBuffer());
  const secondBytes = Buffer.from(await secondZip.blob.arrayBuffer());
  assert.equal(firstBytes.length, secondBytes.length);
  assert.ok(firstBytes.equals(secondBytes), 'compiling the same input twice must produce byte-identical ZIP output');
});

test('a component with no uploaded media still packages a valid ZIP (existing media-free exports still work)', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const prepared = await prepareMediaExport(baseConfig([{ content: 'https://example.com/external.png' }]), { store, mode: 'package' });
  assert.equal(prepared.assets.length, 0);
  assert.equal(prepared.missing.length, 0);

  const { blob, size } = await buildRiseProjectZip({ html: '<html>no media</html>', assets: prepared.assets, manifest: prepared.manifest });
  assert.ok(size > 0);
  const entries = await readZip(blob);
  assert.deepEqual(entries.map(entry => entry.path).sort(), ['assets/manifest.json', 'index.html']);
});

test('inline (non-package) mode is unaffected by the package-mode changes — small images still embed as before', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const image = await uploadImage(store, 'inline-img');
  const prepared = await prepareMediaExport(baseConfig([{ content: image }]), { store }); // default mode: 'inline'
  assert.match(prepared.config.items[0].content, /^data:image\/png;base64,/);
  assert.equal(prepared.warnings.length, 0);
});
