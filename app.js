/* Rise Component Builder — Application Shell Logic */
// @ts-nocheck -- extensive untyped document.getElementById() DOM wiring; see docs/TESTING-STRATEGY.md "Type checking".
// Opt back in incrementally as sections of this file are typed or migrated into the component registry (docs/ARCHITECTURE.md §1).

import { appState, resetConfig } from './js/state.js';
import {
  buildProject, clearDraft, deleteProject, duplicateProject, getProject, importProjectJson,
  deleteCustomTheme, loadCustomThemes, loadDefaultThemeId, loadDraft, loadFavorites, loadPreviewDevice,
  loadProjects, loadSettings, loadUiTheme, renameProject, saveCustomTheme, saveDefaultThemeId, saveDraft,
  saveFavorites, savePreviewDevice, saveProject, saveSettings, saveUiTheme
} from './js/storage.js';
import { componentCatalog, filterCatalog, createCatalogCard } from './js/catalog.js';
import { COMPONENT_REGISTRY, getCategoriesWithCounts, getComponentById, getDefaultConfig } from './js/component-registry.js';
import { createSchemaItemEditor, switchEditorTab as activateEditorTab, addEditorItem, validateActiveComponent, validateSchemaField } from './js/editor.js';
import { writePreview, openPreview, generateIframeContent as compilePreview, COMPONENT_MAX_WIDTH } from './js/preview.js';
import { getDeviceWidthLabel } from './js/device-preview.js';
import {
  buildExportPayload, buildRiseProjectZip, downloadHtml, downloadProjectJson,
  downloadZipFile, formatExportedFileSize, getExportedFileSize, prepareMediaExport
} from './js/export.js';
import { copyTextToClipboard, escapeHTML, normalizeHeadingLevel, toRgba as colorToRgba } from './js/utilities.js';
import { showToast } from './js/toast.js';
import { COMPATIBILITY_TIERS, getExportFormatCompatibility } from './js/compatibility.js';
import { collectSyncIssues, runPreflight, summarizePreflight } from './js/validation.js';
import { collectMediaReferences, resolveMediaLimits, validateMediaAccessibility } from './js/media.js';
import { downloadProjectPackage, exportProjectPackage, importProjectPackage, isProjectPackageFile } from './js/project-package.js';
import { pruneMediaObjectURLs, releaseAllMediaObjectURLs, restoreMediaReferences } from './js/media-storage.js';
import {
  applyThemeToConfig, BUILT_IN_THEMES, createThemeFromCurrentStyling, DEFAULT_THEME_ID,
  duplicateTheme, importThemeJson, normalizeComponentOverrides, renameCustomTheme,
  serializeTheme, validateThemeContrast
} from './js/themes.js';
// Every catalog component is a real, isolated module (js/component-registry.js). The
// preview/export compiler needs its renderer (generateHTML/CSS/JS) and version (embedded
// in the completion adapter's message envelope, js/completion.js); the editor's save-time
// validation gate needs its validate() — combine all three under one id map.
const componentRegistry = Object.fromEntries(COMPONENT_REGISTRY.map(entry => [entry.id, { ...entry.renderer, validate: entry.validate, version: entry.version }]));
const generateIframeContent = () => compilePreview(appState, componentRegistry, colorToRgba);

// Every error thrown deliberately by this app's own code (project/theme/import validation,
// storage quota, export failures, etc.) is already caught at its call site and shown as a
// specific, reviewed, user-facing toast — see the individual try/catch blocks below. This
// handler exists only for the residual case: a genuinely unanticipated bug (an uncaught
// exception or unhandled promise rejection) that would otherwise fail silently or surface a
// raw browser error overlay. Full detail goes to the console (a safe place for it — visible
// only to whoever already has this browser's devtools open, i.e. the same person who hit the
// bug); the toast itself stays generic on purpose, since a bug's raw message/stack can name
// internal variables or file paths that mean nothing to an instructional designer.
let lastUnexpectedErrorToastAt = 0;
function reportUnexpectedError(error) {
  console.error('Unexpected application error:', error);
  const now = Date.now();
  if (now - lastUnexpectedErrorToastAt < 4000) return;
  lastUnexpectedErrorToastAt = now;
  showToast('Something unexpected went wrong. Your work autosaves regularly — check the browser console for technical details.', 'error', 6000);
}
window.addEventListener('error', event => reportUnexpectedError(event.error || event.message));
window.addEventListener('unhandledrejection', event => reportUnexpectedError(event.reason));

document.addEventListener('DOMContentLoaded', async () => {
  
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  appState.uiTheme = loadUiTheme();
  appState.settings = loadSettings();
  appState.favorites = new Set(loadFavorites());
  let customThemes = loadCustomThemes();
  let defaultThemeId = loadDefaultThemeId();
  const initialComponentTheme = [...BUILT_IN_THEMES, ...customThemes].find(theme => theme.id === defaultThemeId)
    || BUILT_IN_THEMES.find(theme => theme.id === DEFAULT_THEME_ID);
  appState.activeThemeId = initialComponentTheme.id;
  appState.activeTheme = structuredClone(initialComponentTheme);
  appState.componentOverrides = {};
  appState.config = applyThemeToConfig(appState.config, appState.activeTheme, appState.componentOverrides);

  // ==========================================
  // DATABASE OF COMPONENT ARCHETYPES
  // ==========================================
  // ==========================================
  // DOM ELEMENT REFERENCES
  // ==========================================
  const htmlRoot = document.documentElement;
  const btnTheme = document.getElementById('btn-theme');
  const themeIconLight = btnTheme.querySelector('.theme-icon-light');
  const themeIconDark = btnTheme.querySelector('.theme-icon-dark');
  
  const searchInput = document.getElementById('search-components');
  const navItems = document.querySelectorAll('.nav-item');
  const componentsGrid = document.getElementById('components-grid');
  
  const catalogState = document.getElementById('catalog-state');
  const editorState = document.getElementById('editor-state');
  
  const btnBackToCatalog = document.getElementById('btn-back-to-catalog');
  const activeComponentTitle = document.getElementById('active-component-title');
  const activeComponentCategory = document.getElementById('active-component-category');
  const btnFavoriteToggle = document.getElementById('btn-favorite-toggle');
  const favoritesCountBadge = document.getElementById('favorites-count-badge');
  const preflightBadge = document.getElementById('preflight-badge');
  
  // Editor Tabs
  const editorTabs = document.querySelectorAll('.editor-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // Form Inputs
  const inputBlockTitle = document.getElementById('input-block-title');
  const inputBlockHeadline = document.getElementById('input-block-headline');
  const inputBlockDesc = document.getElementById('input-block-desc');
  const selectHeadingLevel = document.getElementById('select-heading-level');
  const inputColorPrimary = document.getElementById('input-color-primary');
  const inputColorPrimaryText = document.getElementById('input-color-primary-text');
  const inputColorAccent = document.getElementById('input-color-accent');
  const inputColorAccentText = document.getElementById('input-color-accent-text');
  const inputColorBg = document.getElementById('input-color-bg');
  const inputColorBgText = document.getElementById('input-color-bg-text');
  const inputColorText = document.getElementById('input-color-text');
  const inputColorTextText = document.getElementById('input-color-text-text');
  const inputBorderRadius = document.getElementById('input-border-radius');
  const radiusVal = document.getElementById('radius-val');
  const selectShadow = document.getElementById('select-shadow');
  const inputBorderEnable = document.getElementById('input-border-enable');
  
  const inputBehaviorAccordionMulti = document.getElementById('input-behavior-accordion-multi');
  const inputBehaviorAccordionAnimation = document.getElementById('input-behavior-accordion-animation');
  const selectIconStyle = document.getElementById('select-icon-style');
  const accordionBehaviorGroup = document.getElementById('accordion-behavior-group');
  const inputTrackCompletion = document.getElementById('input-track-completion');
  const inputCompletionMsg = document.getElementById('input-completion-msg');
  
  // Dynamic Content Items
  const dynamicItemsContainer = document.getElementById('dynamic-items-container');
  const btnAddItem = document.getElementById('btn-add-item');
  
  // Preview
  const deviceButtons = document.querySelectorAll('.device-btn');
  const previewViewport = document.getElementById('preview-viewport');
  const btnPreviewRefresh = document.getElementById('btn-preview-refresh');
  const btnPreviewPopout = document.getElementById('btn-preview-popout');
  const livePreviewIframe = document.getElementById('live-preview-iframe');
  const savedComponentsList = document.getElementById('saved-components-list');
  const saveModalTitle = document.getElementById('save-modal-title');
  const saveNameInput = document.getElementById('save-component-name');
  const btnConfirmSaveAs = document.getElementById('btn-confirm-save-as');
  const importProjectFile = document.getElementById('import-project-file');
  const selectComponentFont = document.getElementById('select-component-font');
  const themeCards = document.getElementById('theme-cards');
  const importThemeFile = document.getElementById('import-theme-file');

  // Modals elements
  const modalTriggers = {
    'btn-export': 'modal-export',
    'btn-settings': 'modal-settings',
    'btn-theme-manager': 'modal-theme-manager',
    'btn-open-theme-manager-style': 'modal-theme-manager',
    'btn-preflight': 'modal-preflight'
  };
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  modalOverlays.forEach(overlay => overlay.setAttribute('aria-hidden', 'true'));

  // ==========================================
  // INITIALIZATION
  // ==========================================
  async function init() {
    // 1. Load theme state
    setUiTheme(appState.uiTheme);
    document.documentElement.style.setProperty('--component-max-width', `${COMPONENT_MAX_WIDTH}px`);
    applyDeviceMode(loadPreviewDevice());

    // 2. Render initial category catalog
    renderCatalog();
    updateCategoryBadges();

    // 3. Update Favorites count
    updateFavoritesBadge();
    updateStorageMeter();

    // 4. Hook up live sync for values in Form Inputs
    setupFormListeners();
    
    // 5. Restore a valid draft, otherwise build the initial preview.
    syncSettingsControls();
    const draft = loadDraft();
    if (draft && await applyProject(draft, true)) {
      showToast(`Restored draft “${draft.name}”.`, 'success');
    } else {
      renderDynamicItems();
      updateLivePreview();
    }

    window.setInterval(saveCurrentDraft, 60000);
    window.setInterval(updateStorageMeter, 30000);
  }

  // ==========================================
  // THEME MANAGEMENT
  // ==========================================
  function setUiTheme(theme) {
    appState.uiTheme = theme;
    htmlRoot.setAttribute('data-theme', theme);
    try { saveUiTheme(theme); }
    catch (error) { showToast(error.message, 'error'); }
    
    if (theme === 'dark') {
      themeIconLight.style.display = 'none';
      themeIconDark.style.display = 'block';
    } else {
      themeIconLight.style.display = 'block';
      themeIconDark.style.display = 'none';
    }
    
    // Notify preview frame if running
    updateLivePreview();
  }

  btnTheme.addEventListener('click', () => {
    setUiTheme(appState.uiTheme === 'light' ? 'dark' : 'light');
  });

  function getAvailableThemes() {
    return [...BUILT_IN_THEMES, ...customThemes];
  }

  function syncResolvedThemeConfig() {
    appState.componentOverrides = normalizeComponentOverrides(appState.componentOverrides);
    appState.config = applyThemeToConfig(appState.config, appState.activeTheme, appState.componentOverrides);
  }

  function updateThemeSourceIndicators() {
    const keys = ['primary', 'accent', 'background', 'text', 'borderRadius', 'shadow', 'fontFamily'];
    keys.forEach(key => {
      const badge = document.getElementById(`override-${key}-status`);
      if (!badge) return;
      const overridden = Object.hasOwn(appState.componentOverrides, key);
      badge.textContent = overridden ? 'Component override' : 'Theme value';
      badge.classList.toggle('is-override', overridden);
    });
    const activeLabel = document.getElementById('active-component-theme-name');
    if (activeLabel) activeLabel.textContent = appState.activeTheme.name;
  }

  function setComponentOverride(key, value) {
    appState.componentOverrides = { ...appState.componentOverrides, [key]: value };
    syncResolvedThemeConfig();
    updateThemeSourceIndicators();
    updateLivePreview();
  }

  function applyComponentTheme(theme, { clearOverrides = false } = {}) {
    appState.activeThemeId = theme.id;
    appState.activeTheme = structuredClone(theme);
    if (clearOverrides) appState.componentOverrides = {};
    syncResolvedThemeConfig();
    if (appState.selectedComponent) syncEditorControls();
    else updateThemeSourceIndicators();
    renderThemeManager();
    updateLivePreview();
  }

  function addThemeAction(container, label, handler, className = 'btn btn-text btn-small') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    container.appendChild(button);
  }

  function renderContrastReport() {
    const container = document.getElementById('theme-contrast-report');
    container.replaceChildren();
    validateThemeContrast(appState.activeTheme).forEach(result => {
      const card = document.createElement('div');
      card.className = `contrast-result${result.normalText ? '' : ' fail'}`;
      const heading = document.createElement('div');
      heading.className = 'contrast-result-line';
      const name = document.createElement('strong');
      name.textContent = result.label;
      const ratio = document.createElement('span');
      ratio.textContent = `${result.ratio}:1`;
      heading.append(name, ratio);
      const levels = document.createElement('div');
      levels.className = 'contrast-result-line';
      const normal = document.createElement('span');
      normal.className = result.normalText ? 'contrast-pass' : 'contrast-fail';
      normal.textContent = `Normal: ${result.normalText ? 'Pass' : 'Fail'}`;
      const large = document.createElement('span');
      large.className = result.largeText ? 'contrast-pass' : 'contrast-fail';
      large.textContent = `Large: ${result.largeText ? 'Pass' : 'Fail'}`;
      levels.append(normal, large);
      card.append(heading, levels);
      if (result.suggested) {
        const suggestion = document.createElement('div');
        suggestion.className = 'contrast-suggestion';
        suggestion.textContent = `Suggested accessible ${result.foregroundToken}: ${result.suggested}. Review before applying.`;
        card.appendChild(suggestion);
      }
      container.appendChild(card);
    });
  }

  function renderThemeManager() {
    if (!themeCards) return;
    document.getElementById('theme-manager-active-name').textContent = appState.activeTheme.name;
    document.getElementById('theme-manager-default-label').textContent = appState.activeTheme.id === defaultThemeId ? 'Default theme' : '';
    themeCards.replaceChildren();
    getAvailableThemes().forEach(theme => {
      const card = document.createElement('article');
      card.className = `theme-card${theme.id === appState.activeThemeId ? ' is-active' : ''}`;
      const preview = document.createElement('div');
      preview.className = 'theme-card-preview';
      preview.style.background = theme.tokens.background;
      const title = document.createElement('div');
      title.className = 'theme-card-preview-title';
      title.style.background = theme.tokens.text;
      const copy = document.createElement('div');
      copy.className = 'theme-card-preview-copy';
      copy.style.background = theme.tokens.mutedText;
      const sampleButton = document.createElement('div');
      sampleButton.className = 'theme-card-preview-button';
      sampleButton.style.background = theme.tokens.primary;
      sampleButton.style.borderRadius = `${theme.tokens.buttonRadius}px`;
      preview.append(title, copy, sampleButton);

      const body = document.createElement('div');
      body.className = 'theme-card-body';
      const heading = document.createElement('div');
      heading.className = 'theme-card-heading';
      const name = document.createElement('strong');
      name.textContent = theme.name;
      const pill = document.createElement('span');
      pill.className = 'theme-pill';
      pill.textContent = theme.isLocked ? 'Company · Locked' : theme.isBuiltIn ? 'Built-in' : 'Custom';
      heading.append(name, pill);
      const meta = document.createElement('div');
      meta.className = 'theme-card-meta';
      meta.textContent = `${theme.organization}${theme.id === defaultThemeId ? ' · Default' : ''}`;
      const description = document.createElement('p');
      description.className = 'theme-card-description';
      description.textContent = theme.description;
      const actions = document.createElement('div');
      actions.className = 'theme-card-actions';
      addThemeAction(actions, theme.id === appState.activeThemeId ? 'Applied' : 'Apply', () => {
        applyComponentTheme(theme);
        showToast(`Applied “${theme.name}”.`, 'success');
      }, theme.id === appState.activeThemeId ? 'btn btn-secondary btn-small' : 'btn btn-primary btn-small');
      addThemeAction(actions, 'Duplicate', () => {
        try {
          const copyTheme = saveCustomTheme(duplicateTheme(theme));
          customThemes = loadCustomThemes();
          renderThemeManager();
          showToast(`Created editable copy “${copyTheme.name}”.`, 'success');
        } catch (error) { showToast(error.message, 'error'); }
      });
      addThemeAction(actions, 'Set Default', () => {
        try {
          defaultThemeId = saveDefaultThemeId(theme.id);
          renderThemeManager();
          showToast(`“${theme.name}” is now the default theme.`, 'success');
        } catch (error) { showToast(error.message, 'error'); }
      });
      if (!theme.isBuiltIn && !theme.isLocked) {
        addThemeAction(actions, 'Rename', async () => {
          const nextName = await openPromptDialog({ title: 'Rename Theme', label: 'Theme Name', initialValue: theme.name, confirmLabel: 'Rename' });
          if (nextName === null) return;
          try {
            const renamed = saveCustomTheme(renameCustomTheme(theme, nextName));
            customThemes = loadCustomThemes();
            if (appState.activeThemeId === renamed.id) appState.activeTheme = structuredClone(renamed);
            renderThemeManager();
            updateThemeSourceIndicators();
            showToast('Theme renamed.', 'success');
          } catch (error) { showToast(error.message, 'error'); }
        });
        addThemeAction(actions, 'Delete', async () => {
          const confirmed = await openConfirmDialog({ title: 'Delete Theme', message: `Delete “${theme.name}”? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
          if (!confirmed) return;
          try {
            deleteCustomTheme(theme.id);
            customThemes = loadCustomThemes();
            defaultThemeId = loadDefaultThemeId();
            if (appState.activeThemeId === theme.id) {
              const fallback = getAvailableThemes().find(item => item.id === defaultThemeId)
                || BUILT_IN_THEMES.find(item => item.id === DEFAULT_THEME_ID);
              applyComponentTheme(fallback);
            } else renderThemeManager();
            showToast(`Deleted “${theme.name}”.`, 'success');
            updateStorageMeter();
          } catch (error) { showToast(error.message, 'error'); }
        });
      }
      body.append(heading, meta, description, actions);
      card.append(preview, body);
      themeCards.appendChild(card);
    });
    renderContrastReport();
  }

  function downloadTheme(theme) {
    const blob = new Blob([serializeTheme(theme)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'component-theme'}.theme.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById('btn-save-current-theme').addEventListener('click', async () => {
    const name = await openPromptDialog({ title: 'Save Theme', label: 'Theme Name', initialValue: `${appState.activeTheme.name} Custom`, confirmLabel: 'Save' });
    if (name === null) return;
    try {
      const theme = saveCustomTheme(createThemeFromCurrentStyling(name, appState.activeTheme, appState.componentOverrides));
      customThemes = loadCustomThemes();
      applyComponentTheme(theme, { clearOverrides: true });
      showToast(`Saved “${theme.name}”.`, 'success');
    } catch (error) { showToast(error.message, 'error'); }
  });
  document.getElementById('btn-import-theme').addEventListener('click', () => importThemeFile.click());
  importThemeFile.addEventListener('change', async () => {
    const file = importThemeFile.files?.[0];
    if (!file) return;
    try {
      const imported = saveCustomTheme(importThemeJson(await file.text()));
      customThemes = loadCustomThemes();
      applyComponentTheme(imported, { clearOverrides: true });
      showToast(`Imported “${imported.name}”.`, 'success');
    } catch (error) { showToast(`Theme import failed: ${error.message}`, 'error', 6000); }
    finally { importThemeFile.value = ''; }
  });
  document.getElementById('btn-export-theme').addEventListener('click', () => downloadTheme(appState.activeTheme));
  document.getElementById('btn-reset-active-theme').addEventListener('click', () => {
    const fallback = getAvailableThemes().find(theme => theme.id === defaultThemeId)
      || BUILT_IN_THEMES.find(theme => theme.id === DEFAULT_THEME_ID);
    applyComponentTheme(fallback, { clearOverrides: true });
    showToast(`Reset to “${fallback.name}” with no component overrides.`, 'success');
  });
  document.getElementById('btn-reset-component-overrides').addEventListener('click', () => {
    appState.componentOverrides = {};
    syncResolvedThemeConfig();
    syncEditorControls();
    updateLivePreview();
    showToast('Component overrides reset to theme values.', 'success');
  });

  // ==========================================
  // ROUTING & NAVIGATION
  // ==========================================
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      
      const category = item.getAttribute('data-category');
      appState.activeCategory = category;
      
      // Clear search
      searchInput.value = '';
      appState.searchQuery = '';
      
      // Go back to catalog view
      showState('catalog');
      renderCatalog();
    });
  });

  searchInput.addEventListener('input', (e) => {
    appState.searchQuery = e.target.value.toLowerCase();
    
    // Ensure we are on the catalog view when searching
    showState('catalog');
    renderCatalog();
  });

  function showState(state) {
    if (state === 'catalog') {
      catalogState.style.display = 'flex';
      editorState.style.display = 'none';
    } else if (state === 'editor') {
      catalogState.style.display = 'none';
      editorState.style.display = 'flex';
      // Switch editor tabs back to the first 'content' tab
      switchEditorTab('content');
    }
  }

  // ==========================================
  // CATALOG RENDERING
  // ==========================================
  function renderCatalog() {
    componentsGrid.innerHTML = '';
    
    const filtered = filterCatalog(componentCatalog, appState);

    if (filtered.length === 0) {
      const isFavoritesEmpty = appState.activeCategory === 'favorites' && !appState.searchQuery;
      componentsGrid.innerHTML = isFavoritesEmpty
        ? `
        <div class="catalog-empty-state">
          <div class="catalog-empty-icon" aria-hidden="true">★</div>
          <h4>No Favorites Yet</h4>
          <p>Click the star on any component to add it here for quick access.</p>
        </div>
      `
        : `
        <div class="catalog-empty-state">
          <div class="catalog-empty-icon" aria-hidden="true">🔍</div>
          <h4>No Components Found</h4>
          <p>Try a different query or select another category from the sidebar.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(comp => {
      componentsGrid.appendChild(createCatalogCard(comp, loadComponentToEditor));
    });
  }

  // ==========================================
  // COMPONENT LOADER & EDITOR STATE
  // ==========================================
  // Rule: the selected preview device mode (js/device-preview.js) is intentionally left
  // untouched here. It reflects the author's current testing intent ("check every block
  // at mobile width this session"), not a per-component default, so it persists across
  // component switches rather than resetting to Desktop.
  function loadComponentToEditor(component) {
    appState.currentProjectId = null;
    appState.currentProjectName = '';
    appState.selectedComponent = component;
    
    activeComponentTitle.innerText = component.title;
    activeComponentCategory.innerText = component.category.toUpperCase();
    updateAccordionBehaviorVisibility(component.id);

    // Sync block text items with defaults/reset if needed
    inputBlockTitle.value = component.title.toUpperCase();
    inputBlockHeadline.value = `Explore details about ${component.title}`;
    
    appState.config.blockTitle = inputBlockTitle.value;
    appState.config.blockHeadline = inputBlockHeadline.value;
    
    // Set Favorites icon look
    setFavoriteButtonState(appState.favorites.has(component.id));

    // Setup component-specific default fields
    setupComponentFields(component.id);
    (component.editorSchema?.componentFields || []).forEach(field => {
      appState.config[field.id] = structuredClone(field.default ?? '');
    });
    applyMissingSchemaDefaults(component);
    syncResolvedThemeConfig();
    
    // Render dynamic item list inputs
    renderDynamicItems();

    // Show Editor Layout
    showState('editor');
    
    // Force live preview frame refresh
    updateLivePreview();
  }

  function setupComponentFields(id) {
    const entry = getComponentById(COMPONENT_REGISTRY, id) || getComponentById(COMPONENT_REGISTRY, 'accordion');
    const defaults = getDefaultConfig(entry);
    appState.config.items = defaults.items;
    Object.entries(defaults).forEach(([key, value]) => {
      if (key !== 'items') appState.config[key] = value;
    });
  }

  function applyMissingSchemaDefaults(component) {
    const schema = component?.editorSchema;
    if (!schema) return;
    (schema.componentFields || []).forEach(field => {
      if (appState.config[field.id] === undefined) appState.config[field.id] = structuredClone(field.default ?? '');
    });
    appState.config.items.forEach(item => schema.itemFields.forEach(field => {
      if (item[field.id] === undefined) item[field.id] = structuredClone(field.default ?? '');
    }));
  }

  btnBackToCatalog.addEventListener('click', () => {
    showState('catalog');
    renderCatalog();
  });

  // Favorite toggle
  function setFavoriteButtonState(isFavorited) {
    btnFavoriteToggle.classList.toggle('favorited', isFavorited);
    const label = isFavorited ? 'Remove from Favorites' : 'Add to Favorites';
    btnFavoriteToggle.title = label;
    btnFavoriteToggle.setAttribute('aria-label', label);
    btnFavoriteToggle.setAttribute('aria-pressed', String(isFavorited));
  }

  btnFavoriteToggle.addEventListener('click', () => {
    if (!appState.selectedComponent) return;

    const id = appState.selectedComponent.id;
    if (appState.favorites.has(id)) {
      appState.favorites.delete(id);
    } else {
      appState.favorites.add(id);
    }
    setFavoriteButtonState(appState.favorites.has(id));

    updateFavoritesBadge();
    try { saveFavorites(appState.favorites); }
    catch (error) { showToast(error.message, 'error'); }
    
    if (appState.activeCategory === 'favorites') {
      renderCatalog();
    }
  });

  function updateFavoritesBadge() {
    favoritesCountBadge.innerText = appState.favorites.size;
  }

  function updateCategoryBadges() {
    getCategoriesWithCounts(COMPONENT_REGISTRY).forEach(({ id, count }) => {
      if (id === 'ai') return; // AI category keeps its static "Beta" badge, not a count.
      const badge = document.querySelector(`.nav-item[data-category="${id}"] .badge`);
      if (badge) badge.textContent = String(count);
    });
  }

  function formatStorageBytes(bytes) {
    if (!Number.isFinite(bytes)) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`;
  }

  async function updateStorageMeter() {
    const label = document.getElementById('storage-usage-label');
    const bar = document.getElementById('storage-progress-bar');
    const track = bar?.closest('.storage-bar');
    if (!label || !bar || !track) return;

    if (!navigator.storage?.estimate) {
      label.textContent = 'Usage unavailable';
      bar.style.width = '0%';
      track.setAttribute('aria-valuenow', '0');
      return;
    }

    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      if (!quota) {
        label.textContent = 'Usage unavailable';
        bar.style.width = '0%';
        track.setAttribute('aria-valuenow', '0');
        return;
      }
      const percent = Math.min(100, Math.round((usage / quota) * 100));
      label.textContent = `${percent}% Used`;
      label.title = `${formatStorageBytes(usage)} of ${formatStorageBytes(quota)} used`;
      bar.style.width = `${percent}%`;
      track.setAttribute('aria-valuenow', String(percent));
      track.setAttribute('aria-label', `Local browser storage used: ${formatStorageBytes(usage)} of ${formatStorageBytes(quota)}`);
    } catch {
      label.textContent = 'Usage unavailable';
      bar.style.width = '0%';
      track.setAttribute('aria-valuenow', '0');
    }
  }

  // ==========================================
  // EDITOR TABS SWITCHING
  // ==========================================
  editorTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      switchEditorTab(tabId);
    });
  });

  function switchEditorTab(tabId) {
    activateEditorTab(tabId, editorTabs, tabPanes);
  }

  // ==========================================
  // CONFIGURATION SYNC LISTENERS
  // ==========================================
  function setupFormListeners() {
    // 1. Text Inputs
    const syncText = (elem, stateKey) => {
      elem.addEventListener('input', (e) => {
        appState.config[stateKey] = e.target.value;
        updateLivePreview();
      });
    };
    
    syncText(inputBlockTitle, 'blockTitle');
    syncText(inputBlockHeadline, 'blockHeadline');
    syncText(inputBlockDesc, 'blockDesc');
    syncText(inputCompletionMsg, 'completionMsg');

    selectHeadingLevel.addEventListener('change', (e) => {
      appState.config.blockHeadingLevel = e.target.value;
      updateLivePreview();
    });

    // 2. Color Sync (Picker <-> Text Input)
    const syncColor = (picker, text, stateKey) => {
      const overrideKey = {
        colorPrimary: 'primary', colorAccent: 'accent', colorBg: 'background', colorText: 'text'
      }[stateKey];
      picker.addEventListener('input', (e) => {
        text.value = e.target.value.toUpperCase();
        setComponentOverride(overrideKey, e.target.value);
      });
      
      text.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val.match(/^#[0-9A-F]{6}$/i)) {
          picker.value = val;
          setComponentOverride(overrideKey, val);
        }
      });
    };

    syncColor(inputColorPrimary, inputColorPrimaryText, 'colorPrimary');
    syncColor(inputColorAccent, inputColorAccentText, 'colorAccent');
    syncColor(inputColorBg, inputColorBgText, 'colorBg');
    syncColor(inputColorText, inputColorTextText, 'colorText');

    // 3. Range Sliders
    inputBorderRadius.addEventListener('input', (e) => {
      radiusVal.innerText = `${e.target.value}px`;
      setComponentOverride('borderRadius', Number(e.target.value));
    });

    // 4. Select dropdowns
    selectShadow.addEventListener('change', (e) => {
      setComponentOverride('shadow', e.target.value);
    });

    selectComponentFont.addEventListener('change', (e) => setComponentOverride('fontFamily', e.target.value));

    selectIconStyle.addEventListener('change', (e) => {
      appState.config.iconStyle = e.target.value;
      updateLivePreview();
    });

    // 5. Checkboxes
    const syncCheckbox = (checkbox, stateKey) => {
      checkbox.addEventListener('change', (e) => {
        appState.config[stateKey] = e.target.checked;
        updateLivePreview();
      });
    };

    syncCheckbox(inputBorderEnable, 'borderOutline');
    syncCheckbox(inputBehaviorAccordionMulti, 'accordionMulti');
    syncCheckbox(inputBehaviorAccordionAnimation, 'accordionAnimation');
    syncCheckbox(inputTrackCompletion, 'trackCompletion');
  }

  // ==========================================
  // DYNAMIC ITEM EDITING
  // ==========================================
  const schemaItemEditor = createSchemaItemEditor({
    container: dynamicItemsContainer,
    onChange: updateLivePreview
  });

  function computeIssuesByItem(issues) {
    const map = new Map();
    issues.forEach(item => {
      if (!Number.isInteger(item.itemIndex)) return;
      const entry = map.get(item.itemIndex) || { blocking: 0, warning: 0 };
      if (item.severity === 'blocking') entry.blocking += 1; else entry.warning += 1;
      map.set(item.itemIndex, entry);
    });
    return map;
  }

  function renderDynamicItems() {
    const schema = appState.selectedComponent?.editorSchema || componentCatalog[0].editorSchema;
    schemaItemEditor.render({ schema, items: appState.config.items, config: appState.config, limits: resolveMediaLimits(appState.settings.mediaLimitsMb) });
    refreshItemIssueBadges();
  }

  function refreshItemIssueBadges() {
    const context = buildPreflightContext();
    schemaItemEditor.refreshIssueBadges(context ? computeIssuesByItem(collectSyncIssues(context)) : new Map());
  }

  btnAddItem.addEventListener('click', () => {
    const schema = appState.selectedComponent?.editorSchema || componentCatalog[0].editorSchema;
    addEditorItem(appState, schema);
    renderDynamicItems();
    updateLivePreview();
  });

  // ==========================================
  // DEVICE VIEWPORT CONTROLS
  // ==========================================
  const previewWidthLabel = document.getElementById('preview-width-label');
  const deviceModeClasses = ['desktop', 'tablet', 'mobile-lg', 'mobile'];

  function applyDeviceMode(device) {
    deviceButtons.forEach(b => {
      const isActive = b.getAttribute('data-device') === device;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
    previewViewport.classList.remove(...deviceModeClasses);
    previewViewport.classList.add(device);
    previewWidthLabel.textContent = getDeviceWidthLabel(device, COMPONENT_MAX_WIDTH);
  }

  deviceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const device = btn.getAttribute('data-device');
      applyDeviceMode(device);
      try { savePreviewDevice(device); }
      catch (error) { showToast(error.message, 'error'); }
    });
  });

  btnPreviewRefresh.addEventListener('click', () => {
    const spinner = btnPreviewRefresh.querySelector('svg');
    spinner.style.transform = 'rotate(360deg)';
    spinner.style.transition = 'transform 0.6s ease';
    
    setTimeout(() => {
      spinner.style.transform = 'rotate(0deg)';
      spinner.style.transition = 'none';
    }, 600);
    
    updateLivePreview();
  });

  btnPreviewPopout.addEventListener('click', () => {
    openPreview(generateIframeContent());
  });

  // ==========================================
  // MODALS HANDLING
  // ==========================================
  let saveDialogMode = 'save';
  let renameTargetId = null;
  let modalStack = [];
  const modalFocusReturn = new Map();
  const modalDefaultSettlers = new Map();

  function getFocusableElements(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null);
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (!modalFocusReturn.has(id)) modalFocusReturn.set(id, document.activeElement);
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    modalStack = modalStack.filter(existing => existing !== id);
    modalStack.push(id);
    const focusable = getFocusableElements(modal.querySelector('.modal-card'));
    (focusable[0] || modal.querySelector('.modal-card'))?.focus();
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    modalStack = modalStack.filter(existing => existing !== id);
    const trigger = modalFocusReturn.get(id);
    modalFocusReturn.delete(id);
    if (trigger && typeof trigger.focus === 'function' && document.contains(trigger)) trigger.focus();
    const settleAsDismissed = modalDefaultSettlers.get(id);
    if (settleAsDismissed) {
      modalDefaultSettlers.delete(id);
      settleAsDismissed();
    }
  }

  function openConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
    return new Promise(resolve => {
      document.getElementById('modal-confirm-title').textContent = title;
      document.getElementById('modal-confirm-message').textContent = message;
      const confirmBtn = document.getElementById('btn-confirm-dialog-action');
      const cancelBtn = document.getElementById('btn-confirm-dialog-cancel');
      confirmBtn.textContent = confirmLabel;
      confirmBtn.classList.toggle('btn-danger', danger);
      confirmBtn.classList.toggle('btn-primary', !danger);
      cancelBtn.textContent = cancelLabel;

      let settled = false;
      const settle = value => {
        if (settled) return;
        settled = true;
        confirmBtn.removeEventListener('click', onConfirm);
        resolve(value);
      };
      const onConfirm = () => {
        settle(true);
        closeModal('modal-confirm');
      };
      confirmBtn.addEventListener('click', onConfirm);
      modalDefaultSettlers.set('modal-confirm', () => settle(false));
      openModal('modal-confirm');
    });
  }

  function openPromptDialog({ title, message = '', label, initialValue = '', placeholder = '', confirmLabel = 'Save' }) {
    return new Promise(resolve => {
      document.getElementById('modal-prompt-title').textContent = title;
      const messageEl = document.getElementById('modal-prompt-message');
      messageEl.textContent = message;
      messageEl.hidden = !message;
      document.getElementById('modal-prompt-label').textContent = label;
      const input = document.getElementById('modal-prompt-input');
      input.value = initialValue;
      input.placeholder = placeholder;
      const confirmBtn = document.getElementById('btn-prompt-dialog-action');
      confirmBtn.textContent = confirmLabel;

      let settled = false;
      const settle = value => {
        if (settled) return;
        settled = true;
        confirmBtn.removeEventListener('click', onConfirm);
        input.removeEventListener('keydown', onKeydown);
        resolve(value);
      };
      const onConfirm = () => {
        settle(input.value);
        closeModal('modal-prompt');
      };
      const onKeydown = event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onConfirm();
        }
      };
      confirmBtn.addEventListener('click', onConfirm);
      input.addEventListener('keydown', onKeydown);
      modalDefaultSettlers.set('modal-prompt', () => settle(null));
      openModal('modal-prompt');
      input.focus();
      input.select();
    });
  }

  document.addEventListener('keydown', event => {
    if (!modalStack.length) return;
    const topId = modalStack[modalStack.length - 1];
    const modal = document.getElementById(topId);
    if (!modal) return;
    const card = modal.querySelector('.modal-card');

    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal(topId);
      return;
    }

    if (event.key === 'Tab') {
      const focusable = getFocusableElements(card);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !card.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !card.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  function syncSettingsControls() {
    document.getElementById('settings-default-font').value = appState.settings.defaultFont;
    document.getElementById('settings-export-format').value = appState.settings.exportFormat;
    document.getElementById('settings-enable-autosave').checked = appState.settings.autosave;
    document.getElementById('settings-enable-ai').checked = appState.settings.aiEnabled;
    document.getElementById('settings-limit-image').value = appState.settings.mediaLimitsMb.image;
    document.getElementById('settings-limit-audio').value = appState.settings.mediaLimitsMb.audio;
    document.getElementById('settings-limit-video').value = appState.settings.mediaLimitsMb.video;
    document.getElementById('settings-limit-svg').value = appState.settings.mediaLimitsMb.svg;
    document.getElementById('settings-completion-origin').value = appState.settings.completionParentOrigin;
  }

  // accordionMulti/accordionAnimation/iconStyle only affect the Accordion (components/accordion.js);
  // every other component ignores them, so hide the controls rather than show inert options.
  function updateAccordionBehaviorVisibility(componentId) {
    accordionBehaviorGroup.hidden = componentId !== 'accordion';
  }

  function syncEditorControls() {
    syncResolvedThemeConfig();
    const config = appState.config;
    inputBlockTitle.value = config.blockTitle;
    inputBlockHeadline.value = config.blockHeadline;
    inputBlockDesc.value = config.blockDesc;
    config.blockHeadingLevel = normalizeHeadingLevel(config.blockHeadingLevel);
    selectHeadingLevel.value = config.blockHeadingLevel;
    [[inputColorPrimary, inputColorPrimaryText, 'colorPrimary'], [inputColorAccent, inputColorAccentText, 'colorAccent'],
      [inputColorBg, inputColorBgText, 'colorBg'], [inputColorText, inputColorTextText, 'colorText']]
      .forEach(([picker, text, key]) => { picker.value = config[key]; text.value = config[key].toUpperCase(); });
    inputBorderRadius.value = config.borderRadius;
    radiusVal.innerText = `${config.borderRadius}px`;
    selectShadow.value = config.shadowDepth;
    selectComponentFont.value = config.themeTokens.fontFamily;
    inputBorderEnable.checked = config.borderOutline;
    inputBehaviorAccordionMulti.checked = config.accordionMulti;
    inputBehaviorAccordionAnimation.checked = config.accordionAnimation;
    selectIconStyle.value = config.iconStyle;
    updateAccordionBehaviorVisibility(appState.selectedComponent.id);
    inputTrackCompletion.checked = config.trackCompletion;
    inputCompletionMsg.value = config.completionMsg;
    activeComponentTitle.innerText = appState.selectedComponent.title;
    activeComponentCategory.innerText = appState.selectedComponent.category.toUpperCase();
    btnFavoriteToggle.classList.toggle('favorited', appState.favorites.has(appState.selectedComponent.id));
    updateThemeSourceIndicators();
    renderDynamicItems();
  }

  async function applyProject(project, isDraft = false) {
    const component = componentCatalog.find(item => item.id === project.componentId);
    if (!component) {
      showToast(`Cannot open “${project.name}”: its component is not available.`, 'error');
      return false;
    }
    resetConfig();
    appState.config = { ...appState.config, ...structuredClone(project.config), items: structuredClone(project.config.items) };
    appState.currentProjectId = getProject(project.id) ? project.id : null;
    appState.currentProjectName = project.name;
    appState.selectedComponent = component;
    applyMissingSchemaDefaults(component);
    const mediaRestore = await restoreMediaReferences(appState.config);
    appState.settings = { ...project.settings };
    appState.activeTheme = structuredClone(project.theme);
    appState.activeThemeId = project.theme.id;
    appState.componentOverrides = normalizeComponentOverrides(project.componentOverrides);
    appState.uiTheme = project.uiTheme;
    syncResolvedThemeConfig();
    setUiTheme(project.uiTheme);
    syncSettingsControls();
    syncEditorControls();
    showState('editor');
    updateLivePreview();
    if (mediaRestore.missing.length) {
      showToast(`${mediaRestore.missing.length} uploaded media file${mediaRestore.missing.length === 1 ? ' is' : 's are'} missing from this browser.`, 'warning', 6000);
    }
    if (!isDraft) saveCurrentDraft();
    return true;
  }

  function buildCurrentProject(name, asNew = false) {
    if (!appState.selectedComponent) throw new Error('Choose a component before saving.');
    const existing = !asNew && appState.currentProjectId ? getProject(appState.currentProjectId) : null;
    return buildProject({
      id: existing?.id,
      createdAt: existing?.createdAt,
      name,
      componentId: appState.selectedComponent.id,
      config: appState.config,
      activeTheme: appState.activeTheme,
      componentOverrides: appState.componentOverrides,
      uiTheme: appState.uiTheme,
      settings: appState.settings
    });
  }

  function collectValidationErrors() {
    const schema = appState.selectedComponent?.editorSchema;
    if (!schema) return [];
    const items = Array.isArray(appState.config.items) ? appState.config.items : [];
    const errors = [];

    if (items.length < (schema.minItems || 0)) {
      errors.push(`Add at least ${schema.minItems} ${schema.itemLabel.toLowerCase()}${schema.minItems === 1 ? '' : 's'}.`);
    }
    (schema.componentFields || []).forEach(field => {
      errors.push(...validateSchemaField(field, appState.config[field.id], items));
    });
    items.forEach((item, index) => {
      (schema.itemFields || []).forEach(field => {
        validateSchemaField(field, item[field.id], items)
          .forEach(message => errors.push(`${schema.itemLabel} ${index + 1}: ${message}`));
      });
    });

    const componentResult = validateActiveComponent(appState, componentRegistry);
    if (!componentResult.valid) errors.push(...componentResult.errors);

    return errors;
  }

  function openSaveDialog(mode = 'save', projectId = null) {
    saveDialogMode = mode;
    renameTargetId = projectId;
    const isRename = mode === 'rename';
    const target = isRename ? getProject(projectId) : null;
    saveModalTitle.textContent = isRename ? 'Rename Project' : 'Save Project';
    saveNameInput.value = target?.name || appState.currentProjectName || appState.selectedComponent?.title || '';
    document.getElementById('btn-confirm-save').textContent = isRename ? 'Rename' : 'Save';
    btnConfirmSaveAs.style.display = isRename ? 'none' : '';
    openModal('modal-save');
    saveNameInput.focus();
    saveNameInput.select();
  }

  function performSave(asNew) {
    const name = saveNameInput.value.trim();
    if (!name) {
      showToast('Enter a project name.', 'error');
      saveNameInput.focus();
      return;
    }
    try {
      const saved = saveProject(buildCurrentProject(name, asNew));
      appState.currentProjectId = saved.id;
      appState.currentProjectName = saved.name;
      saveDraft(saved);
      closeModal('modal-save');
      showToast(`Saved “${saved.name}”.`, 'success');
      updateStorageMeter();
      const accessibilityWarnings = validateMediaAccessibility(appState.config, appState.selectedComponent.id);
      if (accessibilityWarnings.length) showToast(accessibilityWarnings[0], 'warning', 6000);
    } catch (error) {
      showToast(error.message, 'error', 5000);
    }
  }

  function renderStoredProjects() {
    savedComponentsList.innerHTML = '';
    const projects = loadProjects();
    if (!projects.length) {
      const empty = document.createElement('div');
      empty.className = 'saved-components-empty';
      empty.textContent = 'No saved projects yet. Save a component or import a project JSON file.';
      savedComponentsList.appendChild(empty);
      return;
    }

    projects.forEach(project => {
      const card = document.createElement('div');
      card.className = `saved-component-card${project.id === appState.currentProjectId ? ' active-card' : ''}`;
      const details = document.createElement('div');
      details.className = 'sc-details';
      const name = document.createElement('div');
      name.className = 'sc-name';
      name.textContent = project.name;
      name.title = project.name;
      const meta = document.createElement('div');
      meta.className = 'sc-meta';
      const component = componentCatalog.find(item => item.id === project.componentId);
      meta.textContent = `Modified: ${new Date(project.updatedAt).toLocaleString()} • ${component?.title || project.componentId}`;
      details.append(name, meta);

      const actions = document.createElement('div');
      actions.className = 'sc-actions';
      const addAction = (label, handler) => {
        const button = document.createElement('button');
        button.className = 'btn btn-text btn-small';
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', handler);
        actions.appendChild(button);
      };
      addAction('Load', async () => {
        if (await applyProject(project)) {
          closeModal('modal-open');
          showToast(`Opened “${project.name}”.`, 'success');
        }
      });
      addAction('Rename', () => openSaveDialog('rename', project.id));
      addAction('Duplicate', () => {
        try { duplicateProject(project.id); renderStoredProjects(); showToast('Project duplicated.', 'success'); }
        catch (error) { showToast(error.message, 'error'); }
      });
      addAction('Export JSON', () => downloadProjectJson(project));
      addAction('Export Package', async () => {
        try {
          const packaged = await exportProjectPackage(project);
          downloadProjectPackage(project.name, packaged.blob);
          showToast(packaged.missing.length
            ? `Package downloaded (${formatExportedFileSize(packaged.size)}), but ${packaged.missing.length} referenced file(s) were missing from local storage and could not be included.`
            : `Portable project package downloaded (${formatExportedFileSize(packaged.size)}).`,
            packaged.missing.length ? 'warning' : 'success', 6000);
        } catch (error) { showToast(`Package export failed: ${error.message}`, 'error', 6000); }
      });
      addAction('Delete', async () => {
        const confirmed = await openConfirmDialog({ title: 'Delete Project', message: `Delete “${project.name}”? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
        if (!confirmed) return;
        try {
          deleteProject(project.id);
          if (appState.currentProjectId === project.id) appState.currentProjectId = null;
          renderStoredProjects();
          showToast(`Deleted “${project.name}”.`, 'success');
          updateStorageMeter();
        } catch (error) { showToast(error.message, 'error'); }
      });
      card.append(details, actions);
      savedComponentsList.appendChild(card);
    });
  }

  document.getElementById('btn-new').addEventListener('click', () => {
    clearDraft();
    resetConfig();
    const defaultTheme = getAvailableThemes().find(theme => theme.id === defaultThemeId)
      || BUILT_IN_THEMES.find(theme => theme.id === DEFAULT_THEME_ID);
    appState.activeThemeId = defaultTheme.id;
    appState.activeTheme = structuredClone(defaultTheme);
    appState.componentOverrides = {};
    syncResolvedThemeConfig();
    appState.currentProjectId = null;
    appState.currentProjectName = '';
    appState.selectedComponent = null;
    releaseAllMediaObjectURLs();
    showState('catalog');
    renderCatalog();
    showToast('New project started. Choose a component to begin.', 'success');
  });

  document.getElementById('btn-open').addEventListener('click', () => {
    renderStoredProjects();
    openModal('modal-open');
  });

  document.getElementById('btn-save').addEventListener('click', () => {
    const validationErrors = collectValidationErrors();
    if (validationErrors.length) {
      switchEditorTab('content');
      showToast(validationErrors[0], 'error', 6000);
      return;
    }
    openSaveDialog('save');
  });

  document.getElementById('btn-import-project').addEventListener('click', () => importProjectFile.click());
  importProjectFile.addEventListener('change', async () => {
    const file = importProjectFile.files?.[0];
    if (!file) return;
    try {
      if (isProjectPackageFile(file)) {
        const { project: imported, restoredMediaCount, missingMedia } = await importProjectPackage(file);
        renderStoredProjects();
        showToast(missingMedia.length
          ? `Imported “${imported.name}”, restored ${restoredMediaCount} media file(s), but ${missingMedia.length} referenced file(s) weren't in the package or this browser.`
          : `Imported “${imported.name}”${restoredMediaCount ? ` and restored ${restoredMediaCount} media file(s)` : ''}.`,
          missingMedia.length ? 'warning' : 'success', 6000);
      } else {
        const imported = importProjectJson(await file.text());
        renderStoredProjects();
        showToast(`Imported “${imported.name}”.`, 'success');
      }
    } catch (error) {
      showToast(`Import failed: ${error.message}`, 'error', 6000);
    } finally {
      importProjectFile.value = '';
    }
  });

  // Setup modal clicks
  Object.keys(modalTriggers).forEach(btnId => {
    const triggerBtn = document.getElementById(btnId);
    const modalId = modalTriggers[btnId];
    const modalElem = document.getElementById(modalId);
    
    if (triggerBtn && modalElem) {
      triggerBtn.addEventListener('click', () => {
        
        // Dynamic loading setup for Export modal
        if (modalId === 'modal-export') {
          setupExportModalContent();
        }
        if (modalId === 'modal-settings') syncSettingsControls();
        if (modalId === 'modal-theme-manager') renderThemeManager();
        if (modalId === 'modal-preflight') renderPreflightModal();

        openModal(modalId);
      });
    }
  });

  // Close modals
  modalOverlays.forEach(overlay => {
    const closeBtns = overlay.querySelectorAll('.modal-close-btn, .modal-cancel-btn');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });

    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal(overlay.id);
      });
    });
  });

  const btnConfirmSave = document.getElementById('btn-confirm-save');
  btnConfirmSave.addEventListener('click', () => {
    if (saveDialogMode === 'rename') {
      const name = saveNameInput.value.trim();
      if (!name) return showToast('Enter a project name.', 'error');
      try {
        renameProject(renameTargetId, name);
        if (appState.currentProjectId === renameTargetId) {
          appState.currentProjectName = name;
          saveCurrentDraft();
        }
        closeModal('modal-save');
        renderStoredProjects();
        showToast('Project renamed.', 'success');
      }
      catch (error) { showToast(error.message, 'error'); }
      return;
    }
    performSave(false);
  });
  btnConfirmSaveAs.addEventListener('click', () => performSave(true));

  // Settings Save
  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const selectFont = document.getElementById('settings-default-font');
      const selectExport = document.getElementById('settings-export-format');
      const checkAutosave = document.getElementById('settings-enable-autosave');
      const checkAi = document.getElementById('settings-enable-ai');
      const limitImage = document.getElementById('settings-limit-image');
      const limitAudio = document.getElementById('settings-limit-audio');
      const limitVideo = document.getElementById('settings-limit-video');
      const limitSvg = document.getElementById('settings-limit-svg');
      const completionOrigin = document.getElementById('settings-completion-origin');

      try {
        appState.settings = saveSettings({
          defaultFont: selectFont.value,
          exportFormat: selectExport.value,
          autosave: checkAutosave.checked,
          aiEnabled: checkAi.checked,
          mediaLimitsMb: {
            image: Number(limitImage.value),
            audio: Number(limitAudio.value),
            video: Number(limitVideo.value),
            svg: Number(limitSvg.value)
          },
          completionParentOrigin: completionOrigin.value
        });
        syncSettingsControls();
        if (!appState.settings.autosave) clearDraft();
        else saveCurrentDraft();
        showToast('Settings applied successfully.', 'success');
        closeModal('modal-settings');
        renderDynamicItems();
        updateLivePreview();
      } catch (error) {
        showToast(error.message, 'error', 5000);
      }
    });
  }

  // Export compatibility report — shown before any download/copy action, sourced from
  // js/compatibility.js so the UI never asserts a host-compatibility claim the docs don't.
  function renderExportCompatibilityReport(formatKey) {
    const container = document.getElementById('export-compatibility-report');
    if (!container) return;
    const entry = getExportFormatCompatibility(formatKey);
    if (!entry) { container.innerHTML = ''; return; }
    const tier = COMPATIBILITY_TIERS[entry.tier];
    container.innerHTML = `
      <div class="compat-report-header">
        <span class="compat-report-title">Compatibility</span>
        <span class="compat-badge ${tier.badgeClass}">${tier.label}</span>
      </div>
      <p class="compat-report-summary">${escapeHTML(entry.summary)}</p>
      <ul class="compat-report-details">${entry.details.map(detail => `<li>${escapeHTML(detail)}</li>`).join('')}</ul>
    `;
  }

  // Export Tab Toggle Options
  const exportTabs = document.querySelectorAll('.export-tab');
  const exportPanes = document.querySelectorAll('.export-pane');
  exportTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      exportTabs.forEach(t => t.classList.remove('active'));
      exportPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const paneId = `pane-export-${tab.getAttribute('data-export-type')}`;
      document.getElementById(paneId).classList.add('active');
      renderExportCompatibilityReport(tab.getAttribute('data-export-type'));
    });
  });

  // Code Copy Buttons
  setupCopyBtn('btn-copy-iframe', 'export-iframe-code');
  setupCopyBtn('btn-copy-html', 'export-html-code');

  function setupCopyBtn(btnId, targetId) {
    const btn = document.getElementById(btnId);
    const target = document.getElementById(targetId);
    if (btn && target) {
      btn.addEventListener('click', async () => {
        const code = target.textContent || '';
        const originalText = btn.textContent;
        btn.disabled = true;

        try {
          await copyTextToClipboard(code);
          btn.textContent = 'Copied!';
          btn.classList.add('copy-success');
          showToast('Code copied to the clipboard.', 'success');
        } catch (error) {
          btn.textContent = 'Copy failed';
          btn.classList.add('copy-error');
          showToast(error.message, 'error', 6000);
        }

        window.setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('copy-success', 'copy-error');
          btn.disabled = false;
        }, 2000);
      });
    }
  }

  let currentExportBundle = null;
  let currentRiseZipBundle = null;
  async function prepareCurrentExport() {
    const prepared = await prepareMediaExport(appState.config);
    const exportState = { ...appState, config: prepared.config };
    const html = compilePreview(exportState, componentRegistry, colorToRgba);
    return { html, assets: prepared.assets, ...buildExportPayload(html, prepared) };
  }

  // Rise Project ZIP always packages every local asset (never inlines, never blocks on
  // "requires a separate file" — packaging one *is* the point), and the ZIP is only
  // actually assembled after every asset resolves, since a missing asset blocks this
  // export entirely rather than shipping an index.html with a dangling reference.
  async function prepareRiseZipBundle() {
    const prepared = await prepareMediaExport(appState.config, { mode: 'package' });
    const exportState = { ...appState, config: prepared.config };
    const html = compilePreview(exportState, componentRegistry, colorToRgba);
    if (prepared.missing.length) {
      return { html, manifest: prepared.manifest, warnings: prepared.warnings, missing: prepared.missing, blob: null, size: 0 };
    }
    const packaged = await buildRiseProjectZip({ html, assets: prepared.assets, manifest: prepared.manifest });
    return {
      html, manifest: prepared.manifest, missing: prepared.missing,
      warnings: [...prepared.warnings, ...packaged.warnings], blob: packaged.blob, size: packaged.size
    };
  }

  function setExportActionsEnabled(enabled) {
    ['btn-copy-iframe', 'btn-copy-html', 'btn-download-html'].forEach(id => {
      const button = document.getElementById(id);
      if (!button) return;
      button.disabled = !enabled;
      button.title = enabled ? '' : 'Fix the blocking errors listed above before exporting.';
    });
    // The Rise Project ZIP button has its own independent, narrower block condition
    // (a genuinely missing asset) layered on top of this preflight gate — see
    // setRiseZipActionEnabled() below, called from setupExportModalContent().
    const zipButton = document.getElementById('btn-download-rise-zip');
    if (zipButton && enabled === false) {
      zipButton.disabled = true;
      zipButton.title = 'Fix the blocking errors listed above before exporting.';
    }
  }

  async function runExportPreflightGate() {
    const container = document.getElementById('export-preflight-results');
    const context = buildPreflightContext();
    if (!container || !context) { setExportActionsEnabled(true); return true; }
    try {
      const issues = await runPreflight(context);
      const summary = renderPreflightResults(container, issues);
      updatePreflightBadge(summary);
      setExportActionsEnabled(summary.canExport);
      return summary.canExport;
    } catch (error) {
      container.innerHTML = `<div class="preflight-empty">Preflight check failed: ${escapeHTML(error.message)}</div>`;
      setExportActionsEnabled(true); // fail open: a broken preflight check must not itself block a working export
      return true;
    }
  }

  function updateRiseZipRecommendedBadge() {
    const badge = document.getElementById('rise-zip-recommended-badge');
    if (badge) badge.hidden = collectMediaReferences(appState.config).length === 0;
  }

  async function setupExportModalContent() {
    const activeTab = document.querySelector('.export-tab.active');
    renderExportCompatibilityReport(activeTab ? activeTab.getAttribute('data-export-type') : 'iframe');
    updateRiseZipRecommendedBadge();
    const canExport = await runExportPreflightGate();
    const warningBox = document.getElementById('export-media-warning');
    if (warningBox) { warningBox.hidden = false; warningBox.classList.add('is-loading'); warningBox.textContent = 'Preparing media export…'; }
    try {
      currentExportBundle = await prepareCurrentExport();
    } catch (error) {
      currentExportBundle = null;
      if (warningBox) { warningBox.classList.remove('is-loading'); warningBox.textContent = `Export preparation failed: ${error.message}`; }
      showToast(`Export preparation failed: ${error.message}`, 'error', 6000);
      return;
    }
    const payload = currentExportBundle;

    // Iframe Embed Code using self-contained srcdoc
    const iframeCode = document.getElementById('export-iframe-code');
    iframeCode.textContent = payload.iframe;

    // Paste-friendly HTML fragment for custom HTML blocks
    const htmlCode = document.getElementById('export-html-code');
    htmlCode.textContent = payload.fragment;
    if (warningBox) {
      warningBox.classList.remove('is-loading');
      warningBox.hidden = payload.warnings.length === 0;
      warningBox.textContent = payload.warnings.join(' ');
    }

    const fileSizeLabel = document.getElementById('export-file-size');
    if (fileSizeLabel) fileSizeLabel.textContent = `Standalone HTML file size: ${formatExportedFileSize(getExportedFileSize(payload.html))}`;

    await setupRiseZipPane(canExport);
  }

  async function setupRiseZipPane(canExport) {
    const zipWarningBox = document.getElementById('rise-zip-warning');
    const zipBlockingBox = document.getElementById('rise-zip-blocking');
    const zipSizeLabel = document.getElementById('rise-zip-file-size');
    const zipManifestCode = document.getElementById('rise-zip-manifest');
    const zipButton = document.getElementById('btn-download-rise-zip');
    if (zipWarningBox) { zipWarningBox.hidden = false; zipWarningBox.classList.add('is-loading'); zipWarningBox.textContent = 'Preparing Rise Project ZIP…'; }
    try {
      currentRiseZipBundle = await prepareRiseZipBundle();
    } catch (error) {
      currentRiseZipBundle = null;
      if (zipWarningBox) { zipWarningBox.classList.remove('is-loading'); zipWarningBox.textContent = `ZIP preparation failed: ${error.message}`; }
      return;
    }
    const bundle = currentRiseZipBundle;
    if (zipManifestCode) zipManifestCode.textContent = JSON.stringify(bundle.manifest, null, 2);
    if (zipWarningBox) {
      zipWarningBox.classList.remove('is-loading');
      zipWarningBox.hidden = bundle.warnings.length === 0;
      zipWarningBox.textContent = bundle.warnings.join(' ');
    }
    const blocked = bundle.missing.length > 0;
    if (zipBlockingBox) {
      zipBlockingBox.hidden = !blocked;
      zipBlockingBox.textContent = blocked
        ? `Export blocked: ${bundle.missing.length} required asset${bundle.missing.length === 1 ? ' is' : 's are'} missing from local storage (${bundle.missing.join(', ')}). Re-upload the missing file(s) before exporting.`
        : '';
    }
    if (zipSizeLabel) zipSizeLabel.textContent = blocked ? '' : `Rise Project ZIP size: ${formatExportedFileSize(bundle.size)}`;
    if (zipButton) {
      const enabled = canExport && !blocked;
      zipButton.disabled = !enabled;
      zipButton.title = blocked ? 'Re-upload the missing asset(s) before exporting.' : enabled ? '' : 'Fix the blocking errors listed above before exporting.';
    }
  }

  const btnDownloadHtml = document.getElementById('btn-download-html');
  if (btnDownloadHtml) {
    btnDownloadHtml.addEventListener('click', async () => {
      const title = appState.selectedComponent?.title || 'rise-component';
      let bundle;
      try {
        bundle = await prepareCurrentExport();
      } catch (error) {
        showToast(`Export failed: ${error.message}`, 'error', 6000);
        return;
      }
      if (bundle.warnings.length) {
        currentExportBundle = bundle;
        showToast('Single-file export is blocked because one or more uploaded assets require separate files. Use the Rise Project ZIP option instead.', 'warning', 7000);
        return;
      }
      downloadHtml(title, bundle.html);
    });
  }

  const btnDownloadRiseZip = document.getElementById('btn-download-rise-zip');
  if (btnDownloadRiseZip) {
    btnDownloadRiseZip.addEventListener('click', async () => {
      const title = appState.selectedComponent?.title || 'rise-component';
      let bundle = currentRiseZipBundle;
      try {
        if (!bundle) bundle = await prepareRiseZipBundle();
      } catch (error) {
        showToast(`Export failed: ${error.message}`, 'error', 6000);
        return;
      }
      if (bundle.missing.length) {
        showToast(`Export blocked: ${bundle.missing.length} required asset${bundle.missing.length === 1 ? ' is' : 's are'} missing from local storage. Re-upload the missing file(s).`, 'error', 7000);
        return;
      }
      downloadZipFile(title, bundle.blob);
      showToast(`Rise Project ZIP downloaded (${formatExportedFileSize(bundle.size)}).`, 'success');
    });
  }

  // ==========================================
  // LIVE PREVIEW COMPILER & GENERATOR
  // ==========================================
  let draftTimer = null;

  function saveCurrentDraft() {
    if (!appState.settings.autosave || !appState.selectedComponent) return;
    try {
      const existing = appState.currentProjectId ? getProject(appState.currentProjectId) : null;
      saveDraft(buildProject({
        id: existing?.id || 'draft',
        createdAt: existing?.createdAt,
        name: appState.currentProjectName || appState.selectedComponent.title,
        componentId: appState.selectedComponent.id,
        config: appState.config,
        activeTheme: appState.activeTheme,
        componentOverrides: appState.componentOverrides,
        uiTheme: appState.uiTheme,
        settings: appState.settings
      }));
    } catch (error) {
      showToast(`Draft autosave failed: ${error.message}`, 'error', 5000);
    }
  }

  function scheduleDraftSave() {
    if (!appState.settings.autosave || !appState.selectedComponent) return;
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(saveCurrentDraft, 700);
  }

  function updateLivePreview() {
    if (!livePreviewIframe) return;
    currentExportBundle = null;
    pruneMediaObjectURLs(appState.config);
    validateActiveComponent(appState, componentRegistry);
    writePreview(livePreviewIframe, generateIframeContent());
    scheduleDraftSave();
    refreshPreflightBadge();
    refreshItemIssueBadges();
  }

  // ==========================================
  // PREFLIGHT VALIDATION (js/validation.js)
  // ==========================================
  const SEVERITY_LABELS = { blocking: 'Blocking Errors', warning: 'Warnings', recommendation: 'Recommendations' };

  function buildPreflightContext() {
    if (!appState.selectedComponent) return null;
    return {
      componentId: appState.selectedComponent.id,
      schema: appState.selectedComponent.editorSchema,
      config: appState.config,
      theme: appState.activeTheme,
      componentOverrides: appState.componentOverrides,
      settings: appState.settings
    };
  }

  function refreshPreflightBadge() {
    const context = buildPreflightContext();
    if (!context) return;
    updatePreflightBadge(summarizePreflight(collectSyncIssues(context)));
  }

  function updatePreflightBadge(summary) {
    if (!preflightBadge) return;
    const total = summary.blocking.length + summary.warnings.length + summary.recommendations.length;
    preflightBadge.dataset.state = summary.blocking.length ? 'blocking' : total ? 'warning' : 'clean';
    preflightBadge.textContent = total ? `Preflight (${total})` : 'Preflight';
  }

  function jumpToPreflightField(fieldId, itemIndexRaw) {
    const itemIndex = itemIndexRaw === '' || itemIndexRaw === undefined ? null : Number(itemIndexRaw);
    closeModal('modal-preflight');
    window.setTimeout(() => {
      let target = null;
      if (Number.isInteger(itemIndex)) {
        const card = dynamicItemsContainer.querySelector(`.dynamic-item-card[data-index="${itemIndex}"]`);
        if (card?.classList.contains('collapsed')) card.querySelector('.item-collapse-btn')?.click();
        target = card?.querySelector(`[data-field-id="${fieldId}"]`) || card;
      } else if (fieldId === 'blockHeadline') {
        target = inputBlockHeadline;
      } else if (fieldId) {
        target = document.querySelector(`#config-form [data-field-id="${fieldId}"]`);
      }
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus?.();
    }, 60);
  }

  function renderPreflightResults(container, issues) {
    const summary = summarizePreflight(issues);
    const sections = [['blocking', summary.blocking], ['warning', summary.warnings], ['recommendation', summary.recommendations]];
    const sectionsHTML = sections.filter(([, list]) => list.length).map(([severity, list]) => `
      <div class="preflight-section">
        <div class="preflight-section-title is-${severity}">${SEVERITY_LABELS[severity]} (${list.length})</div>
        <ul class="preflight-issue-list">
          ${list.map(item => `
            <li class="preflight-issue">
              <span class="preflight-issue-message">${escapeHTML(item.message)}</span>
              ${item.fieldId ? `<button type="button" class="preflight-issue-jump" data-field-id="${escapeHTML(item.fieldId)}" data-item-index="${item.itemIndex ?? ''}">Go to field</button>` : ''}
            </li>`).join('')}
        </ul>
      </div>`).join('');
    container.innerHTML = sectionsHTML || '<div class="preflight-empty">No issues found — this component is clean.</div>';
    container.querySelectorAll('.preflight-issue-jump').forEach(button => {
      button.addEventListener('click', () => jumpToPreflightField(button.dataset.fieldId, button.dataset.itemIndex));
    });
    return summary;
  }

  async function renderPreflightModal() {
    const container = document.getElementById('preflight-results');
    if (!container) return;
    const context = buildPreflightContext();
    if (!context) { container.innerHTML = '<div class="preflight-empty">Select a component first.</div>'; return; }
    container.innerHTML = '<div class="preflight-empty">Running preflight checks…</div>';
    try {
      const issues = await runPreflight(context);
      const summary = renderPreflightResults(container, issues);
      updatePreflightBadge(summary);
    } catch (error) {
      container.innerHTML = `<div class="preflight-empty">Preflight check failed: ${escapeHTML(error.message)}</div>`;
    }
  }

  // Run the initialization
  window.addEventListener('beforeunload', releaseAllMediaObjectURLs);
  await init();

});
