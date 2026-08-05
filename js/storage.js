import { isMediaReference } from './media.js';
import {
  BUILT_IN_THEMES, DEFAULT_THEME_ID, getBuiltInTheme, normalizeComponentOverrides, validateTheme
} from './themes.js';
import { DEFAULT_DEVICE_MODE, isValidDeviceMode } from './device-preview.js';

export const SCHEMA_VERSION = 2;

export const KEYS = {
  projects: 'rise-builder-projects-v1',
  draft: 'rise-builder-draft-v1',
  favorites: 'rise-builder-favorites-v1',
  settings: 'rise-builder-settings-v1',
  uiTheme: 'rise-builder-theme',
  customThemes: 'rise-builder-custom-themes-v1',
  defaultTheme: 'rise-builder-default-theme-v1',
  previewDevice: 'rise-builder-preview-device-v1'
};

const DEFAULT_SETTINGS = {
  defaultFont: 'Lato',
  exportFormat: 'web',
  autosave: true,
  aiEnabled: false,
  mediaLimitsMb: { image: 10, audio: 30, video: 100, svg: 2 },
  // Empty string = unconfigured: exported components post/accept completion messages to/from
  // any origin ('*'), and accept them from any origin — documented default, see
  // docs/COMPLETION-INTEGRATION.md "Why the default targetOrigin is '*'". When set, this
  // exact origin is required for every inbound message and used as the outbound targetOrigin.
  completionParentOrigin: ''
};

export const MEDIA_LIMIT_BOUNDS_MB = {
  image: [1, 50],
  audio: [1, 150],
  video: [1, 500],
  svg: [1, 20]
};

function normalizeMediaLimitsMb(value) {
  const source = isObject(value) ? value : {};
  return Object.fromEntries(Object.entries(MEDIA_LIMIT_BOUNDS_MB).map(([key, [min, max]]) => {
    const num = Number(source[key]);
    const valid = Number.isFinite(num) && num >= min && num <= max;
    return [key, valid ? Math.round(num) : DEFAULT_SETTINGS.mediaLimitsMb[key]];
  }));
}

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isPlainObject = value => isObject(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const clone = value => JSON.parse(JSON.stringify(value));
const validDate = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new Error(error?.name === 'QuotaExceededError'
      ? 'Local storage is full. Export or delete projects and try again.'
      : 'This browser could not save data locally.');
  }
}

export function createProjectId() {
  return globalThis.crypto?.randomUUID?.() || `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Blocked outright regardless of the general key-name pattern below: these are the
// property names a downstream `target[key] = value`-shaped merge (present or future)
// could use to repoint an object's prototype rather than set a normal data field.
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isSafeProjectValue(value, depth = 0) {
  if (depth > 12) return false;
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.length <= 1000 && value.every(entry => isSafeProjectValue(entry, depth + 1));
  if (!isPlainObject(value)) return false;
  if ('objectUrl' in value || 'blob' in value) return false;
  if (value.source === 'upload' && !isMediaReference(value)) return false;
  return Object.entries(value).length <= 100 && Object.entries(value).every(([key, entry]) =>
    /^[a-zA-Z0-9_-]+$/.test(key) && !DANGEROUS_KEYS.has(key) && isSafeProjectValue(entry, depth + 1));
}

const ORIGIN_PATTERN = /^https?:\/\/[^/]+$/i;

function normalizeCompletionParentOrigin(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return ORIGIN_PATTERN.test(trimmed) ? trimmed : DEFAULT_SETTINGS.completionParentOrigin;
}

export function normalizeSettings(value) {
  if (!isObject(value)) return { ...DEFAULT_SETTINGS };
  const allowedFonts = ['Merriweather', 'Lato', 'Roboto', 'Montserrat', 'Open Sans'];
  return {
    defaultFont: allowedFonts.includes(value.defaultFont) ? value.defaultFont : DEFAULT_SETTINGS.defaultFont,
    exportFormat: ['web', 'zip', 'scorm'].includes(value.exportFormat) ? value.exportFormat : DEFAULT_SETTINGS.exportFormat,
    autosave: typeof value.autosave === 'boolean' ? value.autosave : DEFAULT_SETTINGS.autosave,
    aiEnabled: typeof value.aiEnabled === 'boolean' ? value.aiEnabled : DEFAULT_SETTINGS.aiEnabled,
    mediaLimitsMb: normalizeMediaLimitsMb(value.mediaLimitsMb),
    completionParentOrigin: normalizeCompletionParentOrigin(value.completionParentOrigin)
  };
}

function migrateProject(value) {
  if (!isObject(value)) throw new Error('Project data must be a JSON object.');
  const version = value.schemaVersion ?? 0;
  if (!Number.isInteger(version) || version < 0) throw new Error('Invalid project schemaVersion.');
  if (version > SCHEMA_VERSION) throw new Error(`This project uses schema version ${version}, but this builder supports version ${SCHEMA_VERSION}.`);

  let project = value;
  if (version === 0) {
    project = {
      ...value,
      schemaVersion: 1,
      name: value.name || value.title,
      settings: normalizeSettings(value.settings)
    };
  }
  if (project.schemaVersion === 1) {
    const config = isObject(project.config) ? project.config : {};
    const overrides = normalizeComponentOverrides({
      primary: config.colorPrimary,
      accent: config.colorAccent,
      background: config.colorBg,
      text: config.colorText,
      borderRadius: Number(config.borderRadius),
      shadow: config.shadowDepth,
      fontFamily: project.settings?.defaultFont
    });
    return {
      ...project,
      schemaVersion: 2,
      uiTheme: project.theme === 'dark' ? 'dark' : 'light',
      theme: getBuiltInTheme(DEFAULT_THEME_ID),
      componentOverrides: overrides
    };
  }
  return project;
}

export function validateProject(value) {
  try {
    const project = migrateProject(value);
    if (typeof project.id !== 'string' || !project.id.trim()) throw new Error('Project id is missing.');
    if (typeof project.name !== 'string' || !project.name.trim()) throw new Error('Project name is missing.');
    if (typeof project.componentId !== 'string' || !project.componentId.trim()) throw new Error('Project componentId is missing.');
    if (!validDate(project.createdAt) || !validDate(project.updatedAt)) throw new Error('Project dates are invalid.');
    if (!isObject(project.config) || !Array.isArray(project.config.items)) throw new Error('Project config is invalid.');
    if (!project.config.items.every(isObject)) throw new Error('Project items must be objects.');
    const stringFields = ['blockTitle', 'blockHeadline', 'blockDesc', 'colorPrimary', 'colorAccent', 'colorBg',
      'colorText', 'borderRadius', 'shadowDepth', 'iconStyle', 'completionMsg'];
    if (stringFields.some(field => typeof project.config[field] !== 'string')) throw new Error('Project config contains invalid text values.');
    const booleanFields = ['borderOutline', 'accordionMulti', 'accordionAnimation', 'trackCompletion'];
    if (booleanFields.some(field => typeof project.config[field] !== 'boolean')) throw new Error('Project config contains invalid behavior values.');
    if (!['colorPrimary', 'colorAccent', 'colorBg', 'colorText'].every(field => /^#[0-9a-f]{6}$/i.test(project.config[field]))) {
      throw new Error('Project colors must use six-digit hexadecimal values.');
    }
    if (!/^\d{1,3}$/.test(project.config.borderRadius)) throw new Error('Project border radius is invalid.');
    if (!['none', 'soft', 'medium', 'premium'].includes(project.config.shadowDepth)) throw new Error('Project shadow setting is invalid.');
    if (!['chevron', 'plus-minus', 'arrow'].includes(project.config.iconStyle)) throw new Error('Project icon setting is invalid.');
    if (!isSafeProjectValue(project.config)) {
      throw new Error('Project item data is invalid.');
    }
    const themeResult = validateTheme(project.theme);
    if (!themeResult.valid) throw new Error(`Project theme is invalid: ${themeResult.error}`);
    if (!['light', 'dark'].includes(project.uiTheme)) throw new Error('Project UI theme is invalid.');
    const componentOverrides = normalizeComponentOverrides(project.componentOverrides);

    return {
      valid: true,
      project: {
        id: project.id.trim(),
        schemaVersion: SCHEMA_VERSION,
        name: project.name.trim(),
        componentId: project.componentId.trim(),
        createdAt: new Date(project.createdAt).toISOString(),
        updatedAt: new Date(project.updatedAt).toISOString(),
        config: clone(project.config),
        theme: themeResult.theme,
        componentOverrides,
        uiTheme: project.uiTheme,
        settings: normalizeSettings(project.settings)
      }
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * @param {{ id?: any, name?: any, componentId?: any, createdAt?: any, config?: any,
 *   theme?: any, activeTheme?: any, componentOverrides?: any, uiTheme?: any, settings?: any }} project
 */
export function buildProject({
  id, name, componentId, createdAt, config, theme, activeTheme, componentOverrides, uiTheme, settings
}) {
  const now = new Date().toISOString();
  const themeCandidate = activeTheme || (isObject(theme) ? theme : getBuiltInTheme(DEFAULT_THEME_ID));
  const themeResult = validateTheme(themeCandidate);
  if (!themeResult.valid) throw new Error(themeResult.error);
  return {
    id: id || createProjectId(),
    schemaVersion: SCHEMA_VERSION,
    name: String(name || 'Untitled Project').trim() || 'Untitled Project',
    componentId: componentId || 'accordion',
    createdAt: createdAt || now,
    updatedAt: now,
    config: clone(config),
    theme: themeResult.theme,
    componentOverrides: normalizeComponentOverrides(componentOverrides),
    uiTheme: uiTheme === 'dark' || theme === 'dark' ? 'dark' : 'light',
    settings: normalizeSettings(settings)
  };
}

export function loadProjects() {
  const stored = readJson(KEYS.projects, []);
  if (!Array.isArray(stored)) return [];
  return stored.map(validateProject).filter(result => result.valid).map(result => result.project)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function getProject(id) {
  return loadProjects().find(project => project.id === id) || null;
}

export function saveProject(project) {
  const result = validateProject(project);
  if (!result.valid) throw new Error(result.error);
  const projects = loadProjects();
  const index = projects.findIndex(item => item.id === result.project.id);
  if (index >= 0) projects[index] = result.project;
  else projects.push(result.project);
  writeJson(KEYS.projects, projects);
  return result.project;
}

export function renameProject(id, name) {
  const project = getProject(id);
  if (!project) throw new Error('Project not found.');
  return saveProject({ ...project, name: String(name || '').trim(), updatedAt: new Date().toISOString() });
}

export function duplicateProject(id) {
  const project = getProject(id);
  if (!project) throw new Error('Project not found.');
  return saveProject(buildProject({ ...project, id: null, createdAt: null, name: `${project.name} Copy` }));
}

export function deleteProject(id) {
  const projects = loadProjects();
  const filtered = projects.filter(project => project.id !== id);
  if (filtered.length === projects.length) return false;
  writeJson(KEYS.projects, filtered);
  return true;
}

export function importProjectJson(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('The selected file is not valid JSON.'); }
  const result = validateProject(parsed);
  if (!result.valid) throw new Error(result.error);
  const imported = buildProject({ ...result.project, id: null, createdAt: null, name: result.project.name });
  return saveProject(imported);
}

export function saveDraft(project) { writeJson(KEYS.draft, project); }
export function loadDraft() {
  const result = validateProject(readJson(KEYS.draft, null));
  return result.valid ? result.project : null;
}
export function clearDraft() {
  try { localStorage.removeItem(KEYS.draft); } catch { /* Storage may be unavailable in privacy mode. */ }
}

export function loadUiTheme() {
  try { return localStorage.getItem(KEYS.uiTheme) === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}
export function saveUiTheme(theme) {
  try { localStorage.setItem(KEYS.uiTheme, theme); }
  catch { throw new Error('The builder interface theme could not be saved locally.'); }
}

// Backwards-compatible aliases for integrations that used these names for the builder UI mode.
export const loadTheme = loadUiTheme;
export const saveTheme = saveUiTheme;

export function loadCustomThemes() {
  const stored = readJson(KEYS.customThemes, []);
  if (!Array.isArray(stored)) return [];
  return stored.map(validateTheme).filter(result => result.valid && !result.theme.isBuiltIn && !result.theme.isLocked)
    .map(result => result.theme).sort((a, b) => a.name.localeCompare(b.name));
}

export function saveCustomTheme(theme) {
  const result = validateTheme(theme);
  if (!result.valid) throw new Error(result.error);
  if (result.theme.isBuiltIn || result.theme.isLocked) throw new Error('Built-in and locked themes cannot be saved as custom themes.');
  if (BUILT_IN_THEMES.some(item => item.id === result.theme.id)) throw new Error('Custom theme id conflicts with a built-in theme.');
  const themes = loadCustomThemes();
  const index = themes.findIndex(item => item.id === result.theme.id);
  if (index >= 0) themes[index] = result.theme;
  else themes.push(result.theme);
  writeJson(KEYS.customThemes, themes);
  return result.theme;
}

export function deleteCustomTheme(id) {
  const themes = loadCustomThemes();
  const next = themes.filter(theme => theme.id !== id);
  if (next.length === themes.length) return false;
  writeJson(KEYS.customThemes, next);
  if (loadDefaultThemeId() === id) saveDefaultThemeId(DEFAULT_THEME_ID);
  return true;
}

export function loadDefaultThemeId() {
  try {
    const id = localStorage.getItem(KEYS.defaultTheme);
    const exists = id && [...BUILT_IN_THEMES, ...loadCustomThemes()].some(theme => theme.id === id);
    return exists ? id : DEFAULT_THEME_ID;
  } catch { return DEFAULT_THEME_ID; }
}

export function saveDefaultThemeId(id) {
  const exists = [...BUILT_IN_THEMES, ...loadCustomThemes()].some(theme => theme.id === id);
  if (!exists) throw new Error('Default theme was not found.');
  try { localStorage.setItem(KEYS.defaultTheme, id); }
  catch { throw new Error('The default theme could not be saved locally.'); }
  return id;
}

export function loadFavorites() {
  const value = readJson(KEYS.favorites, []);
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
}
export function saveFavorites(favorites) { writeJson(KEYS.favorites, [...favorites]); }

export function loadPreviewDevice() {
  const value = readJson(KEYS.previewDevice, DEFAULT_DEVICE_MODE);
  return isValidDeviceMode(value) ? value : DEFAULT_DEVICE_MODE;
}
export function savePreviewDevice(mode) {
  writeJson(KEYS.previewDevice, isValidDeviceMode(mode) ? mode : DEFAULT_DEVICE_MODE);
}

export function loadSettings() { return normalizeSettings(readJson(KEYS.settings, DEFAULT_SETTINGS)); }
export function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  writeJson(KEYS.settings, normalized);
  return normalized;
}
