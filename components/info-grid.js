import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML, sanitizeCSSColor } from '../js/utilities.js';

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
      ${config.items.map((item) => {
        // sanitizeCSSColor here (not just in js/utilities.js#sanitizePreviewConfig) means
        // this generator stays safe even called directly with an unvalidated config, the
        // same defense-in-depth already used for flip-cards' custom icon URLs.
        const accentColor = item.accentColor ? sanitizeCSSColor(item.accentColor, '') : '';
        return `
        <div class="info-grid-item">
          <div class="info-grid-icon" style="${accentColor ? `color:${accentColor};` : ''}">
            ${renderCustomItemArtwork(item, '<svg width="20" height="20" viewBox="0 0 96 96" fill="currentColor" aria-hidden="true"><g class="info-grid-icon-accent-dots"><rect x="30" y="43" width="4" height="4"/><rect x="30" y="56" width="4" height="4"/><rect x="30" y="69" width="4" height="4"/></g><g><rect x="37" y="44" width="29" height="2"/><rect x="37" y="57" width="29" height="2"/><rect x="37" y="70" width="29" height="2"/><path d="M56.4 10 24 10C20.7 10 18 12.7 18 16L18 80C18 83.3 20.7 86 24 86L72 86C75.3 86 78 83.3 78 80L78 31.6 56.4 10ZM57 13.4 74.6 31 61 31C58.8 31 57 29.2 57 27L57 13.4ZM72 84 24 84C21.8 84 20 82.2 20 80L20 16C20 13.8 21.8 12 24 12L55 12 55 27C55 30.3 57.7 33 61 33L76 33 76 80C76 82.2 74.2 84 72 84Z"/></g></svg>')}
          </div>
          <h4>${escapeHTML(item.title || 'Feature Key')}</h4>
          <p>${item.content || 'Description layout parameters.'}</p>
        </div>
      `;
      }).join('')}
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
      /* Cobalt (--primary), not AT&T Blue: this card is clickable. */
      border-color: var(--primary);
    }
    .info-grid-item.active {
      /* Cobalt border, not an AT&T-Blue tint background: the selected state of a
         clickable card needs the Cobalt clickable treatment, not an invented
         translucent brand-color shade. */
      border-color: var(--primary);
      border-width: 2px;
    }
    .info-grid-icon {
      /* Decorative branding icon, not itself a control — AT&T Blue is the
         approved usage here. */
      color: var(--accent);
      margin-bottom: 12px;
    }
    .info-grid-icon-accent-dots {
      /* Matches the fallback icon's own baked-in accent-dot styling, sourced
         from the icon as authored, expressed as a token instead of a hardcoded
         hex so it always tracks the theme's real accent value. */
      fill: var(--accent);
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
