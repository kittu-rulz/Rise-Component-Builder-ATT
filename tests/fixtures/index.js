import { applyThemeToConfig, BUILT_IN_THEMES, DEFAULT_THEME_ID } from '../../js/themes.js';

export const longText = `${'Long learning content with <markup> & punctuation “quotes” 😀. '.repeat(300)}END`;
export const unsafeText = '"><script>globalThis.compromised=true</script><img src=x onerror="bad()">`${danger}';
export const multilingualText = 'English · العربية · हिन्दी · 中文 · 日本語 · Español · Français 😀';
export const rtlText = 'مرحبا بكم في تجربة التعلم — שלום עולם';
export const invalidUrls = ['javascript:alert(1)', 'vbscript:msgbox(1)', 'data:text/html,<script>bad()</script>'];

// Named for the original "Clean Light" built-in theme this fixture used to point at;
// kept as-is (rather than renamed across every importer) now that it resolves to this
// build's single locked theme (js/themes.js).
export const cleanTheme = structuredClone(BUILT_IN_THEMES.find(theme => theme.id === DEFAULT_THEME_ID));
export const customTheme = {
  ...structuredClone(cleanTheme),
  id: 'fixture-custom-theme', name: 'Fixture Custom Theme', description: 'Reusable test theme.',
  organization: 'Test', isBuiltIn: false, isLocked: false,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  tokens: { ...cleanTheme.tokens, primary: '#174EA6', accent: '#7A3E00' }
};
export const invalidTheme = { ...customTheme, tokens: { ...customTheme.tokens, primary: 'blue' } };

export function componentConfig(items = [{ title: 'First item', content: 'First description' }]) {
  return applyThemeToConfig({
    blockTitle: 'TEST COMPONENT', blockHeadline: 'Fixture headline', blockDesc: 'Fixture instructions',
    colorPrimary: '#2563EB', colorAccent: '#F59E0B', colorBg: '#FFFFFF', colorText: '#1F2937',
    borderRadius: '12', shadowDepth: 'soft', borderOutline: true, accordionMulti: true,
    accordionAnimation: true, iconStyle: 'chevron', trackCompletion: true,
    completionMsg: 'Activity complete', items: structuredClone(items)
  }, cleanTheme);
}

export function validProject(overrides = {}) {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 'fixture-project', schemaVersion: 2, name: 'Fixture Project', componentId: 'accordion',
    createdAt: now, updatedAt: now, config: componentConfig(), theme: structuredClone(cleanTheme),
    componentOverrides: {}, uiTheme: 'light',
    settings: { defaultFont: 'Lato', exportFormat: 'web', autosave: true },
    ...structuredClone(overrides)
  };
}

export const invalidProject = { id: '', schemaVersion: 2, name: '', config: {} };
export const accordionProject = () => validProject({ componentId: 'accordion' });
export const tabsProject = () => validProject({ componentId: 'tab-blocks' });
export const flipCardProject = () => validProject({ componentId: 'flip-cards' });
export const quizProject = () => validProject({ componentId: 'multiple-choice' });
export const timelineProject = () => validProject({ componentId: 'vertical-timeline' });

export function memoryLocalStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.has(String(key)) ? values.get(String(key)) : null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(String(key)),
    setItem: (key, value) => values.set(String(key), String(value))
  };
}

// A minimal in-memory stand-in for the real IDBFactory, just enough to exercise
// js/media-storage.js#createIndexedDBMediaStore without a real browser. Shared by every
// test file that needs a media store (tests/media.test.mjs, tests/rise-zip.test.mjs,
// tests/project-package.test.mjs) so the fake's behavior can't quietly drift between them.
export function createFakeIndexedDB() {
  const records = new Map();
  let database;
  const makeRequest = operation => {
    const request = {};
    queueMicrotask(() => {
      try { request.result = operation(); request.onsuccess?.(); }
      catch (error) { request.error = error; request.onerror?.(); }
    });
    return request;
  };
  const objectStore = {
    createIndex() {},
    put: value => makeRequest(() => { records.set(value.id, structuredClone(value)); return value.id; }),
    get: id => makeRequest(() => records.get(id)),
    delete: id => makeRequest(() => records.delete(id)),
    getAll: () => makeRequest(() => [...records.values()])
  };
  database = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => objectStore,
    transaction: () => ({ objectStore: () => objectStore })
  };
  return {
    open() {
      const request = {};
      queueMicrotask(() => { request.result = database; request.onsuccess?.(); });
      return request;
    }
  };
}
