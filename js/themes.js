export const THEME_SCHEMA_VERSION = 1;

export const ALLOWED_THEME_FONTS = Object.freeze([
  'Merriweather', 'Lato', 'Roboto', 'Montserrat', 'Open Sans'
]);
export const ALLOWED_THEME_SHADOWS = Object.freeze(['none', 'soft', 'medium', 'premium']);
export const ALLOWED_SPACING_DENSITIES = Object.freeze(['compact', 'comfortable', 'spacious']);

const COLOR_TOKEN_KEYS = Object.freeze([
  'primary', 'primaryHover', 'accent', 'background', 'surface', 'text', 'mutedText',
  'border', 'success', 'warning', 'danger'
]);
const TOKEN_KEYS = Object.freeze([
  'fontFamily', 'headingFontFamily', ...COLOR_TOKEN_KEYS, 'borderRadius', 'buttonRadius',
  'shadow', 'spacingDensity', 'animationSpeed'
]);
export const COMPONENT_OVERRIDE_KEYS = Object.freeze([
  'primary', 'accent', 'background', 'text', 'borderRadius', 'shadow', 'fontFamily'
]);

const BUILT_IN_DATE = '2026-01-01T00:00:00.000Z';
const clone = value => JSON.parse(JSON.stringify(value));
const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isHex = value => /^#[0-9a-f]{6}$/i.test(String(value || ''));
const validDate = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const makeId = prefix => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function preset(id, name, description, organization, tokens, options = {}) {
  return {
    id,
    schemaVersion: THEME_SCHEMA_VERSION,
    name,
    description,
    organization,
    isBuiltIn: true,
    isLocked: Boolean(options.isLocked),
    createdAt: BUILT_IN_DATE,
    updatedAt: BUILT_IN_DATE,
    tokens
  };
}

export const BUILT_IN_THEMES = Object.freeze([
  preset('aptara-corporate', 'Aptara Corporate', 'A polished corporate palette for professional learning programs.', 'Aptara', {
    fontFamily: 'Lato', headingFontFamily: 'Montserrat', primary: '#175CD3', primaryHover: '#1849A9', accent: '#F79009',
    background: '#F8FAFC', surface: '#FFFFFF', text: '#101828', mutedText: '#475467', border: '#D0D5DD',
    success: '#067647', warning: '#B54708', danger: '#B42318', borderRadius: 10, buttonRadius: 8,
    shadow: 'soft', spacingDensity: 'comfortable', animationSpeed: 200
  }, { isLocked: true }),
  preset('aptara-ai-university', 'Aptara AI University', 'A modern technology palette for AI learning and innovation programs.', 'Aptara', {
    fontFamily: 'Roboto', headingFontFamily: 'Montserrat', primary: '#5B5BD6', primaryHover: '#4747B8', accent: '#16B8A6',
    background: '#F5F7FF', surface: '#FFFFFF', text: '#171A2B', mutedText: '#51576D', border: '#C9CDE3',
    success: '#087F5B', warning: '#A15C00', danger: '#C92A2A', borderRadius: 14, buttonRadius: 10,
    shadow: 'medium', spacingDensity: 'comfortable', animationSpeed: 220
  }, { isLocked: true }),
  preset('clean-light', 'Clean Light', 'A neutral, flexible preset for general-purpose course content.', 'Rise Component Builder', {
    fontFamily: 'Lato', headingFontFamily: 'Lato', primary: '#2563EB', primaryHover: '#1D4ED8', accent: '#F59E0B',
    background: '#FFFFFF', surface: '#FFFFFF', text: '#1F2937', mutedText: '#505863', border: '#DBDDDF',
    success: '#10B981', warning: '#A16207', danger: '#EF4444', borderRadius: 12, buttonRadius: 8,
    shadow: 'soft', spacingDensity: 'comfortable', animationSpeed: 200
  }),
  preset('dark-technology', 'Dark Technology', 'A dark, high-energy preset for technical and cyber learning.', 'Rise Component Builder', {
    fontFamily: 'Roboto', headingFontFamily: 'Montserrat', primary: '#60A5FA', primaryHover: '#93C5FD', accent: '#2DD4BF',
    background: '#0B1120', surface: '#111827', text: '#F8FAFC', mutedText: '#CBD5E1', border: '#334155',
    success: '#34D399', warning: '#FBBF24', danger: '#F87171', borderRadius: 10, buttonRadius: 8,
    shadow: 'premium', spacingDensity: 'comfortable', animationSpeed: 180
  }),
  preset('accessibility-high-contrast', 'Accessibility High Contrast', 'A strong-contrast preset designed for clear visual separation.', 'Rise Component Builder', {
    fontFamily: 'Open Sans', headingFontFamily: 'Open Sans', primary: '#003B73', primaryHover: '#00264A', accent: '#7A3E00',
    background: '#FFFFFF', surface: '#FFFFFF', text: '#000000', mutedText: '#333333', border: '#000000',
    success: '#006B3C', warning: '#7A3E00', danger: '#A40000', borderRadius: 4, buttonRadius: 4,
    shadow: 'none', spacingDensity: 'spacious', animationSpeed: 0
  }),
  preset('healthcare', 'Healthcare', 'A calm clinical palette for healthcare and patient education.', 'Rise Component Builder', {
    fontFamily: 'Open Sans', headingFontFamily: 'Lato', primary: '#086F83', primaryHover: '#075B6B', accent: '#8A4F00',
    background: '#F6FBFC', surface: '#FFFFFF', text: '#17333A', mutedText: '#46636A', border: '#B9D7DC',
    success: '#087F5B', warning: '#9A6700', danger: '#B42318', borderRadius: 12, buttonRadius: 10,
    shadow: 'soft', spacingDensity: 'spacious', animationSpeed: 180
  }),
  preset('financial-services', 'Financial Services', 'A measured, trustworthy palette for finance and compliance learning.', 'Rise Component Builder', {
    fontFamily: 'Lato', headingFontFamily: 'Merriweather', primary: '#163A5F', primaryHover: '#0E2B49', accent: '#8A5D00',
    background: '#F7F8FA', surface: '#FFFFFF', text: '#172B3A', mutedText: '#4B5F6D', border: '#C8D0D8',
    success: '#176B45', warning: '#8A5D00', danger: '#A12828', borderRadius: 8, buttonRadius: 6,
    shadow: 'soft', spacingDensity: 'comfortable', animationSpeed: 160
  })
]);

export const DEFAULT_THEME_ID = 'clean-light';

export function getBuiltInTheme(id = DEFAULT_THEME_ID) {
  return clone(BUILT_IN_THEMES.find(theme => theme.id === id) || BUILT_IN_THEMES.find(theme => theme.id === DEFAULT_THEME_ID));
}

export function validateTheme(value) {
  try {
    if (!isObject(value)) throw new Error('Theme data must be a JSON object.');
    if (value.schemaVersion !== THEME_SCHEMA_VERSION) {
      throw new Error(`Unsupported theme schemaVersion. This builder supports version ${THEME_SCHEMA_VERSION}.`);
    }
    for (const field of ['id', 'name', 'description', 'organization']) {
      if (typeof value[field] !== 'string' || !value[field].trim()) throw new Error(`Theme ${field} is required.`);
    }
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/i.test(value.id)) throw new Error('Theme id is invalid.');
    if (typeof value.isBuiltIn !== 'boolean' || typeof value.isLocked !== 'boolean') throw new Error('Theme lock flags are invalid.');
    if (!validDate(value.createdAt) || !validDate(value.updatedAt)) throw new Error('Theme dates are invalid.');
    if (!isObject(value.tokens)) throw new Error('Theme tokens are required.');
    for (const key of TOKEN_KEYS) if (!(key in value.tokens)) throw new Error(`Theme token ${key} is required.`);
    for (const key of COLOR_TOKEN_KEYS) if (!isHex(value.tokens[key])) throw new Error(`Theme token ${key} must be a six-digit hex color.`);
    if (!ALLOWED_THEME_FONTS.includes(value.tokens.fontFamily) || !ALLOWED_THEME_FONTS.includes(value.tokens.headingFontFamily)) {
      throw new Error('Theme font is not supported.');
    }
    if (!Number.isInteger(value.tokens.borderRadius) || value.tokens.borderRadius < 0 || value.tokens.borderRadius > 32) {
      throw new Error('Theme borderRadius must be an integer from 0 to 32.');
    }
    if (!Number.isInteger(value.tokens.buttonRadius) || value.tokens.buttonRadius < 0 || value.tokens.buttonRadius > 32) {
      throw new Error('Theme buttonRadius must be an integer from 0 to 32.');
    }
    if (!ALLOWED_THEME_SHADOWS.includes(value.tokens.shadow)) throw new Error('Theme shadow value is invalid.');
    if (!ALLOWED_SPACING_DENSITIES.includes(value.tokens.spacingDensity)) throw new Error('Theme spacingDensity value is invalid.');
    if (!Number.isInteger(value.tokens.animationSpeed) || value.tokens.animationSpeed < 0 || value.tokens.animationSpeed > 2000) {
      throw new Error('Theme animationSpeed must be an integer from 0 to 2000 milliseconds.');
    }
    const extraTokens = Object.keys(value.tokens).filter(key => !TOKEN_KEYS.includes(key));
    if (extraTokens.length) throw new Error(`Unsupported theme token: ${extraTokens[0]}.`);
    return {
      valid: true,
      theme: {
        id: value.id.trim(), schemaVersion: THEME_SCHEMA_VERSION, name: value.name.trim(),
        description: value.description.trim(), organization: value.organization.trim(),
        isBuiltIn: Boolean(value.isBuiltIn), isLocked: Boolean(value.isLocked),
        createdAt: new Date(value.createdAt).toISOString(), updatedAt: new Date(value.updatedAt).toISOString(),
        tokens: Object.fromEntries(TOKEN_KEYS.map(key => [key,
          COLOR_TOKEN_KEYS.includes(key) ? value.tokens[key].toUpperCase() : value.tokens[key]
        ]))
      }
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

export function importThemeJson(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('The selected file is not valid JSON.'); }
  const result = validateTheme(parsed);
  if (!result.valid) throw new Error(result.error);
  const now = new Date().toISOString();
  return {
    ...result.theme, id: makeId('theme'), name: `${result.theme.name} Imported`, isBuiltIn: false, isLocked: false,
    createdAt: now, updatedAt: now
  };
}

/**
 * @param {{ name?: any, description?: string, organization?: string, tokens?: any, id?: any }} [options]
 */
export function createCustomTheme({ name, description = 'Custom component theme.', organization = 'Custom', tokens, id } = {}) {
  const now = new Date().toISOString();
  const candidate = {
    id: id || makeId('theme'), schemaVersion: THEME_SCHEMA_VERSION, name: String(name || 'Custom Theme'),
    description: String(description), organization: String(organization), isBuiltIn: false, isLocked: false,
    createdAt: now, updatedAt: now, tokens: clone(tokens || getBuiltInTheme().tokens)
  };
  const result = validateTheme(candidate);
  if (!result.valid) throw new Error(result.error);
  return result.theme;
}

export function duplicateTheme(theme, name = `${theme?.name || 'Theme'} Copy`) {
  const result = validateTheme(theme);
  if (!result.valid) throw new Error(result.error);
  return createCustomTheme({ name, description: result.theme.description, organization: result.theme.organization, tokens: result.theme.tokens });
}

export function renameCustomTheme(theme, name) {
  const result = validateTheme(theme);
  if (!result.valid) throw new Error(result.error);
  if (result.theme.isBuiltIn || result.theme.isLocked) throw new Error('Built-in and locked themes must be duplicated before editing.');
  if (!String(name || '').trim()) throw new Error('Enter a theme name.');
  return { ...result.theme, name: String(name).trim(), updatedAt: new Date().toISOString() };
}

export function normalizeComponentOverrides(value) {
  if (!isObject(value)) return {};
  const result = {};
  for (const key of COMPONENT_OVERRIDE_KEYS) {
    const entry = value[key];
    if (entry === undefined || entry === null || entry === '') continue;
    if (['primary', 'accent', 'background', 'text'].includes(key) && isHex(entry)) result[key] = String(entry).toUpperCase();
    else if (key === 'borderRadius' && Number.isInteger(Number(entry)) && Number(entry) >= 0 && Number(entry) <= 32) result[key] = Number(entry);
    else if (key === 'shadow' && ALLOWED_THEME_SHADOWS.includes(entry)) result[key] = entry;
    else if (key === 'fontFamily' && ALLOWED_THEME_FONTS.includes(entry)) result[key] = entry;
  }
  return result;
}

export function resolveThemeTokens(theme, overrides = {}) {
  const result = validateTheme(theme);
  const base = result.valid ? result.theme : getBuiltInTheme();
  const safeOverrides = normalizeComponentOverrides(overrides);
  const tokens = { ...base.tokens, ...safeOverrides };
  if (safeOverrides.background) tokens.surface = safeOverrides.background;
  return tokens;
}

export function applyThemeToConfig(config, theme, overrides = {}) {
  const tokens = resolveThemeTokens(theme, overrides);
  return {
    ...config,
    colorPrimary: tokens.primary,
    colorAccent: tokens.accent,
    colorBg: tokens.background,
    colorText: tokens.text,
    borderRadius: String(tokens.borderRadius),
    shadowDepth: tokens.shadow,
    themeTokens: clone(tokens)
  };
}

export function createThemeFromCurrentStyling(name, theme, overrides = {}) {
  return createCustomTheme({
    name,
    description: 'Saved from the current component styling.',
    organization: 'Custom',
    tokens: resolveThemeTokens(theme, overrides)
  });
}

function hexRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(hex) {
  const channels = hexRgb(hex).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground, background) {
  if (!isHex(foreground) || !isHex(background)) return 1;
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function contrastResult(label, foregroundToken, backgroundToken, tokens) {
  const ratio = contrastRatio(tokens[foregroundToken], tokens[backgroundToken]);
  const blackRatio = contrastRatio('#000000', tokens[backgroundToken]);
  const whiteRatio = contrastRatio('#FFFFFF', tokens[backgroundToken]);
  return {
    label, foregroundToken, backgroundToken, ratio: Number(ratio.toFixed(2)),
    normalText: ratio >= 4.5, largeText: ratio >= 3,
    suggested: ratio >= 4.5 ? null : (blackRatio >= whiteRatio ? '#000000' : '#FFFFFF')
  };
}

export function validateThemeContrast(theme) {
  const result = validateTheme(theme);
  if (!result.valid) throw new Error(result.error);
  const tokens = result.theme.tokens;
  return [
    contrastResult('Primary text on background', 'text', 'background', tokens),
    contrastResult('Muted text on background', 'mutedText', 'background', tokens),
    contrastResult('Button text on primary', 'surface', 'primary', tokens),
    contrastResult('Accent text on surface', 'accent', 'surface', tokens),
    contrastResult('Success feedback on background', 'success', 'background', tokens),
    contrastResult('Warning feedback on background', 'warning', 'background', tokens),
    contrastResult('Danger feedback on background', 'danger', 'background', tokens)
  ];
}

export function serializeTheme(theme) {
  const result = validateTheme(theme);
  if (!result.valid) throw new Error(result.error);
  return JSON.stringify(result.theme, null, 2);
}
