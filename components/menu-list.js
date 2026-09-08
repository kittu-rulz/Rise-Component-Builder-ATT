import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML } from '../js/utilities.js';
import { getAttIconSvg } from '../js/att-icons.js';

export const id = 'menu-list';
export const name = 'Secondary Menu Drawer';
export const category = 'navigation';
export const defaultConfig = {
  items: [
    { title: 'Module 1: Getting Started', content: 'Introduction and setup basics.' },
    { title: 'Module 2: Advanced Design', content: 'Explore layouts, shadows, and spacing.' },
    { title: 'Module 3: Code Exporting', content: 'Embedding components inside SCORM courses.' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config) {
  return `
    <div class="menu-drawer-list">
      ${config.items.map((item, idx) => `
        <div class="menu-drawer-item" data-idx="${idx}">
          <div class="menu-item-summary">
            <div class="menu-item-left">
              <span class="menu-num">0${idx + 1}</span>
              <span class="menu-title">${escapeHTML(item.title || 'Lesson Segment')}</span>
            </div>
            ${getAttIconSvg('chevron-down', { className: 'menu-arrow', width: 16, height: 16, ariaHidden: true })}
          </div>
          <div class="menu-item-desc">
            <p>${item.content || 'Description content details...'}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function generateCSS() {
  return `
    .menu-drawer-list {
      display: flex;
      flex-direction: column;
      gap: var(--att-space-3, 12px);
    }
    .menu-drawer-item {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--att-radius-lg, var(--border-radius, 20px));
      box-shadow: var(--shadow-style);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
    }
    .menu-item-summary {
      padding: var(--att-space-4, 16px) var(--att-space-5, 24px);
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 44px;
      box-sizing: border-box;
    }
    .menu-item-left {
      display: flex;
      align-items: center;
      gap: var(--att-space-3, 14px);
    }
    .menu-num {
      font-size: var(--att-fs-body, 1rem);
      font-weight: var(--att-fw-bold, 700);
      /* Cobalt (--primary), not AT&T Blue: this index number is part of a
         clickable drawer header's own content, so it needs the Cobalt clickable
         treatment. */
      color: var(--primary);
    }
    .menu-title {
      font-size: var(--att-fs-body, 1rem);
      font-weight: var(--att-fw-bold, 700);
      line-height: var(--att-lh-heading, 1.25);
      color: var(--text-main);
      text-wrap: pretty;
    }
    .menu-arrow {
      /* Cobalt (--primary), not a neutral gray: this icon is the clickable
         header's own affordance indicator, so it carries the Cobalt clickable
         treatment at rest too, not only once expanded. */
      color: var(--primary);
      transition: transform 0.2s;
    }
    .menu-drawer-item.active .menu-arrow {
      transform: rotate(180deg);
    }
    .menu-item-desc {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.25s ease-out;
      background-color: var(--att-grey-1, #F3F4F5);
    }
    .menu-item-desc p {
      padding: 0 var(--att-space-5, 24px) var(--att-space-5, 24px) 48px;
      font-size: var(--att-fs-body, 1rem);
      line-height: var(--att-lh-body, 1.5);
      color: var(--text-muted);
      max-width: 70ch;
      margin: 0;
    }
    .menu-drawer-item.active .menu-item-desc {
      max-height: 300px;
    }`;
}

export function generateJS() {
  return `
    function toggleMenuDrawer(index, item) {
      var isCurrentlyActive = item.classList.contains('active');
      document.querySelectorAll('.menu-drawer-item').forEach(function(el) { el.classList.remove('active'); });

      if (!isCurrentlyActive) {
        item.classList.add('active');
        viewedItems.add(index);
        updateProgress();
      }
    }

    function initComponent() {
      document.querySelectorAll('.menu-drawer-item').forEach(function(item) {
        item.addEventListener('click', function() {
          toggleMenuDrawer(parseInt(item.getAttribute('data-idx'), 10), item);
        });
      });
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add at least one menu item.'];
  return { valid: errors.length === 0, errors };
}
