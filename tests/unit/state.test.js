import { beforeEach, describe, expect, test } from 'vitest';
import { appState, resetConfig } from '../../js/state.js';
import { componentCatalog } from '../../js/catalog.js';
import { loadDraft, saveDraft } from '../../js/storage.js';
import { applyThemeToConfig, BUILT_IN_THEMES, normalizeComponentOverrides } from '../../js/themes.js';
import { memoryLocalStorage, validProject } from '../fixtures/index.js';

describe('application state', () => {
  beforeEach(() => {
    globalThis.localStorage = memoryLocalStorage();
    appState.selectedComponent = null;
    appState.componentOverrides = {};
    appState.settings.autosave = true;
    resetConfig();
  });

  test('initial state has a valid component config and independent UI/component themes', () => {
    expect(appState.config.items.length).toBeGreaterThan(0);
    expect(appState.activeTheme.id).toBe('clean-light');
    expect(appState.uiTheme).toBe('light');
  });

  test('state updates and component selection retain the selected catalog record', () => {
    appState.searchQuery = 'tabs';
    appState.selectedComponent = componentCatalog.find(component => component.id === 'tab-blocks');
    expect(appState.searchQuery).toBe('tabs');
    expect(appState.selectedComponent.title).toBe('Horizontal Tabs');
  });

  test('theme application, component override, and reset produce predictable state', () => {
    const healthcare = BUILT_IN_THEMES.find(theme => theme.id === 'healthcare');
    appState.activeTheme = structuredClone(healthcare);
    appState.componentOverrides = normalizeComponentOverrides({ primary: '#123456' });
    appState.config = applyThemeToConfig(appState.config, appState.activeTheme, appState.componentOverrides);
    expect(appState.config.colorPrimary).toBe('#123456');
    appState.componentOverrides = {};
    appState.config = applyThemeToConfig(appState.config, appState.activeTheme, appState.componentOverrides);
    expect(appState.config.colorPrimary).toBe(healthcare.tokens.primary);
  });

  test('autosave state and draft restoration preserve the project snapshot', () => {
    appState.settings.autosave = false;
    expect(appState.settings.autosave).toBe(false);
    appState.settings.autosave = true;
    saveDraft(validProject({ name: 'Restored Draft' }));
    const restored = loadDraft();
    expect(restored.name).toBe('Restored Draft');
    expect(restored.theme.id).toBe('clean-light');
  });
});
