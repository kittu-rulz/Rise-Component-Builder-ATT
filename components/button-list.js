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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
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
