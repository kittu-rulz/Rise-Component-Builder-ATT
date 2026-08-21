import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML, sanitizeRichText } from '../js/utilities.js';
import { combineValidationResults } from '../js/validation-utils.js';

/**
 * Vertical Timeline Component Configuration
 * @typedef {Object} VerticalTimelineConfig
 * @property {Array<{title: string, content: string, category?: string}>} items - Array of timeline steps
 * @property {boolean} [timelineCategoriesEnabled] - Shows a category badge per step and a filter chip row
 * @property {boolean} [timelineCompareMode] - Splits steps into two labeled streams by category (requires 2+ distinct categories)
 * @property {boolean} [timelineCollapsibleDetails] - Steps start collapsed; click/Enter expands
 * @property {boolean} [timelineShowProgress] - Shows an "N of M explored" indicator, independent of trackCompletion
 * @property {boolean} [timelineChronologicalReveal] - Locks each step until the previous one has been viewed
 * @property {boolean} [timelineAllowReset] - Shows a "Reset" action clearing visited/expanded/lock/filter state
 */

export const id = 'vertical-timeline';
export const name = 'Vertical Step Timeline';
export const category = 'timelines';

/** @type {VerticalTimelineConfig} */
export const defaultConfig = {
  // Free, single-track browsing is the original, unchanged default — every timelineX
  // field below is additive/optional, so a project saved before this feature existed
  // renders and behaves identically.
  timelineCategoriesEnabled: false,
  timelineCompareMode: false,
  timelineCollapsibleDetails: false,
  timelineShowProgress: false,
  timelineChronologicalReveal: false,
  timelineAllowReset: false,
  items: [
    { title: 'Phase 1: Research', content: 'Collect data assets, requirements, and verify targets.' },
    { title: 'Phase 2: Build Layout', content: 'Configure colors, fonts, margins, and borders in the tool.' },
    { title: 'Phase 3: Export HTML', content: 'Copy custom block and import inside Articulate Rise blocks.' }
  ]
};
export const editorSchema = getEditorSchema(id);

const lockIconSvg = '<svg width="11" height="11" viewBox="0 0 32 32" fill="currentColor" class="step-lock-icon" aria-hidden="true"><path d="M24 14 23 14 23 10.7C23 6.4 19.6 3 15.4 3 11.1 3 7.7 6.5 7.7 10.7L7.7 14 6.7 14C5.2 14 4 15.2 4 16.7L4 27.3C4 28.8 5.2 30 6.7 30L24 30C25.5 30 26.7 28.8 26.7 27.3L26.7 16.7C26.7 15.2 25.5 14 24 14ZM9.7 10.7C9.7 7.6 12.3 5 15.4 5 18.5 5 21 7.6 21 10.7L21 14 9.7 14 9.7 10.7ZM24.7 27.3C24.7 27.7 24.4 28 24 28L6.7 28C6.3 28 6 27.7 6 27.3L6 16.7C6 16.3 6.3 16 6.7 16L24 16C24.4 16 24.7 16.3 24.7 16.7L24.7 27.3Z"/></svg>';

function renderStep(item, index, instanceId, opts) {
  const { collapsible, locked, showCategoryBadge } = opts;
  const trimmedCategory = (item.category || '').trim();
  const stepNum = index + 1;
  const contentHtml = sanitizeRichText(item.content || 'Step content description details go here.');
  const categoryBadge = showCategoryBadge && trimmedCategory ? `<span class="step-category-badge">${escapeHTML(trimmedCategory)}</span>` : '';
  const categoryAttr = trimmedCategory ? ` data-category="${escapeAttribute(trimmedCategory)}"` : '';
  const lockNote = locked ? `<p class="step-lock-note" id="${instanceId}-step-lock-note-${index}">Locked — reveal the previous step first.</p>` : '';
  const lockIconSlot = collapsible || locked ? `<span class="step-lock-icon-slot" ${locked ? '' : 'hidden'}>${lockIconSvg}</span>` : '';

  if (collapsible) {
    return `<div class="timeline-step${locked ? ' locked' : ''}" data-idx="${index}"${categoryAttr}>
      <div class="step-marker" aria-hidden="true"><span class="step-num">${stepNum}</span></div>
      <div class="step-card">
        <button type="button" class="step-toggle-btn" id="${instanceId}-step-toggle-${index}" aria-expanded="false" aria-controls="${instanceId}-step-body-${index}" ${locked ? `aria-disabled="true" aria-describedby="${instanceId}-step-lock-note-${index}"` : ''}>
          ${lockIconSlot}<h4>${escapeHTML(item.title || 'Step Title')}</h4>${categoryBadge}
        </button>
        <div class="step-body" id="${instanceId}-step-body-${index}" hidden><p>${contentHtml}</p></div>
        ${lockNote}
      </div>
    </div>`;
  }

  return `<div class="timeline-step${locked ? ' locked' : ''}" role="listitem" tabindex="0" data-idx="${index}"${categoryAttr} aria-label="Step ${stepNum}: ${escapeAttribute(item.title || 'Step Title')}" aria-pressed="false" ${locked ? `aria-disabled="true" aria-describedby="${instanceId}-step-lock-note-${index}"` : ''}>
    <div class="step-marker" aria-hidden="true"><span class="step-num">${stepNum}</span></div>
    <div class="step-card">
      <h4>${lockIconSlot}${escapeHTML(item.title || 'Step Title')}${categoryBadge}</h4>
      <p>${contentHtml}</p>
      ${lockNote}
    </div>
  </div>`;
}

export function generateHTML(config, instanceId) {
  const categoriesEnabled = config.timelineCategoriesEnabled === true;
  const collapsible = config.timelineCollapsibleDetails === true;
  const showProgress = config.timelineShowProgress === true;
  const chronological = config.timelineChronologicalReveal === true;
  const allowReset = config.timelineAllowReset === true;
  const total = config.items.length;

  const distinctCategories = categoriesEnabled
    ? [...new Set(config.items.map(it => (it.category || '').trim()).filter(Boolean))]
    : [];
  // Compare mode needs something real to compare — with fewer than 2 distinct
  // categories authored, it silently falls back to the normal single-track list
  // (still showing category badges if any are set) rather than rendering a
  // half-empty second column.
  const compareMode = config.timelineCompareMode === true && categoriesEnabled && distinctCategories.length >= 2;

  const filterChips = categoriesEnabled && !compareMode && distinctCategories.length ? `
    <div class="timeline-filter-chips" role="group" aria-label="Filter by category">
      <button type="button" class="timeline-filter-chip active" data-filter-category="">All</button>
      ${distinctCategories.map(cat => `<button type="button" class="timeline-filter-chip" data-filter-category="${escapeAttribute(cat)}">${escapeHTML(cat)}</button>`).join('')}
    </div>
  ` : '';

  const toolbar = (filterChips || showProgress || allowReset) ? `
    <div class="timeline-toolbar">
      ${filterChips}
      <div class="timeline-toolbar-row">
        ${allowReset ? '<button type="button" class="timeline-toolbar-btn timeline-reset-btn">Reset</button>' : ''}
        ${showProgress ? `<span class="timeline-progress-text" id="${instanceId}-timeline-progress" role="status" aria-live="polite">0 of ${total} explored</span>` : ''}
      </div>
    </div>
  ` : '';

  if (compareMode) {
    const [streamA, streamB] = distinctCategories;
    const itemsWithIndex = config.items.map((item, index) => ({ item, index }));
    const columnA = itemsWithIndex.filter(entry => (entry.item.category || '').trim() === streamA);
    const columnB = itemsWithIndex.filter(entry => (entry.item.category || '').trim() !== streamA);
    const renderColumn = (label, entries) => `
      <div class="timeline-compare-column">
        <h3 class="timeline-compare-column-title">${escapeHTML(label)}</h3>
        <div class="vertical-timeline-container" role="list" aria-label="${escapeAttribute(label)} timeline">
          ${entries.map(entry => renderStep(entry.item, entry.index, instanceId, { collapsible, locked: chronological && entry.index > 0, showCategoryBadge: false })).join('')}
        </div>
      </div>`;
    return `${toolbar}<div class="timeline-compare-layout">${renderColumn(streamA, columnA)}${renderColumn(streamB || 'Other', columnB)}</div>`;
  }

  return `${toolbar}<div class="vertical-timeline-container" role="list" aria-label="Timeline">${config.items.map((item, index) => renderStep(item, index, instanceId, {
    collapsible,
    locked: chronological && index > 0,
    showCategoryBadge: categoriesEnabled
  })).join('')}</div>`;
}

export function generateCSS() {
  return `
    .timeline-toolbar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }
    .timeline-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .timeline-toolbar-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .timeline-filter-chip, .timeline-toolbar-btn {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--button-radius);
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
    }
    .timeline-filter-chip.active {
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary) inset;
    }
    .timeline-progress-text {
      margin-left: auto;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .vertical-timeline-container {
      display: flex;
      flex-direction: column;
      position: relative;
      padding-left: 32px;
    }

    .vertical-timeline-container::before {
      content: '';
      position: absolute;
      left: 12px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      /* Not an opacity-faked tint of --accent: the brand rules bar inventing
         shades of the brand colors, so this connecting rail uses the theme's own
         approved neutral border color at full opacity instead. */
      background-color: var(--border-color);
    }

    .timeline-step {
      position: relative;
      margin-bottom: 24px;
      cursor: pointer;
    }

    .timeline-step[hidden] {
      display: none;
    }

    .timeline-step[aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .step-marker {
      position: absolute;
      left: -32px;
      top: 4px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      /* Not --accent-light: a shade of AT&T Blue, not the approved palette. Border
         is Cobalt (--primary), not AT&T Blue: this marker sits inside the
         clickable timeline step and should carry the clickable treatment. */
      background-color: var(--border-color);
      border: 2px solid var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }

    .step-num {
      font-size: 11px;
      font-weight: 700;
      /* Not --accent (AT&T Blue): at 11px, non-bold-equivalent contrast, this fails
         the brand's own 19px threshold for AT&T-Blue-colored text. */
      color: var(--text-main);
    }

    .step-card {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 16px 20px;
    }

    .step-card h4 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .step-card p {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .timeline-step.active .step-marker {
      background-color: var(--primary);
    }
    .timeline-step.active .step-num {
      color: var(--on-primary);
    }
    .timeline-step.active .step-card {
      border-color: var(--primary);
    }

    .step-category-badge {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 2px 8px;
      border-radius: 6px;
      background-color: var(--border-color);
      color: var(--text-main);
    }

    .step-lock-icon-slot {
      display: inline-flex;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .step-lock-note {
      margin-top: 6px;
      font-size: 11px;
      font-style: italic;
      color: var(--text-muted);
    }

    .step-toggle-btn {
      width: 100%;
      background: transparent;
      border: none;
      padding: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      text-align: left;
      cursor: pointer;
      font: inherit;
      color: inherit;
    }

    .step-toggle-btn[aria-disabled="true"] {
      cursor: not-allowed;
    }

    .step-toggle-btn h4 {
      margin: 0;
      flex: 1;
    }

    .step-body {
      margin-top: 8px;
    }

    .step-body p {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .timeline-compare-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .timeline-compare-column-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px dashed var(--border-color);
    }
    @media (max-width: 600px) {
      .timeline-compare-layout {
        grid-template-columns: 1fr;
      }
    }`;
}

export function generateJS(config, instanceId) {
  const collapsible = config.timelineCollapsibleDetails === true;
  const chronological = config.timelineChronologicalReveal === true;
  const categoriesEnabled = config.timelineCategoriesEnabled === true;
  const showProgress = config.timelineShowProgress === true;
  const total = config.items.length;

  return `
    var collapsibleSteps = ${collapsible};
    var chronologicalReveal = ${chronological};
    var categoriesEnabled = ${categoriesEnabled};
    var showProgress = ${showProgress};
    var timelineTotal = ${total};

    function isStepLocked(index) {
      return chronologicalReveal && index > 0 && !viewedItems.has(index - 1);
    }

    function refreshStepLockState() {
      if (!chronologicalReveal) return;
      document.querySelectorAll('.timeline-step').forEach(function(stepEl) {
        var idx = parseInt(stepEl.getAttribute('data-idx'), 10);
        var locked = isStepLocked(idx);
        var lockSlot = stepEl.querySelector('.step-lock-icon-slot');
        var note = document.getElementById('${instanceId}-step-lock-note-' + idx);
        var control = stepEl.querySelector('.step-toggle-btn') || stepEl;
        stepEl.classList.toggle('locked', locked);
        if (locked) control.setAttribute('aria-disabled', 'true');
        else control.removeAttribute('aria-disabled');
        if (lockSlot) lockSlot.hidden = !locked;
        if (note) note.hidden = !locked;
      });
    }

    function updateTimelineProgressText() {
      if (!showProgress) return;
      var progress = document.getElementById('${instanceId}-timeline-progress');
      if (progress) progress.textContent = viewedItems.size + ' of ' + timelineTotal + ' explored';
    }

    function markStepViewed(index) {
      viewedItems.add(index);
      updateProgress();
      updateTimelineProgressText();
      refreshStepLockState();
    }

    function applyTimelineFilter(categoryValue) {
      var visibleCount = 0;
      document.querySelectorAll('.timeline-step').forEach(function(stepEl) {
        var matches = !categoryValue || stepEl.getAttribute('data-category') === categoryValue;
        stepEl.hidden = !matches;
        if (matches) visibleCount++;
      });
      announce(visibleCount + ' step' + (visibleCount === 1 ? '' : 's') + ' shown.');
    }

    function resetTimeline() {
      viewedItems.clear();
      document.querySelectorAll('.timeline-step').forEach(function(stepEl) {
        stepEl.classList.remove('active');
        stepEl.hidden = false;
        if (stepEl.hasAttribute('aria-pressed')) stepEl.setAttribute('aria-pressed', 'false');
        var toggleBtn = stepEl.querySelector('.step-toggle-btn');
        var body = stepEl.querySelector('.step-body');
        if (toggleBtn && body) {
          toggleBtn.setAttribute('aria-expanded', 'false');
          body.hidden = true;
        }
      });
      refreshStepLockState();
      updateTimelineProgressText();
      updateProgress();
      document.querySelectorAll('.timeline-filter-chip').forEach(function(chip) {
        chip.classList.toggle('active', chip.getAttribute('data-filter-category') === '');
      });
      var firstStep = document.querySelector('.timeline-step');
      if (firstStep) (firstStep.querySelector('.step-toggle-btn') || firstStep).focus();
      announce('Timeline reset.');
    }

    function initComponent() {
      document.querySelectorAll('.timeline-step').forEach(function(stepEl) {
        var idx = parseInt(stepEl.getAttribute('data-idx'), 10);

        if (collapsibleSteps) {
          var toggleBtn = stepEl.querySelector('.step-toggle-btn');
          var body = stepEl.querySelector('.step-body');
          if (toggleBtn && body) {
            toggleBtn.addEventListener('click', function() {
              if (isStepLocked(idx)) {
                announce('This step is locked. Reveal the previous step first.');
                return;
              }
              var expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
              toggleBtn.setAttribute('aria-expanded', String(!expanded));
              body.hidden = expanded;
              if (!expanded) markStepViewed(idx);
            });
          }
        } else {
          stepEl.addEventListener('click', function() {
            if (isStepLocked(idx)) {
              announce('This step is locked. Reveal the previous step first.');
              return;
            }
            document.querySelectorAll('.timeline-step').forEach(function(item) { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
            stepEl.classList.add('active');
            stepEl.setAttribute('aria-pressed', 'true');
            markStepViewed(idx);
          });
          stepEl.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              stepEl.click();
            }
          });
        }
      });

      refreshStepLockState();
      updateTimelineProgressText();

      if (categoriesEnabled) {
        document.querySelectorAll('.timeline-filter-chip').forEach(function(chip) {
          chip.addEventListener('click', function() {
            document.querySelectorAll('.timeline-filter-chip').forEach(function(c) { c.classList.remove('active'); });
            chip.classList.add('active');
            applyTimelineFilter(chip.getAttribute('data-filter-category'));
          });
        });
      }

      var resetBtn = document.querySelector('.timeline-reset-btn');
      if (resetBtn) resetBtn.addEventListener('click', resetTimeline);
    }`;
}

/**
 * Validates vertical timeline component configuration.
 * @param {VerticalTimelineConfig} config - The configuration to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with error messages
 */
export function validate(config) {
  const results = [];
  // No date field exists in this component's schema (items are title+content+category),
  // so this checks item presence directly rather than going through
  // validateTimelineEvents, whose date/chronological-order logic doesn't apply here.
  if (!Array.isArray(config.items) || config.items.length === 0) {
    results.push({ valid: false, error: 'At least one timeline step is required.' });
  } else {
    config.items.forEach((item, index) => {
      if (!item.title || !String(item.title).trim()) {
        results.push({ valid: false, error: `Step ${index + 1}: Title is required.` });
      }
      if (!item.content || !String(item.content).trim()) {
        results.push({ valid: false, error: `Step ${index + 1}: Description is required.` });
      }
    });
  }

  return combineValidationResults(results);
}
