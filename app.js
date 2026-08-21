/* Rise Component Builder — Application Shell Logic */
// @ts-nocheck -- extensive untyped document.getElementById() DOM wiring; see docs/TESTING-STRATEGY.md "Type checking".
// Opt back in incrementally as sections of this file are typed or migrated into the component registry (docs/ARCHITECTURE.md §1).

import { appState, resetConfig } from './js/state.js';
import { APP_VERSION } from './js/version.js';
import {
  buildProject, clearDraft, deleteProject, duplicateProject, getProject, importProjectJson,
  loadCustomThemes, loadDefaultThemeId, loadDraft, loadFavorites, loadPreviewDevice,
  loadProjects, loadRecentlyUsed, loadSettings, loadUiTheme, renameProject, saveDraft,
  saveFavorites, savePreviewDevice, saveProject, saveRecentlyUsed, saveSettings, saveUiTheme,
  withRecentlyUsedEntry
} from './js/storage.js';
import { componentCatalog, filterCatalog, createCatalogCard } from './js/catalog.js';
import { COMPONENT_REGISTRY, getCategoriesWithCounts, getComponentById, getDefaultConfig } from './js/component-registry.js';
import { createSchemaItemEditor, switchEditorTab as activateEditorTab, addEditorItem, validateActiveComponent, validateSchemaField } from './js/editor.js';
import { writePreview, openPreview, generateIframeContent as compilePreview, COMPONENT_MAX_WIDTH } from './js/preview.js';
import { getDeviceWidthLabel } from './js/device-preview.js';
import { measureRenderedDimensions } from './js/dom-measurement.js';
import {
  buildExportPayload, buildLargePasteWarning, buildRiseProjectZip, downloadHtml, downloadProjectJson,
  downloadZipFile, formatExportedFileSize, getExportedFileSize, prepareMediaExport
} from './js/export.js';
import { copyTextToClipboard, describeStorageUsage, escapeHTML, formatItemLabel, normalizeHeadingLevel, toRgba as colorToRgba } from './js/utilities.js';
import { showToast } from './js/toast.js';
import { COMPATIBILITY_TIERS, getExportFormatCompatibility } from './js/compatibility.js';
import {
  checkCompletionExportFormatIssue, collectSyncIssues, runPreflight, summarizePreflight, summarizePreflightForAnnouncement
} from './js/validation.js';
import { resolveMediaLimits, validateMediaAccessibility } from './js/media.js';
import { downloadProjectPackage, exportProjectPackage, importProjectPackage, isProjectPackageFile } from './js/project-package.js';
import { pruneMediaObjectURLs, releaseAllMediaObjectURLs, restoreMediaReferences } from './js/media-storage.js';
import { applyThemeToConfig, BUILT_IN_THEMES, DEFAULT_THEME_ID, getBuiltInTheme, normalizeComponentOverrides } from './js/themes.js';
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
  appState.recentlyUsed = loadRecentlyUsed();
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
  const recentCountBadge = document.getElementById('recent-count-badge');
  const preflightBadge = document.getElementById('preflight-badge');
  
  // Editor Tabs
  const editorTabs = document.querySelectorAll('.editor-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // Form Inputs
  const inputBlockTitle = document.getElementById('input-block-title');
  const inputBlockHeadline = document.getElementById('input-block-headline');
  const inputBlockDesc = document.getElementById('input-block-desc');
  const selectHeadingLevel = document.getElementById('select-heading-level');

  const inputBehaviorAccordionMulti = document.getElementById('input-behavior-accordion-multi');
  const inputBehaviorAccordionAnimation = document.getElementById('input-behavior-accordion-animation');
  const selectIconStyle = document.getElementById('select-icon-style');
  const accordionBehaviorGroup = document.getElementById('accordion-behavior-group');
  const inputAccordionSequential = document.getElementById('input-accordion-sequential');
  const inputAccordionShowProgress = document.getElementById('input-accordion-show-progress');
  const inputAccordionShowVisitedBadge = document.getElementById('input-accordion-show-visited-badge');
  const inputAccordionExpandCollapseAll = document.getElementById('input-accordion-expand-collapse-all');
  const inputAccordionSearch = document.getElementById('input-accordion-search');
  const inputAccordionAllowReset = document.getElementById('input-accordion-allow-reset');

  const flipCardsBehaviorGroup = document.getElementById('flip-cards-behavior-group');
  const selectFlipCardsMode = document.getElementById('select-flip-cards-mode');
  const inputFlipCardsShuffle = document.getElementById('input-flip-cards-shuffle');
  const inputFlipCardsCategories = document.getElementById('input-flip-cards-categories');
  const inputFlipCardsSummary = document.getElementById('input-flip-cards-summary');
  const inputFlipCardsReset = document.getElementById('input-flip-cards-reset');
  const inputFlipCardsFrontLabel = document.getElementById('input-flip-cards-front-label');
  const inputFlipCardsBackLabel = document.getElementById('input-flip-cards-back-label');

  const tabsBehaviorGroup = document.getElementById('tabs-behavior-group');
  const selectTabsOrientation = document.getElementById('select-tabs-orientation');
  const inputTabsNumbered = document.getElementById('input-tabs-numbered');
  const inputTabsSequential = document.getElementById('input-tabs-sequential');
  const inputTabsShowProgress = document.getElementById('input-tabs-show-progress');
  const inputTabsShowVisitedBadge = document.getElementById('input-tabs-show-visited-badge');
  const inputTabsCompareMode = document.getElementById('input-tabs-compare-mode');
  const inputTabsAllowReset = document.getElementById('input-tabs-allow-reset');

  const mcBehaviorGroup = document.getElementById('mc-behavior-group');
  const inputMcConfidenceMode = document.getElementById('input-mc-confidence-mode');
  const inputMcRequireConfidence = document.getElementById('input-mc-require-confidence');
  const inputMcConfidenceLowLabel = document.getElementById('input-mc-confidence-low-label');
  const inputMcConfidenceMidLabel = document.getElementById('input-mc-confidence-mid-label');
  const inputMcConfidenceHighLabel = document.getElementById('input-mc-confidence-high-label');
  const inputMcShowResultSummary = document.getElementById('input-mc-show-result-summary');
  const inputMcMaxAttempts = document.getElementById('input-mc-max-attempts');
  const inputMcHintText = document.getElementById('input-mc-hint-text');
  const inputMcShowCorrectAfterFinal = document.getElementById('input-mc-show-correct-after-final');
  const inputMcFinalExplanation = document.getElementById('input-mc-final-explanation');
  const inputMcAllowReset = document.getElementById('input-mc-allow-reset');

  const inputTrackCompletion = document.getElementById('input-track-completion');
  const inputCompletionMsg = document.getElementById('input-completion-msg');
  
  // Dynamic Content Items
  const dynamicItemsContainer = document.getElementById('dynamic-items-container');
  const btnAddItem = document.getElementById('btn-add-item');
  const btnExpandAllItems = document.getElementById('btn-expand-all-items');
  const btnCollapseAllItems = document.getElementById('btn-collapse-all-items');
  
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

  // Modals elements
  const modalTriggers = {
    'btn-export': 'modal-export',
    'btn-settings': 'modal-settings',
    'btn-preflight': 'modal-preflight'
  };
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  modalOverlays.forEach(overlay => overlay.setAttribute('aria-hidden', 'true'));

  // ==========================================
  // INITIALIZATION
  // ==========================================
  async function init() {
    // P09: sourced from js/version.js — the one place this value is maintained — rather
    // than a hand-typed string in index.html, which had drifted out of sync with
    // package.json's own version before this. No date is shown alongside it (Requirement
    // 5): this project has no real release-date tracking to source one from truthfully.
    const versionTag = document.getElementById('app-version-tag');
    if (versionTag) {
      versionTag.textContent = `v${APP_VERSION}`;
      versionTag.hidden = false;
    }

    // 1. Load theme state
    setUiTheme(appState.uiTheme);
    document.documentElement.style.setProperty('--component-max-width', `${COMPONENT_MAX_WIDTH}px`);
    applyDeviceMode(loadPreviewDevice());

    // 2. Render initial category catalog
    renderCatalog();
    updateCategoryBadges();

    // 3. Update Favorites/Recently Used counts
    updateFavoritesBadge();
    updateRecentBadge();
    updateStorageMeter();

    // 4. Hook up live sync for values in Form Inputs
    setupFormListeners();
    
    // 5. Restore a valid draft, otherwise build the initial preview.
    syncSettingsControls();
    const draft = loadDraft();
    if (draft && await applyProject(draft, true)) {
      showToast(`Restored draft “${draft.name}”.`, 'success');
    } else {
      // P12: a genuinely fresh launch (no draft) starts on the catalog with nothing
      // selected — explicit rather than relying on index.html's static default markup, so
      // updateToolbarActionAvailability()/updatePreviewEmptyState() run on this path too.
      showState('catalog');
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

  // ==========================================
  // ROUTING & NAVIGATION
  // ==========================================
  navItems.forEach(item => {
    item.addEventListener('click', () => {
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
    appState.searchQuery = e.target.value;

    // Ensure we are on the catalog view when searching
    showState('catalog');
    renderCatalog();
  });

  function showState(state) {
    if (state === 'catalog') {
      catalogState.style.display = 'flex';
      editorState.style.display = 'none';
      const status = document.getElementById('project-status');
      if (status) status.hidden = true; // no project context on the catalog screen
    } else if (state === 'editor') {
      catalogState.style.display = 'none';
      editorState.style.display = 'flex';
      // Switch editor tabs back to the first 'content' tab
      switchEditorTab('content');
    }
    // P12: the single chokepoint every catalog<->editor transition passes through, so the
    // toolbar's Save/Export availability and the preview panel's empty state never need a
    // separate call site of their own to stay in sync with what's actually on screen.
    updateToolbarActionAvailability();
    updatePreviewEmptyState();
  }

  // P12 Requirement 3: there is no valid selected component to save or export while the
  // catalog screen is showing — whether that's a fresh launch, "New Project," or "Back to
  // Templates" (which also clears appState.selectedComponent, see performBackToCatalog).
  // Explains why near the disabled action via `title`/`aria-label`, matching the existing
  // pattern setExportActionsEnabled() uses for the Blocking-issues case inside the modal.
  function updateToolbarActionAvailability() {
    const hasSelection = Boolean(appState.selectedComponent);
    const noSelectionReason = 'Select a component to enable this.';
    [document.getElementById('btn-save'), document.getElementById('btn-export')].forEach(button => {
      if (!button) return;
      if (!button.dataset.defaultTitle) button.dataset.defaultTitle = button.title;
      button.disabled = !hasSelection;
      const title = hasSelection ? button.dataset.defaultTitle : noSelectionReason;
      button.title = title;
      button.setAttribute('aria-label', title);
    });
  }

  // P12: the live preview panel is a permanent sibling of the catalog/editor screens (not
  // hidden by showState() the way #catalog-state/#editor-state are), so without this it
  // would keep silently rendering appState.config's leftover content — the sample
  // accordion's own default data — even on a bare catalog screen where nothing is
  // selected, contradicting what the catalog screen itself is showing.
  function updatePreviewEmptyState() {
    const emptyState = document.getElementById('preview-empty-state');
    if (!emptyState || !livePreviewIframe) return;
    const hasSelection = Boolean(appState.selectedComponent);
    livePreviewIframe.hidden = !hasSelection;
    emptyState.hidden = hasSelection;
  }

  // P08: header identity/save-status ("Untitled project · Unsaved changes" /
  // "Project name · Saved") — updateLivePreview() calls this on every meaningful edit, but
  // the DOM text only actually changes on a dirty-state transition (clean->dirty happens
  // once per edit session, not per keystroke), so this never becomes noisy chatter despite
  // being an aria-live region (Requirement 7).
  function updateProjectStatusDisplay() {
    const status = document.getElementById('project-status');
    if (!status || !appState.selectedComponent) return;
    status.hidden = false;
    const name = appState.currentProjectName || 'Untitled project';
    // A project with no backing save is always "Unsaved changes," regardless of the
    // isDirty flag's raw value — there is nothing yet to have drifted from.
    const isSaved = Boolean(appState.currentProjectId) && !appState.isDirty;
    const label = `${name} · ${isSaved ? 'Saved' : 'Unsaved changes'}`;
    if (status.textContent !== label) status.textContent = label; // avoid redundant aria-live re-announcement
    status.classList.toggle('is-saved', isSaved);
    status.classList.toggle('is-unsaved', !isSaved);
  }

  // Resumes whatever New/Open/Back-to-Templates action the user was attempting once a
  // Save chosen from guardUnsavedChanges() actually succeeds (openSaveDialog's own
  // modalDefaultSettlers entry, below, clears this if that save is cancelled instead).
  let pendingActionAfterSave = null;

  /**
   * Requirement 4/5, P08: call before New Project, Back to Templates, or loading a
   * different saved project. Returns `true` when the caller should proceed immediately
   * (nothing dirty, or the user chose Discard), `false` when the caller must not proceed
   * (Cancel), or `'deferred'` when the user chose Save — in that case this function has
   * already opened the save dialog and stashed `action` in pendingActionAfterSave; the
   * caller should not also run `action` itself.
   */
  async function guardUnsavedChanges(action) {
    if (!appState.isDirty) return true;
    const result = await openConfirmDialog({
      title: 'Unsaved changes',
      message: `“${appState.currentProjectName || 'Untitled project'}” has unsaved changes. Save before continuing?`,
      confirmLabel: 'Discard',
      cancelLabel: 'Cancel',
      danger: true,
      extraLabel: 'Save'
    });
    if (result === false) return false;
    if (result === true) return true;
    pendingActionAfterSave = action;
    openSaveDialog('save');
    return 'deferred';
  }

  // ==========================================
  // CATALOG RENDERING
  // ==========================================
  function renderCatalog() {
    componentsGrid.innerHTML = '';

    const filtered = filterCatalog(componentCatalog, appState);

    if (filtered.length === 0) {
      const query = appState.searchQuery.trim();
      if (query) {
        // P11 Requirement 4: name the query back to the user and offer a one-click way out,
        // rather than a generic "try something else" with no path forward.
        componentsGrid.innerHTML = `
          <div class="catalog-empty-state">
            <div class="catalog-empty-icon" aria-hidden="true">🔍</div>
            <h4>No results for “${escapeHTML(query)}”</h4>
            <p>Try a different term, or clear the search to browse by category.</p>
          </div>
        `;
        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'btn btn-text btn-small catalog-empty-clear';
        clearButton.textContent = 'Clear search';
        clearButton.addEventListener('click', () => {
          searchInput.value = '';
          appState.searchQuery = '';
          renderCatalog();
          searchInput.focus(); // P11 Requirement 8: this button is destroyed by the render() above it triggers — hand focus back to the search box rather than dropping it.
        });
        componentsGrid.querySelector('.catalog-empty-state').appendChild(clearButton);
      } else if (appState.activeCategory === 'favorites') {
        componentsGrid.innerHTML = `
          <div class="catalog-empty-state">
            <div class="catalog-empty-icon" aria-hidden="true">★</div>
            <h4>No Favorites Yet</h4>
            <p>Click the star on any component to add it here for quick access.</p>
          </div>
        `;
      } else if (appState.activeCategory === 'recent') {
        componentsGrid.innerHTML = `
          <div class="catalog-empty-state">
            <div class="catalog-empty-icon" aria-hidden="true">🕐</div>
            <h4>Nothing Used Yet</h4>
            <p>Components you open will show up here for quick access.</p>
          </div>
        `;
      } else {
        componentsGrid.innerHTML = `
          <div class="catalog-empty-state">
            <div class="catalog-empty-icon" aria-hidden="true">🔍</div>
            <h4>No Components Found</h4>
            <p>Select another category from the sidebar.</p>
          </div>
        `;
      }
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
    updateFlipCardsBehaviorVisibility(component.id);
    updateMcBehaviorVisibility(component.id);
    updateTabsBehaviorVisibility(component.id);

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

    // P11 Requirement 1: a freshly-picked component starts with only its first item
    // expanded, not every item at once.
    schemaItemEditor.resetToDefaultCollapse(appState.config.items);
    // Render dynamic item list inputs
    renderDynamicItems();

    recordRecentlyUsed(component.id);

    // Show Editor Layout
    showState('editor');

    // Force live preview frame refresh
    updateLivePreview();
    // P08: an unmodified component's own schema defaults are not "meaningful project data
    // changes" (Requirement 2) — nothing has actually been authored yet, so there's
    // nothing to guard against losing. Same load-vs-edit reset updateLivePreview()'s own
    // comment describes, applied here for the same reason applyProject() needs it.
    appState.isDirty = false;
    updateProjectStatusDisplay();
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

  function performBackToCatalog() {
    // P12: "Back to Templates" is a deselection, not just a screen change — makes
    // appState.selectedComponent the single source of truth for "is a component currently
    // loaded," rather than needing callers to also check which screen is visible. Any
    // unsaved edits were already resolved by guardUnsavedChanges() before this runs.
    appState.selectedComponent = null;
    showState('catalog');
    renderCatalog();
  }

  btnBackToCatalog.addEventListener('click', async () => {
    const guard = await guardUnsavedChanges(performBackToCatalog);
    if (guard === true) performBackToCatalog();
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

  function updateRecentBadge() {
    if (recentCountBadge) recentCountBadge.innerText = appState.recentlyUsed.length;
  }

  // P11 Requirement 5: recorded exactly once per selection — a fresh component pick
  // (loadComponentToEditor) or opening/restoring a saved project (applyProject via
  // syncEditorControls) — never on every keystroke or re-render.
  function recordRecentlyUsed(componentId) {
    appState.recentlyUsed = withRecentlyUsedEntry(appState.recentlyUsed, componentId);
    updateRecentBadge();
    try { saveRecentlyUsed(appState.recentlyUsed); }
    catch (error) { showToast(error.message, 'error'); }
    if (appState.activeCategory === 'recent') renderCatalog();
  }

  function updateCategoryBadges() {
    getCategoriesWithCounts(COMPONENT_REGISTRY).forEach(({ id, count }) => {
      const badge = document.querySelector(`.nav-item[data-category="${id}"] .badge`);
      if (badge) badge.textContent = String(count);
    });
  }

  async function updateStorageMeter() {
    const label = document.getElementById('storage-usage-label');
    const bar = document.getElementById('storage-progress-bar');
    const track = bar?.closest('.storage-bar');
    if (!label || !bar || !track) return;

    let state;
    if (!navigator.storage?.estimate) {
      state = describeStorageUsage({ supported: false });
    } else {
      try {
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        state = describeStorageUsage({ supported: true, usage, quota });
      } catch {
        state = describeStorageUsage({ supported: true, failed: true });
      }
    }

    label.textContent = state.label;
    label.title = state.tooltip;
    bar.style.width = `${state.percent}%`;
    track.setAttribute('aria-valuenow', String(state.percent));
    track.setAttribute('aria-label', `Browser storage: ${state.label}`);
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

    // Colors, fonts, border radius, and shadow are permanently locked to the single AT&T
    // theme (js/themes.js) — no per-component override UI exists in this build.

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

    syncCheckbox(inputBehaviorAccordionMulti, 'accordionMulti');
    syncCheckbox(inputBehaviorAccordionAnimation, 'accordionAnimation');
    syncCheckbox(inputAccordionSequential, 'accordionSequential');
    syncCheckbox(inputAccordionShowProgress, 'accordionShowProgress');
    syncCheckbox(inputAccordionShowVisitedBadge, 'accordionShowVisitedBadge');
    syncCheckbox(inputAccordionExpandCollapseAll, 'accordionExpandCollapseAll');
    syncCheckbox(inputAccordionSearch, 'accordionSearch');
    syncCheckbox(inputAccordionAllowReset, 'accordionAllowReset');
    syncCheckbox(inputTrackCompletion, 'trackCompletion');

    selectFlipCardsMode.addEventListener('change', (e) => {
      appState.config.flipCardsMode = e.target.value;
      updateLivePreview();
    });
    syncCheckbox(inputFlipCardsShuffle, 'flipCardsShuffle');
    syncCheckbox(inputFlipCardsCategories, 'flipCardsCategories');
    syncCheckbox(inputFlipCardsSummary, 'flipCardsSummary');
    syncCheckbox(inputFlipCardsReset, 'flipCardsReset');
    syncText(inputFlipCardsFrontLabel, 'flipCardsFrontLabel');
    syncText(inputFlipCardsBackLabel, 'flipCardsBackLabel');

    syncCheckbox(inputMcConfidenceMode, 'mcConfidenceMode');
    syncCheckbox(inputMcRequireConfidence, 'mcRequireConfidence');
    syncText(inputMcConfidenceLowLabel, 'mcConfidenceLowLabel');
    syncText(inputMcConfidenceMidLabel, 'mcConfidenceMidLabel');
    syncText(inputMcConfidenceHighLabel, 'mcConfidenceHighLabel');
    syncCheckbox(inputMcShowResultSummary, 'mcShowResultSummary');
    syncCheckbox(inputMcShowCorrectAfterFinal, 'mcShowCorrectAfterFinal');
    syncCheckbox(inputMcAllowReset, 'mcAllowReset');
    syncText(inputMcHintText, 'mcHintText');
    syncText(inputMcFinalExplanation, 'mcFinalExplanation');

    inputMcMaxAttempts.addEventListener('input', (e) => {
      const parsed = parseInt(e.target.value, 10);
      appState.config.mcMaxAttempts = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
      updateLivePreview();
    });

    selectTabsOrientation.addEventListener('change', (e) => {
      appState.config.tabsOrientation = e.target.value;
      updateLivePreview();
    });
    syncCheckbox(inputTabsNumbered, 'tabsNumbered');
    syncCheckbox(inputTabsSequential, 'tabsSequential');
    syncCheckbox(inputTabsShowProgress, 'tabsShowProgress');
    syncCheckbox(inputTabsShowVisitedBadge, 'tabsShowVisitedBadge');
    syncCheckbox(inputTabsCompareMode, 'tabsCompareMode');
    syncCheckbox(inputTabsAllowReset, 'tabsAllowReset');
  }

  // ==========================================
  // DYNAMIC ITEM EDITING
  // ==========================================
  const schemaItemEditor = createSchemaItemEditor({
    container: dynamicItemsContainer,
    onChange: updateLivePreview,
    focusFallback: btnAddItem
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
    updateAddItemButtonState(schema);
  }

  // Some components (audio-player, video-frame) only ever render their first item —
  // maxItems stops the author from adding a 2nd/3rd entry that would be accepted and
  // saved but never appear anywhere. See js/editor-schemas.js for which schemas set it.
  function updateAddItemButtonState(schema) {
    const atMaxItems = Number.isInteger(schema.maxItems) && appState.config.items.length >= schema.maxItems;
    btnAddItem.disabled = atMaxItems;
    const title = atMaxItems
      ? `This component only supports ${schema.maxItems} ${schema.itemLabel.toLowerCase()}${schema.maxItems === 1 ? '' : 's'}.`
      : '';
    btnAddItem.title = title;
    if (title) btnAddItem.setAttribute('aria-label', `Add Item — ${title}`); else btnAddItem.removeAttribute('aria-label');
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

  // P11 Requirement 2: keyboard-accessible bulk expand/collapse near the item list.
  btnExpandAllItems.addEventListener('click', () => schemaItemEditor.expandAll());
  btnCollapseAllItems.addEventListener('click', () => schemaItemEditor.collapseAll());

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

  // extraLabel (P08) opts into a third button — e.g. unsaved-changes guards need
  // Save/Discard/Cancel, not just Confirm/Cancel. Resolves 'extra' when clicked, keeping
  // the existing true/false confirm/cancel contract unchanged for every other caller
  // (only Delete used this before P08) — the button stays hidden unless extraLabel is
  // passed, so nothing about the existing 2-button flow changes.
  function openConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, extraLabel = null }) {
    return new Promise(resolve => {
      document.getElementById('modal-confirm-title').textContent = title;
      document.getElementById('modal-confirm-message').textContent = message;
      const confirmBtn = document.getElementById('btn-confirm-dialog-action');
      const cancelBtn = document.getElementById('btn-confirm-dialog-cancel');
      const extraBtn = document.getElementById('btn-confirm-dialog-extra');
      confirmBtn.textContent = confirmLabel;
      confirmBtn.classList.toggle('btn-danger', danger);
      confirmBtn.classList.toggle('btn-primary', !danger);
      cancelBtn.textContent = cancelLabel;
      extraBtn.hidden = !extraLabel;
      extraBtn.textContent = extraLabel || '';

      let settled = false;
      const settle = value => {
        if (settled) return;
        settled = true;
        confirmBtn.removeEventListener('click', onConfirm);
        extraBtn.removeEventListener('click', onExtra);
        resolve(value);
      };
      const onConfirm = () => {
        settle(true);
        closeModal('modal-confirm');
      };
      const onExtra = () => {
        settle('extra');
        closeModal('modal-confirm');
      };
      confirmBtn.addEventListener('click', onConfirm);
      if (extraLabel) extraBtn.addEventListener('click', onExtra);
      modalDefaultSettlers.set('modal-confirm', () => settle(false));
      openModal('modal-confirm');
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
    document.getElementById('settings-export-format').value = appState.settings.exportFormat;
    document.getElementById('settings-enable-autosave').checked = appState.settings.autosave;
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

  // Same pattern as updateAccordionBehaviorVisibility — flipCards* config keys only affect
  // Flip Cards (components/flip-cards.js). No conditional-field-visibility mechanism exists
  // in the schema-driven editor yet, so Study-mode-only sub-options (shuffle/categories/
  // summary/reset) stay visible even in Explore mode rather than being truly hidden — their
  // hints say so explicitly. See docs/COMPONENT-SCHEMA.md "Recommended schema improvements."
  function updateFlipCardsBehaviorVisibility(componentId) {
    flipCardsBehaviorGroup.hidden = componentId !== 'flip-cards';
  }

  // Same pattern again — mc* config keys only affect Multiple Choice Check
  // (components/multiple-choice.js). Confidence-mode-only sub-options (require
  // confidence, labels, result summary) stay visible even with Confidence mode off,
  // same documented trade-off as Flip Cards' Study-mode-only controls.
  function updateMcBehaviorVisibility(componentId) {
    mcBehaviorGroup.hidden = componentId !== 'multiple-choice';
  }

  // Same pattern again — tabsX config keys only affect Horizontal Tabs
  // (components/tabs.js, registry id "tab-blocks").
  function updateTabsBehaviorVisibility(componentId) {
    tabsBehaviorGroup.hidden = componentId !== 'tab-blocks';
  }

  function syncEditorControls() {
    syncResolvedThemeConfig();
    const config = appState.config;
    inputBlockTitle.value = config.blockTitle;
    inputBlockHeadline.value = config.blockHeadline;
    inputBlockDesc.value = config.blockDesc;
    config.blockHeadingLevel = normalizeHeadingLevel(config.blockHeadingLevel);
    selectHeadingLevel.value = config.blockHeadingLevel;
    inputBehaviorAccordionMulti.checked = config.accordionMulti;
    inputBehaviorAccordionAnimation.checked = config.accordionAnimation;
    selectIconStyle.value = config.iconStyle;
    inputAccordionSequential.checked = config.accordionSequential === true;
    inputAccordionShowProgress.checked = config.accordionShowProgress === true;
    inputAccordionShowVisitedBadge.checked = config.accordionShowVisitedBadge === true;
    inputAccordionExpandCollapseAll.checked = config.accordionExpandCollapseAll === true;
    inputAccordionSearch.checked = config.accordionSearch === true;
    inputAccordionAllowReset.checked = config.accordionAllowReset === true;
    updateAccordionBehaviorVisibility(appState.selectedComponent.id);
    // Defensive fallbacks (not just `= config.flipCardsX`): a project saved before this
    // feature existed has no flipCards* keys at all, and an unmatched <select> value would
    // otherwise render as blank rather than the actual effective default.
    selectFlipCardsMode.value = config.flipCardsMode || 'explore';
    inputFlipCardsShuffle.checked = config.flipCardsShuffle === true;
    inputFlipCardsCategories.checked = config.flipCardsCategories === true;
    inputFlipCardsSummary.checked = config.flipCardsSummary === true;
    inputFlipCardsReset.checked = config.flipCardsReset === true;
    inputFlipCardsFrontLabel.value = config.flipCardsFrontLabel || 'Front';
    inputFlipCardsBackLabel.value = config.flipCardsBackLabel || 'Back';
    updateFlipCardsBehaviorVisibility(appState.selectedComponent.id);
    inputMcConfidenceMode.checked = config.mcConfidenceMode === true;
    inputMcRequireConfidence.checked = config.mcRequireConfidence === true;
    inputMcConfidenceLowLabel.value = config.mcConfidenceLowLabel || 'Not sure';
    inputMcConfidenceMidLabel.value = config.mcConfidenceMidLabel || 'Somewhat sure';
    inputMcConfidenceHighLabel.value = config.mcConfidenceHighLabel || 'Very sure';
    inputMcShowResultSummary.checked = config.mcShowResultSummary === true;
    inputMcMaxAttempts.value = Number.isInteger(config.mcMaxAttempts) && config.mcMaxAttempts > 0 ? config.mcMaxAttempts : 1;
    inputMcHintText.value = config.mcHintText || '';
    inputMcShowCorrectAfterFinal.checked = config.mcShowCorrectAfterFinal === true;
    inputMcFinalExplanation.value = config.mcFinalExplanation || '';
    inputMcAllowReset.checked = config.mcAllowReset === true;
    updateMcBehaviorVisibility(appState.selectedComponent.id);
    selectTabsOrientation.value = config.tabsOrientation || 'horizontal';
    inputTabsNumbered.checked = config.tabsNumbered === true;
    inputTabsSequential.checked = config.tabsSequential === true;
    inputTabsShowProgress.checked = config.tabsShowProgress === true;
    inputTabsShowVisitedBadge.checked = config.tabsShowVisitedBadge === true;
    inputTabsCompareMode.checked = config.tabsCompareMode === true;
    inputTabsAllowReset.checked = config.tabsAllowReset === true;
    updateTabsBehaviorVisibility(appState.selectedComponent.id);
    inputTrackCompletion.checked = config.trackCompletion;
    inputCompletionMsg.value = config.completionMsg;
    activeComponentTitle.innerText = appState.selectedComponent.title;
    activeComponentCategory.innerText = appState.selectedComponent.category.toUpperCase();
    btnFavoriteToggle.classList.toggle('favorited', appState.favorites.has(appState.selectedComponent.id));
    // P11 Requirement 1: opening/restoring a project is also a fresh population of the
    // items list — same "only first item open" default as picking a blank component.
    schemaItemEditor.resetToDefaultCollapse(config.items);
    renderDynamicItems();
    recordRecentlyUsed(appState.selectedComponent.id);
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
    // This build is locked to a single theme (js/themes.js) — always re-resolve the
    // current live theme rather than trust a project's stored snapshot, so a brand
    // color update (e.g. the AT&T palette) reaches every previously-saved project
    // and draft, not just newly-created ones.
    appState.activeTheme = getBuiltInTheme(DEFAULT_THEME_ID);
    appState.activeThemeId = appState.activeTheme.id;
    appState.componentOverrides = normalizeComponentOverrides(project.componentOverrides);
    appState.uiTheme = project.uiTheme;
    syncResolvedThemeConfig();
    setUiTheme(project.uiTheme);
    syncSettingsControls();
    syncEditorControls();
    showState('editor');
    updateLivePreview();
    // P08: resets what updateLivePreview() just set — an open/restore is a "load," not an
    // edit. Draft restores of a never-explicitly-saved project still correctly show
    // "Unsaved changes" (updateProjectStatusDisplay ignores isDirty when currentProjectId
    // is null, which getProject(project.id) above already resolved to null for that case).
    appState.isDirty = false;
    updateProjectStatusDisplay();
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
          .forEach(message => errors.push(`${formatItemLabel(schema, index)}: ${message}`));
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
    // P08: if this dialog closes (any way — Cancel, X, Escape) while still dirty, no save
    // actually happened, so any action deferred by guardUnsavedChanges() must not run
    // later on some unrelated future save. Re-registered on every open since closeModal()
    // deletes the entry after each fire (see modalDefaultSettlers, above).
    modalDefaultSettlers.set('modal-save', () => { if (appState.isDirty) pendingActionAfterSave = null; });
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
      // Set before closeModal() so modal-save's own settler (above) sees isDirty already
      // false and correctly leaves pendingActionAfterSave alone for this success path.
      appState.isDirty = false;
      closeModal('modal-save');
      updateProjectStatusDisplay();
      showToast(`Saved “${saved.name}”.`, 'success');
      updateStorageMeter();
      const accessibilityWarnings = validateMediaAccessibility(appState.config, appState.selectedComponent.id);
      if (accessibilityWarnings.length) showToast(accessibilityWarnings[0], 'warning', 6000);
      if (pendingActionAfterSave) {
        const action = pendingActionAfterSave;
        pendingActionAfterSave = null;
        action();
      }
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
      const performLoad = async () => {
        if (await applyProject(project)) {
          closeModal('modal-open');
          showToast(`Opened “${project.name}”.`, 'success');
        }
      };
      addAction('Load', async () => {
        const guard = await guardUnsavedChanges(performLoad);
        if (guard === true) await performLoad();
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

  function performNewProject() {
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
    appState.isDirty = false; // P08: a blank slate hasn't been edited yet
    releaseAllMediaObjectURLs();
    showState('catalog');
    renderCatalog();
    showToast('New project started. Choose a component to begin.', 'success');
  }

  document.getElementById('btn-new').addEventListener('click', async () => {
    const guard = await guardUnsavedChanges(performNewProject);
    if (guard === true) performNewProject();
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
      const selectExport = document.getElementById('settings-export-format');
      const checkAutosave = document.getElementById('settings-enable-autosave');
      const limitImage = document.getElementById('settings-limit-image');
      const limitAudio = document.getElementById('settings-limit-audio');
      const limitVideo = document.getElementById('settings-limit-video');
      const limitSvg = document.getElementById('settings-limit-svg');
      const completionOrigin = document.getElementById('settings-completion-origin');

      try {
        appState.settings = saveSettings({
          exportFormat: selectExport.value,
          autosave: checkAutosave.checked,
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
        // P08: Builder Settings (media limits, autosave, export format) are a global app
        // preference, not project data — updateLivePreview() re-renders the preview using
        // the new settings (e.g. an updated media-size limit), but must not flip the
        // *project's* dirty state as a side effect of that. Preserve whatever it was.
        const wasDirty = appState.isDirty;
        updateLivePreview();
        appState.isDirty = wasDirty;
        updateProjectStatusDisplay();
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

  // Tracked so applyCompletionExportGate() (a second, independent gate layered on top —
  // see below) never re-enables a button the general preflight gate already disabled.
  let lastExportGateEnabled = true;

  function setExportActionsEnabled(enabled) {
    lastExportGateEnabled = enabled;
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

  // A second, independent Blocking gate (Requirement 4, P02) layered on top of the general
  // preflight gate above: when completion tracking is on, the Iframe Snippet and Web
  // Package ZIP formats can't report completion to Rise (js/compatibility.js's single
  // source of truth), so their actions are disabled with a direct fix — use "Copy for
  // Rise" in the primary panel instead — regardless of whether the rest of the component
  // is otherwise clean. Only relaxes a button when the general gate also allows it.
  function applyCompletionExportGate() {
    [['iframe', 'btn-copy-iframe'], ['rise-zip', 'btn-download-rise-zip']].forEach(([formatKey, buttonId]) => {
      const gateIssue = checkCompletionExportFormatIssue(appState.config, formatKey);
      const button = document.getElementById(buttonId);
      const pane = document.getElementById(`pane-export-${formatKey}`);
      let banner = pane?.querySelector('.completion-export-block');
      if (gateIssue) {
        if (pane && !banner) {
          banner = document.createElement('div');
          banner.className = 'field-error completion-export-block';
          banner.setAttribute('role', 'alert');
          pane.insertBefore(banner, pane.firstChild);
        }
        if (banner) banner.textContent = gateIssue.explanation;
        if (button) { button.disabled = true; button.title = 'Switch to "Copy for Rise" in the main panel — this format doesn\'t report completion to Rise.'; }
      } else {
        if (banner) banner.remove();
        if (button && lastExportGateEnabled) { button.disabled = false; button.title = ''; }
      }
    });
  }

  async function runExportPreflightGate() {
    const container = document.getElementById('export-preflight-results');
    if (!container) { setExportActionsEnabled(true); return true; } // fail open: a missing results panel is a tooling problem, not a content one
    const context = buildPreflightContext();
    // P12 Requirement 3: no selected component is a genuine reason to block export — the
    // toolbar's Export button is already disabled in this case (updateToolbarActionAvailability),
    // so this is defense-in-depth against anything that could still reach this modal.
    if (!context) {
      container.innerHTML = '<div class="preflight-empty">Select a component before exporting.</div>';
      setExportActionsEnabled(false);
      return false;
    }
    try {
      await attachDomMeasurement(context);
      const issues = await runPreflight(context);
      const summary = renderPreflightResults(container, issues);
      updatePreflightBadge(summary);
      announcePreflightSummary('export-preflight-announcement', issues);
      setExportActionsEnabled(summary.canExport);
      return summary.canExport;
    } catch (error) {
      container.innerHTML = `<div class="preflight-empty">Preflight check failed: ${escapeHTML(error.message)}</div>`;
      setExportActionsEnabled(true); // fail open: a broken preflight check must not itself block a working export
      return true;
    }
  }

  // Primary export recommendation: the Fragment/"Copy for Rise" box is the one dominant
  // action, relabeled when completion tracking is on and superseded entirely by a
  // "use Web Package ZIP" notice when media can't be safely inlined into it.
  function updatePrimaryExportSection(payload) {
    const trackCompletion = Boolean(appState.config.trackCompletion);
    const title = document.getElementById('export-primary-title');
    const desc = document.getElementById('export-primary-desc');
    const zipNotice = document.getElementById('export-primary-zip-notice');
    const codeBox = document.getElementById('export-primary-code-box');
    const steps = document.getElementById('export-primary-steps');
    const advancedDetails = document.getElementById('export-advanced-options');
    const pasteWarningBox = document.getElementById('export-large-paste-warning');
    const zipRequired = payload.warnings.length > 0;

    if (title) title.textContent = zipRequired
      ? 'This component needs to be hosted'
      : (trackCompletion ? 'Rise Code Block with completion' : 'Copy for Rise');
    if (desc) desc.textContent = zipRequired
      ? ''
      : (trackCompletion
        ? 'Paste this into a Code > Add code block in Rise 360. This format is required for Rise to detect when this component is complete.'
        : 'Paste this into a Code > Add code block in Rise 360.');

    if (zipNotice) zipNotice.hidden = !zipRequired;
    if (codeBox) codeBox.hidden = zipRequired;
    if (steps) steps.hidden = zipRequired;
    // The paste-size warning is about the Fragment code specifically — irrelevant once
    // that box is hidden in favor of the "needs to be hosted" ZIP notice.
    if (zipRequired && pasteWarningBox) pasteWarningBox.hidden = true;

    if (zipRequired && advancedDetails) {
      advancedDetails.open = true;
      const zipTab = document.querySelector('.export-tab[data-export-type="rise-zip"]');
      if (zipTab && !zipTab.classList.contains('active')) zipTab.click();
    }
  }

  async function setupExportModalContent() {
    const activeTab = document.querySelector('.export-tab.active');
    renderExportCompatibilityReport(activeTab ? activeTab.getAttribute('data-export-type') : 'iframe');
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
    const iframeSizeLabel = document.getElementById('export-iframe-size');
    if (iframeSizeLabel) iframeSizeLabel.textContent = formatExportedFileSize(getExportedFileSize(payload.iframe));

    // Paste-friendly HTML fragment for custom HTML blocks
    const htmlCode = document.getElementById('export-html-code');
    htmlCode.textContent = payload.fragment;
    const htmlSize = getExportedFileSize(payload.fragment);
    const htmlSizeLabel = document.getElementById('export-html-size');
    if (htmlSizeLabel) htmlSizeLabel.textContent = formatExportedFileSize(htmlSize);
    const pasteWarningBox = document.getElementById('export-large-paste-warning');
    if (pasteWarningBox) {
      const pasteWarning = buildLargePasteWarning(htmlSize);
      pasteWarningBox.hidden = !pasteWarning;
      pasteWarningBox.textContent = pasteWarning || '';
    }
    if (warningBox) {
      warningBox.classList.remove('is-loading');
      warningBox.hidden = payload.warnings.length === 0;
      warningBox.textContent = payload.warnings.join(' ');
    }

    updatePrimaryExportSection(payload);

    const fileSizeLabel = document.getElementById('export-file-size');
    if (fileSizeLabel) fileSizeLabel.textContent = `Standalone HTML file size: ${formatExportedFileSize(getExportedFileSize(payload.html))}`;

    await setupRiseZipPane(canExport);
    // setupRiseZipPane() sets the ZIP button's disabled/title state purely from the
    // general gate + missing-asset check, with no knowledge of the completion gate above —
    // re-apply last so it always has the final word (mirrors the completion gate also
    // running after setExportActionsEnabled() for the same reason).
    applyCompletionExportGate();
  }

  async function setupRiseZipPane(canExport) {
    const zipWarningBox = document.getElementById('rise-zip-warning');
    const zipBlockingBox = document.getElementById('rise-zip-blocking');
    const zipSizeLabel = document.getElementById('rise-zip-file-size');
    const zipManifestCode = document.getElementById('rise-zip-manifest');
    const zipButton = document.getElementById('btn-download-rise-zip');
    if (zipWarningBox) { zipWarningBox.hidden = false; zipWarningBox.classList.add('is-loading'); zipWarningBox.textContent = 'Preparing Web Package ZIP…'; }
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
    if (zipSizeLabel) zipSizeLabel.textContent = blocked ? '' : `Web Package ZIP size: ${formatExportedFileSize(bundle.size)}`;
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
        showToast('Single-file export is blocked because one or more uploaded assets require separate files. Use the Web Package ZIP option instead.', 'warning', 7000);
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
      showToast(`Web Package ZIP downloaded (${formatExportedFileSize(bundle.size)}).`, 'success');
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
    updatePreviewEmptyState();
    // P12: nothing selected means there is no real content to render or validate — without
    // this, a bare catalog screen would still silently compile and preview
    // appState.config's leftover/sample data (P12 Requirement 1's "accidental default").
    if (!appState.selectedComponent) return;
    validateActiveComponent(appState, componentRegistry);
    writePreview(livePreviewIframe, generateIframeContent());
    scheduleDraftSave();
    refreshPreflightBadge();
    refreshItemIssueBadges();
    // P08: every call here follows a meaningful project-data change (config/theme/
    // overrides) — never a transient UI-only change like preview device mode or panel
    // state, which don't call updateLivePreview() at all. Load flows (applyProject,
    // component selection) also call this, then immediately reset isDirty back to false
    // themselves, so this alone doesn't mark a freshly opened project dirty.
    appState.isDirty = true;
    updateProjectStatusDisplay();
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

  // Clipping-risk/mobile-overflow (P07) need a real hidden-iframe render — too expensive
  // to run on every keystroke (Requirement 6), so this is only ever called from a full
  // preflight run (panel open, export gate), never from refreshPreflightBadge()'s
  // per-keystroke path. `domMeasurementAbort` cancels a still-in-flight measurement when a
  // newer one starts (e.g. the author reopens Preflight before the previous run finished)
  // so a stale result can never land after a fresher request superseded it.
  let domMeasurementAbort = null;

  async function attachDomMeasurement(context) {
    domMeasurementAbort?.abort();
    const controller = new AbortController();
    domMeasurementAbort = controller;
    try {
      const html = generateIframeContent();
      context.domMeasurement = await measureRenderedDimensions(html, { signal: controller.signal });
    } catch {
      context.domMeasurement = null; // measured-but-failed, not "never attempted" — still surfaces the manual-check recommendation
    }
    return context;
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
        let card = dynamicItemsContainer.querySelector(`.dynamic-item-card[data-index="${itemIndex}"]`);
        if (card?.classList.contains('collapsed')) {
          card.querySelector('.item-collapse-btn')?.click();
          // Expanding an item re-renders the whole items container (js/editor.js) — the
          // pre-click `card` reference is now a detached node, so re-query for the live one
          // or focus() below silently lands on nothing.
          card = dynamicItemsContainer.querySelector(`.dynamic-item-card[data-index="${itemIndex}"]`);
        }
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

  // Concise accessible summary (Requirement 5, P05) — a single short sentence in its own
  // aria-live region, instead of the full detailed issue list itself being live (which
  // would re-read every issue's full text aloud on every update — real chatter, not just a
  // theoretical risk, since the export modal used to do exactly that). Deliberately not
  // called from refreshPreflightBadge()'s per-keystroke path — only from a full preflight
  // render (modal open, export gate), so typing never triggers an announcement.
  function announcePreflightSummary(regionId, issues) {
    const region = document.getElementById(regionId);
    if (region) region.textContent = summarizePreflightForAnnouncement(issues);
  }

  function renderPreflightResults(container, issues) {
    const summary = summarizePreflight(issues);
    const sections = [['blocking', summary.blocking], ['warning', summary.warnings], ['recommendation', summary.recommendations]];
    const sectionsHTML = sections.filter(([, list]) => list.length).map(([severity, list]) => `
      <div class="preflight-section">
        <div class="preflight-section-title is-${severity}">${SEVERITY_LABELS[severity]} (${list.length})</div>
        <ul class="preflight-issue-list">
          ${list.map(item => `
            <li class="preflight-issue is-${item.severity}">
              <div class="preflight-issue-text">
                <span class="preflight-issue-title">${escapeHTML(item.title)}</span>
                <span class="preflight-issue-message">${escapeHTML(item.explanation)}</span>
              </div>
              ${item.fix ? `<button type="button" class="preflight-issue-jump" data-field-id="${escapeHTML(item.fieldId ?? '')}" data-item-index="${item.itemIndex ?? ''}">${escapeHTML(item.fix.label)}</button>` : ''}
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
      await attachDomMeasurement(context);
      const issues = await runPreflight(context);
      const summary = renderPreflightResults(container, issues);
      updatePreflightBadge(summary);
      announcePreflightSummary('preflight-announcement', issues);
    } catch (error) {
      container.innerHTML = `<div class="preflight-empty">Preflight check failed: ${escapeHTML(error.message)}</div>`;
    }
  }

  // Run the initialization
  window.addEventListener('beforeunload', releaseAllMediaObjectURLs);
  // P08: the browser's own native "leave site?" prompt — the one unsaved-changes guard
  // that can't use openConfirmDialog (a page already mid-unload can't await a promise or
  // show a custom modal). Setting returnValue is what triggers the native prompt; the
  // message string itself is ignored by every modern browser, which shows its own fixed
  // text instead — set anyway for older engines that still honor it.
  window.addEventListener('beforeunload', event => {
    if (!appState.isDirty) return;
    event.preventDefault();
    event.returnValue = 'You have unsaved changes. Leaving now will lose them.';
  });
  await init();

});
