import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML, sanitizeRichText, sanitizeURL } from '../js/utilities.js';

export const id = 'flip-cards';
export const name = '3D Flip Cards';
export const category = 'interactive';
export const defaultConfig = {
  items: [
    { title: 'Front Side A', content: 'Hover to reveal definition.' },
    { title: 'Back Side A', content: 'Definitions should be concise.' },
    { title: 'Front Side B', content: 'Mobile compatibility check.' },
    { title: 'Back Side B', content: 'Rise blocks fit full width.' }
  ]
};
export const editorSchema = getEditorSchema(id);

const defaultFrontIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

function renderCardArtwork(item, fallback = '') {
  const source = sanitizeURL(item?.iconImage, { allowDataImage: true, allowBlob: true, allowRelative: true });
  if (!source) return fallback;
  const decorative = item.iconDecorative !== false;
  const fit = item.iconFit === 'cover' ? 'cover' : 'contain';
  return `<img class="custom-item-icon" src="${escapeAttribute(source)}" alt="${decorative ? '' : escapeAttribute(item.iconAltText || '')}" ${decorative ? 'aria-hidden="true"' : ''} style="object-fit:${fit};">`;
}

export function generateHTML(config, instanceId) {
  const cards = [];
  for (let index = 0; index < config.items.length; index += 2) {
    if (config.items[index]) cards.push({ front: config.items[index], back: config.items[index + 1] || { title: 'Back Side Label', content: 'Back side description text.' } });
  }
  return `<div class="flip-cards-grid">${cards.map((card, index) => {
    const frontArtwork = renderCardArtwork(card.front, defaultFrontIcon);
    const backArtwork = renderCardArtwork(card.back);
    return `
    <div class="flip-card" role="button" tabindex="0" aria-expanded="false" aria-controls="${instanceId}-flip-card-back-${index}" aria-label="${escapeAttribute(card.front.title || 'Flip card')}: reveal back">
      <div class="flip-card-inner">
      <div class="flip-card-front" id="${instanceId}-flip-card-front-${index}" aria-hidden="false"><div class="card-icon-badge">${frontArtwork}</div><h3>${escapeHTML(card.front.title || 'Front Title')}</h3><p>${sanitizeRichText(card.front.content || 'Click to reveal definition.')}</p></div>
      <div class="flip-card-back" id="${instanceId}-flip-card-back-${index}" aria-hidden="true">${backArtwork ? `<div class="card-icon-badge">${backArtwork}</div>` : ''}<h3>${escapeHTML(card.back.title || 'Back Title')}</h3><p>${sanitizeRichText(card.back.content || 'Back description content goes here.')}</p></div>
    </div></div>`;
  }).join('')}</div>`;
}

export function generateCSS() {
  return `
    .flip-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .flip-card {
      background-color: transparent;
      height: 180px;
      perspective: 1000px;
      cursor: pointer;
    }

    .flip-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      text-align: center;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      transform-style: preserve-3d;
    }

    .flip-card.flipped .flip-card-inner {
      transform: rotateY(180deg);
    }

    .flip-card-front, .flip-card-back {
      position: absolute;
      width: 100%;
      height: 100%;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      border-radius: var(--border-radius);
      border: var(--border-style);
      box-shadow: var(--shadow-style);
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }

    .flip-card-front {
      background-color: var(--bg-card);
      color: var(--text-main);
    }

    .card-icon-badge {
      color: var(--accent);
      margin-bottom: 4px;
    }

    .card-icon-badge .custom-item-icon {
      width: 32px;
      height: 32px;
      border-radius: calc(var(--border-radius) / 2);
    }

    .flip-card-front h3, .flip-card-back h3 {
      font-size: 15px;
      font-weight: 600;
    }

    .flip-card-front p, .flip-card-back p {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .flip-card-back {
      background-color: var(--primary);
      color: var(--on-primary);
      transform: rotateY(180deg);
    }

    .flip-card-back h3 {
      color: var(--on-primary);
    }

    .flip-card-back p {
      color: var(--on-primary);
    }

    @media (prefers-reduced-motion: reduce) {
      .flip-card-inner { transform: none !important; }
      .flip-card-front, .flip-card-back { transition: none !important; }
      .flip-card.flipped .flip-card-front { display: none; }
      .flip-card:not(.flipped) .flip-card-back { display: none; }
    }`;
}

export function generateJS() {
  return `
    function initComponent() {
      document.querySelectorAll('.flip-card').forEach(function(card, idx) {
        card.addEventListener('click', function() {
          card.classList.toggle('flipped');
          var flipped = card.classList.contains('flipped');
          card.setAttribute('aria-expanded', String(flipped));
          card.setAttribute('aria-label', (flipped ? 'Hide back of ' : 'Reveal back of ') + card.querySelector('.flip-card-front h3').textContent);
          card.querySelector('.flip-card-front').setAttribute('aria-hidden', String(flipped));
          card.querySelector('.flip-card-back').setAttribute('aria-hidden', String(!flipped));
          announce(flipped ? 'Card back revealed' : 'Card front shown');
          viewedItems.add(idx);
          updateProgress();
        });
        card.addEventListener('keydown', function(event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            card.click();
          }
        });
      });
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add at least one card face.'];
  return { valid: errors.length === 0, errors };
}
