import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';
import { getAttIconSvg } from '../js/att-icons.js';

export const id = 'button-list';
export const name = 'Quick Link Buttons';
export const category = 'navigation';
export const defaultConfig = {
  items: [
    { title: 'Launch Resource Hub', content: 'https://community.articulate.com' },
    { title: 'Download User Manual', content: 'https://github.com' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config) {
  return `
    <div class="buttons-container">
      ${config.items.map((item, idx) => `
        <a href="${escapeAttribute(item.content || '#')}" target="_blank" rel="noopener noreferrer" class="link-button-item" data-idx="${idx}">
          <span>${escapeHTML(item.title || 'Launch Link')}</span>
          ${getAttIconSvg('open-new', { width: 14, height: 14, ariaHidden: true })}
        </a>
      `).join('')}
    </div>
  `;
}

export function generateCSS() {
  return `
    .buttons-container {
      display: flex;
      flex-wrap: wrap;
      gap: var(--att-space-3, 12px);
      justify-content: flex-start;
    }
    .link-button-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--att-space-2, 8px);
      background-color: var(--primary);
      color: var(--on-primary);
      padding: 12px 20px;
      border-radius: var(--button-radius, var(--att-radius-pill, 999px));
      box-shadow: var(--shadow-style);
      font-size: var(--att-fs-body, 1rem);
      font-weight: var(--att-fw-bold, 700);
      min-height: 44px;
      box-sizing: border-box;
      transition: all var(--animation-speed);
      border: var(--border-style);
    }
    .link-button-item:hover {
      background-color: var(--primary-hover);
      box-shadow: var(--att-shadow-2);
    }
    .link-button-item:active {
      transform: scale(0.98);
    }
    .link-button-item:focus-visible {
      outline: 3px solid var(--att-cobalt, var(--primary));
      outline-offset: 2px;
    }`;
}

export function generateJS() {
  return `
    function trackLinkClick(index) {
      viewedItems.add(index);
      updateProgress();
    }

    function initComponent() {
      document.querySelectorAll('.link-button-item').forEach(function(link) {
        link.addEventListener('click', function() {
          trackLinkClick(parseInt(link.getAttribute('data-idx'), 10));
        });
      });
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add at least one link button.'];
  return { valid: errors.length === 0, errors };
}
