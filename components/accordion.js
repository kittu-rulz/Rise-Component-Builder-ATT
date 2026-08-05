import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML, sanitizeRichText } from '../js/utilities.js';
import { validateNonEmptyArray, combineValidationResults } from '../js/validation-utils.js';

/**
 * Accordion Component Configuration
 * @typedef {Object} AccordionConfig
 * @property {boolean} accordionMulti - Allow multiple items open simultaneously
 * @property {boolean} accordionAnimation - Enable expand/collapse animation
 * @property {'chevron'|'plus-minus'|'arrow'} iconStyle - Icon style for expand indicators
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
  items: [
    { title: 'Understanding User Intent', content: 'Instructional design begins by identifying the core learning objectives and alignment with business outcomes.' },
    { title: 'Designing for Engagement', content: 'Modern eLearning relies on micro-interactions, clean visual layouts, and bite-sized chunks of information.' },
    { title: 'SCORM and Tracking Analytics', content: 'Export clean standard elements to trace course completion, custom interaction states, and score cards.' }
  ]
};

export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  const icon = config.iconStyle === 'chevron'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="acc-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>'
    : config.iconStyle === 'plus-minus'
      ? '<div class="acc-plus-minus"></div>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="acc-arrow"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  return `<div class="accordion-group">${config.items.map((item, index) => `
    <div class="accordion-item" id="${instanceId}-item-${index}">
      <h3><button class="accordion-trigger" id="${instanceId}-accordion-trigger-${index}" data-idx="${index}" aria-expanded="false" aria-controls="${instanceId}-accordion-panel-${index}"><span>${escapeHTML(item.title || 'Item Title Header')}</span>${icon}</button></h3>
      <div class="accordion-content" id="${instanceId}-accordion-panel-${index}" role="region" aria-labelledby="${instanceId}-accordion-trigger-${index}" aria-hidden="true"><div class="accordion-body"><p>${sanitizeRichText(item.content || 'Customize accordion body descriptions.')}</p></div></div>
    </div>`).join('')}</div>`;
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
    }`;
}

export function generateJS(config, instanceId) {
  return `
    var multiOpen = ${Boolean(config.accordionMulti)};
    var allowAnimation = ${Boolean(config.accordionAnimation)};

    function toggleAccordion(index) {
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
      }
    }

    function initComponent() {
      document.querySelectorAll('.accordion-trigger').forEach(function(trigger) {
        trigger.addEventListener('click', function() {
          toggleAccordion(parseInt(trigger.getAttribute('data-idx'), 10));
        });
      });
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
