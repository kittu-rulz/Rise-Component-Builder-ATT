import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';

export const id = 'info-grid';
export const name = 'Multi-Column Info Grid';
export const category = 'cards';
export const defaultConfig = {
  items: [
    { title: 'SaaS Aesthetic', content: 'Vibrant custom colors, layered shadows, and large margins.' },
    { title: 'Fully Serverless', content: 'Direct srcdoc codes containing styles and scripts.' },
    { title: 'Responsive Shell', content: 'Adaptive grid layout structures for all target screens.' }
  ]
};
export const editorSchema = getEditorSchema(id);

function renderCustomItemArtwork(item, fallbackMarkup = '') {
  if (!item?.iconImage) return fallbackMarkup;
  const decorative = item.iconDecorative !== false;
  const fit = item.iconFit === 'cover' ? 'cover' : 'contain';
  return `<img class="custom-item-icon" src="${escapeAttribute(item.iconImage)}" alt="${decorative ? '' : escapeAttribute(item.iconAltText || '')}" ${decorative ? 'aria-hidden="true"' : ''} style="object-fit:${fit};">`;
}

export function generateHTML(config) {
  return `
    <div class="info-grid-container">
      ${config.items.map((item) => `
        <div class="info-grid-item">
          <div class="info-grid-icon">
            ${renderCustomItemArtwork(item, '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line></svg>')}
          </div>
          <h4>${escapeHTML(item.title || 'Feature Key')}</h4>
          <p>${item.content || 'Description layout parameters.'}</p>
        </div>
      `).join('')}
    </div>
  `;
}

export function generateCSS() {
  return `
    .info-grid-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    .info-grid-item {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 20px;
      transition: all 0.2s;
    }
    .info-grid-item:hover {
      transform: translateY(-2px);
      border-color: var(--accent);
    }
    .info-grid-item.active {
      border-color: var(--accent);
      background-color: var(--accent-tint);
    }
    .info-grid-icon {
      color: var(--accent);
      margin-bottom: 12px;
    }
    .info-grid-icon .custom-item-icon {
      width: 42px;
      height: 42px;
      border-radius: calc(var(--border-radius) / 2);
    }
    .info-grid-item h4 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .info-grid-item p {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.5;
    }`;
}

export function generateJS() {
  return `
    function initComponent() {
      document.querySelectorAll('.info-grid-item').forEach(function(card, idx) {
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
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add at least one info card.'];
  return { valid: errors.length === 0, errors };
}
