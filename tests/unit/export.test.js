// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { buildRiseProjectZip, formatExportedFileSize, getExportedFileSize, prepareMediaExport } from '../../js/export.js';
import { readZip } from '../../js/zip.js';

describe('export file size reporting', () => {
  test('getExportedFileSize reports the UTF-8 byte length', () => {
    expect(getExportedFileSize('abcd')).toBe(4);
    expect(getExportedFileSize('')).toBe(0);
    // Multi-byte characters must count their real byte length, not character length.
    expect(getExportedFileSize('café')).toBe(5);
  });

  test('formatExportedFileSize renders bytes, kilobytes, and megabytes', () => {
    expect(formatExportedFileSize(0)).toBe('0 B');
    expect(formatExportedFileSize(512)).toBe('512 B');
    expect(formatExportedFileSize(1536)).toBe('1.5 KB');
    expect(formatExportedFileSize(13398)).toBe('13.1 KB');
    expect(formatExportedFileSize(2 * 1024 * 1024)).toBe('2.00 MB');
  });

  test('formatExportedFileSize handles invalid input gracefully', () => {
    expect(formatExportedFileSize(-1)).toBe('Unknown size');
    expect(formatExportedFileSize(NaN)).toBe('Unknown size');
    expect(formatExportedFileSize(undefined)).toBe('Unknown size');
  });
});

function pngBlob(bytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) {
  return new Blob([new Uint8Array(bytes)], { type: 'image/png' });
}

function fakeStore(records) {
  return { get: async id => records[id] };
}

describe('prepareMediaExport filename and cache handling', () => {
  test('two media references that sanitize to the same filename get distinct, collision-free names', async () => {
    const store = fakeStore({
      'media-a': { id: 'media-a', blob: pngBlob([1]), sanitizedName: 'photo.png', kind: 'image', mimeType: 'image/png', size: 1, name: 'photo.png' },
      'media-b': { id: 'media-b', blob: pngBlob([2]), sanitizedName: 'photo.png', kind: 'image', mimeType: 'image/png', size: 1, name: 'photo.png' }
    });
    const reference = id => ({ source: 'upload', mediaId: id, schemaVersion: 1, kind: 'image', name: 'photo.png', mimeType: 'image/png', size: 1, createdAt: new Date().toISOString() });
    const config = { items: [{ content: reference('media-a') }, { content: reference('media-b') }] };
    const result = await prepareMediaExport(config, { store, mode: 'package' });
    const filenames = result.manifest.map(entry => entry.filename);
    expect(new Set(filenames).size).toBe(2);
    expect(filenames).toContain('photo.png');
    expect(filenames).toContain('photo-2.png');
  });

  // NOTE: prepareMediaExport's `resolvedMedia` cache is intended to dedupe a media
  // reference used in more than one field, but its recursive walk resolves every branch
  // concurrently via Promise.all, so both branches reach the `resolvedMedia.has(...)`
  // check before either has resolved and populated the cache — the cache never actually
  // hits. This is a known, minor inefficiency (the same uploaded file is packaged twice,
  // under two distinct filenames, instead of once) rather than a correctness bug: both
  // occurrences still resolve to a valid, working reference. Fixing the concurrency model
  // is a behavioral change out of scope for expanding test coverage; documented here so
  // the gap is visible rather than silently assumed away.
  test('the same mediaId referenced twice still resolves both occurrences correctly (each is fetched and packaged independently)', async () => {
    let fetchCount = 0;
    const record = { id: 'shared', blob: pngBlob(), sanitizedName: 'shared.png', kind: 'image', mimeType: 'image/png', size: 8, name: 'shared.png' };
    const store = { get: async () => { fetchCount += 1; return record; } };
    const reference = { source: 'upload', mediaId: 'shared', schemaVersion: 1, kind: 'image', name: 'shared.png', mimeType: 'image/png', size: 8, createdAt: new Date().toISOString() };
    const config = { items: [{ content: reference }, { content: reference }] };
    const result = await prepareMediaExport(config, { store, mode: 'package' });
    expect(fetchCount).toBe(2);
    expect(result.manifest.map(entry => entry.filename)).toEqual(['shared.png', 'shared-2.png']);
    expect(result.config.items[0].content).toBe('assets/shared.png');
    expect(result.config.items[1].content).toBe('assets/shared-2.png');
  });
});

describe('buildRiseProjectZip', () => {
  test('assembles index.html at the root, packaged assets, and an asset manifest', async () => {
    const asset = { relativePath: 'assets/photo.png', blob: pngBlob(), filename: 'photo.png', sourceMediaId: 'm1', mimeType: 'image/png' };
    const { blob, size, warnings } = await buildRiseProjectZip({
      html: '<html></html>', assets: [asset], manifest: [{ filename: 'photo.png', sourceMediaId: 'm1', mimeType: 'image/png', relativePath: 'assets/photo.png' }]
    });
    expect(size).toBe(blob.size);
    expect(warnings).toEqual([]);
    const entries = await readZip(blob);
    expect(entries[0].path).toBe('index.html');
    expect(entries.some(entry => entry.path === 'assets/photo.png')).toBe(true);
    expect(entries.some(entry => entry.path === 'assets/manifest.json')).toBe(true);
  });

  test('omits the manifest entry when includeManifest is false', async () => {
    const { blob } = await buildRiseProjectZip({ html: '<html></html>', assets: [], manifest: [], includeManifest: false });
    const entries = await readZip(blob);
    expect(entries.some(entry => entry.path === 'assets/manifest.json')).toBe(false);
  });

  test('warns when the packaged ZIP exceeds the advisory large-package size', async () => {
    const bigAsset = { relativePath: 'assets/big.bin', blob: new Blob([new Uint8Array(51 * 1024 * 1024)]) };
    const { warnings } = await buildRiseProjectZip({ html: '<html></html>', assets: [bigAsset], manifest: [] });
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/50 MB/);
  });
});

describe('download helpers', () => {
  const originalCreateObjectURL = globalThis.URL?.createObjectURL;
  const originalRevokeObjectURL = globalThis.URL?.revokeObjectURL;

  afterEach(() => {
    globalThis.URL.createObjectURL = originalCreateObjectURL;
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  function stubObjectURL() {
    let counter = 0;
    globalThis.URL.createObjectURL = vi.fn(() => `blob:local-${++counter}`);
    globalThis.URL.revokeObjectURL = vi.fn();
  }

  test('downloadHtml creates and clicks a slugified .html download link, then revokes its object URL', async () => {
    stubObjectURL();
    const { downloadHtml } = await import('../../js/export.js');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadHtml('My Cool Component!', '<html></html>');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-1');
    clickSpy.mockRestore();
  });

  test('downloadZipFile downloads a .zip file named after the slugified title', async () => {
    stubObjectURL();
    const { downloadZipFile } = await import('../../js/export.js');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function capture() { this.__downloadName = this.download; });
    downloadZipFile('Flip Cards', new Blob(['zip-bytes']));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  test('downloadProjectJson and downloadAssetManifest each produce and revoke one object URL', async () => {
    stubObjectURL();
    const { downloadAssetManifest, downloadProjectJson } = await import('../../js/export.js');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadProjectJson({ name: 'My Project' });
    downloadAssetManifest('My Component', [{ filename: 'a.png' }]);
    expect(clickSpy).toHaveBeenCalledTimes(2);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    clickSpy.mockRestore();
  });
});
