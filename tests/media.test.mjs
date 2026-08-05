import { test } from 'vitest';
import assert from 'node:assert/strict';

import {
  MEDIA_LIMITS, computeFileHash, computeResizeTarget, createMediaReference, formatFileSize, prepareMediaFile,
  resolveMediaLimits, sanitizeSVGText, validateMediaAccessibility, validateMediaFile
} from '../js/media.js';
import {
  createIndexedDBMediaStore, deleteMediaRecord, ensureMediaObjectURL, findDuplicateByHash,
  getRuntimeMediaURLCount, pruneMediaObjectURLs, releaseAllMediaObjectURLs, restoreMediaReferences,
  saveMediaRecord
} from '../js/media-storage.js';
import { prepareMediaExport } from '../js/export.js';
import { buildProject, getProject, saveProject } from '../js/storage.js';
import { createFakeIndexedDB } from './fixtures/index.js';

function fileBlob(name, type, content) {
  const extension = name.split('.').pop().toLowerCase();
  const signatures = {
    jpg: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    png: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    gif: 'GIF89a', webp: 'RIFF0000WEBP', mp3: 'ID3media', wav: 'RIFF0000WAVE',
    mp4: new Uint8Array([0, 0, 0, 16, 0x66, 0x74, 0x79, 0x70]),
    webm: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), vtt: 'WEBVTT\n',
    svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
  };
  const blob = new Blob([content ?? signatures[extension] ?? 'file-data'], { type });
  Object.defineProperty(blob, 'name', { value: name });
  return blob;
}

function createMemoryLocalStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
}

function baseConfig(items) {
  return {
    blockTitle: 'MEDIA', blockHeadline: 'Media test', blockDesc: 'Test content',
    colorPrimary: '#2563EB', colorAccent: '#B45309', colorBg: '#FFFFFF', colorText: '#1F2937',
    borderRadius: '12', shadowDepth: 'soft', borderOutline: true, accordionMulti: true,
    accordionAnimation: true, iconStyle: 'chevron', trackCompletion: false,
    completionMsg: 'Complete', items
  };
}

test('valid image upload creates a sanitized media record and reference', async () => {
  const file = fileBlob('photo.JPG', 'image/jpeg');
  assert.equal(validateMediaFile(file, 'image').valid, true);
  const record = await prepareMediaFile(file, 'image', { id: 'image-1' });
  const reference = createMediaReference(record);
  assert.equal(reference.mediaId, 'image-1');
  assert.equal(reference.name, 'photo.JPG');
  assert.equal(reference.mimeType, 'image/jpeg');
  assert.equal('blob' in reference, false);
  assert.equal('objectUrl' in reference, false);
});

test('invalid file types and mismatched MIME types are rejected', () => {
  assert.equal(validateMediaFile(fileBlob('payload.exe', 'application/octet-stream'), 'image').valid, false);
  const mismatch = validateMediaFile(fileBlob('photo.png', 'image/jpeg'), 'image');
  assert.equal(mismatch.valid, false);
  assert.match(mismatch.errors.join(' '), /MIME type/i);
});

test('declared media types with invalid file signatures are rejected', async () => {
  await assert.rejects(
    () => prepareMediaFile(fileBlob('fake.png', 'image/png', 'not-a-png'), 'image'),
    /do not match/i
  );
});

test('oversized uploads use configurable type and SVG limits', () => {
  const oversized = { name: 'large.png', type: 'image/png', size: MEDIA_LIMITS.image + 1 };
  assert.equal(validateMediaFile(oversized, 'image').valid, false);
  const oversizedSvg = { name: 'large.svg', type: 'image/svg+xml', size: MEDIA_LIMITS.svg + 1 };
  assert.equal(validateMediaFile(oversizedSvg, 'image').valid, false);
});

test('SVG sanitization accepts simple artwork and rejects active content', async () => {
  const safe = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>';
  assert.equal(sanitizeSVGText(safe).valid, true);
  for (const unsafe of [
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path onload="alert(1)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)">x</a></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>HTML</div></foreignObject></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/x.png"/></svg>'
  ]) assert.equal(sanitizeSVGText(unsafe).valid, false);
  await assert.rejects(() => prepareMediaFile(fileBlob('unsafe.svg', 'image/svg+xml', '<svg><script>x</script></svg>'), 'image'));
});

test('audio and video uploads validate supported formats', async () => {
  const audio = await prepareMediaFile(fileBlob('lesson.mp3', 'audio/mpeg'), 'audio', { id: 'audio-1', duration: 12.5 });
  const video = await prepareMediaFile(fileBlob('lesson.webm', 'video/webm'), 'video', { id: 'video-1', duration: 45 });
  const captions = await prepareMediaFile(fileBlob('lesson.vtt', 'text/vtt'), 'captions', { id: 'captions-1' });
  assert.equal(audio.kind, 'audio');
  assert.equal(audio.duration, 12.5);
  assert.equal(video.kind, 'video');
  assert.equal(video.duration, 45);
  assert.equal(captions.kind, 'captions');
});

test('IndexedDB storage restores uploaded media references after reopening', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const record = await prepareMediaFile(fileBlob('restore.png', 'image/png'), 'image', { id: 'restore-image' });
  const reference = await saveMediaRecord(record, store);
  releaseAllMediaObjectURLs();
  const restored = await restoreMediaReferences({ items: [{ content: reference }] }, store);
  assert.deepEqual(restored.missing, []);
  assert.equal(restored.restored, 1);
  assert.match(await ensureMediaObjectURL(reference.mediaId, store), /^blob:/);
  releaseAllMediaObjectURLs();
});

test('a reference whose underlying record was cleared (different browser/profile) is reported as missing, not restored', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const record = await prepareMediaFile(fileBlob('gone.png', 'image/png'), 'image', { id: 'gone-image' });
  const reference = await saveMediaRecord(record, store);
  await deleteMediaRecord(reference.mediaId, store);
  const restored = await restoreMediaReferences({ items: [{ content: reference }] }, store);
  assert.equal(restored.restored, 0);
  assert.deepEqual(restored.missing, [reference.mediaId]);
  releaseAllMediaObjectURLs();
});

test('image replacement and removal update references and clean object URLs', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const first = await saveMediaRecord(await prepareMediaFile(fileBlob('first.png', 'image/png'), 'image', { id: 'first' }), store);
  await ensureMediaObjectURL(first.mediaId, store);
  const second = await saveMediaRecord(await prepareMediaFile(fileBlob('second.png', 'image/png'), 'image', { id: 'second' }), store);
  await ensureMediaObjectURL(second.mediaId, store);
  assert.equal(getRuntimeMediaURLCount(), 2);
  pruneMediaObjectURLs({ items: [{ content: second }] });
  assert.equal(getRuntimeMediaURLCount(), 1);
  await deleteMediaRecord(second.mediaId, store);
  assert.equal(await store.get(second.mediaId), undefined);
  assert.equal(getRuntimeMediaURLCount(), 0);
});

test('missing alt text warns while decorative images pass', () => {
  const missing = validateMediaAccessibility(baseConfig([{ content: 'https://example.com/image.png', altText: '', decorative: false }]), 'image-gallery');
  assert.equal(missing.length, 1);
  const decorative = validateMediaAccessibility(baseConfig([{ content: 'https://example.com/image.png', altText: '', decorative: true }]), 'image-gallery');
  assert.deepEqual(decorative, []);
});

test('custom item artwork requires alt text unless explicitly decorative', () => {
  const missing = validateMediaAccessibility(baseConfig([
    { title: 'Card', content: 'Content', iconImage: 'https://example.com/icon.png', iconAltText: '', iconDecorative: false }
  ]), 'flip-cards');
  assert.equal(missing.length, 1);
  assert.match(missing[0], /alternative text/i);
  const meaningful = validateMediaAccessibility(baseConfig([
    { title: 'Card', content: 'Content', iconImage: 'https://example.com/icon.png', iconAltText: 'Learning icon', iconDecorative: false }
  ]), 'flip-cards');
  const decorative = validateMediaAccessibility(baseConfig([
    { title: 'Card', content: 'Content', iconImage: 'https://example.com/icon.png', iconAltText: '', iconDecorative: true }
  ]), 'info-grid');
  assert.deepEqual(meaningful, []);
  assert.deepEqual(decorative, []);
});

test('audio transcript and video captions-or-transcript warnings are non-blocking', () => {
  assert.equal(validateMediaAccessibility(baseConfig([{ content: 'https://example.com/audio.mp3', transcript: '' }]), 'audio-player').length, 1);
  assert.equal(validateMediaAccessibility(baseConfig([{ content: 'https://example.com/video.mp4', captionsUrl: '', transcript: '' }]), 'video-frame').length, 1);
  assert.deepEqual(validateMediaAccessibility(baseConfig([{ content: 'https://example.com/video.mp4', captionsUrl: '', transcript: '<p>Transcript</p>' }]), 'video-frame'), []);
});

test('project save and reopen retain media metadata without binary or object URLs', async () => {
  globalThis.localStorage = createMemoryLocalStorage();
  const record = await prepareMediaFile(fileBlob('project.png', 'image/png'), 'image', { id: 'project-image' });
  const reference = createMediaReference(record);
  const project = buildProject({
    name: 'Media project', componentId: 'image-gallery', config: baseConfig([{ title: 'Image', content: reference }]),
    theme: 'light', settings: { defaultFont: 'Lato', exportFormat: 'web', autosave: true, aiEnabled: false }
  });
  const saved = saveProject(project);
  const reopened = getProject(saved.id);
  assert.deepEqual(reopened.config.items[0].content, reference);
  assert.equal(JSON.stringify(reopened).includes('blob:'), false);
  delete globalThis.localStorage;
});

test('export embeds small images and emits media metadata manifests and warnings', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const image = await saveMediaRecord(await prepareMediaFile(fileBlob('small.png', 'image/png'), 'image', { id: 'export-image' }), store);
  const audio = await saveMediaRecord(await prepareMediaFile(fileBlob('lesson.wav', 'audio/wav'), 'audio', { id: 'export-audio' }), store);
  const exported = await prepareMediaExport(baseConfig([{ content: image }, { content: audio }]), { store });
  assert.match(exported.config.items[0].content, /^data:image\/png;base64,/);
  assert.equal(exported.config.items[1].content, 'assets/lesson.wav');
  assert.deepEqual(exported.manifest.map(asset => Object.keys(asset)), [
    ['filename', 'sourceMediaId', 'mimeType', 'relativePath'],
    ['filename', 'sourceMediaId', 'mimeType', 'relativePath']
  ]);
  assert.equal(exported.manifest[1].sourceMediaId, 'export-audio');
  assert.equal(exported.warnings.length, 1);
});

test('export warns and blanks the reference when the referenced media record no longer exists', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const ghostReference = createMediaReference({
    id: 'never-saved', kind: 'image', name: 'ghost.png', mimeType: 'image/png', size: 100, createdAt: new Date().toISOString()
  });
  const exported = await prepareMediaExport(baseConfig([{ content: ghostReference }]), { store });
  assert.equal(exported.config.items[0].content, '');
  assert.equal(exported.manifest.length, 0);
  assert.equal(exported.warnings.length, 1);
  assert.match(exported.warnings[0], /missing from local storage/i);
});

test('the resize-target decision downscales only when the long edge exceeds the threshold', () => {
  assert.equal(computeResizeTarget(1200, 900, 2000), null);
  assert.equal(computeResizeTarget(2000, 1500, 2000), null);
  assert.deepEqual(computeResizeTarget(4000, 3000, 2000), { width: 2000, height: 1500 });
  assert.deepEqual(computeResizeTarget(3000, 6000, 2000), { width: 1000, height: 2000 });
  assert.equal(computeResizeTarget(0, 0), null);
  assert.equal(computeResizeTarget(Number.NaN, 500), null);
});

test('identical file content hashes the same regardless of filename, and different content hashes differently', async () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
  const hashA = await computeFileHash(new Blob([bytes], { type: 'image/png' }));
  const hashB = await computeFileHash(new Blob([bytes], { type: 'image/png' }));
  const hashC = await computeFileHash(new Blob([bytes.slice(0, -1)], { type: 'image/png' }));
  assert.equal(typeof hashA, 'string');
  assert.equal(hashA.length, 64);
  assert.equal(hashA, hashB);
  assert.notEqual(hashA, hashC);
});

test('uploading the same file content twice is detected as a duplicate and no second blob is stored', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const first = await prepareMediaFile(fileBlob('photo.png', 'image/png'), 'image', { id: 'dup-first' });
  await saveMediaRecord(first, store);
  const second = await prepareMediaFile(fileBlob('photo-renamed.png', 'image/png'), 'image', { id: 'dup-second' });
  assert.equal(first.contentHash, second.contentHash);
  const duplicate = await findDuplicateByHash(second.contentHash, 'image', store);
  assert.ok(duplicate);
  assert.equal(duplicate.id, 'dup-first');
  const all = await store.getAll();
  assert.equal(all.length, 1);
});

test('a different file, or the same bytes under a different media kind, is not treated as a duplicate', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  const image = await prepareMediaFile(fileBlob('photo.png', 'image/png'), 'image', { id: 'unique-1' });
  await saveMediaRecord(image, store);
  const differentImage = await prepareMediaFile(fileBlob('other.png', 'image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 9, 9])), 'image', { id: 'unique-2' });
  assert.equal(await findDuplicateByHash(differentImage.contentHash, 'image', store), null);
  assert.equal(await findDuplicateByHash(image.contentHash, 'video', store), null);
});

test('findDuplicateByHash never blocks an upload when a content hash is unavailable', async () => {
  const store = createIndexedDBMediaStore(createFakeIndexedDB());
  assert.equal(await findDuplicateByHash(null, 'image', store), null);
  assert.equal(await findDuplicateByHash(undefined, 'image', store), null);
});

test('a storage-quota failure while saving a media record surfaces a specific, user-actionable error', async () => {
  const quotaError = new Error('quota exceeded');
  quotaError.name = 'QuotaExceededError';
  const failingStore = { put: () => Promise.reject(quotaError) };
  const record = await prepareMediaFile(fileBlob('big.png', 'image/png'), 'image', { id: 'quota-test' });
  await assert.rejects(() => saveMediaRecord(record, failingStore), /storage is full/i);
});

test('an unrelated media storage failure still surfaces a clear, generic error', async () => {
  const failingStore = { put: () => Promise.reject(new Error('some other browser restriction')) };
  const record = await prepareMediaFile(fileBlob('big.png', 'image/png'), 'image', { id: 'other-fail-test' });
  await assert.rejects(() => saveMediaRecord(record, failingStore), /could not store the uploaded file/i);
});

test('formatFileSize renders bytes, kilobytes, and megabytes', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(5 * 1024 * 1024), '5.0 MB');
  assert.equal(formatFileSize(undefined), '0 B');
});

test('validateMediaFile rejects an unsupported upload kind and a malformed file object', () => {
  const file = fileBlob('lesson.mp3', 'audio/mpeg');
  Object.defineProperty(file, 'name', { value: 'lesson.mp3' });
  assert.equal(validateMediaFile(file, 'captions-not-a-kind').valid, false);
  assert.equal(validateMediaFile(null, 'image').valid, false);
  assert.equal(validateMediaFile({}, 'image').valid, false);
});

test('validateMediaFile rejects an empty (zero-byte) file', () => {
  const empty = { name: 'empty.png', type: 'image/png', size: 0 };
  const result = validateMediaFile(empty, 'image');
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /empty files/i);
});

test('resolveMediaLimits converts configured megabyte settings to bytes and falls back per field', () => {
  const custom = resolveMediaLimits({ image: 5, audio: 0, video: -1 });
  assert.equal(custom.image, 5 * 1024 * 1024);
  assert.equal(custom.audio, MEDIA_LIMITS.audio);
  assert.equal(custom.video, MEDIA_LIMITS.video);
  assert.equal(custom.svg, MEDIA_LIMITS.svg);
  assert.deepEqual(resolveMediaLimits(null), MEDIA_LIMITS);
});

test('the hotspot background image requires alt text or an explicit decorative flag', () => {
  const missing = validateMediaAccessibility({ backgroundImage: 'https://example.com/bg.png', backgroundDecorative: false, backgroundAltText: '', items: [] }, 'hotspots');
  assert.equal(missing.length, 1);
  assert.match(missing[0], /hotspot background/i);
  const decorative = validateMediaAccessibility({ backgroundImage: 'https://example.com/bg.png', backgroundDecorative: true, backgroundAltText: '', items: [] }, 'hotspots');
  assert.deepEqual(decorative, []);
});
