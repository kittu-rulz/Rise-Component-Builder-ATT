import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML, sanitizeRichText, serializeForInlineScript } from '../js/utilities.js';
import { validateQuizAnswers, combineValidationResults } from '../js/validation-utils.js';

/**
 * Multiple Select Component Configuration
 * @typedef {Object} MultipleSelectConfig
 * @property {Array<{label: string, content: string, correct: boolean}>} items - Array of answer options (multiple can be correct)
 */

export const id = 'multiple-select';
export const name = 'Multiple Select Check';
export const category = 'knowledge';

/** @type {MultipleSelectConfig} */
export const defaultConfig = {
  items: [
    { label: 'Improves long-term retention', content: 'Spaced, bite-sized review strengthens recall.', correct: true },
    { label: 'Supports mobile learning', content: 'Short segments fit naturally into mobile sessions.', correct: true },
    { label: 'Requires no learner interaction', content: 'Interaction is what drives engagement and retention.', correct: false },
    { label: 'Replaces the need for assessments', content: 'Micro-learning complements, not replaces, assessment.', correct: false }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  return `<div class="quiz-block quiz-multi"><div class="quiz-options" role="group" aria-label="Answer choices, select all that apply">${config.items.map((item, index) => `
    <div class="quiz-option" role="checkbox" tabindex="${index === 0 ? '0' : '-1'}" aria-checked="false" data-idx="${index}"><div class="option-check-square" aria-hidden="true"></div><div class="option-text">${item.label ? sanitizeRichText(item.label) : escapeHTML(item.title || 'Option Label')}</div></div>`).join('')}</div>
    <button class="quiz-submit-btn" type="button" data-quiz-mode="multi">Submit Answer</button><div id="${instanceId}-quiz-feedback-box" class="quiz-feedback" role="status" aria-live="polite" aria-atomic="true" style="display:none;"></div>
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

    .option-check-square {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 2px solid var(--text-muted);
      position: relative;
      transition: all 0.2s ease;
    }

    .quiz-option.selected .option-check-square {
      border-color: var(--accent);
      background-color: var(--accent);
    }

    .quiz-option.selected .option-check-square::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 5px;
      width: 4px;
      height: 8px;
      border: solid #FFFFFF;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
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
    var selectedOptionIndices = new Set();
    var quizOptions = ${serializeForInlineScript(config.items)};

    function toggleQuizOption(index, element) {
      var checked = element.getAttribute('aria-checked') === 'true';
      if (checked) {
        element.classList.remove('selected');
        element.setAttribute('aria-checked', 'false');
        selectedOptionIndices.delete(index);
      } else {
        element.classList.add('selected');
        element.setAttribute('aria-checked', 'true');
        selectedOptionIndices.add(index);
      }
    }

    function submitMultiQuiz() {
      var feedback = document.getElementById('${instanceId}-quiz-feedback-box');
      if (selectedOptionIndices.size === 0) {
        feedback.style.display = 'block';
        feedback.className = 'quiz-feedback wrong';
        feedback.innerHTML = '<strong>Select at least one option.</strong>';
        return;
      }

      var correctIndices = new Set(quizOptions.reduce(function(indices, option, index) {
        if (option.correct) indices.push(index);
        return indices;
      }, []));
      var isCorrect = selectedOptionIndices.size === correctIndices.size
        && Array.from(selectedOptionIndices).every(function(index) { return correctIndices.has(index); });

      feedback.style.display = 'block';
      feedback.className = 'quiz-feedback ' + (isCorrect ? 'correct' : 'wrong');

      if (isCorrect) {
        feedback.innerHTML = '<strong>Correct!</strong> You selected all the right answers.';
        updateTrackerComplete();
      } else {
        feedback.innerHTML = '<strong>Incorrect.</strong> Review your selections and try again.';
      }
    }

    function initComponent() {
      document.querySelectorAll('.quiz-option[role="checkbox"]').forEach(function(option) {
        option.addEventListener('click', function() {
          toggleQuizOption(parseInt(option.getAttribute('data-idx'), 10), option);
        });
        option.addEventListener('keydown', function(event) {
          var options = Array.from(document.querySelectorAll('.quiz-option[role="checkbox"]'));
          var current = options.indexOf(option);
          var next = current;
          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (current + 1) % options.length;
          else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (current - 1 + options.length) % options.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = options.length - 1;
          else if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            toggleQuizOption(current, option);
            return;
          } else return;
          event.preventDefault();
          option.setAttribute('tabindex', '-1');
          options[next].setAttribute('tabindex', '0');
          options[next].focus();
        });
      });

      var quizSubmitBtn = document.querySelector('.quiz-submit-btn');
      if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', submitMultiQuiz);
    }`;
}

/**
 * Validates multiple select component configuration.
 * @param {MultipleSelectConfig} config - The configuration to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with error messages
 */
export function validate(config) {
  const results = [
    validateQuizAnswers(config.items, 'multiple-select')
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
