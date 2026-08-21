import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML, sanitizeRichText } from '../js/utilities.js';
import { validateNonEmptyArray, combineValidationResults } from '../js/validation-utils.js';

/**
 * Accordion Component Configuration
 * @typedef {Object} AccordionConfig
 * @property {boolean} accordionMulti - Allow multiple items open simultaneously
 * @property {boolean} accordionAnimation - Enable expand/collapse animation
 * @property {'chevron'|'plus-minus'|'arrow'} iconStyle - Icon style for expand indicators
 * @property {boolean} [accordionSequential] - Lock each panel until the previous one has been opened
 * @property {boolean} [accordionShowProgress] - Shows an "N of M explored" indicator, independent of trackCompletion
 * @property {boolean} [accordionShowVisitedBadge] - Shows a "Visited" badge on each panel once opened
 * @property {boolean} [accordionAllowReset] - Shows a "Reset" action clearing visited/opened/lock state
 * @property {boolean} [accordionSearch] - Shows a search input that filters panels by title/body text
 * @property {boolean} [accordionExpandCollapseAll] - Shows learner-facing Expand All/Collapse All controls (multi-open, non-sequential only)
 * @property {Array<{title: string, content: string}>} items - Array of accordion items
 */

export const id = 'accordion';
export const name = 'Responsive Accordion';
export const category = 'interactive';

/** @type {AccordionConfig} */
export const defaultConfig = {
  accordionMulti: true,
  accordionAnimation: true,
  iconStyle: 'chevron',
  // Free-exploration is the original, unchanged default — every accordionX guided-mode
  // field below is additive/optional, so a project saved before this feature existed
  // renders and behaves identically.
  accordionSequential: false,
  accordionShowProgress: false,
  accordionShowVisitedBadge: false,
  accordionAllowReset: false,
  accordionSearch: false,
  accordionExpandCollapseAll: false,
  items: [
    { title: 'Understanding User Intent', content: 'Instructional design begins by identifying the core learning objectives and alignment with business outcomes.' },
    { title: 'Designing for Engagement', content: 'Modern eLearning relies on micro-interactions, clean visual layouts, and bite-sized chunks of information.' },
    { title: 'SCORM and Tracking Analytics', content: 'Export clean standard elements to trace course completion, custom interaction states, and score cards.' }
  ]
};

export const editorSchema = getEditorSchema(id);

const lockIconSvg = '<svg width="13" height="13" viewBox="0 0 32 32" fill="currentColor" class="accordion-lock-icon" aria-hidden="true"><path d="M24 14 23 14 23 10.7C23 6.4 19.6 3 15.4 3 11.1 3 7.7 6.5 7.7 10.7L7.7 14 6.7 14C5.2 14 4 15.2 4 16.7L4 27.3C4 28.8 5.2 30 6.7 30L24 30C25.5 30 26.7 28.8 26.7 27.3L26.7 16.7C26.7 15.2 25.5 14 24 14ZM9.7 10.7C9.7 7.6 12.3 5 15.4 5 18.5 5 21 7.6 21 10.7L21 14 9.7 14 9.7 10.7ZM24.7 27.3C24.7 27.7 24.4 28 24 28L6.7 28C6.3 28 6 27.7 6 27.3L6 16.7C6 16.3 6.3 16 6.7 16L24 16C24.4 16 24.7 16.3 24.7 16.7L24.7 27.3Z"/></svg>';

export function generateHTML(config, instanceId) {
  const icon = config.iconStyle === 'chevron'
    ? '<svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" class="acc-arrow"><path d="M16 21.99 5.29 11.28 6.71 9.87 16 19.16 25.29 9.87 26.71 11.28Z"/></svg>'
    : config.iconStyle === 'plus-minus'
      ? '<div class="acc-plus-minus"></div>'
      : '<svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" class="acc-arrow"><path d="M12.27 26.71 10.86 25.29 20.15 16 10.86 6.71 12.27 5.29 22.98 16Z"/></svg>';

  const sequential = config.accordionSequential === true;
  const showProgress = config.accordionShowProgress === true;
  const showVisitedBadge = config.accordionShowVisitedBadge === true;
  const allowReset = config.accordionAllowReset === true;
  const searchEnabled = config.accordionSearch === true;
  const showExpandCollapseAll = config.accordionExpandCollapseAll === true && config.accordionMulti === true && !sequential;
  const total = config.items.length;

  const toolbar = (searchEnabled || showExpandCollapseAll || allowReset || showProgress) ? `
    <div class="accordion-toolbar">
      ${searchEnabled ? `
        <div class="accordion-search-row">
          <input type="search" class="accordion-search-input" id="${instanceId}-accordion-search" placeholder="Search sections..." aria-label="Search accordion sections">
          <button type="button" class="accordion-search-clear" hidden>Clear</button>
        </div>
        <div class="accordion-search-status" id="${instanceId}-accordion-search-status" role="status" aria-live="polite"></div>
      ` : ''}
      <div class="accordion-toolbar-row">
        ${showExpandCollapseAll ? `
          <button type="button" class="accordion-toolbar-btn accordion-expand-all-btn">Expand All</button>
          <button type="button" class="accordion-toolbar-btn accordion-collapse-all-btn">Collapse All</button>
        ` : ''}
        ${allowReset ? '<button type="button" class="accordion-toolbar-btn accordion-reset-btn">Reset</button>' : ''}
        ${showProgress ? `<span class="accordion-progress-text" id="${instanceId}-accordion-progress" role="status" aria-live="polite">0 of ${total} explored</span>` : ''}
      </div>
    </div>
  ` : '';

  return `${toolbar}<div class="accordion-group" id="${instanceId}-accordion-group">${config.items.map((item, index) => {
    const locked = sequential && index > 0;
    return `
    <div class="accordion-item${locked ? ' locked' : ''}" id="${instanceId}-item-${index}" data-idx="${index}">
      <h3><button class="accordion-trigger" id="${instanceId}-accordion-trigger-${index}" data-idx="${index}" aria-expanded="false" aria-controls="${instanceId}-accordion-panel-${index}" ${sequential ? `aria-describedby="${instanceId}-lock-note-${index}"` : ''} ${locked ? 'aria-disabled="true"' : ''}>
        <span class="accordion-trigger-text">
          ${sequential ? `<span class="accordion-lock-icon-slot" ${locked ? '' : 'hidden'}>${lockIconSvg}</span>` : ''}
          <span>${escapeHTML(item.title || 'Item Title Header')}</span>
          ${showVisitedBadge ? `<span class="accordion-visited-badge" hidden>Visited</span>` : ''}
        </span>
        ${icon}
      </button></h3>
      ${sequential ? `<p class="accordion-lock-note" id="${instanceId}-lock-note-${index}" ${locked ? '' : 'hidden'}>Locked — open the previous section first.</p>` : ''}
      <div class="accordion-content" id="${instanceId}-accordion-panel-${index}" role="region" aria-labelledby="${instanceId}-accordion-trigger-${index}" aria-hidden="true"><div class="accordion-body"><p>${sanitizeRichText(item.content || 'Customize accordion body descriptions.')}</p></div></div>
    </div>`;
  }).join('')}</div>`;
}

export function generateCSS() {
  return `
    .accordion-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .accordion-item {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      overflow: hidden;
      transition: border-color 0.2s ease;
    }

    .accordion-item[hidden] {
      display: none;
    }

    .accordion-trigger {
      width: 100%;
      background: transparent;
      border: none;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      color: var(--text-main);
      outline: none;
    }

    .accordion-trigger:focus-visible {
      box-shadow: 0 0 0 3px var(--focus-ring);
    }

    .accordion-trigger[aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .accordion-trigger-text {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .accordion-lock-icon-slot {
      display: inline-flex;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .accordion-lock-note {
      margin: -8px 20px 12px;
      font-size: 11px;
      font-style: italic;
      color: var(--text-muted);
    }

    .accordion-visited-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 2px 8px;
      border-radius: 6px;
      background-color: var(--border-color);
      color: var(--text-main);
    }

    .acc-arrow {
      transition: transform 0.25s ease;
      color: var(--text-muted);
    }

    .accordion-item.active .acc-arrow {
      transform: rotate(180deg);
      color: var(--accent);
    }

    .accordion-item.active {
      border-color: var(--accent);
    }

    .acc-plus-minus {
      position: relative;
      width: 14px;
      height: 14px;
    }

    .acc-plus-minus::before, .acc-plus-minus::after {
      content: '';
      position: absolute;
      background-color: var(--text-muted);
      transition: transform 0.25s ease;
    }

    .acc-plus-minus::before {
      top: 6px;
      left: 0;
      right: 0;
      height: 2px;
    }

    .acc-plus-minus::after {
      top: 0;
      bottom: 0;
      left: 6px;
      width: 2px;
    }

    .accordion-item.active .acc-plus-minus::after {
      transform: rotate(90deg);
      opacity: 0;
    }
    .accordion-item.active .acc-plus-minus::before,
    .accordion-item.active .acc-plus-minus::after {
      background-color: var(--accent);
    }

    .accordion-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }

    .accordion-body {
      padding: 0 20px 20px 20px;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-muted);
    }

    .accordion-toolbar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 14px;
    }

    .accordion-search-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .accordion-search-input {
      flex: 1;
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--button-radius);
      padding: 8px 14px;
      font-size: 12px;
      color: var(--text-main);
    }

    .accordion-toolbar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .accordion-toolbar-btn, .accordion-search-clear {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--button-radius);
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
    }

    .accordion-progress-text {
      margin-left: auto;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }`;
}

export function generateJS(config, instanceId) {
  const sequential = config.accordionSequential === true;
  const showVisitedBadge = config.accordionShowVisitedBadge === true;
  const showProgress = config.accordionShowProgress === true;
  const total = config.items.length;

  return `
    var multiOpen = ${Boolean(config.accordionMulti)};
    var allowAnimation = ${Boolean(config.accordionAnimation)};
    var sequentialMode = ${sequential};
    var showVisitedBadge = ${showVisitedBadge};
    var showProgress = ${showProgress};
    var accordionTotal = ${total};

    function isPanelLocked(index) {
      return sequentialMode && index > 0 && !viewedItems.has(index - 1);
    }

    function refreshLockState() {
      if (!sequentialMode) return;
      document.querySelectorAll('.accordion-item').forEach(function(itemEl) {
        var idx = parseInt(itemEl.getAttribute('data-idx'), 10);
        var locked = isPanelLocked(idx);
        var trigger = itemEl.querySelector('.accordion-trigger');
        var lockIconSlot = itemEl.querySelector('.accordion-lock-icon-slot');
        var lockNote = itemEl.querySelector('.accordion-lock-note');
        itemEl.classList.toggle('locked', locked);
        if (trigger) {
          if (locked) trigger.setAttribute('aria-disabled', 'true');
          else trigger.removeAttribute('aria-disabled');
        }
        if (lockIconSlot) lockIconSlot.hidden = !locked;
        if (lockNote) lockNote.hidden = !locked;
      });
    }

    function updateVisitedBadge(index) {
      if (!showVisitedBadge) return;
      var item = document.getElementById('${instanceId}-item-' + index);
      var badge = item && item.querySelector('.accordion-visited-badge');
      if (badge) badge.hidden = !viewedItems.has(index);
    }

    function updateProgressText() {
      if (!showProgress) return;
      var progress = document.getElementById('${instanceId}-accordion-progress');
      if (progress) progress.textContent = viewedItems.size + ' of ' + accordionTotal + ' explored';
    }

    function toggleAccordion(index) {
      if (isPanelLocked(index)) {
        announce('This section is locked. Open the previous section first.');
        return;
      }

      var item = document.getElementById('${instanceId}-item-' + index);
      var isCurrentlyActive = item.classList.contains('active');

      if (!multiOpen) {
        document.querySelectorAll('.accordion-item').forEach(function(el) {
          el.classList.remove('active');
          var panel = el.querySelector('.accordion-content');
          var trigger = el.querySelector('.accordion-trigger');
          if (panel) {
            panel.style.maxHeight = null;
            panel.setAttribute('aria-hidden', 'true');
          }
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
      }

      var contentPanel = item.querySelector('.accordion-content');

      if (isCurrentlyActive) {
        item.classList.remove('active');
        contentPanel.style.maxHeight = null;
        contentPanel.setAttribute('aria-hidden', 'true');
        item.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('active');
        contentPanel.style.maxHeight = contentPanel.scrollHeight + 'px';
        contentPanel.setAttribute('aria-hidden', 'false');
        item.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'true');
        viewedItems.add(index);
        updateProgress();
        updateVisitedBadge(index);
        updateProgressText();
        refreshLockState();
      }
    }

    function expandAllPanels() {
      document.querySelectorAll('.accordion-item').forEach(function(itemEl) {
        var idx = parseInt(itemEl.getAttribute('data-idx'), 10);
        if (!itemEl.classList.contains('active') && !isPanelLocked(idx)) toggleAccordion(idx);
      });
    }

    function collapseAllPanels() {
      document.querySelectorAll('.accordion-item.active').forEach(function(itemEl) {
        toggleAccordion(parseInt(itemEl.getAttribute('data-idx'), 10));
      });
    }

    function applyAccordionSearch(query) {
      var q = query.trim().toLowerCase();
      var matchCount = 0;
      var total = 0;
      document.querySelectorAll('.accordion-item').forEach(function(itemEl) {
        total++;
        if (!q) { itemEl.hidden = false; matchCount++; return; }
        var visible = itemEl.textContent.toLowerCase().indexOf(q) !== -1;
        itemEl.hidden = !visible;
        if (visible) matchCount++;
      });
      var clearBtn = document.querySelector('.accordion-search-clear');
      if (clearBtn) clearBtn.hidden = !q;
      var status = document.getElementById('${instanceId}-accordion-search-status');
      if (status) status.textContent = q ? (matchCount + ' of ' + total + ' sections match.') : '';
    }

    function resetAccordion() {
      viewedItems.clear();
      document.querySelectorAll('.accordion-item').forEach(function(itemEl) {
        itemEl.classList.remove('active');
        itemEl.hidden = false;
        var panel = itemEl.querySelector('.accordion-content');
        var trigger = itemEl.querySelector('.accordion-trigger');
        if (panel) { panel.style.maxHeight = null; panel.setAttribute('aria-hidden', 'true'); }
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        updateVisitedBadge(parseInt(itemEl.getAttribute('data-idx'), 10));
      });
      refreshLockState();
      updateProgressText();
      updateProgress();
      var searchInput = document.getElementById('${instanceId}-accordion-search');
      if (searchInput) { searchInput.value = ''; applyAccordionSearch(''); }
      var firstTrigger = document.querySelector('.accordion-trigger');
      if (firstTrigger) firstTrigger.focus();
      announce('Accordion reset.');
    }

    function initComponent() {
      document.querySelectorAll('.accordion-trigger').forEach(function(trigger) {
        trigger.addEventListener('click', function() {
          toggleAccordion(parseInt(trigger.getAttribute('data-idx'), 10));
        });
      });

      refreshLockState();
      updateProgressText();

      var expandAllBtn = document.querySelector('.accordion-expand-all-btn');
      if (expandAllBtn) expandAllBtn.addEventListener('click', expandAllPanels);
      var collapseAllBtn = document.querySelector('.accordion-collapse-all-btn');
      if (collapseAllBtn) collapseAllBtn.addEventListener('click', collapseAllPanels);

      var resetBtn = document.querySelector('.accordion-reset-btn');
      if (resetBtn) resetBtn.addEventListener('click', resetAccordion);

      var searchInput = document.getElementById('${instanceId}-accordion-search');
      if (searchInput) {
        searchInput.addEventListener('input', function(event) { applyAccordionSearch(event.target.value); });
        var clearBtn = document.querySelector('.accordion-search-clear');
        if (clearBtn) clearBtn.addEventListener('click', function() {
          searchInput.value = '';
          applyAccordionSearch('');
          searchInput.focus();
        });
      }
    }`;
}

/**
 * Validates accordion component configuration.
 * @param {AccordionConfig} config - The configuration to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with error messages
 */
export function validate(config) {
  const results = [
    validateNonEmptyArray(config.items, 'Accordion items')
  ];

  // Validate each item has required fields
  if (Array.isArray(config.items)) {
    config.items.forEach((item, index) => {
      if (!item.title || !String(item.title).trim()) {
        results.push({ valid: false, error: `Item ${index + 1}: Title is required.` });
      }
      if (!item.content || !String(item.content).trim()) {
        results.push({ valid: false, error: `Item ${index + 1}: Content is required.` });
      }
    });
  }

  return combineValidationResults(results);
}
