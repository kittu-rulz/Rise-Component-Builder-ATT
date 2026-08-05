import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML } from '../js/utilities.js';

export const id = 'pricing-comparison';
export const name = 'Product Matrix Cards';
export const category = 'cards';
export const defaultConfig = {
  items: [
    { title: 'Starter Plan', content: '1 User • 5 Components/mo • Community Support' },
    { title: 'Professional', content: 'Unlimited Builders • 20 Components/mo • Priority Support' },
    { title: 'Enterprise Suite', content: 'Custom Domains • Unlimited Builders • Dedicated Success Agent' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config) {
  return `
    <div class="pricing-table-container">
      ${config.items.map((item, idx) => `
        <div class="pricing-card-item ${idx === 1 ? 'premium-highlight' : ''}">
          ${idx === 1 ? '<div class="popular-ribbon">RECOMMENDED</div>' : ''}
          <div class="pricing-tier-header">
            <h4>${escapeHTML(item.title || 'Service Plan')}</h4>
          </div>
          <div class="pricing-features-list">
            ${(item.content || '').split('•').map(feat => `
              <div class="pricing-feature-line">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="tick-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>${feat.trim()}</span>
              </div>
            `).join('')}
          </div>
          <button class="pricing-action-btn">Choose Plan</button>
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
      color: var(--on-accent);
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
      background-color: var(--bg-body);
      border: 1px solid var(--border-color);
      border-radius: calc(var(--border-radius) - 4px);
      padding: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--animation-speed);
    }
    .pricing-card-item.premium-highlight .pricing-action-btn {
      background-color: var(--primary);
      border-color: var(--primary);
      color: var(--on-primary);
    }
    .pricing-action-btn:hover {
      border-color: var(--primary-hover);
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
        });
      });
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length >= 2 ? [] : ['Add at least two comparison options.'];
  return { valid: errors.length === 0, errors };
}
