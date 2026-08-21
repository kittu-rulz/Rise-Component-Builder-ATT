import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';

export const id = 'pricing-comparison';
export const name = 'Product Matrix Cards';
export const category = 'cards';
export const defaultConfig = {
  items: [
    { title: 'Starter Plan', content: '1 User • 5 Components/mo • Community Support' },
    { title: 'Professional', content: 'Unlimited Builders • 20 Components/mo • Priority Support', highlighted: true },
    { title: 'Enterprise Suite', content: 'Custom Domains • Unlimited Builders • Dedicated Success Agent' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config) {
  return `
    <div class="pricing-table-container">
      ${config.items.map((item, idx) => `
        <div class="pricing-card-item ${item.highlighted ? 'premium-highlight' : ''}">
          ${item.highlighted ? '<div class="popular-ribbon">RECOMMENDED</div>' : ''}
          <div class="pricing-tier-header">
            <h4>${escapeHTML(item.title || 'Service Plan')}</h4>
          </div>
          <div class="pricing-features-list">
            ${(item.content || '').split('•').map(feat => `
              <div class="pricing-feature-line">
                <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" class="tick-icon"><path d="M11.33 26.75 1.29 16.71 2.71 15.29 11.33 23.92 29.29 5.96 30.71 7.37 11.33 26.75Z"/></svg>
                <span>${feat.trim()}</span>
              </div>
            `).join('')}
          </div>
          <button class="pricing-action-btn" type="button" data-idx="${idx}" data-action-url="${escapeAttribute(item.actionUrl || '')}">Choose Plan</button>
        </div>
      `).join('')}
    </div>
  `;
}

export function generateCSS() {
  return `
    .pricing-table-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      align-items: stretch;
    }
    .pricing-card-item {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 24px;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.2s;
    }
    .pricing-card-item.premium-highlight {
      border-color: var(--accent);
      box-shadow: var(--shadow-lg);
    }
    .pricing-card-item.selected {
      border-color: var(--accent);
      transform: translateY(-2px);
    }
    .popular-ribbon {
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--accent);
      /* Not --on-accent (white): at 9px this is well under the brand's 19px
         threshold for white text on an AT&T Blue background. */
      color: var(--text-main);
      font-size: 9px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .pricing-tier-header {
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
    }
    .pricing-tier-header h4 {
      font-size: 15px;
      font-weight: 600;
    }
    .pricing-features-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
      margin-bottom: 20px;
    }
    .pricing-feature-line {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .tick-icon {
      color: var(--accent);
      flex-shrink: 0;
    }
    .pricing-action-btn {
      width: 100%;
      background-color: var(--bg-card);
      border: 1px solid var(--primary);
      /* Full capsule, not a partial rounding: the brand's own button spec is a
         complete pill, and this is the card's clickable CTA. */
      border-radius: var(--button-radius);
      padding: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--animation-speed);
      /* Cobalt text on white, the brand's clickable treatment for this
         non-highlighted button (highlighted cards invert it below). */
      color: var(--primary);
    }
    .pricing-card-item.premium-highlight .pricing-action-btn {
      background-color: var(--primary);
      border-color: var(--primary);
      color: var(--on-primary);
    }
    .pricing-action-btn:hover {
      border-color: var(--primary-hover);
      color: var(--primary-hover);
    }
    .pricing-card-item.premium-highlight .pricing-action-btn:hover {
      color: var(--on-primary);
    }`;
}

export function generateJS() {
  return `
    function initComponent() {
      document.querySelectorAll('.pricing-action-btn').forEach(function(button, idx) {
        button.addEventListener('click', function() {
          document.querySelectorAll('.pricing-card-item').forEach(function(card) {
            card.classList.remove('selected');
          });
          document.querySelectorAll('.pricing-action-btn').forEach(function(btn) {
            btn.textContent = 'Choose Plan';
          });
          button.closest('.pricing-card-item').classList.add('selected');
          button.textContent = 'Selected';
          viewedItems.add(idx);
          updateProgress();
          var actionUrl = button.getAttribute('data-action-url');
          if (actionUrl) window.open(actionUrl, '_blank', 'noopener,noreferrer');
        });
      });
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length >= 2 ? [] : ['Add at least two comparison options.'];
  return { valid: errors.length === 0, errors };
}
