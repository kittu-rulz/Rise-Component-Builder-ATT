import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';

export const id = 'image-gallery';
export const name = 'Grid Photo Gallery';
export const category = 'media';
export const defaultConfig = {
  items: [
    { title: 'Workspace Design System', content: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800' },
    { title: 'User Layout Journey', content: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  return `
    <div class="gallery-grid">
      ${config.items.map((item, idx) => `
        <button type="button" class="gallery-item-card" data-img="${escapeAttribute(item.content)}" data-caption="${escapeAttribute(item.caption || item.title || `Image ${idx + 1}`)}" data-alt="${item.decorative ? '' : escapeAttribute(item.altText || '')}" aria-haspopup="dialog" aria-controls="${instanceId}-gallery-lightbox" aria-label="Open image: ${escapeAttribute(item.title || `Image ${idx + 1}`)}">
          <img src="${escapeAttribute(item.content)}" alt="${item.decorative ? '' : escapeAttribute(item.altText || '')}" ${item.decorative ? 'aria-hidden="true"' : ''} style="object-fit:${item.imageFit === 'contain' ? 'contain' : 'cover'};">
          <div class="gallery-caption-overlay">
            <span>${escapeHTML(item.title || 'View Layout')}</span>
          </div>
        </button>
      `).join('')}
    </div>
    <div id="${instanceId}-gallery-lightbox" class="lightbox-overlay" role="dialog" aria-modal="true" aria-labelledby="${instanceId}-lightbox-expanded-caption" tabindex="-1" style="display:none;">
      <button type="button" class="lightbox-close" aria-label="Close image dialog">&times;</button>
      <img class="lightbox-img" id="${instanceId}-lightbox-expanded-img" src="" alt="Lightbox image">
      <div class="lightbox-caption" id="${instanceId}-lightbox-expanded-caption">Caption details</div>
    </div>
  `;
}

export function generateCSS() {
  return `
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }
    .gallery-item-card {
      position: relative;
      border-radius: var(--border-radius);
      border: var(--border-style);
      box-shadow: var(--shadow-style);
      overflow: hidden;
      cursor: pointer;
      aspect-ratio: 4/3;
      padding: 0;
      font: inherit;
      background: var(--bg-card);
      color: inherit;
    }
    .gallery-item-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .gallery-item-card:hover img {
      transform: scale(1.05);
    }
    .gallery-caption-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(0deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0) 100%);
      padding: 10px;
      color: white;
      font-size: 11px;
      font-weight: 500;
    }
    .lightbox-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(15, 23, 42, 0.9);
      z-index: 200;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    .lightbox-img {
      max-width: 90%;
      max-height: 80%;
      border-radius: 8px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .lightbox-caption {
      color: #94A3B8;
      font-size: 13px;
      margin-top: 16px;
      text-align: center;
    }
    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 30px;
      color: white;
      font-size: 32px;
      cursor: pointer;
    }`;
}

export function generateJS(config, instanceId) {
  return `
    var galleryReturnFocus = null;
    var galleryCurrentIndex = 0;
    var galleryCards = [];

    function showGalleryIndex(index) {
      var lightbox = document.getElementById('${instanceId}-gallery-lightbox');
      var img = document.getElementById('${instanceId}-lightbox-expanded-img');
      var caption = document.getElementById('${instanceId}-lightbox-expanded-caption');
      var card = galleryCards[index];
      if (!lightbox || !img || !caption || !card) return;

      galleryCurrentIndex = index;
      img.src = card.getAttribute('data-img');
      img.alt = card.getAttribute('data-alt') || '';
      caption.textContent = card.getAttribute('data-caption') || ('Image ' + (index + 1));

      viewedItems.add(index);
      updateProgress();
    }

    function openGalleryLightbox(index, src, trigger) {
      var lightbox = document.getElementById('${instanceId}-gallery-lightbox');
      lightbox.style.display = 'flex';
      galleryReturnFocus = trigger || document.activeElement;
      showGalleryIndex(index);
      lightbox.focus();
    }

    function closeGalleryLightbox() {
      var lightbox = document.getElementById('${instanceId}-gallery-lightbox');
      if (!lightbox || lightbox.style.display === 'none') return;
      lightbox.style.display = 'none';
      if (galleryReturnFocus) galleryReturnFocus.focus();
    }

    function initComponent() {
      galleryCards = Array.prototype.slice.call(document.querySelectorAll('.gallery-item-card'));
      galleryCards.forEach(function(card, idx) {
        card.addEventListener('click', function() {
          openGalleryLightbox(idx, card.getAttribute('data-img'), card);
        });
      });

      var lightbox = document.getElementById('${instanceId}-gallery-lightbox');
      var lightboxClose = document.querySelector('.lightbox-close');
      if (lightboxClose) lightboxClose.addEventListener('click', function() {
        closeGalleryLightbox();
      });
      if (lightbox) {
        lightbox.addEventListener('click', function(event) {
          if (event.target === lightbox) closeGalleryLightbox();
        });
        lightbox.addEventListener('keydown', function(event) {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeGalleryLightbox();
          }
          if (event.key === 'ArrowRight' && galleryCards.length > 1) {
            event.preventDefault();
            showGalleryIndex((galleryCurrentIndex + 1) % galleryCards.length);
          }
          if (event.key === 'ArrowLeft' && galleryCards.length > 1) {
            event.preventDefault();
            showGalleryIndex((galleryCurrentIndex - 1 + galleryCards.length) % galleryCards.length);
          }
          if (event.key === 'Tab') {
            var close = lightbox.querySelector('.lightbox-close');
            event.preventDefault();
            close.focus();
          }
        });
      }
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add at least one gallery image.'];
  return { valid: errors.length === 0, errors };
}
