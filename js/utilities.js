export function toRgba(color, alpha, fallback) {
  const value = (color || '').trim();
  const shortHex = /^#([0-9a-f]{3})$/i.exec(value);
  const longHex = /^#([0-9a-f]{6})$/i.exec(value);
  let hex = longHex ? longHex[1] : null;
  if (!hex && shortHex) hex = shortHex[1].split('').map(char => char + char).join('');
  if (!hex) return fallback || `rgba(31, 41, 55, ${alpha})`;
  const number = parseInt(hex, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

export function slugify(value, fallback = 'rise-component') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback;
}

export async function copyTextToClipboard(value, options = {}) {
  const text = String(value ?? '');
  if (!text) throw new Error('There is no code to copy.');

  const navigatorObject = options.navigatorObject ?? globalThis.navigator;
  const documentObject = options.documentObject ?? globalThis.document;

  if (navigatorObject?.clipboard?.writeText) {
    try {
      await navigatorObject.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API access can be denied outside HTTPS/localhost. Keep the
      // current click gesture active and try the broadly supported fallback.
    }
  }

  if (!documentObject?.body || typeof documentObject.execCommand !== 'function') {
    throw new Error('Clipboard access is unavailable in this browser.');
  }

  const activeElement = documentObject.activeElement;
  const textarea = documentObject.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  documentObject.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = documentObject.execCommand('copy');
  } finally {
    textarea.remove();
    activeElement?.focus?.();
  }

  if (!copied) throw new Error('The browser could not copy the code. Select the code and copy it manually.');
  return true;
}

export function generateHtmlFragment(fullHtml) {
  const styleMatch = fullHtml.match(/<style>([\s\S]*?)<\/style>/i);
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const styleBlock = styleMatch ? `<style>\n${styleMatch[1].trim()}\n</style>` : '';
  const bodyBlock = bodyMatch ? bodyMatch[1].trim() : fullHtml;
  return [styleBlock, bodyBlock].filter(Boolean).join('\n\n');
}

export function escapeSrcdoc(html) {
  return escapeAttribute(html);
}

export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const escapeHtml = escapeHTML;

export function escapeAttribute(value) {
  return escapeHTML(value)
    .replace(/`/g, '&#96;')
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;')
    .replace(/\t/g, '&#9;');
}

export function escapeJavaScriptString(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/"/g, '\\u0022')
    .replace(/'/g, '\\u0027')
    .replace(/`/g, '\\u0060')
    .replace(/\$/g, '\\u0024')
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026');
}

const localBlobURLs = new Set();

export function registerLocalBlobURL(url) {
  if (typeof url === 'string' && url.startsWith('blob:')) localBlobURLs.add(url);
  return url;
}

export function revokeLocalBlobURL(url) {
  localBlobURLs.delete(url);
  URL.revokeObjectURL(url);
}

export function sanitizeURL(value, options = {}) {
  const { allowDataImage = false, allowBlob = false, allowRelative = false, fallback = '' } = options;
  const input = String(value ?? '').trim();
  if (!input) return fallback;
  const schemeEnd = input.indexOf(':');
  if (schemeEnd < 1) return allowRelative && /^assets\/[a-z0-9._-]+$/i.test(input) ? input : fallback;
  // eslint-disable-next-line no-control-regex -- intentionally strips control characters that could hide a scheme, e.g. a NUL byte inside "javascript:"
  const normalizedScheme = input.slice(0, schemeEnd).replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase();

  if (normalizedScheme === 'javascript' || normalizedScheme === 'vbscript') return fallback;
  if (normalizedScheme === 'data') {
    if (!allowDataImage) return fallback;
    return /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(input) ? input : fallback;
  }
  if (normalizedScheme === 'blob') return allowBlob && localBlobURLs.has(input) ? input : fallback;
  if (!['http', 'https'].includes(normalizedScheme)) return fallback;

  try {
    const url = new URL(input);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

function decodeEntities(value) {
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, '\u00a0')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

export function sanitizeRichText(value) {
  const input = String(value ?? '');
  const allowedSimpleTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li']);
  const tagPattern = /<[^>]*>/g;
  let output = '';
  let cursor = 0;

  for (const match of input.matchAll(tagPattern)) {
    output += escapeHTML(decodeEntities(input.slice(cursor, match.index)));
    const tag = match[0];
    const simple = /^<\s*(\/?)\s*([a-z0-9]+)\s*\/?>$/i.exec(tag);
    if (simple && allowedSimpleTags.has(simple[2].toLowerCase())) {
      const name = simple[2].toLowerCase();
      output += name === 'br' ? '<br>' : `<${simple[1] ? '/' : ''}${name}>`;
    } else {
      const anchor = /^<\s*a\s+href\s*=\s*(["'])(.*?)\1(?:\s+target\s*=\s*(["'])_blank\3)?\s*>$/i.exec(tag);
      if (anchor) {
        const href = sanitizeURL(decodeEntities(anchor[2]));
        output += href ? `<a href="${escapeAttribute(href)}"${anchor[3] ? ' target="_blank" rel="noopener noreferrer"' : ''}>` : '&lt;a&gt;';
      } else if (/^<\s*\/\s*a\s*>$/i.test(tag)) {
        output += '</a>';
      } else {
        output += escapeHTML(decodeEntities(tag));
      }
    }
    cursor = match.index + tag.length;
  }
  output += escapeHTML(decodeEntities(input.slice(cursor)));
  return output;
}

export function serializeForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function sanitizeCSSColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value ?? '')) ? String(value).toUpperCase() : fallback;
}

// Rise embeds a block inside a page that already has its own h1, so the wrapping
// headline defaults to h2 rather than forcing an h1 into the host document's outline.
export const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
export const DEFAULT_HEADING_LEVEL = 'h2';

export function normalizeHeadingLevel(value) {
  return HEADING_LEVELS.includes(value) ? value : DEFAULT_HEADING_LEVEL;
}

export function sanitizeCSSNumber(value, { minimum = 0, maximum = 100, fallback = 0 } = {}) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

export function sanitizePreviewConfig(config, componentId) {
  const result = structuredClone(config);
  result.colorPrimary = sanitizeCSSColor(config.colorPrimary, '#2563EB');
  result.colorAccent = sanitizeCSSColor(config.colorAccent, '#F59E0B');
  result.colorBg = sanitizeCSSColor(config.colorBg, '#FFFFFF');
  result.colorText = sanitizeCSSColor(config.colorText, '#1F2937');
  result.borderRadius = String(sanitizeCSSNumber(config.borderRadius, { minimum: 0, maximum: 100, fallback: 12 }));
  result.shadowDepth = ['none', 'soft', 'medium', 'premium'].includes(config.shadowDepth) ? config.shadowDepth : 'soft';
  result.iconStyle = ['chevron', 'plus-minus', 'arrow'].includes(config.iconStyle) ? config.iconStyle : 'chevron';
  result.blockHeadingLevel = normalizeHeadingLevel(config.blockHeadingLevel);
  result.accordionMulti = Boolean(config.accordionMulti);
  result.accordionAnimation = Boolean(config.accordionAnimation);
  result.trackCompletion = Boolean(config.trackCompletion);

  const contentURLTypes = {
    'button-list': {},
    'audio-player': { allowBlob: true, allowRelative: true },
    'video-frame': { allowBlob: true, allowRelative: true },
    'image-gallery': { allowDataImage: true, allowBlob: true, allowRelative: true }
  };
  result.items = (Array.isArray(config.items) ? config.items : []).map(item => {
    const safeItem = { ...item };
    if (contentURLTypes[componentId]) safeItem.content = sanitizeURL(item.content, contentURLTypes[componentId]);
    else safeItem.content = sanitizeRichText(item.content);
    if (componentId === 'multiple-choice' || componentId === 'multiple-select') safeItem.label = sanitizeRichText(item.label);
    if (componentId === 'fill-blank') safeItem.title = sanitizeRichText(item.title);
    if (item.image !== undefined) safeItem.image = sanitizeURL(item.image, { allowDataImage: true, allowBlob: true, allowRelative: true });
    if (item.iconImage !== undefined) safeItem.iconImage = sanitizeURL(item.iconImage, { allowDataImage: true, allowBlob: true, allowRelative: true });
    if (item.posterImage !== undefined) safeItem.posterImage = sanitizeURL(item.posterImage, { allowDataImage: true, allowBlob: true, allowRelative: true });
    if (item.actionUrl !== undefined) safeItem.actionUrl = sanitizeURL(item.actionUrl);
    if (item.captionsUrl !== undefined) safeItem.captionsUrl = sanitizeURL(item.captionsUrl, { allowBlob: true, allowRelative: true });
    if (item.transcript !== undefined) safeItem.transcript = sanitizeRichText(item.transcript);
    if (item.audioDescription !== undefined) safeItem.audioDescription = sanitizeRichText(item.audioDescription);
    if (item.altText !== undefined) safeItem.altText = String(item.altText || '');
    if (item.iconAltText !== undefined) safeItem.iconAltText = String(item.iconAltText || '');
    if (item.posterAltText !== undefined) safeItem.posterAltText = String(item.posterAltText || '');
    if (item.caption !== undefined) safeItem.caption = String(item.caption || '');
    if (item.decorative !== undefined) safeItem.decorative = Boolean(item.decorative);
    if (item.iconDecorative !== undefined) safeItem.iconDecorative = Boolean(item.iconDecorative);
    if (item.posterDecorative !== undefined) safeItem.posterDecorative = Boolean(item.posterDecorative);
    if (item.imageCrop !== undefined) safeItem.imageCrop = item.imageCrop === 'square' ? 'square' : 'circle';
    if (item.imageFit !== undefined) safeItem.imageFit = item.imageFit === 'contain' ? 'contain' : 'cover';
    if (item.iconFit !== undefined) safeItem.iconFit = item.iconFit === 'cover' ? 'cover' : 'contain';
    if (item.x !== undefined) safeItem.x = String(sanitizeCSSNumber(item.x, { minimum: 0, maximum: 100, fallback: 50 }));
    if (item.y !== undefined) safeItem.y = String(sanitizeCSSNumber(item.y, { minimum: 0, maximum: 100, fallback: 50 }));
    return safeItem;
  });
  result.backgroundImage = sanitizeURL(result.backgroundImage, { allowDataImage: true, allowBlob: true, allowRelative: true });
  result.backgroundAltText = String(result.backgroundAltText || '');
  result.backgroundDecorative = Boolean(result.backgroundDecorative);
  result.backgroundFit = result.backgroundFit === 'cover' ? 'cover' : 'contain';
  result.backgroundFocalX = String(sanitizeCSSNumber(result.backgroundFocalX, { minimum: 0, maximum: 100, fallback: 50 }));
  result.backgroundFocalY = String(sanitizeCSSNumber(result.backgroundFocalY, { minimum: 0, maximum: 100, fallback: 50 }));
  return result;
}
