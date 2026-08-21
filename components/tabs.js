import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML, sanitizeRichText, sanitizeURL, serializeForInlineScript } from '../js/utilities.js';

/**
 * Horizontal Tabs Component Configuration
 * @typedef {Object} TabsConfig
 * @property {Array<{title: string, content: string, iconImage?: string, iconAltText?: string, iconDecorative?: boolean, iconFit?: string}>} items - Array of tab items
 * @property {boolean} [tabsSequential] - Locks each tab until the previous one has been selected
 * @property {boolean} [tabsShowProgress] - Shows an "N of M explored" indicator, independent of trackCompletion
 * @property {boolean} [tabsShowVisitedBadge] - Shows a "Visited" badge on each visited tab
 * @property {boolean} [tabsAllowReset] - Shows a "Reset" action clearing visited/selected/lock state
 * @property {boolean} [tabsNumbered] - Prefixes each tab label with its step number
 * @property {'horizontal'|'vertical'} [tabsOrientation] - Tab list orientation (vertical falls back to horizontal below 480px)
 * @property {boolean} [tabsCompareMode] - Shows an optional side-by-side comparison of two chosen tabs
 */

export const id = 'tab-blocks';
export const name = 'Horizontal Tabs';
export const category = 'interactive';
export const defaultConfig = {
  // Free navigation is the original, unchanged default — every tabsX guided/comparison
  // field below is additive/optional, so a project saved before this feature existed
  // renders and behaves identically.
  tabsSequential: false,
  tabsShowProgress: false,
  tabsShowVisitedBadge: false,
  tabsAllowReset: false,
  tabsNumbered: false,
  tabsOrientation: 'horizontal',
  tabsCompareMode: false,
  items: [
    { title: 'Tab 1: Overview', content: 'A high-level explanation of the subject matter, laying a strong conceptual foundation.' },
    { title: 'Tab 2: Details', content: 'In-depth description of procedures, parameters, and design metrics.' },
    { title: 'Tab 3: Summary', content: 'Key takeaways and visual summaries to reinforce memory retention.' }
  ]
};
export const editorSchema = getEditorSchema(id);

const lockIconSvg = '<svg width="12" height="12" viewBox="0 0 32 32" fill="currentColor" class="tab-lock-icon" aria-hidden="true"><path d="M24 14 23 14 23 10.7C23 6.4 19.6 3 15.4 3 11.1 3 7.7 6.5 7.7 10.7L7.7 14 6.7 14C5.2 14 4 15.2 4 16.7L4 27.3C4 28.8 5.2 30 6.7 30L24 30C25.5 30 26.7 28.8 26.7 27.3L26.7 16.7C26.7 15.2 25.5 14 24 14ZM9.7 10.7C9.7 7.6 12.3 5 15.4 5 18.5 5 21 7.6 21 10.7L21 14 9.7 14 9.7 10.7ZM24.7 27.3C24.7 27.7 24.4 28 24 28L6.7 28C6.3 28 6 27.7 6 27.3L6 16.7C6 16.3 6.3 16 6.7 16L24 16C24.4 16 24.7 16.3 24.7 16.7L24.7 27.3Z"/></svg>';

function renderTabIcon(item) {
  const source = sanitizeURL(item?.iconImage, { allowDataImage: true, allowBlob: true, allowRelative: true });
  if (!source) return '';
  const decorative = item.iconDecorative !== false;
  const fit = item.iconFit === 'cover' ? 'cover' : 'contain';
  return `<img class="tab-icon-img" src="${escapeAttribute(source)}" alt="${decorative ? '' : escapeAttribute(item.iconAltText || '')}" ${decorative ? 'aria-hidden="true"' : ''} style="object-fit:${fit};">`;
}

export function generateHTML(config, instanceId) {
  const sequential = config.tabsSequential === true;
  const showProgress = config.tabsShowProgress === true;
  const showVisitedBadge = config.tabsShowVisitedBadge === true;
  const allowReset = config.tabsAllowReset === true;
  const numbered = config.tabsNumbered === true;
  const vertical = config.tabsOrientation === 'vertical';
  const compareMode = config.tabsCompareMode === true;
  const total = config.items.length;

  const toolbar = (showProgress || allowReset || compareMode) ? `
    <div class="tabs-toolbar">
      ${compareMode ? '<button type="button" class="tabs-toolbar-btn tabs-compare-toggle-btn" aria-pressed="false">Compare Sections</button>' : ''}
      ${allowReset ? '<button type="button" class="tabs-toolbar-btn tabs-reset-btn">Reset</button>' : ''}
      ${showProgress ? `<span class="tabs-progress-text" id="${instanceId}-tabs-progress" role="status" aria-live="polite">0 of ${total} explored</span>` : ''}
    </div>
  ` : '';

  const tabHeaders = config.items.map((item, index) => {
    const locked = sequential && index > 0;
    const icon = renderTabIcon(item);
    return `<button class="tab-btn ${index === 0 ? 'active' : ''}" id="${instanceId}-tab-${index}" role="tab" aria-selected="${index === 0}" aria-controls="${instanceId}-tab-panel-${index}" tabindex="${index === 0 ? '0' : '-1'}" data-idx="${index}" ${sequential ? `aria-describedby="${instanceId}-tab-lock-note-${index}"` : ''} ${locked ? 'aria-disabled="true"' : ''}>${sequential ? `<span class="tab-lock-icon-slot" ${locked ? '' : 'hidden'}>${lockIconSvg}</span>` : ''}${icon}${numbered ? `<span class="tab-number" aria-hidden="true">${index + 1}.</span>` : ''}<span class="tab-label-text">${escapeHTML(item.title || 'Tab')}</span>${showVisitedBadge ? '<span class="tab-visited-badge" hidden>Visited</span>' : ''}</button>${sequential ? `<span class="sr-only tab-lock-note" id="${instanceId}-tab-lock-note-${index}" ${locked ? '' : 'hidden'}>Locked. Select the previous tab first.</span>` : ''}`;
  }).join('');

  const tabPanels = config.items.map((item, index) => `<div class="tab-panel ${index === 0 ? 'active' : ''}" id="${instanceId}-tab-panel-${index}" role="tabpanel" aria-labelledby="${instanceId}-tab-${index}" tabindex="0" ${index === 0 ? '' : 'hidden'}><p>${sanitizeRichText(item.content || '')}</p></div>`).join('');

  const compareBlock = compareMode ? `
    <div class="tabs-compare-panel" hidden>
      <p class="tabs-compare-hint" id="${instanceId}-compare-hint">Select up to 2 sections to compare side by side.</p>
      <div class="tabs-compare-checklist" role="group" aria-labelledby="${instanceId}-compare-hint">
        ${config.items.map((item, index) => `
          <label class="tabs-compare-check-item">
            <input type="checkbox" class="tabs-compare-checkbox" data-idx="${index}">
            <span>${escapeHTML(item.title || 'Tab')}</span>
          </label>
        `).join('')}
      </div>
      <div class="tabs-compare-columns" id="${instanceId}-compare-columns"></div>
    </div>
  ` : '';

  return `<div class="tabs-container ${vertical ? 'tabs-vertical' : ''}">
    ${toolbar}
    <div class="tabs-header" role="tablist" aria-label="Content sections" aria-orientation="${vertical ? 'vertical' : 'horizontal'}">${tabHeaders}</div>
    <div class="tabs-content-wrapper">${tabPanels}</div>
    ${compareBlock}
  </div>`;
}

export function generateCSS() {
  return `
    .tabs-container {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      overflow: hidden;
    }
    .tabs-toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 16px 0;
    }
    .tabs-toolbar-btn {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--button-radius);
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
    }
    .tabs-toolbar-btn[aria-pressed="true"] {
      /* Cobalt (--primary), not AT&T Blue: this is the pressed/active state of a
         clickable toggle button, which must use the Cobalt clickable treatment. */
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary) inset;
    }
    .tabs-progress-text {
      margin-left: auto;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .tabs-header {
      display: flex;
      border-bottom: var(--border-style);
      background-color: rgba(0,0,0,0.02);
      overflow-x: auto;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: none;
      padding: 14px 20px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: var(--text-main);
    }
    .tab-btn.active {
      /* Cobalt (--primary), not AT&T Blue (--accent): the active tab is a
         clickable control's selected state, so it needs the Cobalt clickable
         treatment. --accent is also restricted to >=19px text by the brand's
         own contrast rules (3.01:1 on white), and this label renders at 13px. */
      color: var(--primary);
      border-bottom-color: var(--primary);
    }
    .tab-btn[aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.6;
    }
    .tab-icon-img {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      border-radius: 4px;
    }
    .tab-lock-icon-slot {
      display: inline-flex;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .tab-visited-badge {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 1px 6px;
      border-radius: 6px;
      background-color: var(--border-color);
      color: var(--text-main);
    }
    .tabs-content-wrapper {
      padding: 20px;
    }
    .tab-panel {
      display: none;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-muted);
      animation: fadeIn 0.3s ease;
    }
    .tab-panel.active {
      display: block;
    }

    .tabs-container.tabs-vertical {
      display: flex;
    }
    .tabs-container.tabs-vertical .tabs-header {
      flex-direction: column;
      border-bottom: none;
      border-right: var(--border-style);
      overflow-x: visible;
      flex-shrink: 0;
      width: 200px;
    }
    .tabs-container.tabs-vertical .tab-btn {
      border-bottom: none;
      border-right: 2px solid transparent;
      justify-content: flex-start;
    }
    .tabs-container.tabs-vertical .tab-btn.active {
      border-right-color: var(--primary);
      border-bottom-color: transparent;
    }
    .tabs-container.tabs-vertical .tabs-content-wrapper {
      flex: 1;
      min-width: 0;
    }
    @media (max-width: 480px) {
      .tabs-container.tabs-vertical {
        flex-direction: column;
      }
      .tabs-container.tabs-vertical .tabs-header {
        flex-direction: row;
        border-right: none;
        border-bottom: var(--border-style);
        width: auto;
        overflow-x: auto;
      }
      .tabs-container.tabs-vertical .tab-btn {
        border-right: none;
        border-bottom: 2px solid transparent;
      }
      .tabs-container.tabs-vertical .tab-btn.active {
        border-right-color: transparent;
        border-bottom-color: var(--primary);
      }
    }

    .tabs-compare-panel {
      border-top: var(--border-style);
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .tabs-compare-hint {
      font-size: 12px;
      color: var(--text-muted);
    }
    .tabs-compare-checklist {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .tabs-compare-check-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .tabs-compare-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .tabs-compare-column {
      background-color: var(--bg-body);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 14px 16px;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-muted);
    }
    .tabs-compare-column h4 {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 6px;
    }
    @media (max-width: 600px) {
      .tabs-compare-columns {
        grid-template-columns: 1fr;
      }
    }`;
}

export function generateJS(config, instanceId) {
  const sequential = config.tabsSequential === true;
  const showVisitedBadge = config.tabsShowVisitedBadge === true;
  const showProgress = config.tabsShowProgress === true;
  const compareMode = config.tabsCompareMode === true;
  const total = config.items.length;

  return `
    var sequentialMode = ${sequential};
    var showVisitedBadge = ${showVisitedBadge};
    var showProgress = ${showProgress};
    var tabsTotal = ${total};
    ${compareMode ? `var tabItems = ${serializeForInlineScript(config.items)};
    var compareSelected = [];` : ''}

    function isTabLocked(index) {
      return sequentialMode && index > 0 && !viewedItems.has(index - 1);
    }

    function refreshTabLockState() {
      if (!sequentialMode) return;
      document.querySelectorAll('.tab-btn').forEach(function(btn) {
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        var locked = isTabLocked(idx);
        var lockSlot = btn.querySelector('.tab-lock-icon-slot');
        var note = document.getElementById('${instanceId}-tab-lock-note-' + idx);
        if (locked) btn.setAttribute('aria-disabled', 'true');
        else btn.removeAttribute('aria-disabled');
        if (lockSlot) lockSlot.hidden = !locked;
        if (note) note.hidden = !locked;
      });
    }

    function updateTabVisitedBadge(index) {
      if (!showVisitedBadge) return;
      var btn = document.getElementById('${instanceId}-tab-' + index);
      var badge = btn && btn.querySelector('.tab-visited-badge');
      if (badge) badge.hidden = !viewedItems.has(index);
    }

    function updateTabsProgressText() {
      if (!showProgress) return;
      var progress = document.getElementById('${instanceId}-tabs-progress');
      if (progress) progress.textContent = viewedItems.size + ' of ' + tabsTotal + ' explored';
    }

    function selectTab(index, button) {
      if (isTabLocked(index)) {
        announce('This tab is locked. Select the previous tab first.');
        return;
      }
      var container = button.closest('.tabs-container');
      container.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
        b.setAttribute('tabindex', '-1');
      });
      container.querySelectorAll('.tab-panel').forEach(function(p) {
        p.classList.remove('active');
        p.hidden = true;
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      button.setAttribute('tabindex', '0');
      var panel = document.getElementById('${instanceId}-tab-panel-' + index);
      panel.hidden = false;
      panel.classList.add('active');
      viewedItems.add(index);
      updateProgress();
      updateTabVisitedBadge(index);
      updateTabsProgressText();
      refreshTabLockState();
    }

    ${compareMode ? `
    function updateCompareColumns() {
      var columns = document.getElementById('${instanceId}-compare-columns');
      if (!columns) return;
      columns.innerHTML = '';
      if (compareSelected.length !== 2) return;
      compareSelected.forEach(function(idx) {
        var item = tabItems[idx];
        var col = document.createElement('div');
        col.className = 'tabs-compare-column';
        var heading = document.createElement('h4');
        heading.textContent = item.title || 'Section';
        var body = document.createElement('div');
        body.innerHTML = item.content || '';
        col.appendChild(heading);
        col.appendChild(body);
        columns.appendChild(col);
      });
    }` : ''}

    function resetTabs() {
      viewedItems.clear();
      var firstBtn = null;
      document.querySelectorAll('.tab-btn').forEach(function(btn, idx) {
        var isFirst = idx === 0;
        if (isFirst) firstBtn = btn;
        btn.classList.toggle('active', isFirst);
        btn.setAttribute('aria-selected', String(isFirst));
        btn.setAttribute('tabindex', isFirst ? '0' : '-1');
        updateTabVisitedBadge(idx);
      });
      document.querySelectorAll('.tab-panel').forEach(function(panel, idx) {
        panel.classList.toggle('active', idx === 0);
        panel.hidden = idx !== 0;
      });
      refreshTabLockState();
      updateTabsProgressText();
      updateProgress();
      if (firstBtn) firstBtn.focus();
      announce('Tabs reset.');
    }

    function initComponent() {
      var tabs = Array.from(document.querySelectorAll('.tab-btn'));
      tabs.forEach(function(button, idx) {
        button.addEventListener('click', function() {
          selectTab(idx, button);
        });
        button.addEventListener('keydown', function(event) {
          var next = idx;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (idx + 1) % tabs.length;
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (idx - 1 + tabs.length) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else return;
          event.preventDefault();
          selectTab(next, tabs[next]);
          tabs[next].focus();
        });
      });

      refreshTabLockState();
      updateTabsProgressText();

      var resetBtn = document.querySelector('.tabs-reset-btn');
      if (resetBtn) resetBtn.addEventListener('click', resetTabs);

      ${compareMode ? `
      var compareToggleBtn = document.querySelector('.tabs-compare-toggle-btn');
      var comparePanel = document.querySelector('.tabs-compare-panel');
      if (compareToggleBtn && comparePanel) {
        compareToggleBtn.addEventListener('click', function() {
          var willShow = comparePanel.hidden;
          comparePanel.hidden = !willShow;
          compareToggleBtn.setAttribute('aria-pressed', String(willShow));
        });
      }
      document.querySelectorAll('.tabs-compare-checkbox').forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
          var idx = parseInt(checkbox.getAttribute('data-idx'), 10);
          if (checkbox.checked) {
            if (compareSelected.length >= 2) { checkbox.checked = false; return; }
            compareSelected.push(idx);
          } else {
            compareSelected = compareSelected.filter(function(i) { return i !== idx; });
          }
          document.querySelectorAll('.tabs-compare-checkbox').forEach(function(cb) {
            if (!cb.checked) cb.disabled = compareSelected.length >= 2;
          });
          updateCompareColumns();
        });
      });` : ''}
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add at least one tab.'];
  return { valid: errors.length === 0, errors };
}
