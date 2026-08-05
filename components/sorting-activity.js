import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML, serializeForInlineScript } from '../js/utilities.js';
import { combineValidationResults } from '../js/validation-utils.js';

/**
 * Sorting Activity Component Configuration
 * @typedef {Object} SortingActivityConfig
 * @property {Array<{title: string, content: string, category: string}>} items - Array of sortable items with categories
 */

export const id = 'sorting-activity';
export const name = 'Sorting Drag-and-Drop';
export const category = 'knowledge';

/** @type {SortingActivityConfig} */
export const defaultConfig = {
  items: [
    { title: 'Vibrant Colors', content: 'Design System', category: 'Design' },
    { title: 'Click Triggers', content: 'Interaction Logic', category: 'Logic' },
    { title: 'Rounded Corners', content: 'Design System', category: 'Design' },
    { title: 'Theme Toggles', content: 'Interaction Logic', category: 'Logic' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  const categories = [...new Set(config.items.map(it => it.category || 'Category'))];
  return `
    <div class="sorting-activity-container" aria-describedby="${instanceId}-sorting-instructions">
      <p id="${instanceId}-sorting-instructions" class="sr-only">For each item, choose its category. Then verify the sorting.</p>
      <div class="sorting-card-pool" role="group" aria-label="Items to sort">
        ${config.items.map((item, idx) => `
          <div class="sorting-draggable" id="${instanceId}-sort-card-${idx}" data-category="${escapeAttribute(item.category || '')}" role="group" aria-labelledby="${instanceId}-sort-label-${idx}">
            <div class="drag-handle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
            </div>
            <div class="drag-text" id="${instanceId}-sort-label-${idx}">${escapeHTML(item.title || 'Sorting Card')}</div>
            <div class="sorting-targets-row">
              ${categories.map(cat => `
                <button type="button" class="target-btn" data-idx="${idx}" data-cat="${escapeAttribute(cat)}" aria-pressed="false">Move to ${escapeHTML(cat)}</button>
              `).join('')}
            </div>
            <div class="sort-status-indicator" role="status" aria-live="polite"></div>
          </div>
        `).join('')}
      </div>
      <div class="sorting-categories-columns">
        ${categories.map((cat, catIdx) => `
          <div class="sorting-column" data-column-cat="${escapeAttribute(cat)}" role="group" aria-labelledby="${instanceId}-sorting-column-${catIdx}">
            <div class="column-header" id="${instanceId}-sorting-column-${catIdx}">${escapeHTML(cat)}</div>
            <div class="column-dropzone" id="${instanceId}-sorting-zone-${catIdx}" aria-live="polite"></div>
          </div>
        `).join('')}
      </div>
      <button type="button" class="quiz-submit-btn">Verify Sorting</button>
      <div id="${instanceId}-sorting-feedback-box" class="quiz-feedback" role="status" aria-live="polite" aria-atomic="true" style="display:none;"></div>
    </div>
  `;
}

export function generateCSS() {
  return `
    .sorting-activity-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .sorting-card-pool {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sorting-draggable {
      background-color: var(--bg-body);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      transition: all 0.2s;
    }
    .drag-handle {
      color: var(--text-muted);
      cursor: grab;
      margin-right: 12px;
      display: flex;
    }
    .drag-text {
      flex: 1;
      font-weight: 500;
    }
    .sorting-targets-row {
      display: flex;
      gap: 8px;
    }
    .target-btn {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .target-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .target-btn.active {
      border-color: var(--accent);
      background-color: var(--accent);
      color: var(--on-accent);
    }
    .sorting-categories-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .sorting-column {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 16px;
    }
    .column-header {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--accent);
      border-bottom: 1px dashed var(--border-color);
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .column-dropzone {
      min-height: 80px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sorted-item-badge {
      background-color: var(--bg-body);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      animation: fadeIn 0.2s ease;
    }
    .sort-status-indicator {
      font-size: 11px;
      font-weight: 600;
      margin-left: 10px;
    }

    .quiz-submit-btn {
      align-self: flex-start;
      margin-top: 10px;
      padding: 10px 24px;
      border-radius: var(--button-radius);
      border: none;
      background-color: var(--primary);
      color: var(--on-primary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--animation-speed);
    }
    .quiz-submit-btn:hover {
      background-color: var(--primary-hover);
    }
    .quiz-feedback {
      margin-top: 14px;
      padding: 16px;
      border-radius: var(--border-radius);
      font-size: 13px;
      line-height: 1.5;
      animation: fadeIn 0.3s ease;
    }
    .quiz-feedback.correct {
      background-color: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #065F46;
    }
    .quiz-feedback.wrong {
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #991B1B;
    }`;
}

export function generateJS(config, instanceId) {
  return `
    var sortingChoices = {};

    function assignCategory(idx, cat, btn) {
      sortingChoices[idx] = cat;

      var card = document.getElementById('${instanceId}-sort-card-' + idx);
      var indicator = card.querySelector('.sort-status-indicator');
      indicator.textContent = '-> assigned to ' + cat;
      indicator.style.color = 'var(--primary)';

      document.querySelectorAll('.target-btn[data-idx="' + idx + '"]').forEach(function(targetBtn) {
        targetBtn.classList.toggle('active', targetBtn === btn);
        targetBtn.setAttribute('aria-pressed', String(targetBtn === btn));
      });

      document.querySelectorAll('.sorted-item-badge[data-card-idx="' + idx + '"]').forEach(function(badge) {
        badge.remove();
      });

      var targetZone = null;
      document.querySelectorAll('.sorting-column').forEach(function(column) {
        if (column.getAttribute('data-column-cat') === cat) {
          targetZone = column.querySelector('.column-dropzone');
        }
      });

      if (targetZone) {
        var badge = document.createElement('div');
        badge.className = 'sorted-item-badge';
        badge.setAttribute('data-card-idx', idx);
        badge.textContent = card.querySelector('.drag-text').textContent;
        targetZone.appendChild(badge);
      }

      viewedItems.add(idx);
      updateProgress();
    }

    function checkSorting() {
      var allCorrect = true;
      var originalCards = ${serializeForInlineScript(config.items)};

      originalCards.forEach(function(item, idx) {
        var choice = sortingChoices[idx];
        var card = document.getElementById('${instanceId}-sort-card-' + idx);
        var indicator = card.querySelector('.sort-status-indicator');

        if (choice === item.category) {
          indicator.textContent = 'Correct';
          indicator.style.color = 'var(--success)';
        } else {
          allCorrect = false;
          indicator.textContent = 'Incorrect';
          indicator.style.color = 'var(--danger)';
        }
      });

      var feedback = document.getElementById('${instanceId}-sorting-feedback-box');
      feedback.style.display = 'block';
      if (allCorrect) {
        feedback.className = 'quiz-feedback correct';
        feedback.innerHTML = '<strong>Superb!</strong> All items sorted correctly.';
        updateTrackerComplete();
      } else {
        feedback.className = 'quiz-feedback wrong';
        feedback.innerHTML = '<strong>Try again.</strong> Some items are not in their correct categories.';
      }
    }

    function initComponent() {
      document.querySelectorAll('.target-btn').forEach(function(button) {
        button.addEventListener('click', function() {
          assignCategory(parseInt(button.getAttribute('data-idx'), 10), button.getAttribute('data-cat'), button);
        });
      });

      var sortingSubmitBtn = document.querySelector('.quiz-submit-btn');
      if (sortingSubmitBtn) sortingSubmitBtn.addEventListener('click', checkSorting);
    }`;
}

/**
 * Validates sorting activity component configuration.
 * @param {SortingActivityConfig} config - The configuration to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with error messages
 */
export function validate(config) {
  const results = [];
  
  // Check minimum items
  if (!Array.isArray(config.items) || config.items.length < 2) {
    results.push({ valid: false, error: 'Add at least two sortable items.' });
  } else {
    // Validate each item has required fields
    config.items.forEach((item, index) => {
      if (!item.title || !String(item.title).trim()) {
        results.push({ valid: false, error: `Item ${index + 1}: Title is required.` });
      }
      if (!item.category || !String(item.category).trim()) {
        results.push({ valid: false, error: `Item ${index + 1}: Category is required.` });
      }
    });
    
    // Check that at least 2 unique categories exist
    const categories = new Set(config.items.map(item => item.category));
    if (categories.size < 2) {
      results.push({ valid: false, error: 'Items must have at least two different categories.' });
    }
  }
  
  return combineValidationResults(results);
}
