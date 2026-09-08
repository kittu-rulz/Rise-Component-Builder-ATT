import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';
import { getAttIconSvg } from '../js/att-icons.js';

export const id = 'profile-cards';
export const name = 'Modern Profile Grid';
export const category = 'cards';
export const defaultConfig = {
  items: [
    { title: 'Sarah Jenkins', content: 'Lead Instructional Designer • Dedicated to creating engaging eLearning pathways.' },
    { title: 'Marcus Chen', content: 'UX Engineer • Expert in web layout rendering and responsive CSS frameworks.' }
  ]
};
export const editorSchema = getEditorSchema(id);

// Default avatar glyph uses official AT&T "person" functional icon
export function generateHTML(config) {
  return `
    <div class="profiles-grid">
      ${config.items.map((item) => `
        <div class="profile-card-item">
          <div class="profile-avatar-circle ${item.imageCrop === 'square' ? 'square' : ''}">
            ${item.image ? `<img src="${escapeAttribute(item.image)}" alt="${item.decorative ? '' : escapeAttribute(item.altText || '')}" ${item.decorative ? 'aria-hidden="true"' : ''}>` : getAttIconSvg('person', { width: 24, height: 24, ariaHidden: true })}
          </div>
          <div class="profile-card-content">
            <h4>${escapeHTML(item.title || 'Expert Name')}</h4>
            <p>${item.content || 'Professional background summary bio.'}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function generateCSS() {
  return `
    .profiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--att-space-5, 20px);
    }
    .profile-card-item {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--att-radius-lg, var(--border-radius, 20px));
      box-shadow: var(--shadow-style);
      padding: var(--att-space-5, 20px);
      display: flex;
      gap: var(--att-space-4, 16px);
      align-items: flex-start;
      transition: border-color 0.2s;
    }
    .profile-card-item:hover {
      /* Cobalt (--primary), not AT&T Blue: this card is clickable. */
      border-color: var(--primary);
      box-shadow: var(--att-shadow-2, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
    }
    .profile-card-item:active {
      transform: scale(0.98);
    }
    .profile-card-item:focus-visible {
      outline: 3px solid var(--att-cobalt, var(--primary));
      outline-offset: 2px;
    }
    .profile-card-item.active {
      border-color: var(--primary);
      box-shadow: var(--att-shadow-2, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
    }
    .profile-avatar-circle {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      /* Not --accent-light: a shade of AT&T Blue, not the approved palette. */
      background-color: var(--border-color);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1px solid var(--border-color);
      overflow: hidden;
    }
    .profile-avatar-circle.square { border-radius: var(--att-radius-sm, 8px); }
    .profile-avatar-circle img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .profile-card-content h4 {
      font-size: var(--att-fs-h4, 1.125rem);
      font-weight: var(--att-fw-bold, 700);
      line-height: var(--att-lh-heading, 1.25);
      margin-bottom: 4px;
      color: var(--text-main);
      text-wrap: pretty;
    }
    .profile-card-content p {
      font-size: var(--att-fs-body, 1rem);
      color: var(--text-muted);
      line-height: var(--att-lh-body, 1.5);
      max-width: 70ch;
      margin: 0;
    }`;
}

export function generateJS() {
  return `
    function initComponent() {
      document.querySelectorAll('.profile-card-item').forEach(function(card, idx) {
        card.setAttribute('tabindex', '0');
        card.addEventListener('click', function() {
          card.classList.toggle('active');
          viewedItems.add(idx);
          updateProgress();
        });
      });
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add at least one profile.'];
  return { valid: errors.length === 0, errors };
}
