import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML, sanitizeRichText, serializeForInlineScript } from '../js/utilities.js';
import { validateQuizAnswers, combineValidationResults } from '../js/validation-utils.js';

/**
 * Multiple Choice Component Configuration
 * @typedef {Object} MultipleChoiceConfig
 * @property {Array<{label: string, content: string, correct: boolean}>} items - Array of answer options
 */

export const id = 'multiple-choice';
export const name = 'Multiple Choice Check';
export const category = 'knowledge';

/** @type {MultipleChoiceConfig} */
export const defaultConfig = {
  items: [
    { label: 'Option A (Correct)', content: 'Micro-learning helps memory retention.', correct: true },
    { label: 'Option B', content: 'Courses must be at least 1 hour long.', correct: false },
    { label: 'Option C', content: 'Instructional text should be very dense.', correct: false }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  return `<div class="quiz-block"><div class="quiz-options" role="radiogroup" aria-label="Answer choices">${config.items.map((item, index) => `
    <div class="quiz-option" role="radio" tabindex="${index === 0 ? '0' : '-1'}" aria-checked="false" data-idx="${index}"><div class="option-check-circle" aria-hidden="true"></div><div class="option-text">${item.label ? sanitizeRichText(item.label) : escapeHTML(item.title || 'Option Label')}</div></div>`).join('')}</div>
    <button class="quiz-submit-btn" type="button">Submit Answer</button><div id="${instanceId}-quiz-feedback-box" class="quiz-feedback" role="status" aria-live="polite" aria-atomic="true" style="display:none;"></div>
  </div>`;
}

export function generateCSS() {
  return `
    .quiz-block {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .quiz-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .quiz-option {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quiz-option:hover {
      border-color: var(--primary);
    }

    .quiz-option.selected {
      border-color: var(--accent);
      background-color: var(--accent-tint);
    }

    .option-check-circle {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid var(--text-muted);
      position: relative;
      transition: all 0.2s ease;
    }

    .quiz-option.selected .option-check-circle {
      border-color: var(--accent);
      background-color: var(--accent);
    }

    .quiz-option.selected .option-check-circle::after {
      content: '';
      position: absolute;
      top: 4px;
      left: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #FFFFFF;
    }

    .option-text {
      font-size: 13px;
      font-weight: 500;
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
    var selectedOptionIndex = null;
    var quizOptions = ${serializeForInlineScript(config.items)};

    function selectQuizOption(index, element) {
      selectedOptionIndex = index;
      document.querySelectorAll('.quiz-option').forEach(function(el) {
        el.classList.remove('selected');
        el.setAttribute('aria-checked', 'false');
        el.setAttribute('tabindex', '-1');
      });
      element.classList.add('selected');
      element.setAttribute('aria-checked', 'true');
      element.setAttribute('tabindex', '0');
    }

    function submitQuiz() {
      var feedback = document.getElementById('${instanceId}-quiz-feedback-box');
      if (selectedOptionIndex === null) {
        feedback.style.display = 'block';
        feedback.className = 'quiz-feedback wrong';
        feedback.innerHTML = '<strong>Select an option first.</strong>';
        return;
      }

      var selection = quizOptions[selectedOptionIndex];
      var isCorrect = selection.correct;

      feedback.style.display = 'block';
      feedback.className = 'quiz-feedback ' + (isCorrect ? 'correct' : 'wrong');

      if (isCorrect) {
        feedback.innerHTML = '<strong>Correct!</strong> ' + (selection.content || 'Excellent choices.');
        updateTrackerComplete();
      } else {
        feedback.innerHTML = '<strong>Incorrect.</strong> Try reviewing the source documentation again.';
      }
    }

    function initComponent() {
      document.querySelectorAll('.quiz-option[role="radio"]').forEach(function(option) {
        option.addEventListener('click', function() {
          selectQuizOption(parseInt(option.getAttribute('data-idx'), 10), option);
        });
        option.addEventListener('keydown', function(event) {
          var options = Array.from(document.querySelectorAll('.quiz-option[role="radio"]'));
          var current = options.indexOf(option);
          var next = current;
          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (current + 1) % options.length;
          else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (current - 1 + options.length) % options.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = options.length - 1;
          else if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            selectQuizOption(current, option);
            return;
          } else return;
          event.preventDefault();
          selectQuizOption(next, options[next]);
          options[next].focus();
        });
      });

      var quizSubmitBtn = document.querySelector('.quiz-submit-btn');
      if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', submitQuiz);
    }`;
}

/**
 * Validates multiple choice component configuration.
 * @param {MultipleChoiceConfig} config - The configuration to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with error messages
 */
export function validate(config) {
  const results = [
    validateQuizAnswers(config.items, 'multiple-choice')
  ];
  
  // Validate each item has required fields
  if (Array.isArray(config.items)) {
    config.items.forEach((item, index) => {
      if (!item.label || !String(item.label).trim()) {
        results.push({ valid: false, error: `Option ${index + 1}: Label is required.` });
      }
    });
  }
  
  return combineValidationResults(results);
}
