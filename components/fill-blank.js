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
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .blank-sentence-card {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      border-bottom: 1px dashed var(--border-color);
      padding-bottom: 14px;
    }
    .blank-sentence-card:last-child {
      border-bottom: none;
    }
    .sentence-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: var(--accent-light);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .blank-sentence-content {
      font-size: 13px;
      line-height: 1.8;
    }
    .blank-input {
      border: none;
      border-bottom: 2px solid var(--text-muted);
      background-color: transparent;
      outline: none;
      padding: 0 4px;
      font-weight: 600;
      color: var(--text-main);
      width: 100px;
      text-align: center;
      transition: border-bottom-color 0.2s;
    }
    .blank-input:focus {
      border-bottom-color: var(--accent);
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
