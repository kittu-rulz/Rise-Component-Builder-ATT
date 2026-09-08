import { getEditorSchema } from '../js/editor-schemas.js';
import { serializeForInlineScript } from '../js/utilities.js';
import { validateFillBlankAnswers, combineValidationResults } from '../js/validation-utils.js';

/**
 * Fill-in-the-Blank Component Configuration
 * @typedef {Object} FillBlankConfig
 * @property {Array<{title: string, content: string}>} items - Array of sentences with blanks and answers
 */

export const id = 'fill-blank';
export const name = 'Fill-in-the-Blank';
export const category = 'knowledge';

/** @type {FillBlankConfig} */
export const defaultConfig = {
  items: [
    { title: 'Articulate Rise uses [blank] to display custom interactive content.', content: 'iframes' },
    { title: 'To keep web builds lightweight, use [blank] CSS styles.', content: 'vanilla' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  return `
    <div class="fill-blank-container" aria-describedby="${instanceId}-blank-instructions">
      <p id="${instanceId}-blank-instructions" class="sr-only">Fill in each blank, then check your answers.</p>
      ${config.items.map((item, idx) => {
        const sentence = item.title || '';
        const blanked = sentence.replace(/\[blank\]/gi, `<input type="text" class="blank-input" data-index="${idx}" aria-label="Answer for sentence ${idx + 1}" aria-describedby="${instanceId}-blank-status-${idx}" autocomplete="off">`);
        return `
          <div class="blank-sentence-card">
            <span class="sentence-num">${idx + 1}</span>
            <div class="blank-sentence-content">${blanked}<span id="${instanceId}-blank-status-${idx}" class="sr-only" role="status"></span></div>
          </div>
        `;
      }).join('')}
      <button type="button" class="quiz-submit-btn">Check Answers</button>
      <div id="${instanceId}-blank-feedback-box" class="quiz-feedback" role="status" aria-live="polite" aria-atomic="true" style="display:none;"></div>
    </div>
  `;
}

export function generateCSS() {
  return `
    .fill-blank-container {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--att-radius-lg, var(--border-radius, 20px));
      box-shadow: var(--shadow-style);
      padding: var(--att-space-5, 24px);
      display: flex;
      flex-direction: column;
      gap: var(--att-space-4, 16px);
    }
    .blank-sentence-card {
      display: flex;
      gap: var(--att-space-3, 12px);
      align-items: flex-start;
      border-bottom: 1px dashed var(--border-color);
      padding-bottom: var(--att-space-3, 12px);
    }
    .blank-sentence-card:last-child {
      border-bottom: none;
    }
    .sentence-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      /* Not --accent-light (a shade of AT&T Blue, not the approved palette) with
         AT&T Blue text on top — at 11px, non-bold, that also fails the brand's own
         19px threshold for AT&T-Blue-colored text. Neutral background, dark text. */
      background-color: var(--border-color);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--att-fs-body-sm, 14px);
      font-weight: 700;
      flex-shrink: 0;
    }
    .blank-sentence-content {
      font-size: var(--att-fs-body, 16px);
      line-height: var(--att-lh-body, 1.5);
      max-width: 70ch;
    }
    .blank-input {
      border: 1px solid var(--border-color, #DCDFE3);
      border-radius: var(--att-radius-sm, 6px);
      background-color: var(--bg-card, #FFFFFF);
      padding: 6px 10px;
      font-size: var(--att-fs-body, 16px);
      font-weight: 600;
      color: var(--text-main);
      width: 140px;
      min-height: 36px;
      text-align: center;
      transition: border-color 0.2s ease;
    }
    .blank-input:focus-visible {
      outline: 3px solid var(--att-cobalt, var(--primary));
      outline-offset: 2px;
      border-color: var(--primary);
    }

    .quiz-submit-btn {
      align-self: flex-start;
      margin-top: 10px;
      padding: 10px 24px;
      border-radius: var(--button-radius, var(--att-radius-pill, 999px));
      border: none;
      background-color: var(--primary);
      color: var(--on-primary);
      font-size: var(--att-fs-body, 16px);
      font-weight: 600;
      cursor: pointer;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all var(--animation-speed);
    }
    .quiz-submit-btn:hover {
      background-color: var(--primary-hover);
    }
    .quiz-submit-btn:active {
      transform: scale(0.98);
    }
    .quiz-submit-btn:focus-visible {
      outline: 3px solid var(--att-cobalt, var(--primary));
      outline-offset: 2px;
    }
    .quiz-submit-btn:disabled {
      background-color: var(--att-grey-2, #DCDFE3);
      color: var(--att-grey-3, #BDC2C7);
      cursor: not-allowed;
      opacity: 0.6;
    }
    .quiz-feedback {
      margin-top: var(--att-space-4, 16px);
      padding: var(--att-space-4, 16px) var(--att-space-5, 24px);
      border-radius: var(--att-radius-md, var(--border-radius, 12px));
      font-size: var(--att-fs-body, 16px);
      line-height: var(--att-lh-body, 1.5);
      max-width: 70ch;
      animation: fadeIn 0.3s ease;
    }
    .quiz-feedback.correct {
      background-color: var(--success-tint);
      border: 1px solid var(--success);
      color: var(--text-main);
    }
    .quiz-feedback.wrong {
      background-color: var(--danger-tint);
      border: 1px solid var(--danger);
      color: var(--text-main);
    }`;
}

export function generateJS(config, instanceId) {
  return `
    function checkBlanks() {
      var blanks = document.querySelectorAll('.blank-input');
      var allCorrect = true;
      var solutions = ${serializeForInlineScript(config.items)};

      blanks.forEach(function(input) {
        var idx = parseInt(input.getAttribute('data-index'));
        var userVal = input.value.trim().toLowerCase();
        var correctVal = solutions[idx].content.trim().toLowerCase();

        if (userVal === correctVal) {
          input.style.borderBottomColor = 'var(--success)';
          input.style.color = 'var(--success)';
          input.setAttribute('aria-invalid', 'false');
          document.getElementById('${instanceId}-blank-status-' + idx).textContent = 'Correct';
        } else {
          allCorrect = false;
          input.style.borderBottomColor = 'var(--danger)';
          input.style.color = 'var(--danger)';
          input.setAttribute('aria-invalid', 'true');
          document.getElementById('${instanceId}-blank-status-' + idx).textContent = 'Incorrect';
        }
      });

      var feedback = document.getElementById('${instanceId}-blank-feedback-box');
      feedback.style.display = 'block';
      if (allCorrect) {
        feedback.className = 'quiz-feedback correct';
        feedback.innerHTML = '<strong>Excellent!</strong> All answers are correct.';
        updateTrackerComplete();
      } else {
        feedback.className = 'quiz-feedback wrong';
        feedback.innerHTML = '<strong>Incorrect blanks.</strong> Review and adjust input answers.';
      }
    }

    function initComponent() {
      var blanksSubmitBtn = document.querySelector('.quiz-submit-btn');
      if (blanksSubmitBtn) blanksSubmitBtn.addEventListener('click', checkBlanks);
    }`;
}

/**
 * Validates fill-in-the-blank component configuration.
 * @param {FillBlankConfig} config - The configuration to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with error messages
 */
export function validate(config) {
  const results = [
    validateFillBlankAnswers(config.items)
  ];
  
  // Validate each item has required fields
  if (Array.isArray(config.items)) {
    config.items.forEach((item, index) => {
      if (!item.title || !String(item.title).trim()) {
        results.push({ valid: false, error: `Question ${index + 1}: Sentence with [blank] is required.` });
      }
      if (!item.title.includes('[blank]')) {
        results.push({ valid: false, error: `Question ${index + 1}: Sentence must contain [blank] placeholder.` });
      }
    });
  }
  
  return combineValidationResults(results);
}
