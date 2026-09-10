/* Rise Component Builder — Application Shell Logic */
// @ts-nocheck -- extensive untyped document.getElementById() DOM wiring; see docs/TESTING-STRATEGY.md "Type checking".
// Opt back in incrementally as sections of this file are typed or migrated into the component registry (docs/ARCHITECTURE.md §1).

import { appState, resetConfig } from './js/state.js';
import { APP_VERSION, parseVersionBuildDate } from './js/version.js';
import {
  buildProject, clearDraft, deleteProject, duplicateProject, getProject, importProjectJson,
  loadCustomThemes, loadDefaultThemeId, loadDraft, loadFavorites, loadPreviewDevice,
  loadProjects, loadRecentlyUsed, loadSettings, loadUiTheme, renameProject, saveDraft,
  saveFavorites, savePreviewDevice, saveProject, saveRecentlyUsed, saveSettings, saveUiTheme,
  withRecentlyUsedEntry
} from './js/storage.js';
import { componentCatalog, filterCatalog, createCatalogCard, showComponentDetailsModal, closeComponentDetailsModal } from './js/catalog.js';
import { COMPONENT_REGISTRY, getCategoriesWithCounts, getComponentById, getDefaultConfig } from './js/component-registry.js';
import { createSchemaItemEditor, switchEditorTab as activateEditorTab, addEditorItem, validateActiveComponent, validateSchemaField, setupEditorTabKeyboardNavigation, jumpToEditorField, getFieldTabLocation } from './js/editor.js';
import { writePreview, openPreview, generateIframeContent as compilePreview, COMPONENT_MAX_WIDTH } from './js/preview.js';
import { getDeviceWidthLabel } from './js/device-preview.js';
import { measureRenderedDimensions } from './js/dom-measurement.js';
import {
  buildCoursePackZip, buildExportPayload, buildLargePasteWarning, buildRiseEmbedSnippet,
  buildRiseProjectZip, buildStorylineWebObjectZip, downloadCoursePackZip, downloadHtml,
  downloadProjectJson, downloadStorylineWebObjectZip, downloadZipFile, formatExportedFileSize,
  getExportedFileSize, prepareMediaExport
} from './js/export.js';
import { copyTextToClipboard, describeStorageUsage, escapeHTML, formatItemLabel, formatReadableDate, normalizeHeadingLevel, toRgba as colorToRgba } from './js/utilities.js';
import { showToast } from './js/toast.js';
import { COMPATIBILITY_TIERS, getExportFormatCompatibility } from './js/compatibility.js';
import {
  checkCompletionExportFormatIssue, collectSyncIssues, runPreflight, summarizePreflight, summarizePreflightForAnnouncement
} from './js/validation.js';
import { resolveMediaLimits, validateMediaAccessibility } from './js/media.js';
import { downloadProjectPackage, exportProjectPackage, importProjectPackage, isProjectPackageFile } from './js/project-package.js';
import { pruneMediaObjectURLs, releaseAllMediaObjectURLs, resolveMediaReference, restoreMediaReferences } from './js/media-storage.js';
import { applyThemeToConfig, BUILT_IN_THEMES, DEFAULT_THEME_ID, getBuiltInTheme, normalizeComponentOverrides } from './js/themes.js';
import { createHistoryManager } from './js/history.js';
import { getPresetsForComponent } from './js/presets.js';
// app.js is the composition root and is explicitly allowed to depend on any module,
// including one specific component's own file (docs/ARCHITECTURE.md "Important
// dependencies") — reused here only for its MM:SS/H:MM:SS formatter, so the builder's own
// authoring-timeline widget (Interactive Video Phase 2, below) can't silently drift from
// what the exported component itself displays to learners.
import { formatTimestamp as formatIvTimestamp } from './components/interactive-video.js';
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
  const classificationFilterButtons = document.querySelectorAll('.classification-filter-btn');
  const purposeChips = document.querySelectorAll('.purpose-chip');
  
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
  const selectHeaderStyle = document.getElementById('select-header-style');
  const inputHeaderCyanRule = document.getElementById('input-header-cyan-rule');
  const headerCyanRuleWrapper = document.getElementById('header-cyan-rule-wrapper');
  const selectSpacingDensity = document.getElementById('select-spacing-density');
  const inputContextBandEnabled = document.getElementById('input-context-band-enabled');
  const contextBandFields = document.getElementById('context-band-fields');
  const inputContextBandText = document.getElementById('input-context-band-text');
  const selectContextBandAlignment = document.getElementById('select-context-band-alignment');

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

  const timelineBehaviorGroup = document.getElementById('timeline-behavior-group');
  const inputTimelineCategories = document.getElementById('input-timeline-categories');
  const inputTimelineCompareMode = document.getElementById('input-timeline-compare-mode');
  const inputTimelineCollapsible = document.getElementById('input-timeline-collapsible');
  const inputTimelineChronological = document.getElementById('input-timeline-chronological');
  const inputTimelineShowProgress = document.getElementById('input-timeline-show-progress');
  const inputTimelineAllowReset = document.getElementById('input-timeline-allow-reset');

  const ivTimelineAuthoringGroup = document.getElementById('iv-timeline-authoring-group');
  const ivAuthoringVideo = document.getElementById('iv-authoring-video');
  const btnIvAddMarkerAtTime = document.getElementById('btn-iv-add-marker-at-time');
  const ivAuthoringTimeReadout = document.getElementById('iv-authoring-time-readout');
  const ivAuthoringTimelineTrack = document.getElementById('iv-authoring-timeline-track');
  const ivAuthoringTimelineEmptyHint = document.getElementById('iv-authoring-timeline-empty-hint');

  const ivBehaviorGroup = document.getElementById('iv-behavior-group');
  const selectIvResumeBehaviour = document.getElementById('select-iv-resume-behaviour');
  const selectIvCompletionRule = document.getElementById('select-iv-completion-rule');
  const inputIvShowMarkerNav = document.getElementById('input-iv-show-marker-nav');
  const inputIvShowProgress = document.getElementById('input-iv-show-progress');
  const inputIvAllowRestart = document.getElementById('input-iv-allow-restart');

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
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');

  const history = createHistoryManager({
    maxDepth: 50,
    onStateChange: ({ canUndo, canRedo }) => {
      if (btnUndo) {
        btnUndo.disabled = !canUndo;
        btnUndo.title = canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo';
      }
      if (btnRedo) {
        btnRedo.disabled = !canRedo;
        btnRedo.title = canRedo ? 'Redo (Ctrl+Shift+Z / Ctrl+Y)' : 'Nothing to redo';
      }
    }
  });

  function performUndo() {
    if (!history.canUndo()) return;
    const previousConfig = history.undo(appState.config);
    if (previousConfig) {
      appState.config = structuredClone(previousConfig);
      syncEditorControls();
      updateLivePreview();
      showToast('Undone.', 'info', 2000);
    }
  }

  function performRedo() {
    if (!history.canRedo()) return;
    const nextConfig = history.redo(appState.config);
    if (nextConfig) {
      appState.config = structuredClone(nextConfig);
      syncEditorControls();
      updateLivePreview();
      showToast('Redone.', 'info', 2000);
    }
  }

  if (btnUndo) btnUndo.addEventListener('click', performUndo);
  if (btnRedo) btnRedo.addEventListener('click', performRedo);

  // Modals elements
  const modalTriggers = {
    'btn-export': 'modal-export',
    'btn-settings': 'modal-settings',
    'btn-preflight': 'modal-preflight',
    'btn-open-presets': 'modal-presets'
  };
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  modalOverlays.forEach(overlay => overlay.setAttribute('aria-hidden', 'true'));

  // ==========================================
  // INITIALIZATION
  // ==========================================
  async function init() {
    // P09: sourced from js/version.js — the one place this value is maintained — rather
    // than a hand-typed string in index.html, which had drifted out of sync with
    // package.json's own version before this. A build-metadata date/time suffix on the
    // version string itself (js/version.js) was reinstated at explicit user request; the
    // badge shows that suffix as a readable date (parseVersionBuildDate + formatReadableDate)
    // rather than the raw "YYYYMMDD.HHmm" digits, while APP_VERSION itself is untouched —
    // the full semver string is still available via the badge's title attribute.
    const versionTag = document.getElementById('app-version-tag');
    if (versionTag) {
      const baseVersion = APP_VERSION.split('+')[0];
      const buildDate = parseVersionBuildDate(APP_VERSION);
      versionTag.textContent = buildDate ? `v${baseVersion} · ${formatReadableDate(buildDate)}` : `v${APP_VERSION}`;
      versionTag.title = `Full version: ${APP_VERSION}`;
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

  const btnClearSearch = document.getElementById('btn-clear-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value;
      if (btnClearSearch) btnClearSearch.style.display = searchInput.value.trim() ? 'block' : 'none';

      // Ensure we are on the catalog view when searching
      showState('catalog');
      renderCatalog();
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      appState.searchQuery = '';
      btnClearSearch.style.display = 'none';
      renderCatalog();
    });
  }

  // Independent of the category sidebar — does not reset activeCategory/searchQuery, and
  // applies inside Favorites/Recent the same way search already does (js/catalog.js
  // #filterCatalog).
  classificationFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      classificationFilterButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      appState.activeClassification = btn.getAttribute('data-classification');
      renderCatalog();
    });
  });

  purposeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      purposeChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-pressed', 'true');
      appState.activePurpose = chip.getAttribute('data-purpose');
      renderCatalog();
    });
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
    const wasHidden = livePreviewIframe.hidden;
    livePreviewIframe.hidden = !hasSelection;
    emptyState.hidden = hasSelection;
    // Reported: the very first component selected in a session (iframe going from
    // hidden -> visible) can render completely blank, unlike every subsequent switch
    // between already-visible components (which writePreview()'s own srcdoc='' + srcdoc=
    // html double-write already handles reliably). Root cause: removing `hidden` and
    // writing the iframe's srcdoc land in the same synchronous tick immediately after
    // (updateLivePreview() calls this, then writePreview(), back to back) — for a
    // sandboxed (no allow-same-origin) iframe, some Chrome builds haven't run a layout
    // pass for the newly-unhidden subtree yet when the srcdoc navigation starts, so its
    // very first paint is silently dropped until an unrelated later reflow (resizing,
    // switching components, anything that forces layout) happens to repaint it — which,
    // for a small/fast component, resolves almost instantly and goes unnoticed, but for a
    // larger payload with its own external media (e.g. Interactive Video) can leave the
    // preview blank indefinitely, since nothing else naturally triggers a reflow while the
    // author is just looking at it. Forcing a synchronous reflow here, before
    // writePreview() runs immediately after, makes sure the browser has processed the
    // visibility change first — a standard, minimal fix for this exact class of issue.
    if (wasHidden && hasSelection) void livePreviewIframe.offsetHeight;
  }

  // Header identity, inline rename, and save-status display
  const headerProjectName = document.getElementById('header-project-name');
  const btnEditProjectName = document.getElementById('btn-edit-project-name');
  const inputHeaderProjectName = document.getElementById('input-header-project-name');
  const projectTitleEditor = document.getElementById('project-title-editor');

  function updateProjectStatusDisplay() {
    const status = document.getElementById('project-status');
    const hasComponent = Boolean(appState.selectedComponent);

    if (projectTitleEditor) {
      projectTitleEditor.style.display = hasComponent ? 'flex' : 'none';
    }

    if (!hasComponent) {
      if (status) status.hidden = true;
      return;
    }

    const name = appState.currentProjectName || appState.selectedComponent.title || 'Untitled Component';
    if (headerProjectName && headerProjectName.textContent !== name) {
      headerProjectName.textContent = name;
      headerProjectName.title = `Project: ${name} (Click or press F2 to rename)`;
    }

    if (status) {
      status.hidden = false;
      const isSaved = Boolean(appState.currentProjectId) && !appState.isDirty;
      const statusText = document.getElementById('project-status-text');
      if (statusText) {
        statusText.textContent = isSaved ? 'Saved' : 'Unsaved changes';
      }
      status.classList.toggle('is-saved', isSaved);
      status.classList.toggle('is-unsaved', !isSaved);
    }
  }

  function startHeaderProjectRename() {
    if (!appState.selectedComponent || !headerProjectName || !inputHeaderProjectName) return;
    inputHeaderProjectName.value = appState.currentProjectName || headerProjectName.textContent || '';
    headerProjectName.style.display = 'none';
    if (btnEditProjectName) btnEditProjectName.style.display = 'none';
    inputHeaderProjectName.style.display = 'inline-block';
    inputHeaderProjectName.focus();
    inputHeaderProjectName.select();
  }

  function commitHeaderProjectRename() {
    if (!inputHeaderProjectName || inputHeaderProjectName.style.display === 'none') return;
    const newName = inputHeaderProjectName.value.trim();
    if (newName && newName !== appState.currentProjectName) {
      appState.currentProjectName = newName;
      appState.isDirty = true;
      if (appState.currentProjectId) {
        try {
          renameProject(appState.currentProjectId, newName);
          showToast(`Renamed project to “${newName}”.`, 'success', 2500);
        } catch (e) {
          console.warn('Could not persist rename directly to storage:', e);
        }
      }
    }
    inputHeaderProjectName.style.display = 'none';
    if (headerProjectName) headerProjectName.style.display = 'inline-block';
    if (btnEditProjectName) btnEditProjectName.style.display = 'inline-flex';
    updateProjectStatusDisplay();
  }

  function cancelHeaderProjectRename() {
    if (!inputHeaderProjectName || inputHeaderProjectName.style.display === 'none') return;
    inputHeaderProjectName.style.display = 'none';
    if (headerProjectName) headerProjectName.style.display = 'inline-block';
    if (btnEditProjectName) btnEditProjectName.style.display = 'inline-flex';
  }

  if (headerProjectName) headerProjectName.addEventListener('click', startHeaderProjectRename);
  if (btnEditProjectName) btnEditProjectName.addEventListener('click', startHeaderProjectRename);
  if (inputHeaderProjectName) {
    inputHeaderProjectName.addEventListener('blur', commitHeaderProjectRename);
    inputHeaderProjectName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitHeaderProjectRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelHeaderProjectRename();
      }
    });
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
            <p>Try changing your category or learning purpose filter.</p>
          </div>
        `;
      }
      return;
    }

    filtered.forEach(comp => {
      componentsGrid.appendChild(createCatalogCard(comp, {
        onSelect: loadComponentToEditor,
        onOpenDetails: (component) => {
          showComponentDetailsModal(component, loadComponentToEditor, (c) => {
            const registryEntry = getComponentById(COMPONENT_REGISTRY, c.id) || c;
            const presets = getPresetsForComponent(c.id);
            const preset = presets.length ? presets[0] : null;
            const baseConfig = getDefaultConfig(registryEntry);
            const sampleConfig = preset?.config
              ? {
                  blockTitle: preset.config.blockTitle || (c.title || registryEntry.name || '').toUpperCase(),
                  blockHeadline: preset.config.blockHeadline || `Explore ${c.title || registryEntry.name}`,
                  blockDesc: preset.config.blockDesc || c.desc || registryEntry.description || '',
                  borderRadius: '12',
                  shadowDepth: 'soft',
                  borderOutline: true,
                  trackCompletion: false,
                  completionMsg: 'Complete!',
                  ...baseConfig,
                  ...preset.config
                }
              : {
                  blockTitle: (c.title || registryEntry.name || '').toUpperCase(),
                  blockHeadline: `Explore details about ${c.title || registryEntry.name}`,
                  blockDesc: c.desc || registryEntry.description || '',
                  borderRadius: '12',
                  shadowDepth: 'soft',
                  borderOutline: true,
                  trackCompletion: false,
                  completionMsg: 'Complete!',
                  ...baseConfig
                };
            const sampleState = {
              selectedComponent: registryEntry,
              config: sampleConfig,
              activeTheme: appState.activeTheme || getBuiltInTheme(),
              componentOverrides: {}
            };
            return compilePreview(sampleState, componentRegistry, colorToRgba);
          });
        }
      }));
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
    updateComponentSpecificOptions(component.id);
    syncIvAuthoringVideoSource();
    renderIvMarkerTimeline();

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
    history.clear(appState.config);
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

  setupEditorTabKeyboardNavigation(editorTabs, tabPanes, (tabId) => {
    switchEditorTab(tabId);
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
        history.pushDebouncedState(appState.config);
        updateLivePreview();
      });
    };
    
    syncText(inputBlockTitle, 'blockTitle');
    syncText(inputBlockHeadline, 'blockHeadline');
    syncText(inputBlockDesc, 'blockDesc');
    syncText(inputCompletionMsg, 'completionMsg');

    selectHeadingLevel.addEventListener('change', (e) => {
      history.pushState(appState.config);
      appState.config.blockHeadingLevel = e.target.value;
      updateLivePreview();
    });

    if (selectHeaderStyle) {
      selectHeaderStyle.addEventListener('change', (e) => {
        history.pushState(appState.config);
        appState.config.headerStyle = e.target.value;
        if (headerCyanRuleWrapper) headerCyanRuleWrapper.style.display = e.target.value === 'editorial' ? 'flex' : 'none';
        updateLivePreview();
      });
    }

    if (inputHeaderCyanRule) {
      inputHeaderCyanRule.addEventListener('change', (e) => {
        history.pushState(appState.config);
        appState.config.headerCyanRule = e.target.checked;
        updateLivePreview();
      });
    }

    if (selectSpacingDensity) {
      selectSpacingDensity.addEventListener('change', (e) => {
        history.pushState(appState.config);
        appState.config.spacingDensity = e.target.value;
        updateLivePreview();
      });
    }

    if (inputContextBandEnabled) {
      inputContextBandEnabled.addEventListener('change', (e) => {
        history.pushState(appState.config);
        appState.config.contextBandEnabled = e.target.checked;
        if (contextBandFields) contextBandFields.style.display = e.target.checked ? 'block' : 'none';
        updateLivePreview();
      });
    }

    if (inputContextBandText) {
      syncText(inputContextBandText, 'contextBandText');
    }

    if (selectContextBandAlignment) {
      selectContextBandAlignment.addEventListener('change', (e) => {
        history.pushState(appState.config);
        appState.config.contextBandAlignment = e.target.value;
        updateLivePreview();
      });
    }

    // Colors, fonts, border radius, and shadow are permanently locked to the single AT&T
    // theme (js/themes.js) — no per-component override UI exists in this build.

    selectIconStyle.addEventListener('change', (e) => {
      history.pushState(appState.config);
      appState.config.iconStyle = e.target.value;
      updateLivePreview();
    });

    // 5. Checkboxes
    const syncCheckbox = (checkbox, stateKey) => {
      checkbox.addEventListener('change', (e) => {
        history.pushState(appState.config);
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

    const completionModeRadios = document.querySelectorAll('input[name="completion-mode"]');
    completionModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (!e.target.checked) return;
        history.pushState(appState.config);
        const mode = e.target.value;
        appState.config.completionMode = mode;
        appState.config.trackCompletion = mode !== 'none';
        if (inputTrackCompletion) inputTrackCompletion.checked = appState.config.trackCompletion;
        updateLivePreview();
      });
    });

    const inputAllowReset = document.getElementById('input-allow-reset');
    if (inputAllowReset) {
      inputAllowReset.addEventListener('change', (e) => {
        history.pushState(appState.config);
        appState.config.allowReset = e.target.checked;
        updateLivePreview();
      });
    }

    selectFlipCardsMode.addEventListener('change', (e) => {
      history.pushState(appState.config);
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
      history.pushDebouncedState(appState.config);
      updateLivePreview();
    });

    selectTabsOrientation.addEventListener('change', (e) => {
      history.pushState(appState.config);
      appState.config.tabsOrientation = e.target.value;
      updateLivePreview();
    });
    syncCheckbox(inputTabsNumbered, 'tabsNumbered');
    syncCheckbox(inputTabsSequential, 'tabsSequential');
    syncCheckbox(inputTabsShowProgress, 'tabsShowProgress');
    syncCheckbox(inputTabsShowVisitedBadge, 'tabsShowVisitedBadge');
    syncCheckbox(inputTabsCompareMode, 'tabsCompareMode');
    syncCheckbox(inputTabsAllowReset, 'tabsAllowReset');

    syncCheckbox(inputTimelineCategories, 'timelineCategoriesEnabled');
    syncCheckbox(inputTimelineCompareMode, 'timelineCompareMode');
    syncCheckbox(inputTimelineCollapsible, 'timelineCollapsibleDetails');
    syncCheckbox(inputTimelineChronological, 'timelineChronologicalReveal');
    syncCheckbox(inputTimelineShowProgress, 'timelineShowProgress');
    syncCheckbox(inputTimelineAllowReset, 'timelineAllowReset');

    selectIvResumeBehaviour.addEventListener('change', (e) => {
      history.pushState(appState.config);
      appState.config.resumeBehaviour = e.target.value;
      updateLivePreview();
    });
    selectIvCompletionRule.addEventListener('change', (e) => {
      history.pushState(appState.config);
      appState.config.completionRule = e.target.value;
      updateLivePreview();
    });
    syncCheckbox(inputIvShowMarkerNav, 'showMarkerNavigation');
    syncCheckbox(inputIvShowProgress, 'showVideoProgress');
    syncCheckbox(inputIvAllowRestart, 'allowRestart');
  }

  // ==========================================
  // DYNAMIC ITEM EDITING
  // ==========================================
  const schemaItemEditor = createSchemaItemEditor({
    container: dynamicItemsContainer,
    onChange: () => {
      history.pushDebouncedState(appState.config);
      updateLivePreview();
    },
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

  function updateAddItemButtonState(schema) {
    const itemsCountBadge = document.getElementById('items-count-badge');
    if (itemsCountBadge) {
      const count = appState.config.items?.length || 0;
      const label = schema.itemLabel ? schema.itemLabel.toLowerCase() : 'item';
      let rangeText = '';
      if (schema.minItems && schema.maxItems) {
        rangeText = ` (min ${schema.minItems}, max ${schema.maxItems})`;
      } else if (schema.minItems) {
        rangeText = ` (min ${schema.minItems})`;
      } else if (schema.maxItems) {
        rangeText = ` (max ${schema.maxItems})`;
      }
      itemsCountBadge.textContent = `${count} ${label}${count === 1 ? '' : 's'}${rangeText}`;
    }

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
    history.pushState(appState.config);
    const schema = appState.selectedComponent?.editorSchema || componentCatalog[0].editorSchema;
    addEditorItem(appState, schema);
    renderDynamicItems();
    updateLivePreview();
  });

  // P11 Requirement 2: keyboard-accessible bulk expand/collapse near the item list.
  btnExpandAllItems.addEventListener('click', () => schemaItemEditor.expandAll());
  btnCollapseAllItems.addEventListener('click', () => schemaItemEditor.collapseAll());

  // ==========================================
  // INTERACTIVE VIDEO: AUTHORING TIMELINE (Phase 2)
  // ==========================================
  // Only relevant while Interactive Video is selected; a plain builder-chrome widget
  // (styles.css), never part of any exported component output. Reuses the video element
  // directly (not the sandboxed Live Preview iframe) because reading currentTime/duration
  // and seeking on click both need real, unrestricted DOM access to the element itself.
  let ivAuthoringLastSrc = '';

  function syncIvAuthoringVideoSource() {
    if (!ivAuthoringVideo || appState.selectedComponent?.id !== 'interactive-video') return;
    const config = appState.config;
    const raw = config.videoSourceType === 'url' ? config.videoUrl : config.videoMediaId;
    const resolved = resolveMediaReference(raw);
    // Guards against reloading (and interrupting playback of) the exact same source on
    // every keystroke elsewhere in the form — updateLivePreview() runs on every config
    // change, including ones unrelated to the video source itself. An empty/unresolved
    // value (e.g. mid-typing an external URL, or no source configured) intentionally
    // leaves whatever is already loaded alone rather than flashing to a blank player.
    if (!resolved || resolved === ivAuthoringLastSrc) return;
    ivAuthoringLastSrc = resolved;
    ivAuthoringVideo.src = resolved;
    appState.config.videoDurationSeconds = undefined;
  }

  function updateIvTimeReadout() {
    if (!ivAuthoringTimeReadout) return;
    const current = formatIvTimestamp(ivAuthoringVideo.currentTime || 0);
    const total = Number.isFinite(ivAuthoringVideo.duration) ? formatIvTimestamp(ivAuthoringVideo.duration) : '--:--';
    ivAuthoringTimeReadout.textContent = `${current} / ${total}`;
  }

  function renderIvMarkerTimeline() {
    if (!ivAuthoringTimelineTrack || appState.selectedComponent?.id !== 'interactive-video') return;
    const items = Array.isArray(appState.config.items) ? appState.config.items : [];
    const duration = Number(appState.config.videoDurationSeconds);
    const hasDuration = Number.isFinite(duration) && duration > 0;
    ivAuthoringTimelineTrack.innerHTML = '';
    ivAuthoringTimelineEmptyHint.hidden = hasDuration && items.length > 0;
    if (!hasDuration) return;

    items.forEach((item, index) => {
      const isMc = item.type === 'multipleChoice';
      const pct = Math.max(0, Math.min(100, ((Number(item.timestamp) || 0) / duration) * 100));
      const tick = document.createElement('button');
      tick.type = 'button';
      tick.className = `iv-timeline-tick ${isMc ? 'iv-timeline-tick-mc' : 'iv-timeline-tick-info'}`;
      tick.style.left = `${pct}%`;
      tick.dataset.idx = String(index);
      // Text content, not just color, tells the two marker types apart (WCAG 1.4.1) —
      // the marker list below uses the same convention (icon + visible type label).
      tick.textContent = isMc ? '?' : 'i';
      const timeLabel = formatIvTimestamp(item.timestamp);
      tick.title = `${timeLabel} — ${item.title || 'Untitled marker'}`;
      tick.setAttribute('aria-label', `${isMc ? 'Multiple Choice' : 'Information'} marker at ${timeLabel}: ${item.title || 'Untitled marker'}. Activate to jump the preview video here.`);
      tick.addEventListener('click', () => {
        if (Number.isFinite(ivAuthoringVideo.duration)) ivAuthoringVideo.currentTime = Number(item.timestamp) || 0;
        const card = dynamicItemsContainer.querySelector(`.dynamic-item-card[data-index="${index}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (card.querySelector('.item-collapse-btn') || card).focus();
        }
      });
      ivAuthoringTimelineTrack.appendChild(tick);
    });
  }

  if (ivAuthoringVideo) {
    ivAuthoringVideo.addEventListener('loadedmetadata', () => {
      appState.config.videoDurationSeconds = Number.isFinite(ivAuthoringVideo.duration) ? ivAuthoringVideo.duration : undefined;
      updateIvTimeReadout();
      renderIvMarkerTimeline();
      refreshPreflightBadge();
    });
    ivAuthoringVideo.addEventListener('timeupdate', updateIvTimeReadout);
  }

  if (btnIvAddMarkerAtTime) {
    btnIvAddMarkerAtTime.addEventListener('click', () => {
      if (!appState.selectedComponent || appState.selectedComponent.id !== 'interactive-video') return;
      const schema = appState.selectedComponent.editorSchema;
      addEditorItem(appState, schema);
      const newItem = appState.config.items[appState.config.items.length - 1];
      newItem.timestamp = Math.max(0, Math.round(ivAuthoringVideo.currentTime || 0));
      renderDynamicItems();
      renderIvMarkerTimeline();
      updateLivePreview();
    });
  }

  // ==========================================
  // DEVICE VIEWPORT & ZOOM CONTROLS
  // ==========================================
  const previewWidthLabel = document.getElementById('preview-width-label');
  const deviceModeClasses = ['desktop', 'tablet', 'mobile-lg', 'mobile'];
  const btnPreviewOrientation = document.getElementById('btn-preview-orientation');
  let isLandscapeOrientation = false;

  function applyDeviceMode(device) {
    deviceButtons.forEach(b => {
      const isActive = b.getAttribute('data-device') === device;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
    previewViewport.classList.remove(...deviceModeClasses);
    previewViewport.classList.add(device);
    previewWidthLabel.textContent = getDeviceWidthLabel(device, COMPONENT_MAX_WIDTH);

    if (btnPreviewOrientation) {
      const isMobileOrTablet = device === 'tablet' || device === 'mobile-lg' || device === 'mobile';
      btnPreviewOrientation.style.display = isMobileOrTablet ? 'inline-flex' : 'none';
      if (!isMobileOrTablet) {
        isLandscapeOrientation = false;
        previewViewport.classList.remove('landscape');
        btnPreviewOrientation.classList.remove('active');
      }
    }
  }

  if (btnPreviewOrientation) {
    btnPreviewOrientation.addEventListener('click', () => {
      isLandscapeOrientation = !isLandscapeOrientation;
      btnPreviewOrientation.classList.toggle('active', isLandscapeOrientation);
      previewViewport.classList.toggle('landscape', isLandscapeOrientation);
      showToast(isLandscapeOrientation ? 'Orientation: Landscape' : 'Orientation: Portrait', 'info', 1500);
      updateLivePreview();
    });
  }

  // Live Preview Zoom Controls
  let previewZoom = 1.0;
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');

  function applyPreviewZoom(level) {
    previewZoom = Math.min(1.5, Math.max(0.5, Math.round(level * 10) / 10));
    if (livePreviewIframe) {
      if (previewZoom === 1.0) {
        livePreviewIframe.style.transform = '';
        livePreviewIframe.style.width = '100%';
      } else {
        livePreviewIframe.style.transform = `scale(${previewZoom})`;
        livePreviewIframe.style.transformOrigin = 'top center';
        livePreviewIframe.style.width = `${100 / previewZoom}%`;
      }
    }
    if (btnZoomReset) {
      btnZoomReset.textContent = `${Math.round(previewZoom * 100)}%`;
    }
  }

  if (btnZoomIn) btnZoomIn.addEventListener('click', () => applyPreviewZoom(previewZoom + 0.1));
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => applyPreviewZoom(previewZoom - 0.1));
  if (btnZoomReset) btnZoomReset.addEventListener('click', () => applyPreviewZoom(1.0));

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
    if (spinner) {
      spinner.style.transform = 'rotate(360deg)';
      spinner.style.transition = 'transform 0.6s ease';
      
      setTimeout(() => {
        spinner.style.transform = 'rotate(0deg)';
        spinner.style.transition = 'none';
      }, 600);
    }
    
    updateLivePreview();
  });

  btnPreviewPopout.addEventListener('click', () => {
    openPreview(generateIframeContent());
  });

  // ==========================================
  // MODALS HANDLING
  // ==========================================
  const btnShortcuts = document.getElementById('btn-shortcuts');
  const modalShortcuts = document.getElementById('modal-shortcuts');
  if (btnShortcuts && modalShortcuts) {
    btnShortcuts.addEventListener('click', () => openModal('modal-shortcuts'));
  }
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
    const target = event.target;
    const isEditingText = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if (modalStack.length) {
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
      return;
    }

    // Escape outside modals: return from editor to catalog if authoring
    if (event.key === 'Escape' && !isEditingText) {
      if (editorState && editorState.style.display !== 'none') {
        event.preventDefault();
        btnBackToCatalog?.click();
        return;
      }
    }

    // '/' jumps to search in catalog view
    if (event.key === '/' && !isEditingText) {
      if (searchInput && catalogState && catalogState.style.display !== 'none') {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
        return;
      }
    }

    // '?' opens shortcuts cheatsheet
    if (event.key === '?' && !isEditingText) {
      event.preventDefault();
      openModal('modal-shortcuts');
      return;
    }

    // F2 triggers inline project title editing
    if (event.key === 'F2' && !isEditingText) {
      if (appState.selectedComponent) {
        event.preventDefault();
        startHeaderProjectRename();
        return;
      }
    }

    const isCmdOrCtrl = event.ctrlKey || event.metaKey;

    if (isCmdOrCtrl) {
      const key = event.key.toLowerCase();

      // Undo / Redo
      if (key === 'z' && !event.shiftKey) {
        if (history.canUndo()) {
          event.preventDefault();
          performUndo();
        }
        return;
      }
      if ((key === 'z' && event.shiftKey) || key === 'y') {
        if (history.canRedo()) {
          event.preventDefault();
          performRedo();
        }
        return;
      }

      // Save
      if (key === 's') {
        event.preventDefault();
        const btnSave = document.getElementById('btn-save');
        if (btnSave && !btnSave.disabled) btnSave.click();
        return;
      }

      // Export
      if (key === 'e') {
        event.preventDefault();
        const btnExport = document.getElementById('btn-export');
        if (btnExport && !btnExport.disabled) btnExport.click();
        return;
      }

      // Open Project
      if (key === 'o') {
        event.preventDefault();
        const btnOpen = document.getElementById('btn-open');
        if (btnOpen) btnOpen.click();
        return;
      }

      // Refresh preview
      if (key === 'p') {
        event.preventDefault();
        btnPreviewRefresh?.click();
        return;
      }

      // New Project (Ctrl+Alt+N)
      if (event.altKey && key === 'n') {
        event.preventDefault();
        const btnNew = document.getElementById('btn-new');
        if (btnNew) btnNew.click();
        return;
      }

      // Zoom preview (+ / - / 0)
      if (event.key === '=' || event.key === '+') {
        event.preventDefault();
        applyPreviewZoom(previewZoom + 0.1);
        return;
      }
      if (event.key === '-') {
        event.preventDefault();
        applyPreviewZoom(previewZoom - 0.1);
        return;
      }
      if (event.key === '0') {
        event.preventDefault();
        applyPreviewZoom(1.0);
        return;
      }
    }

    // Alt combinations for quick tab / viewport switching
    if (event.altKey && !isCmdOrCtrl && !isEditingText) {
      if (event.key === '1') { event.preventDefault(); activateEditorTab('content'); }
      else if (event.key === '2') { event.preventDefault(); activateEditorTab('interaction'); }
      else if (event.key === '3') { event.preventDefault(); activateEditorTab('appearance'); }
      else if (event.key === '4') { event.preventDefault(); activateEditorTab('completion'); }
      else if (event.key.toLowerCase() === 'd') { event.preventDefault(); applyDeviceMode('desktop'); }
      else if (event.key.toLowerCase() === 't') { event.preventDefault(); applyDeviceMode('tablet'); }
      else if (event.key.toLowerCase() === 'm') { event.preventDefault(); applyDeviceMode('mobile'); }
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

  function updateAccordionBehaviorVisibility(componentId) {
    accordionBehaviorGroup.hidden = componentId !== 'accordion';
  }

  function updateFlipCardsBehaviorVisibility(componentId) {
    flipCardsBehaviorGroup.hidden = componentId !== 'flip-cards';
  }

  function updateMcBehaviorVisibility(componentId) {
    mcBehaviorGroup.hidden = componentId !== 'multiple-choice';
  }

  function updateTabsBehaviorVisibility(componentId) {
    tabsBehaviorGroup.hidden = componentId !== 'tab-blocks';
  }

  function updateTimelineBehaviorVisibility(componentId) {
    timelineBehaviorGroup.hidden = componentId !== 'vertical-timeline';
  }

  function updateIvBehaviorVisibility(componentId) {
    ivBehaviorGroup.hidden = componentId !== 'interactive-video';
  }

  function updateIvTimelineAuthoringVisibility(componentId) {
    ivTimelineAuthoringGroup.hidden = componentId !== 'interactive-video';
  }

  function updateComponentSpecificOptions(componentId) {
    updateAccordionBehaviorVisibility(componentId);
    updateFlipCardsBehaviorVisibility(componentId);
    updateMcBehaviorVisibility(componentId);
    updateTabsBehaviorVisibility(componentId);
    updateTimelineBehaviorVisibility(componentId);
    updateIvBehaviorVisibility(componentId);
    updateIvTimelineAuthoringVisibility(componentId);

    // Interaction default guidance note
    const interactionGuidance = document.getElementById('interaction-default-guidance');
    const hasCustomBehavior = ['accordion', 'flip-cards', 'multiple-choice', 'tab-blocks', 'vertical-timeline', 'interactive-video'].includes(componentId);
    if (interactionGuidance) interactionGuidance.style.display = hasCustomBehavior ? 'none' : 'flex';

    // Appearance component card
    const appearanceAccordionIcon = document.getElementById('appearance-accordion-icon-wrapper');
    const appearanceTabs = document.getElementById('appearance-tabs-wrapper');
    const componentAppearanceCard = document.getElementById('component-appearance-card');
    if (appearanceAccordionIcon) appearanceAccordionIcon.style.display = componentId === 'accordion' ? 'flex' : 'none';
    if (appearanceTabs) appearanceTabs.style.display = componentId === 'tab-blocks' ? 'block' : 'none';
    if (componentAppearanceCard) componentAppearanceCard.style.display = (componentId === 'accordion' || componentId === 'tab-blocks') ? 'flex' : 'none';

    // Completion tab items & guidance
    const ivCompletionRuleWrapper = document.getElementById('iv-completion-rule-wrapper');
    if (ivCompletionRuleWrapper) ivCompletionRuleWrapper.style.display = componentId === 'interactive-video' ? 'flex' : 'none';

    const completionTierBadge = document.getElementById('completion-tier-badge');
    const completionTrackingType = document.getElementById('completion-tracking-type');
    const completionGuidanceText = document.getElementById('completion-guidance-text');
    const statusBanner = document.getElementById('completion-status-banner');
    const compMeta = componentCatalog.find(c => c.id === componentId) || appState.selectedComponent;
    if (compMeta && completionTierBadge && completionTrackingType && completionGuidanceText) {
      completionTierBadge.textContent = compMeta.tierLabel || compMeta.tier || 'Enhanced Rise';
      completionTierBadge.className = `completion-tier-badge card-tier-${compMeta.tier || 'enhanced-rise'}`;
      completionTrackingType.textContent = compMeta.completionTracking || 'View / Interaction';
      completionGuidanceText.textContent = compMeta.completionTracking
        ? `When exported via Rise Code Block, this component reports completion through Rise iframe message events (${compMeta.completionTracking}).`
        : 'Rise tracks completion for this block via standard learner scroll visibility when embedded.';
      if (statusBanner) {
        const isCustomLms = Boolean(compMeta.completionTracking);
        statusBanner.innerHTML = isCustomLms
          ? `<span class="completion-status-icon">✓</span><span class="completion-status-msg">Rise Code Block Compatible: dispatches iframe completion message on ${escapeHTML(compMeta.completionTracking.toLowerCase())}</span>`
          : `<span class="completion-status-icon">ℹ</span><span class="completion-status-msg">Standard Rise Scroll Tracking: Rise marks this block complete when scrolled into view</span>`;
      }
    }
  }

  function syncEditorControls() {
    syncResolvedThemeConfig();
    const config = appState.config;
    inputBlockTitle.value = config.blockTitle;
    inputBlockHeadline.value = config.blockHeadline;
    inputBlockDesc.value = config.blockDesc;
    config.blockHeadingLevel = normalizeHeadingLevel(config.blockHeadingLevel);
    selectHeadingLevel.value = config.blockHeadingLevel;
    if (selectHeaderStyle) selectHeaderStyle.value = config.headerStyle || 'minimal';
    if (inputHeaderCyanRule) inputHeaderCyanRule.checked = config.headerCyanRule === true;
    if (headerCyanRuleWrapper) headerCyanRuleWrapper.style.display = config.headerStyle === 'editorial' ? 'flex' : 'none';
    if (selectSpacingDensity) selectSpacingDensity.value = config.spacingDensity || 'standard';
    if (inputContextBandEnabled) inputContextBandEnabled.checked = config.contextBandEnabled === true;
    if (contextBandFields) contextBandFields.style.display = config.contextBandEnabled ? 'block' : 'none';
    if (inputContextBandText) inputContextBandText.value = config.contextBandText || '';
    if (selectContextBandAlignment) selectContextBandAlignment.value = config.contextBandAlignment || 'left';
    inputBehaviorAccordionMulti.checked = config.accordionMulti;
    inputBehaviorAccordionAnimation.checked = config.accordionAnimation;
    selectIconStyle.value = config.iconStyle;
    inputAccordionSequential.checked = config.accordionSequential === true;
    inputAccordionShowProgress.checked = config.accordionShowProgress === true;
    inputAccordionShowVisitedBadge.checked = config.accordionShowVisitedBadge === true;
    inputAccordionExpandCollapseAll.checked = config.accordionExpandCollapseAll === true;
    inputAccordionSearch.checked = config.accordionSearch === true;
    inputAccordionAllowReset.checked = config.accordionAllowReset === true;
    
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
    
    selectTabsOrientation.value = config.tabsOrientation || 'horizontal';
    inputTabsNumbered.checked = config.tabsNumbered === true;
    inputTabsSequential.checked = config.tabsSequential === true;
    inputTabsShowProgress.checked = config.tabsShowProgress === true;
    inputTabsShowVisitedBadge.checked = config.tabsShowVisitedBadge === true;
    inputTabsCompareMode.checked = config.tabsCompareMode === true;
    inputTabsAllowReset.checked = config.tabsAllowReset === true;
    
    inputTimelineCategories.checked = config.timelineCategoriesEnabled === true;
    inputTimelineCompareMode.checked = config.timelineCompareMode === true;
    inputTimelineCollapsible.checked = config.timelineCollapsibleDetails === true;
    inputTimelineChronological.checked = config.timelineChronologicalReveal === true;
    inputTimelineShowProgress.checked = config.timelineShowProgress === true;
    inputTimelineAllowReset.checked = config.timelineAllowReset === true;
    
    selectIvResumeBehaviour.value = config.resumeBehaviour || 'manual';
    selectIvCompletionRule.value = config.completionRule || 'videoEnded';
    inputIvShowMarkerNav.checked = config.showMarkerNavigation !== false;
    inputIvShowProgress.checked = config.showVideoProgress !== false;
    inputIvAllowRestart.checked = config.allowRestart === true;
    
    updateComponentSpecificOptions(appState.selectedComponent.id);
    syncIvAuthoringVideoSource();
    renderIvMarkerTimeline();
    inputTrackCompletion.checked = config.trackCompletion;
    inputCompletionMsg.value = config.completionMsg || '';

    // Sync completion tracking mode radio cards & allow-reset checkbox
    const currentCompletionMode = config.completionMode || (config.trackCompletion ? 'all-items' : 'none');
    const targetModeRadio = document.querySelector(`input[name="completion-mode"][value="${currentCompletionMode}"]`);
    if (targetModeRadio) targetModeRadio.checked = true;
    const inputAllowReset = document.getElementById('input-allow-reset');
    if (inputAllowReset) inputAllowReset.checked = config.allowReset === true;

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

  const selectedProjectsForCoursePack = new Set();

  function updateCoursePackControls() {
    const btn = document.getElementById('btn-export-course-pack');
    const countSpan = document.getElementById('course-pack-selected-count');
    const selectAllCheck = document.getElementById('check-select-all-projects');
    const projects = loadProjects();
    const count = selectedProjectsForCoursePack.size;
    if (countSpan) countSpan.textContent = String(count);
    if (btn) {
      btn.disabled = count === 0;
      btn.title = count === 0 ? 'Select at least one saved project to export a course pack' : `Export ${count} project(s) as Course Pack ZIP`;
    }
    if (selectAllCheck) {
      selectAllCheck.checked = projects.length > 0 && count === projects.length;
      selectAllCheck.indeterminate = count > 0 && count < projects.length;
    }
  }

  function renderStoredProjects() {
    savedComponentsList.innerHTML = '';
    const projects = loadProjects();
    // Prune selections of projects that were deleted
    const currentProjectIds = new Set(projects.map(p => p.id));
    for (const id of selectedProjectsForCoursePack) {
      if (!currentProjectIds.has(id)) selectedProjectsForCoursePack.delete(id);
    }
    updateCoursePackControls();

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
      
      const leftCol = document.createElement('div');
      leftCol.className = 'sc-card-left';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'sc-checkbox';
      checkbox.checked = selectedProjectsForCoursePack.has(project.id);
      checkbox.title = `Select “${project.name}” for course pack export`;
      checkbox.setAttribute('aria-label', `Select ${project.name} for course pack`);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedProjectsForCoursePack.add(project.id);
        else selectedProjectsForCoursePack.delete(project.id);
        updateCoursePackControls();
      });

      const details = document.createElement('div');
      details.className = 'sc-details';
      const name = document.createElement('div');
      name.className = 'sc-name';
      name.textContent = project.name;
      name.title = project.name;
      const meta = document.createElement('div');
      meta.className = 'sc-meta';
      const component = componentCatalog.find(item => item.id === project.componentId);
      meta.textContent = `Modified: ${formatReadableDate(project.updatedAt)} • ${component?.title || project.componentId}`;
      details.append(name, meta);
      leftCol.append(checkbox, details);

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
          selectedProjectsForCoursePack.delete(project.id);
          if (appState.currentProjectId === project.id) appState.currentProjectId = null;
          renderStoredProjects();
          showToast(`Deleted “${project.name}”.`, 'success');
          updateStorageMeter();
        } catch (error) { showToast(error.message, 'error'); }
      });
      card.append(leftCol, actions);
      savedComponentsList.appendChild(card);
    });
  }

  const selectAllProjectsCheck = document.getElementById('check-select-all-projects');
  if (selectAllProjectsCheck) {
    selectAllProjectsCheck.addEventListener('change', () => {
      const projects = loadProjects();
      if (selectAllProjectsCheck.checked) {
        projects.forEach(p => selectedProjectsForCoursePack.add(p.id));
      } else {
        selectedProjectsForCoursePack.clear();
      }
      renderStoredProjects();
    });
  }

  const btnExportCoursePack = document.getElementById('btn-export-course-pack');
  if (btnExportCoursePack) {
    btnExportCoursePack.addEventListener('click', async () => {
      const projects = loadProjects().filter(p => selectedProjectsForCoursePack.has(p.id));
      if (!projects.length) return showToast('Select at least one project for the course pack.', 'warning');
      const titleInput = document.getElementById('course-pack-title-input');
      const courseTitle = titleInput?.value.trim() || 'Course Package';

      btnExportCoursePack.disabled = true;
      const originalText = btnExportCoursePack.innerHTML;
      btnExportCoursePack.innerHTML = '<span>Building Course Pack…</span>';

      try {
        const componentsData = [];
        for (const project of projects) {
          const compDef = componentCatalog.find(item => item.id === project.componentId) || { id: project.componentId, title: project.name, category: 'interactive' };
          const prepared = await prepareMediaExport(project.config, { mode: 'package' });
          const projectTheme = project.theme || BUILT_IN_THEMES.find(t => t.id === DEFAULT_THEME_ID);
          const exportState = {
            selectedComponent: compDef,
            config: prepared.config,
            activeTheme: projectTheme,
            activeThemeId: projectTheme.id,
            componentOverrides: project.componentOverrides || {},
            settings: project.settings || {}
          };
          const html = compilePreview(exportState, componentRegistry, colorToRgba);
          componentsData.push({
            name: project.name,
            componentId: project.componentId,
            title: project.name,
            html,
            assets: prepared.assets,
            manifest: prepared.manifest
          });
        }

        const pack = await buildCoursePackZip({ courseTitle, components: componentsData });
        downloadCoursePackZip(courseTitle, pack.blob);
        showToast(`Course Pack ZIP downloaded with ${componentsData.length} block(s) (${formatExportedFileSize(pack.size)}).`, 'success');
      } catch (error) {
        showToast(`Course pack export failed: ${error.message}`, 'error', 6000);
      } finally {
        btnExportCoursePack.innerHTML = originalText;
        updateCoursePackControls();
      }
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

  const btnDuplicate = document.getElementById('btn-duplicate');
  if (btnDuplicate) {
    btnDuplicate.addEventListener('click', () => {
      if (!appState.selectedComponent) {
        showToast('Select or open a component block to duplicate.', 'warning');
        return;
      }
      try {
        const baseName = appState.currentProjectName || appState.selectedComponent.title || 'Component Block';
        const duplicateName = `${baseName} (Copy)`;
        const duplicatedProject = buildCurrentProject(duplicateName, true);
        const saved = saveProject(duplicatedProject);
        appState.currentProjectId = saved.id;
        appState.currentProjectName = saved.name;
        appState.isDirty = false;
        saveDraft(saved);
        updateProjectStatusDisplay();
        showToast(`Duplicated block as “${saved.name}”.`, 'success');
      } catch (error) {
        showToast(`Duplicate failed: ${error.message}`, 'error', 5000);
      }
    });
  }

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

  function renderPresetsModal() {
    const list = document.getElementById('presets-list');
    if (!list) return;
    list.innerHTML = '';
    const compId = appState.selectedComponent?.id || 'accordion';
    const presets = getPresetsForComponent(compId);

    if (!presets.length) {
      list.innerHTML = `
        <div class="sc-empty" style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-muted);">
          <p>No starter presets are currently available for this component archetype.</p>
        </div>
      `;
      return;
    }

    presets.forEach(preset => {
      const card = document.createElement('div');
      card.className = 'preset-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <span class="preset-card-domain">${escapeHTML(preset.domain)}</span>
        <div class="preset-card-title">${escapeHTML(preset.title)}</div>
        <div class="preset-card-desc">${escapeHTML(preset.description)}</div>
        <div class="preset-card-action">Apply Preset →</div>
      `;
      const apply = () => {
        history.pushState(appState.config);
        appState.config = { ...appState.config, ...structuredClone(preset.config), items: structuredClone(preset.config.items) };
        if (appState.selectedComponent) {
          applyMissingSchemaDefaults(appState.selectedComponent);
        }
        syncEditorControls();
        updateLivePreview();
        closeModal('modal-presets');
        showToast(`Applied preset “${preset.title}”.`, 'success');
      };
      card.addEventListener('click', apply);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          apply();
        }
      });
      list.appendChild(card);
    });
  }

  // Setup modal clicks
  Object.keys(modalTriggers).forEach(btnId => {
    const triggerBtn = document.getElementById(btnId);
    const modalId = modalTriggers[btnId];
    const modalElem = document.getElementById(modalId);
    
    if (triggerBtn && modalElem) {
      triggerBtn.addEventListener('click', () => {
        
        // Dynamic loading setup for modals
        if (modalId === 'modal-export') {
          setupExportModalContent();
        }
        if (modalId === 'modal-settings') syncSettingsControls();
        if (modalId === 'modal-preflight') renderPreflightModal();
        if (modalId === 'modal-presets') renderPresetsModal();

        openModal(modalId);
      });
    }
  });

  // Close modals
  modalOverlays.forEach(overlay => {
    const closeBtns = overlay.querySelectorAll('.modal-close-btn, .modal-cancel-btn');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (overlay.id === 'modal-component-details') closeComponentDetailsModal();
        else closeModal(overlay.id);
      }
    });

    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (overlay.id === 'modal-component-details') closeComponentDetailsModal();
        else closeModal(overlay.id);
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
  setupCopyBtn('btn-copy-rise-embed', 'export-rise-embed-code');
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
  let currentStorylineZipBundle = null;

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

  async function prepareStorylineZipBundle() {
    const prepared = await prepareMediaExport(appState.config, { mode: 'package' });
    const exportState = { ...appState, config: prepared.config };
    const html = compilePreview(exportState, componentRegistry, colorToRgba);
    if (prepared.missing.length) {
      return { html, manifest: prepared.manifest, warnings: prepared.warnings, missing: prepared.missing, blob: null, size: 0 };
    }
    const title = appState.selectedComponent?.title || 'Storyline Web Object';
    const packaged = await buildStorylineWebObjectZip({ html, assets: prepared.assets, manifest: prepared.manifest, title });
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
    ['btn-copy-iframe', 'btn-copy-rise-embed', 'btn-copy-html', 'btn-download-html'].forEach(id => {
      const button = document.getElementById(id);
      if (!button) return;
      button.disabled = !enabled;
      button.title = enabled ? '' : 'Fix the blocking errors listed above before exporting.';
    });
    // The Rise Project ZIP and Storyline ZIP buttons have their own independent, narrower block condition
    // (a genuinely missing asset) layered on top of this preflight gate.
    ['btn-download-rise-zip', 'btn-download-storyline-zip'].forEach(id => {
      const zipButton = document.getElementById(id);
      if (zipButton && enabled === false) {
        zipButton.disabled = true;
        zipButton.title = 'Fix the blocking errors listed above before exporting.';
      }
    });
  }

  // A second, independent Blocking gate (Requirement 4, P02) layered on top of the general
  // preflight gate above: when completion tracking is on, the Iframe Snippet, Rise Embed, and Web
  // Package ZIP formats can't report completion to Rise (js/compatibility.js's single
  // source of truth), so their actions are disabled with a direct fix — use "Copy for
  // Rise" in the primary panel instead — regardless of whether the rest of the component
  // is otherwise clean. Only relaxes a button when the general gate also allows it.
  function applyCompletionExportGate() {
    [['iframe', 'btn-copy-iframe'], ['rise-embed', 'btn-copy-rise-embed'], ['rise-zip', 'btn-download-rise-zip'], ['storyline', 'btn-download-storyline-zip']].forEach(([formatKey, buttonId]) => {
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

    // Rise Multimedia Embed snippet
    const riseEmbedUrlInput = document.getElementById('export-rise-embed-url');
    const riseEmbedCode = document.getElementById('export-rise-embed-code');
    const riseEmbedSizeLabel = document.getElementById('export-rise-embed-size');
    const updateRiseEmbedSnippet = () => {
      const url = riseEmbedUrlInput?.value.trim() || 'https://your-server.example.com/components/my-block/index.html';
      const snippet = buildRiseEmbedSnippet({
        url,
        title: appState.selectedComponent?.title || 'AT&T Interactive Block'
      });
      if (riseEmbedCode) riseEmbedCode.textContent = snippet;
      if (riseEmbedSizeLabel) riseEmbedSizeLabel.textContent = formatExportedFileSize(getExportedFileSize(snippet));
    };
    updateRiseEmbedSnippet();
    if (riseEmbedUrlInput && !riseEmbedUrlInput.dataset.listenerAttached) {
      riseEmbedUrlInput.dataset.listenerAttached = 'true';
      riseEmbedUrlInput.addEventListener('input', updateRiseEmbedSnippet);
    }

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
    await setupStorylineZipPane(canExport);
    // setupRiseZipPane() and setupStorylineZipPane() set buttons disabled/title state purely from
    // general gate + missing-asset check. Re-apply completion export gate last so it has final word.
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

  async function setupStorylineZipPane(canExport) {
    const zipWarningBox = document.getElementById('storyline-zip-warning');
    const zipBlockingBox = document.getElementById('storyline-zip-blocking');
    const zipSizeLabel = document.getElementById('storyline-zip-file-size');
    const zipButton = document.getElementById('btn-download-storyline-zip');
    if (zipWarningBox) { zipWarningBox.hidden = false; zipWarningBox.classList.add('is-loading'); zipWarningBox.textContent = 'Preparing Storyline Web Object ZIP…'; }
    try {
      currentStorylineZipBundle = await prepareStorylineZipBundle();
    } catch (error) {
      currentStorylineZipBundle = null;
      if (zipWarningBox) { zipWarningBox.classList.remove('is-loading'); zipWarningBox.textContent = `Storyline ZIP preparation failed: ${error.message}`; }
      return;
    }
    const bundle = currentStorylineZipBundle;
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
    if (zipSizeLabel) zipSizeLabel.textContent = blocked ? '' : `Storyline Web Object ZIP size: ${formatExportedFileSize(bundle.size)}`;
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

  const btnDownloadStorylineZip = document.getElementById('btn-download-storyline-zip');
  if (btnDownloadStorylineZip) {
    btnDownloadStorylineZip.addEventListener('click', async () => {
      const title = appState.selectedComponent?.title || 'rise-component';
      let bundle = currentStorylineZipBundle;
      try {
        if (!bundle) bundle = await prepareStorylineZipBundle();
      } catch (error) {
        showToast(`Export failed: ${error.message}`, 'error', 6000);
        return;
      }
      if (bundle.missing.length) {
        showToast(`Export blocked: ${bundle.missing.length} required asset${bundle.missing.length === 1 ? ' is' : 's are'} missing from local storage. Re-upload the missing file(s).`, 'error', 7000);
        return;
      }
      downloadStorylineWebObjectZip(title, bundle.blob);
      showToast(`Storyline Web Object ZIP downloaded (${formatExportedFileSize(bundle.size)}).`, 'success');
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
    syncIvAuthoringVideoSource();
    renderIvMarkerTimeline();
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

  function updateEditorTabBadges(issues) {
    if (!appState.selectedComponent) {
      ['content', 'interaction', 'appearance', 'completion'].forEach(tabName => {
        const badge = document.getElementById(`tab-badge-${tabName}`);
        if (badge) badge.style.display = 'none';
      });
      return;
    }
    const context = buildPreflightContext();
    const issueList = issues || (context ? collectSyncIssues(context) : []);
    const tabCounts = { content: 0, interaction: 0, appearance: 0, completion: 0 };

    issueList.forEach(issue => {
      const fieldId = issue.field || issue.key || issue.fieldId || '';
      const tab = getFieldTabLocation(fieldId) || 'content';
      if (tabCounts[tab] !== undefined) {
        tabCounts[tab]++;
      }
    });

    ['content', 'interaction', 'appearance', 'completion'].forEach(tabName => {
      const badge = document.getElementById(`tab-badge-${tabName}`);
      if (badge) {
        const count = tabCounts[tabName];
        if (count > 0) {
          badge.textContent = count > 9 ? '9+' : String(count);
          badge.style.display = 'inline-flex';
          badge.title = `${count} issue${count > 1 ? 's' : ''} in ${tabName}`;
        } else {
          badge.style.display = 'none';
        }
      }
    });
  }

  function refreshPreflightBadge() {
    const context = buildPreflightContext();
    if (!context) return;
    const syncIssues = collectSyncIssues(context);
    updatePreflightBadge(summarizePreflight(syncIssues));
    updateEditorTabBadges(syncIssues);
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
    updateEditorTabBadges();
  }

  function jumpToPreflightField(fieldId, itemIndexRaw) {
    const itemIndex = itemIndexRaw === '' || itemIndexRaw === undefined ? null : Number(itemIndexRaw);
    closeModal('modal-preflight');
    closeModal('modal-export');
    window.setTimeout(() => {
      jumpToEditorField(fieldId, itemIndex);
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

  function computeCompliancePillars(issues) {
    const brandIssues = issues.filter(i => i.rule?.includes('brand') || i.title?.toLowerCase().includes('brand') || i.title?.toLowerCase().includes('color') || i.title?.toLowerCase().includes('typography'));
    const a11yIssues = issues.filter(i => i.rule?.includes('a11y') || i.title?.toLowerCase().includes('contrast') || i.title?.toLowerCase().includes('accessibility') || i.title?.toLowerCase().includes('alt'));
    const riseIssues = issues.filter(i => i.rule?.includes('rise') || i.title?.toLowerCase().includes('rise') || i.title?.toLowerCase().includes('overflow') || i.title?.toLowerCase().includes('height') || i.title?.toLowerCase().includes('completion'));
    const mediaIssues = issues.filter(i => i.rule?.includes('media') || i.title?.toLowerCase().includes('media') || i.title?.toLowerCase().includes('image') || i.title?.toLowerCase().includes('video') || i.title?.toLowerCase().includes('audio'));

    const getPillarState = (pillIssues) => {
      if (pillIssues.some(i => i.severity === 'blocking')) return 'blocking';
      if (pillIssues.some(i => i.severity === 'warning')) return 'warning';
      return 'pass';
    };

    return [
      { id: 'brand', name: 'Brand & Typography', state: getPillarState(brandIssues), count: brandIssues.length },
      { id: 'a11y', name: 'WCAG 2.1 AA Accessibility', state: getPillarState(a11yIssues), count: a11yIssues.length },
      { id: 'rise', name: 'Rise 360 Compatibility', state: getPillarState(riseIssues), count: riseIssues.length },
      { id: 'media', name: 'Media & Asset Budgets', state: getPillarState(mediaIssues), count: mediaIssues.length }
    ];
  }

  function renderPreflightResults(container, issues) {
    const summary = summarizePreflight(issues);
    const pillars = computeCompliancePillars(issues);
    const passingCount = pillars.filter(p => p.state === 'pass').length;

    const pillarsHTML = `
      <div class="compliance-pillars-grid">
        ${pillars.map(p => {
          const icon = p.state === 'pass' ? '✓' : p.state === 'warning' ? '!' : '×';
          const metaText = p.state === 'pass' ? '100% Compliant' : `${p.count} ${p.state === 'blocking' ? 'blocking issue' : 'warning'}${p.count === 1 ? '' : 's'}`;
          return `
            <div class="compliance-pillar-card">
              <span class="compliance-pillar-status is-${p.state}">${icon}</span>
              <div class="compliance-pillar-info">
                <span class="compliance-pillar-name">${escapeHTML(p.name)}</span>
                <span class="compliance-pillar-meta">${escapeHTML(metaText)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

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

    const statusBanner = `<div class="preflight-summary-line" style="font-size: 13px; font-weight: 600; margin-bottom: 12px; color: ${summary.blocking.length ? 'var(--danger)' : 'var(--text-main)'};">AT&T Compliance Status: ${passingCount}/4 Pillars Verified${summary.blocking.length ? ' · Fix blocking errors before export' : ''}</div>`;

    container.innerHTML = statusBanner + pillarsHTML + (sectionsHTML || '<div class="preflight-empty">No issues found — this component is clean and ready for Rise.</div>');
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
