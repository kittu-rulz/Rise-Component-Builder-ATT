import { escapeSrcdoc, generateHtmlFragment, registerLocalBlobURL, revokeLocalBlobURL, slugify } from './utilities.js';
import { blobToDataURL, isMediaReference, sanitizeAssetFilename, SMALL_IMAGE_INLINE_LIMIT } from './media.js';
import { getMediaRecord, mediaStore } from './media-storage.js';
import { createZip } from './zip.js';

// Many LMS hosts cap an uploaded course/package's size somewhere in this neighborhood —
// this is advisory, not enforced: the ZIP is still produced, the author is just told.
const LARGE_ZIP_WARNING_BYTES = 50 * 1024 * 1024;

/** Byte size of the compiled export (UTF-8), for display before download. */
export function getExportedFileSize(html) {
  return new Blob([html]).size;
}

export function formatExportedFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function buildExportPayload(fullHtml, options = {}) {
  return {
    iframe: `<iframe srcdoc="${escapeSrcdoc(fullHtml)}" width="100%" height="500px" style="border:none;" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"></iframe>`,
    fragment: generateHtmlFragment(fullHtml),
    manifest: Array.isArray(options.manifest) ? options.manifest : [],
    warnings: Array.isArray(options.warnings) ? options.warnings : []
  };
}

/**
 * @param {object} config
 * @param {{ store?: any, inlineImageLimit?: number, mode?: 'inline'|'package' }} options
 *   `mode: 'inline'` (default) is the existing behavior used by the iframe snippet, HTML
 *   fragment, and single-file HTML download: small images embed as base64 data URLs,
 *   everything else gets a relative-path reference plus a warning that it "requires an
 *   external asset file" (since those formats have no way to actually deliver one).
 *   `mode: 'package'` is used by the Rise Project ZIP export (js/export.js#buildRiseProjectZip):
 *   every local media reference always becomes a relative-path asset — nothing is inlined,
 *   and no "requires an external file" warning is produced, because packaging the file
 *   alongside index.html *is* the point. A missing/deleted media record is still reported
 *   in both modes (via `warnings` and the dedicated `missing` list, the latter is what
 *   callers should actually gate export on rather than string-matching `warnings`).
 */
export async function prepareMediaExport(config, options = {}) {
  const store = options.store || mediaStore;
  const mode = options.mode === 'package' ? 'package' : 'inline';
  const inlineImageLimit = options.inlineImageLimit ?? SMALL_IMAGE_INLINE_LIMIT;
  const manifest = [];
  const assets = [];
  const warnings = [];
  const missing = [];
  const filenames = new Set();
  const resolvedMedia = new Map();

  const uniqueFilename = name => {
    const safe = sanitizeAssetFilename(name, 'asset');
    if (!filenames.has(safe)) { filenames.add(safe); return safe; }
    const dot = safe.lastIndexOf('.');
    const stem = dot > 0 ? safe.slice(0, dot) : safe;
    const extension = dot > 0 ? safe.slice(dot) : '';
    let counter = 2;
    while (filenames.has(`${stem}-${counter}${extension}`)) counter += 1;
    const unique = `${stem}-${counter}${extension}`;
    filenames.add(unique);
    return unique;
  };

  const transform = async value => {
    if (isMediaReference(value)) {
      if (resolvedMedia.has(value.mediaId)) return resolvedMedia.get(value.mediaId);
      const record = await getMediaRecord(value.mediaId, store);
      if (!record?.blob) {
        warnings.push(`Uploaded media “${value.name}” is missing from local storage and cannot be exported.`);
        missing.push(value.name);
        return '';
      }
      const filename = uniqueFilename(record.sanitizedName || record.name);
      const relativePath = `assets/${filename}`;
      const manifestEntry = { filename, sourceMediaId: record.id, mimeType: record.mimeType, relativePath };
      manifest.push(manifestEntry);
      assets.push({ ...manifestEntry, blob: record.blob });
      const canInline = mode === 'inline' && record.kind === 'image' && record.mimeType !== 'image/svg+xml' && record.size <= inlineImageLimit;
      if (canInline) {
        const dataUrl = await blobToDataURL(record.blob);
        resolvedMedia.set(value.mediaId, dataUrl);
        return dataUrl;
      }
      if (mode === 'inline') {
        warnings.push(`“${record.name}” requires an external asset file at ${relativePath}; it cannot be safely included in a single HTML file.`);
      }
      resolvedMedia.set(value.mediaId, relativePath);
      return relativePath;
    }
    if (Array.isArray(value)) return Promise.all(value.map(transform));
    if (value && typeof value === 'object') {
      const entries = await Promise.all(Object.entries(value).map(async ([key, entry]) => [key, await transform(entry)]));
      return Object.fromEntries(entries);
    }
    return value;
  };

  return { config: await transform(config), manifest, assets, warnings, missing };
}

/**
 * Packages a compiled export into a real, standalone ZIP: `index.html` at the ZIP root
 * (never inside a wrapper directory — Rise's own import, and just opening the file
 * directly, both expect this), every locally uploaded asset the component actually
 * references under `assets/`, and an optional `assets/manifest.json` for diagnostics.
 * The exported HTML must work without the Builder — it's the exact same compiled output
 * every other export format uses (docs/EXPORT-CONTRACT.md's single-compiler guarantee),
 * just with its media references pointing at packaged relative paths instead of a data
 * URL or an unreachable placeholder.
 *
 * @param {{ html: string, assets: { relativePath: string, blob: Blob }[], manifest: any[], includeManifest?: boolean }} bundle
 *   `html`/`assets`/`manifest` are exactly the shape `prepareMediaExport(config, { mode: 'package' })`
 *   already produces (plus the compiled HTML) — this function does no media resolution of
 *   its own, only archive assembly, so there is exactly one place that decides how a media
 *   reference becomes a path (`prepareMediaExport`) and exactly one place that decides how
 *   bytes become a ZIP (`js/zip.js`).
 * @returns {Promise<{ blob: Blob, size: number, warnings: string[] }>}
 */
export async function buildRiseProjectZip({ html, assets, manifest, includeManifest = true }) {
  /** @type {{ path: string, data: string|ArrayBuffer }[]} */
  const entries = [{ path: 'index.html', data: html }];
  for (const asset of assets) {
    entries.push({ path: asset.relativePath, data: await asset.blob.arrayBuffer() });
  }
  if (includeManifest) {
    entries.push({ path: 'assets/manifest.json', data: JSON.stringify({ schemaVersion: 1, assets: manifest }, null, 2) });
  }
  const blob = createZip(entries);
  const warnings = [];
  if (blob.size > LARGE_ZIP_WARNING_BYTES) {
    warnings.push(`This package is ${formatExportedFileSize(blob.size)} — some LMS hosts limit uploaded packages to around 50 MB. Consider using smaller media if your host rejects the upload.`);
  }
  return { blob, size: blob.size, warnings };
}

export function downloadZipFile(title, blob) {
  const url = registerLocalBlobURL(URL.createObjectURL(blob));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(title || 'rise-component')}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  revokeLocalBlobURL(url);
}

export function downloadHtml(title, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = registerLocalBlobURL(URL.createObjectURL(blob));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(title || 'rise-component')}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  revokeLocalBlobURL(url);
}

export function downloadProjectJson(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = registerLocalBlobURL(URL.createObjectURL(blob));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(project.name || 'rise-project')}.rise.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  revokeLocalBlobURL(url);
}

export function downloadAssetManifest(title, manifest) {
  const blob = new Blob([JSON.stringify({ schemaVersion: 1, assets: manifest }, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = registerLocalBlobURL(URL.createObjectURL(blob));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(title || 'rise-component')}.assets.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  revokeLocalBlobURL(url);
}
