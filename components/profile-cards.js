import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';

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

export function generateHTML(config) {
  return `
    <div class="profiles-grid">
      ${config.items.map((item) => `
        <div class="profile-card-item">
          <div class="profile-avatar-circle ${item.imageCrop === 'square' ? 'square' : ''}">
            ${item.image ? `<img src="${escapeAttribute(item.image)}" alt="${item.decorative ? '' : escapeAttribute(item.altText || '')}" ${item.decorative ? 'aria-hidden="true"' : ''}>` : `<svg width="24" height="24" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M20 15.8C21.8 14.5 23 12.4 23 10 23 6.1 19.9 3 16 3 12.1 3 9 6.1 9 10 9 12.4 10.2 14.5 12 15.8 7.9 17.4 5 21.3 5 26L5 29 7 29 7 26C7 21 11 17 16 17 21 17 25 21 25 26L25 29 27 29 27 26C27 21.3 24.1 17.4 20 15.8ZM11 10C11 7.2 13.2 5 16 5 18.8 5 21 7.2 21 10 21 12.8 18.8 15 16 15 13.2 15 11 12.8 11 10Z"/></svg>`}
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
      gap: 20px;
    }
    .profile-card-item {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 20px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      transition: border-color 0.2s;
    }
    .profile-card-item:hover {
      border-color: var(--accent);
    }
    .profile-card-item.active {
      border-color: var(--accent);
      transform: translateY(-2px);
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
    .profile-avatar-circle.square { border-radius: calc(var(--border-radius) / 2); }
    .profile-avatar-circle img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .profile-card-content h4 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .profile-card-content p {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.5;
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
