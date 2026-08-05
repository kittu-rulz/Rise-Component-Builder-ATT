import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML } from '../js/utilities.js';
import { combineValidationResults } from '../js/validation-utils.js';

/**
 * Horizontal Timeline Component Configuration
 * @typedef {Object} HorizontalTimelineConfig
 * @property {Array<{title: string, content: string, date?: string, year?: string}>} items - Array of timeline events
 */

export const id = 'horizontal-timeline';
export const name = 'Horizontal Journey Map';
export const category = 'timelines';

/** @type {HorizontalTimelineConfig} */
export const defaultConfig = {
  items: [
    { title: 'Phase 1: Research', content: 'Collect data assets, requirements, and verify targets.' },
    { title: 'Phase 2: Build Layout', content: 'Configure colors, fonts, margins, and borders in the tool.' },
    { title: 'Phase 3: Export HTML', content: 'Copy custom block and import inside Articulate Rise blocks.' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  return `
    <div class="horizontal-timeline-container">
      <div class="timeline-nodes-row" role="tablist" aria-label="Timeline steps">
        ${config.items.map((item, idx) => `
          <div class="timeline-node ${idx === 0 ? 'active' : ''}" id="${instanceId}-timeline-tab-${idx}" data-idx="${idx}" role="tab" tabindex="${idx === 0 ? '0' : '-1'}" aria-selected="${idx === 0}" aria-controls="${instanceId}-timeline-slide-${idx}">
            <div class="node-marker"></div>
            <span class="node-label">${escapeHTML(item.title || 'Step')}</span>
          </div>
        `).join('')}
      </div>
      <div class="timeline-slider-box">
        ${config.items.map((item, idx) => `
          <div class="timeline-slide ${idx === 0 ? 'active' : ''}" id="${instanceId}-timeline-slide-${idx}" role="tabpanel" aria-labelledby="${instanceId}-timeline-tab-${idx}" tabindex="0" ${idx === 0 ? '' : 'hidden'}>
            <h4>${escapeHTML(item.title || 'Phase Header')}</h4>
            <p>${item.content || 'Milestone description goes here.'}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function generateCSS() {
  return `
    .horizontal-timeline-container {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .timeline-nodes-row {
      display: flex;
      justify-content: space-between;
      position: relative;
      padding-bottom: 12px;
    }
    .timeline-nodes-row::before {
      content: '';
      position: absolute;
      left: 10px;
      right: 10px;
      top: 10px;
      height: 2px;
      background-color: var(--border-color);
      z-index: 1;
    }
    .timeline-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      z-index: 2;
      flex: 1;
    }
    .node-marker {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: var(--bg-card);
      border: 3px solid var(--border-color);
      transition: all 0.2s;
      box-shadow: var(--shadow-sm);
    }
    .timeline-node.active .node-marker {
      border-color: var(--accent);
      background-color: var(--accent);
      transform: scale(1.1);
    }
    .node-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 8px;
      text-align: center;
      transition: color 0.2s;
    }
    .timeline-node.active .node-label {
      color: var(--accent);
    }
    .timeline-slider-box {
      background-color: var(--bg-body);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      min-height: 100px;
    }
    .timeline-slide {
      display: none;
      animation: fadeIn 0.3s ease;
    }
    .timeline-slide.active {
      display: block;
    }
    .timeline-slide h4 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .timeline-slide p {
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-muted);
    }`;
}

export function generateJS(config, instanceId) {
  return `
    function selectTimelineNode(index, node) {
      var container = node.closest('.horizontal-timeline-container');
      container.querySelectorAll('.timeline-node').forEach(function(n) {
        n.classList.remove('active');
        n.setAttribute('aria-selected', 'false');
        n.setAttribute('tabindex', '-1');
      });
      container.querySelectorAll('.timeline-slide').forEach(function(s) {
        s.classList.remove('active');
        s.hidden = true;
      });

      node.classList.add('active');
      node.setAttribute('aria-selected', 'true');
      node.setAttribute('tabindex', '0');
      var slide = document.getElementById('${instanceId}-timeline-slide-' + index);
      slide.hidden = false;
      slide.classList.add('active');

      viewedItems.add(index);
      updateProgress();
    }

    function initComponent() {
      document.querySelectorAll('.timeline-node').forEach(function(node) {
        node.addEventListener('click', function() {
          selectTimelineNode(parseInt(node.getAttribute('data-idx'), 10), node);
        });
        node.addEventListener('keydown', function(event) {
          var nodes = Array.from(node.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
          var current = nodes.indexOf(node);
          var next = current;
          if (event.key === 'ArrowRight') next = (current + 1) % nodes.length;
          else if (event.key === 'ArrowLeft') next = (current - 1 + nodes.length) % nodes.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = nodes.length - 1;
          else return;
          event.preventDefault();
          selectTimelineNode(next, nodes[next]);
          nodes[next].focus();
        });
      });
    }`;
}

/**
 * Validates horizontal timeline component configuration.
 * @param {HorizontalTimelineConfig} config - The configuration to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with error messages
 */
export function validate(config) {
  const results = [];
  // No date/year field exists in this component's schema (js/editor-schemas.js — items
  // are title+content only), so this checks item presence directly rather than going
  // through validateTimelineEvents, whose date/chronological-order logic doesn't apply
  // to this component's actual data shape.
  if (!Array.isArray(config.items) || config.items.length === 0) {
    results.push({ valid: false, error: 'At least one timeline milestone is required.' });
  } else {
    config.items.forEach((item, index) => {
      if (!item.title || !String(item.title).trim()) {
        results.push({ valid: false, error: `Event ${index + 1}: Title is required.` });
      }
      if (!item.content || !String(item.content).trim()) {
        results.push({ valid: false, error: `Event ${index + 1}: Description is required.` });
      }
    });
  }

  return combineValidationResults(results);
}
