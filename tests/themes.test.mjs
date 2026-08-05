import { test } from 'vitest';
import assert from 'node:assert/strict';

import {
  applyThemeToConfig, BUILT_IN_THEMES, createCustomTheme, createThemeFromCurrentStyling,
  DEFAULT_THEME_ID, duplicateTheme, importThemeJson, renameCustomTheme, serializeTheme,
  validateTheme, validateThemeContrast
} from '../js/themes.js';
import {
  buildProject, deleteCustomTheme, getProject, loadCustomThemes, loadDefaultThemeId,
  saveCustomTheme, saveDefaultThemeId, saveProject, saveUiTheme, loadUiTheme
} from '../js/storage.js';
import { generateIframeContent } from '../js/preview.js';
import { toRgba } from '../js/utilities.js';
import * as accordion from '../components/accordion.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
}

function baseConfig() {
  return {
    blockTitle: 'Theme test', blockHeadline: 'Theme output', blockDesc: 'Description',
    colorPrimary: '#2563EB', colorAccent: '#B45309', colorBg: '#FFFFFF', colorText: '#1F2937',
    borderRadius: '12', shadowDepth: 'soft', borderOutline: true, accordionMulti: true,
    accordionAnimation: true, iconStyle: 'chevron', trackCompletion: false,
    completionMsg: 'Complete', items: [{ title: 'Item', content: 'Content' }]
  };
}

test('seven centralized built-in themes validate and a built-in theme applies to legacy style fields', () => {
  assert.equal(BUILT_IN_THEMES.length, 7);
  assert.deepEqual(BUILT_IN_THEMES.map(theme => theme.name), [
    'Aptara Corporate', 'Aptara AI University', 'Clean Light', 'Dark Technology',
    'Accessibility High Contrast', 'Healthcare', 'Financial Services'
  ]);
  BUILT_IN_THEMES.forEach(theme => assert.equal(validateTheme(theme).valid, true));
  const dark = BUILT_IN_THEMES.find(theme => theme.id === 'dark-technology');
  const applied = applyThemeToConfig(baseConfig(), dark);
  assert.equal(applied.colorPrimary, dark.tokens.primary);
  assert.equal(applied.colorBg, dark.tokens.background);
  assert.equal(applied.themeTokens.headingFontFamily, dark.tokens.headingFontFamily);
});

test('locked themes duplicate into editable custom themes and custom themes can be renamed', () => {
  const locked = BUILT_IN_THEMES.find(theme => theme.isLocked);
  const copy = duplicateTheme(locked);
  assert.equal(copy.isBuiltIn, false);
  assert.equal(copy.isLocked, false);
  assert.deepEqual(copy.tokens, locked.tokens);
  assert.equal(renameCustomTheme(copy, 'Team Theme').name, 'Team Theme');
  assert.throws(() => renameCustomTheme(locked, 'No'), /duplicated/i);
});

test('custom theme creation, saving, deletion, and default selection persist locally', () => {
  globalThis.localStorage = memoryStorage();
  const custom = createCustomTheme({ name: 'Saved Theme', tokens: BUILT_IN_THEMES[2].tokens });
  saveCustomTheme(custom);
  assert.equal(loadCustomThemes()[0].name, 'Saved Theme');
  assert.equal(saveDefaultThemeId(custom.id), custom.id);
  assert.equal(loadDefaultThemeId(), custom.id);
  assert.equal(deleteCustomTheme(custom.id), true);
  assert.equal(loadCustomThemes().length, 0);
  assert.equal(loadDefaultThemeId(), DEFAULT_THEME_ID);
  delete globalThis.localStorage;
});

test('saving current styling creates a custom theme with component overrides resolved', () => {
  const theme = BUILT_IN_THEMES[2];
  const custom = createThemeFromCurrentStyling('Current Styling', theme, { primary: '#123456', fontFamily: 'Roboto' });
  assert.equal(custom.tokens.primary, '#123456');
  assert.equal(custom.tokens.fontFamily, 'Roboto');
  assert.equal(custom.isBuiltIn, false);
});

test('component overrides take precedence and resetting them restores active theme values', () => {
  const theme = BUILT_IN_THEMES[5];
  const overridden = applyThemeToConfig(baseConfig(), theme, {
    primary: '#123456', accent: '#654321', background: '#FAFAFA', text: '#111111',
    borderRadius: 20, shadow: 'premium', fontFamily: 'Roboto'
  });
  assert.equal(overridden.colorPrimary, '#123456');
  assert.equal(overridden.themeTokens.surface, '#FAFAFA');
  assert.equal(overridden.themeTokens.fontFamily, 'Roboto');
  const reset = applyThemeToConfig(overridden, theme, {});
  assert.equal(reset.colorPrimary, theme.tokens.primary);
  assert.equal(reset.themeTokens.fontFamily, theme.tokens.fontFamily);
});

test('project persistence retains the active theme snapshot, overrides, and independent UI mode', () => {
  globalThis.localStorage = memoryStorage();
  const theme = BUILT_IN_THEMES[6];
  const project = buildProject({
    name: 'Themed project', componentId: 'accordion', config: applyThemeToConfig(baseConfig(), theme, { accent: '#704F00' }),
    activeTheme: theme, componentOverrides: { accent: '#704F00' }, uiTheme: 'dark',
    settings: { defaultFont: 'Lato', exportFormat: 'web', autosave: true, aiEnabled: false }
  });
  const reopened = getProject(saveProject(project).id);
  assert.equal(reopened.theme.id, theme.id);
  assert.equal(reopened.componentOverrides.accent, '#704F00');
  assert.equal(reopened.uiTheme, 'dark');
  delete globalThis.localStorage;
});

test('theme JSON imports defensively and malformed or unsupported themes are rejected', () => {
  const custom = createCustomTheme({ name: 'Portable', tokens: BUILT_IN_THEMES[2].tokens });
  const imported = importThemeJson(serializeTheme(custom));
  assert.equal(imported.isBuiltIn, false);
  assert.equal(imported.isLocked, false);
  assert.notEqual(imported.id, custom.id);
  assert.throws(() => importThemeJson('{broken'), /not valid JSON/i);
  const invalidColor = { ...custom, tokens: { ...custom.tokens, primary: 'red' } };
  assert.equal(validateTheme(invalidColor).valid, false);
  const future = { ...custom, schemaVersion: 99 };
  assert.match(validateTheme(future).error, /unsupported/i);
});

test('contrast validation reports exact ratios, normal and large text results, and suggestions', () => {
  const accessible = BUILT_IN_THEMES.find(theme => theme.id === 'accessibility-high-contrast');
  const report = validateThemeContrast(accessible);
  assert.equal(report.length, 7);
  assert.ok(report.every(row => typeof row.ratio === 'number' && typeof row.normalText === 'boolean' && typeof row.largeText === 'boolean'));
  const lowContrast = createCustomTheme({
    name: 'Low Contrast', tokens: { ...accessible.tokens, text: '#777777', background: '#777777' }
  });
  const failure = validateThemeContrast(lowContrast).find(row => row.label === 'Primary text on background');
  assert.equal(failure.normalText, false);
  assert.match(failure.suggested, /^#[0-9A-F]{6}$/);
});

test('generated and exported HTML uses the selected component theme while builder dark mode remains independent', () => {
  globalThis.localStorage = memoryStorage();
  saveUiTheme('dark');
  const theme = BUILT_IN_THEMES.find(item => item.id === 'healthcare');
  const state = {
    selectedComponent: { id: 'accordion' }, activeTheme: theme, activeThemeId: theme.id,
    componentOverrides: {}, uiTheme: loadUiTheme(), settings: { defaultFont: 'Merriweather' }, config: baseConfig()
  };
  const html = generateIframeContent(state, { accordion }, toRgba);
  assert.match(html, new RegExp(`--primary: ${theme.tokens.primary}`));
  assert.match(html, new RegExp(`--success: ${theme.tokens.success}`));
  assert.match(html, new RegExp(`--heading-font-family: '${theme.tokens.headingFontFamily}'`));
  assert.equal(state.uiTheme, 'dark');
  assert.ok(!html.includes('data-theme="dark"'));
  delete globalThis.localStorage;
});
