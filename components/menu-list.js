import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML } from '../js/utilities.js';

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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="menu-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
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
      gap: 10px;
    }
    .menu-drawer-item {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
    }
    .menu-item-summary {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .menu-item-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .menu-num {
      font-size: 14px;
      font-weight: 700;
      color: var(--accent);
    }
    .menu-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }
    .menu-arrow {
      color: var(--text-muted);
      transition: transform 0.2s;
    }
    .menu-drawer-item.active .menu-arrow {
      transform: rotate(180deg);
      color: var(--accent);
    }
    .menu-item-desc {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.25s ease-out;
      background-color: rgba(0,0,0,0.01);
    }
    .menu-item-desc p {
      padding: 0 20px 20px 48px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-muted);
    }
    .menu-drawer-item.active .menu-item-desc {
      max-height: 200px;
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
