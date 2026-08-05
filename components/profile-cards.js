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
            ${item.image ? `<img src="${escapeAttribute(item.image)}" alt="${item.decorative ? '' : escapeAttribute(item.altText || '')}" ${item.decorative ? 'aria-hidden="true"' : ''}>` : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`}
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
      background-color: var(--accent-light);
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
