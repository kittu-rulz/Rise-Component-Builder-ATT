export const MEDIA_SCHEMA_VERSION = 1;

export const MEDIA_LIMITS = Object.freeze({
  image: 10 * 1024 * 1024,
  audio: 30 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  svg: 2 * 1024 * 1024,
  captions: 2 * 1024 * 1024
});

export const SMALL_IMAGE_INLINE_LIMIT = 1024 * 1024;

// A raster image above this on its long edge is rejected outright — a guard against a
// pathological/decompression-bomb-style file (a tiny compressed byte count that decodes
// to an enormous pixel grid), not a limit real authoring photography would ever hit.
export const MAX_IMAGE_DIMENSION_PX = 8000;

// Above this (but under the hard max), the image is automatically downscaled before
// storing — most authoring photos/screenshots are far larger than any component will
// ever render them, and shipping the original only inflates storage and, for small
// enough files, the inlined base64 export payload.
export const IMAGE_RESIZE_THRESHOLD_PX = 2000;

export function resolveMediaLimits(mediaLimitsMb) {
  if (!mediaLimitsMb) return MEDIA_LIMITS;
  const toBytes = (mb, fallback) => Number.isFinite(mb) && mb > 0 ? Math.round(mb * 1024 * 1024) : fallback;
  return {
    image: toBytes(mediaLimitsMb.image, MEDIA_LIMITS.image),
    audio: toBytes(mediaLimitsMb.audio, MEDIA_LIMITS.audio),
    video: toBytes(mediaLimitsMb.video, MEDIA_LIMITS.video),
    svg: toBytes(mediaLimitsMb.svg, MEDIA_LIMITS.svg),
    captions: MEDIA_LIMITS.captions
  };
}

const TYPE_RULES = Object.freeze({
  image: {
    jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], webp: ['image/webp'],
    svg: ['image/svg+xml'], gif: ['image/gif']
  },
  audio: { mp3: ['audio/mpeg', 'audio/mp3'], wav: ['audio/wav', 'audio/x-wav', 'audio/wave'] },
  video: { mp4: ['video/mp4'], webm: ['video/webm'] },
  captions: { vtt: ['text/vtt'] }
});

const MEDIA_REFERENCE_KEYS = new Set([
  'mediaId', 'schemaVersion', 'source', 'kind', 'name', 'mimeType', 'size', 'createdAt', 'duration'
]);

function createId() {
  return globalThis.crypto?.randomUUID?.() || `media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getFileExtension(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name || '').trim());
  return match ? match[1].toLowerCase() : '';
}

export function formatFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function validateMediaFile(file, kind, limits = MEDIA_LIMITS) {
  const errors = [];
  const rules = TYPE_RULES[kind];
  if (!file || typeof file.name !== 'string' || typeof file.size !== 'number') {
    return { valid: false, errors: ['Choose a valid file.'] };
  }
  if (!rules) return { valid: false, errors: ['This upload field has an unsupported media type.'] };

  const extension = getFileExtension(file.name);
  const allowedMimes = rules[extension];
  const mimeType = String(file.type || '').toLowerCase();
  if (!allowedMimes) errors.push(`.${extension || 'unknown'} files are not supported for ${kind} uploads.`);
  else if (!allowedMimes.includes(mimeType)) errors.push(`The file extension and MIME type (${mimeType || 'missing'}) do not match.`);

  const limit = extension === 'svg' ? limits.svg : limits[kind];
  if (Number.isFinite(limit) && file.size > limit) {
    errors.push(`${file.name} exceeds the ${formatFileSize(limit)} ${extension === 'svg' ? 'SVG' : kind} limit.`);
  }
  if (file.size === 0) errors.push('Empty files cannot be uploaded.');
  return { valid: errors.length === 0, errors, extension, mimeType, limit };
}

// Pure sizing decision, kept separate from the actual pixel-decoding/canvas work below
// so it can be unit-tested without a real browser image decoder (this test suite's
// vitest environment is plain Node — see docs/MEDIA-ASSET-PIPELINE.md).
export function computeResizeTarget(width, height, threshold = IMAGE_RESIZE_THRESHOLD_PX) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const longEdge = Math.max(width, height);
  if (longEdge <= threshold) return null;
  const scale = threshold / longEdge;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// Requires a real browser image decoder — unavailable in this project's Node-based unit
// test environment by design, so every caller treats a thrown/rejected result as "could
// not determine dimensions" and fails open rather than blocking the upload.
async function readImageDimensions(blob) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return dimensions;
  }
  if (typeof Image === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    throw new Error('Image decoding is not available in this environment.');
  }
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('Could not read image dimensions.'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Downscales via <canvas> — also browser-only; callers fail open (keep the original blob)
// if canvas or its 2D context isn't available.
async function resizeImageBlob(blob, width, height, mimeType) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw new Error('Image resizing is not available in this environment.');
  }
  const bitmap = typeof createImageBitmap === 'function' ? await createImageBitmap(blob) : null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas context is not available.');
  if (bitmap) {
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
  } else {
    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('Could not decode image for resizing.'));
        element.src = url;
      });
      context.drawImage(image, 0, 0, width, height);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      result => (result ? resolve(result) : reject(new Error('Could not encode the resized image.'))),
      mimeType && mimeType !== 'image/gif' ? mimeType : 'image/png'
    );
  });
}

// Content hash for duplicate-file detection (js/media-storage.js#findDuplicateByHash) —
// hex-encoded SHA-256 of the final stored bytes, so two uploads of the same picture (even
// under different filenames) are recognized as the same asset. Returns null rather than
// throwing when the Web Crypto digest API isn't available (e.g. an insecure, non-localhost
// context), since duplicate detection is an optimization, never a correctness requirement.
export async function computeFileHash(blob) {
  if (typeof globalThis.crypto?.subtle?.digest !== 'function') return null;
  try {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

export function sanitizeSVGText(value) {
  // eslint-disable-next-line no-control-regex -- intentionally strips control characters before unsafe-content checks
  const svg = String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  const normalized = svg
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);?/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&colon;/gi, ':');
  const unsafeChecks = [
    { pattern: /<!DOCTYPE|<!ENTITY/i, message: 'SVG document types and entities are not allowed.' },
    { pattern: /<\s*(?:script|foreignObject|iframe|object|embed|audio|video|canvas)\b/i, message: 'SVG contains an unsafe embedded element.' },
    { pattern: /\son[a-z0-9_-]+\s*=/i, message: 'SVG event-handler attributes are not allowed.' },
    { pattern: /(?:javascript|vbscript)\s*:/i, message: 'SVG contains an unsafe script URL.' },
    { pattern: /data\s*:\s*text\/html/i, message: 'SVG contains embedded HTML.' },
    { pattern: /\b(?:href|xlink:href|src)\s*=\s*["']\s*(?!#)[^"']+/i, message: 'SVG external references are not allowed.' },
    { pattern: /@import\b|url\(\s*["']?\s*(?!#)/i, message: 'SVG external style references are not allowed.' }
  ];
  for (const check of unsafeChecks) {
    if (check.pattern.test(normalized)) return { valid: false, error: check.message, sanitized: '' };
  }
  if (!/^\s*(?:<\?xml[^>]*>\s*)?<svg\b[\s\S]*<\/svg>\s*$/i.test(svg)) {
    return { valid: false, error: 'The file is not a complete SVG document.', sanitized: '' };
  }
  return { valid: true, sanitized: svg };
}

async function hasExpectedFileSignature(file, extension) {
  if (extension === 'svg') return true;
  if (extension === 'vtt') return /^\uFEFF?WEBVTT(?:[ \t]|\r?\n)/.test(await file.text());
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  if (['jpg', 'jpeg'].includes(extension)) return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === 'png') return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (extension === 'gif') return ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a');
  if (extension === 'webp') return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
  if (extension === 'wav') return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE';
  if (extension === 'mp3') return ascii.startsWith('ID3') || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  if (extension === 'mp4') return ascii.slice(4, 8) === 'ftyp';
  if (extension === 'webm') return [0x1a, 0x45, 0xdf, 0xa3].every((value, index) => bytes[index] === value);
  return false;
}

export async function prepareMediaFile(file, kind, options = {}) {
  const validation = validateMediaFile(file, kind, options.limits || MEDIA_LIMITS);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  if (!await hasExpectedFileSignature(file, validation.extension)) {
    throw new Error(`The contents of ${file.name} do not match its declared file type.`);
  }

  let blob;
  if (validation.extension === 'svg') {
    const result = sanitizeSVGText(await file.text());
    if (!result.valid) throw new Error(result.error);
    blob = new Blob([result.sanitized], { type: 'image/svg+xml' });
  } else {
    // Some browsers (WebKit) fail to structured-clone a File object into
    // IndexedDB; storing a plain Blob copy avoids that failure everywhere.
    blob = new Blob([file], { type: file.type });
  }

  // Dimension limit + auto-downscale only applies to real raster images — SVG has no
  // fixed pixel grid to decompression-bomb, and both steps require a real browser image
  // decoder that this project's Node-based unit test environment doesn't provide, so a
  // failure here is treated as "couldn't determine dimensions" and never blocks the
  // upload (fails open, same philosophy as the export-preflight engine).
  let resized = false;
  let dimensions = null;
  if (kind === 'image' && validation.extension !== 'svg') {
    try {
      dimensions = await readImageDimensions(blob);
      if (Math.max(dimensions.width, dimensions.height) > MAX_IMAGE_DIMENSION_PX) {
        throw new Error(`${file.name} is ${dimensions.width}×${dimensions.height}px, which exceeds the ${MAX_IMAGE_DIMENSION_PX}px maximum image dimension.`);
      }
      const target = computeResizeTarget(dimensions.width, dimensions.height);
      if (target) {
        blob = await resizeImageBlob(blob, target.width, target.height, validation.mimeType);
        resized = true;
        dimensions = target;
      }
    } catch (error) {
      // Only the explicit over-the-hard-limit case above should ever block the upload;
      // any other failure (decoder unavailable, resize failed) falls through silently —
      // `dimensions` simply stays whatever was last determined (or null).
      if (error.message.includes('maximum image dimension')) throw error;
    }
  }

  const now = new Date().toISOString();
  return {
    id: options.id || createId(),
    schemaVersion: MEDIA_SCHEMA_VERSION,
    name: file.name,
    sanitizedName: sanitizeAssetFilename(file.name),
    mimeType: resized ? (validation.mimeType === 'image/gif' ? 'image/png' : validation.mimeType) : validation.mimeType,
    size: blob.size,
    createdAt: now,
    kind,
    duration: Number.isFinite(options.duration) ? options.duration : null,
    dimensions,
    altText: '',
    decorative: false,
    caption: '',
    transcript: '',
    resized,
    contentHash: await computeFileHash(blob),
    blob
  };
}

export function createMediaReference(record) {
  return {
    source: 'upload',
    mediaId: record.id,
    schemaVersion: MEDIA_SCHEMA_VERSION,
    kind: record.kind,
    name: record.name,
    mimeType: record.mimeType,
    size: record.size,
    createdAt: record.createdAt,
    duration: Number.isFinite(record.duration) ? record.duration : null
  };
}

export function isMediaReference(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && value.source === 'upload' && typeof value.mediaId === 'string' && Boolean(value.mediaId)
    && value.schemaVersion === MEDIA_SCHEMA_VERSION
    && ['image', 'audio', 'video', 'captions'].includes(value.kind)
    && typeof value.name === 'string' && Boolean(value.name.trim())
    && typeof value.mimeType === 'string' && Boolean(value.mimeType)
    && Number.isFinite(value.size) && value.size >= 0
    && typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
    && [...MEDIA_REFERENCE_KEYS].every(key => value[key] === undefined || value[key] === null
      || ['string', 'number'].includes(typeof value[key]));
}

export function collectMediaReferences(value, found = new Map()) {
  if (isMediaReference(value)) {
    found.set(value.mediaId, value);
    return [...found.values()];
  }
  if (Array.isArray(value)) value.forEach(entry => collectMediaReferences(entry, found));
  else if (value && typeof value === 'object') Object.values(value).forEach(entry => collectMediaReferences(entry, found));
  return [...found.values()];
}

export function sanitizeAssetFilename(name, fallback = 'asset') {
  const source = String(name || fallback).trim();
  const extension = getFileExtension(source);
  const stem = (extension ? source.slice(0, -(extension.length + 1)) : source)
    .normalize('NFKD').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || fallback;
  return extension ? `${stem}.${extension}` : stem;
}

export async function blobToDataURL(blob) {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result)));
      reader.addEventListener('error', () => reject(reader.error || new Error('Could not read media data.')));
      reader.readAsDataURL(blob);
    });
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

export function validateMediaAccessibility(config, componentId) {
  const warnings = [];
  const items = Array.isArray(config?.items) ? config.items : [];
  const imageWarning = (item, label, sourceKey = 'content', altKey = 'altText', decorativeKey = 'decorative') => {
    if (!item?.[sourceKey]) return;
    if (!item[decorativeKey] && !String(item[altKey] || '').trim()) warnings.push(`${label} needs alternative text or must be marked decorative.`);
  };

  if (componentId === 'hotspots' && config.backgroundImage && !config.backgroundDecorative && !String(config.backgroundAltText || '').trim()) {
    warnings.push('The hotspot background needs alternative text or must be marked decorative.');
  }
  if (componentId === 'profile-cards') items.forEach((item, index) => imageWarning(item, `Profile image ${index + 1}`, 'image'));
  if (componentId === 'image-gallery') items.forEach((item, index) => imageWarning(item, `Gallery image ${index + 1}`));
  if (['flip-cards', 'info-grid', 'audio-player'].includes(componentId)) {
    items.forEach((item, index) => imageWarning(item, `Custom icon or image ${index + 1}`, 'iconImage', 'iconAltText', 'iconDecorative'));
  }
  if (componentId === 'audio-player' && items.some(item => item.content && !String(item.transcript || '').replace(/<[^>]*>/g, '').trim())) {
    warnings.push('Instructional audio should include a transcript.');
  }
  if (componentId === 'video-frame' && items.some(item => item.content
    && !item.captionsUrl && !String(item.transcript || '').replace(/<[^>]*>/g, '').trim())) {
    warnings.push('Video should include captions or a transcript.');
  }
  return warnings;
}
