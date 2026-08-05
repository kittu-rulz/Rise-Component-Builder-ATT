import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML, sanitizeRichText } from '../js/utilities.js';

export const id = 'tab-blocks';
export const name = 'Horizontal Tabs';
export const category = 'interactive';
export const defaultConfig = {
  items: [
    { title: 'Tab 1: Overview', content: 'A high-level explanation of the subject matter, laying a strong conceptual foundation.' },
    { title: 'Tab 2: Details', content: 'In-depth description of procedures, parameters, and design metrics.' },
    { title: 'Tab 3: Summary', content: 'Key takeaways and visual summaries to reinforce memory retention.' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  return `<div class="tabs-container">
    <div class="tabs-header" role="tablist" aria-label="Content sections">${config.items.map((item, index) => `<button class="tab-btn ${index === 0 ? 'active' : ''}" id="${instanceId}-tab-${index}" role="tab" aria-selected="${index === 0}" aria-controls="${instanceId}-tab-panel-${index}" tabindex="${index === 0 ? '0' : '-1'}">${escapeHTML(item.title || 'Tab')}</button>`).join('')}</div>
    <div class="tabs-content-wrapper">${config.items.map((item, index) => `<div class="tab-panel ${index === 0 ? 'active' : ''}" id="${instanceId}-tab-panel-${index}" role="tabpanel" aria-labelledby="${instanceId}-tab-${index}" tabindex="0" ${index === 0 ? '' : 'hidden'}><p>${sanitizeRichText(item.content || '')}</p></div>`).join('')}</div>
  </div>`;
}

export function generateCSS() {
  return `
    .tabs-container {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      overflow: hidden;
    }
    .tabs-header {
      display: flex;
      border-bottom: var(--border-style);
      background-color: rgba(0,0,0,0.02);
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: none;
      padding: 14px 20px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: var(--text-main);
    }
    .tab-btn.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }
    .tabs-content-wrapper {
      padding: 20px;
    }
    .tab-panel {
      display: none;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-muted);
      animation: fadeIn 0.3s ease;
    }
    .tab-panel.active {
      display: block;
    }`;
}

export function generateJS(config, instanceId) {
  return `
    function selectTab(index, button) {
      var container = button.closest('.tabs-container');
      container.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
        b.setAttribute('tabindex', '-1');
      });
      container.querySelectorAll('.tab-panel').forEach(function(p) {
        p.classList.remove('active');
        p.hidden = true;
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      button.setAttribute('tabindex', '0');
      var panel = document.getElementById('${instanceId}-tab-panel-' + index);
      panel.hidden = false;
      panel.classList.add('active');
      viewedItems.add(index);
      updateProgress();
    }

    function initComponent() {
      document.querySelectorAll('.tab-btn').forEach(function(button, idx) {
        button.addEventListener('click', function() {
          selectTab(idx, button);
        });
        button.addEventListener('keydown', function(event) {
          var tabs = Array.from(button.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
          var next = idx;
          if (event.key === 'ArrowRight') next = (idx + 1) % tabs.length;
          else if (event.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else return;
          event.preventDefault();
          selectTab(next, tabs[next]);
          tabs[next].focus();
        });
      });
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add at least one tab.'];
  return { valid: errors.length === 0, errors };
}
