import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';

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
          <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><g><path d="M24 26C24 26.6 23.6 27 23 27L6 27C5.4 27 5 26.6 5 26L5 9C5 8.4 5.4 8 6 8L19 8 19 6 6 6C4.3 6 3 7.3 3 9L3 26C3 27.7 4.3 29 6 29L23 29C24.7 29 26 27.7 26 26L26 13 24 13 24 26Z"/><path d="M21 3 21 5 25.6 5 17 13.6 18.4 15 27 6.4 27 11 29 11 29 3Z"/></g></svg>
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
      gap: 12px;
      justify-content: flex-start;
    }
    .link-button-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background-color: var(--primary);
      color: var(--on-primary);
      padding: 12px 20px;
      border-radius: var(--button-radius);
      box-shadow: var(--shadow-style);
      font-size: 13px;
      font-weight: 600;
      transition: all var(--animation-speed);
      border: var(--border-style);
    }
    .link-button-item:hover {
      transform: translateY(-2px);
      background-color: var(--primary-hover);
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
