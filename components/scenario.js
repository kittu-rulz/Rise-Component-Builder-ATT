import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';
import { validateScenarioBranching, combineValidationResults } from '../js/validation-utils.js';
import { getAttIconSvg } from '../js/att-icons.js';

/**
 * Scenario Component Configuration
 * @typedef {Object} ScenarioConfig
 * @property {Array<{title: string, content: string, nextSlide?: string}>} items - Array of scenario steps (prompt + choices)
 */

export const id = 'scenario';
export const name = 'Branching Scenario Card';
export const category = 'process';

/** @type {ScenarioConfig} */
export const defaultConfig = {
  items: [
    { title: 'How should you write interactive eLearning scripts?', content: 'Short and conversational' },
    { title: 'Choice A: Write dense documents.', content: 'Character: "That makes learning boring!" (Incorrect)' },
    { title: 'Choice B: Write conversational steps.', content: 'Character: "Spot on! Keeps learners hooked!" (Correct)' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  const q = config.items[0] || { title: 'Dialogue prompt', content: 'What should we do?' };
  const choices = config.items.slice(1);
  return `
    <div class="scenario-container">
      <div class="scenario-avatar-row">
        <div class="char-avatar-img">
          ${getAttIconSvg('person', { width: 24, height: 24, ariaHidden: true })}
        </div>
        <div class="scenario-bubble">
          <div class="speaker-name">Chris (Team Lead)</div>
          <div class="speech-text" id="${instanceId}-scenario-speech">${escapeHTML(q.title)}</div>
        </div>
      </div>
      <div class="scenario-choices-list" id="${instanceId}-scenario-choices-box">
        ${choices.map((ch, idx) => `
          <button class="scenario-choice-btn" data-choice-idx="${idx}" data-feedback="${escapeAttribute(ch.content)}">
            ${escapeHTML(ch.title || 'Choice Option')}
          </button>
        `).join('')}
      </div>
      <div id="${instanceId}-scenario-feedback-card" class="scenario-feedback-balloon" role="status" aria-live="polite" aria-atomic="true" tabindex="-1" style="display:none;"></div>
    </div>
  `;
}

export function generateCSS() {
  return `
    .scenario-container {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--att-radius-lg, var(--border-radius, 20px));
      box-shadow: var(--shadow-style);
      padding: var(--att-space-5, 24px);
      display: flex;
      flex-direction: column;
      gap: var(--att-space-5, 20px);
    }
    .scenario-avatar-row {
      display: flex;
      gap: var(--att-space-4, 16px);
      align-items: flex-start;
    }
    .char-avatar-img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      /* Not --accent-light: a shade of AT&T Blue, not the approved palette. */
      background-color: var(--border-color);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 2px solid var(--accent);
      box-shadow: var(--shadow-sm);
    }
    .scenario-bubble {
      flex: 1;
      background-color: var(--bg-body);
      border: 1px solid var(--border-color);
      border-radius: var(--att-radius-md, var(--border-radius, 12px));
      padding: var(--att-space-4, 16px) var(--att-space-5, 20px);
      position: relative;
    }
    .scenario-bubble::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 18px;
      border-width: 8px 8px 8px 0;
      border-style: solid;
      border-color: transparent var(--border-color) transparent transparent;
    }
    .scenario-bubble::after {
      content: '';
      position: absolute;
      left: -7px;
      top: 18px;
      border-width: 8px 8px 8px 0;
      border-style: solid;
      border-color: transparent var(--bg-body) transparent transparent;
    }
    .speaker-name {
      /* AT&T Blue kept, sized up to the brand's own 19px floor for accent
         text (3.01:1 on white — accepted at large-text size, not below it). */
      font-size: var(--att-fs-h3, 1.25rem);
      font-weight: var(--att-fw-bold, 700);
      color: var(--accent);
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      text-wrap: pretty;
    }
    .speech-text {
      font-size: var(--att-fs-body, 1rem);
      line-height: var(--att-lh-body, 1.5);
      color: var(--text-main);
      max-width: 70ch;
    }
    .scenario-choices-list {
      display: flex;
      flex-direction: column;
      gap: var(--att-space-3, 10px);
      margin-top: var(--att-space-3, 10px);
    }
    .scenario-choice-btn {
      width: 100%;
      background-color: var(--bg-card);
      /* Cobalt (--primary) at rest, not a neutral gray: this button is
         clickable at all times, so it carries the Cobalt clickable treatment
         from the start, not only on hover. */
      border: 1px solid var(--primary);
      color: var(--primary);
      padding: 12px 16px;
      border-radius: var(--button-radius, var(--att-radius-md, 12px));
      text-align: left;
      font-size: var(--att-fs-body, 1rem);
      font-weight: var(--att-fw-medium, 500);
      line-height: var(--att-lh-body, 1.5);
      cursor: pointer;
      min-height: 44px;
      display: flex;
      align-items: center;
      box-sizing: border-box;
      transition: all 0.2s;
    }
    .scenario-choice-btn:hover {
      border-color: var(--primary-hover);
      color: var(--primary-hover);
    }
    .scenario-feedback-balloon {
      background-color: var(--att-grey-1, #F3F4F5);
      border: 1px solid var(--border-color);
      border-radius: var(--att-radius-md, var(--border-radius, 12px));
      padding: var(--att-space-4, 16px);
      font-size: var(--att-fs-body, 1rem);
      line-height: var(--att-lh-body, 1.5);
      color: var(--text-main);
      max-width: 70ch;
      animation: fadeIn 0.3s ease;
    }`;
}

export function generateJS(config, instanceId) {
  return `
    function selectScenarioChoice(choiceIdx, feedback) {
      var feedbackCard = document.getElementById('${instanceId}-scenario-feedback-card');
      feedbackCard.style.display = 'block';
      feedbackCard.innerHTML = '<strong>Chris:</strong> "' + feedback + '"';

      viewedItems.add(choiceIdx);
      updateProgress();

      if (feedback.toLowerCase().includes('correct') || feedback.toLowerCase().includes('spot on')) {
        updateTrackerComplete();
      }
    }

    function initComponent() {
      document.querySelectorAll('.scenario-choice-btn').forEach(function(button) {
        button.addEventListener('click', function() {
          selectScenarioChoice(parseInt(button.getAttribute('data-choice-idx'), 10), button.getAttribute('data-feedback') || '');
        });
      });
    }`;
}

/**
 * Validates scenario component configuration.
 * @param {ScenarioConfig} config - The configuration to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with error messages
 */
export function validate(config) {
  const results = [];
  
  // Check minimum items (prompt + at least one choice)
  if (!Array.isArray(config.items) || config.items.length < 2) {
    results.push({ valid: false, error: 'Add a prompt and at least one choice.' });
  } else {
    // Validate branching if nextSlide properties exist
    const hasBranching = config.items.some(item => item.nextSlide);
    if (hasBranching) {
      results.push(validateScenarioBranching(config.items));
    }
    
    // Validate each item has required fields
    config.items.forEach((item, index) => {
      if (!item.title || !String(item.title).trim()) {
        results.push({ valid: false, error: `Step ${index + 1}: Title is required.` });
      }
      if (!item.content || !String(item.content).trim()) {
        results.push({ valid: false, error: `Step ${index + 1}: Content/feedback is required.` });
      }
    });
  }
  
  return combineValidationResults(results);
}
