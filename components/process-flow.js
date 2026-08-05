import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeHTML } from '../js/utilities.js';

export const id = 'process-flow';
export const name = 'Step-by-Step Flow';
export const category = 'process';
export const defaultConfig = {
  items: [
    { title: 'Define Objectives', content: 'Align course content with measurable learner metrics.' },
    { title: 'Create Visual Wireframes', content: 'Draft templates in the Rise Component Builder UI.' },
    { title: 'Export SCORM Pack', content: 'Zip files and deploy directly inside the Rise lesson LMS.' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  return `
    <div class="process-steps-container">
      <div class="process-progress-header">
        <span class="step-badge" aria-live="polite" aria-atomic="true">Step <span id="${instanceId}-current-process-num">1</span> of ${config.items.length}</span>
        <div class="process-dots">
          ${config.items.map((_, idx) => `<span class="p-dot ${idx === 0 ? 'active' : ''}" aria-hidden="true"></span>`).join('')}
        </div>
      </div>
      <div class="process-slides-wrapper">
        ${config.items.map((item, idx) => `
          <div class="process-slide ${idx === 0 ? 'active' : ''}" id="${instanceId}-process-slide-${idx}" role="group" aria-roledescription="step" aria-label="Step ${idx + 1} of ${config.items.length}" tabindex="-1" ${idx === 0 ? '' : 'hidden'}>
            <h3>${escapeHTML(item.title || 'Step Headline')}</h3>
            <p>${item.content || 'Step content description details go here.'}</p>
          </div>
        `).join('')}
      </div>
      <div class="process-controls-row">
        <button class="btn btn-secondary btn-small" id="${instanceId}-btn-process-prev" disabled>Previous</button>
        <button class="btn btn-primary btn-small" id="${instanceId}-btn-process-next">Next Step</button>
      </div>
    </div>
  `;
}

export function generateCSS() {
  return `
    .process-steps-container {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .process-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .step-badge {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      background-color: var(--accent-light);
      padding: 3px 10px;
      border-radius: 20px;
    }
    .process-dots {
      display: flex;
      gap: 6px;
    }
    .p-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--border-color);
      transition: all 0.2s;
    }
    .p-dot.active {
      background-color: var(--accent);
      transform: scale(1.1);
    }
    .process-slides-wrapper {
      min-height: 120px;
      padding: 8px 0;
    }
    .process-slide {
      display: none;
      animation: fadeIn 0.3s ease;
    }
    .process-slide.active {
      display: block;
    }
    .process-slide h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .process-slide p {
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-muted);
    }
    .process-controls-row {
      display: flex;
      justify-content: space-between;
    }
    .process-controls-row .btn {
      padding: 10px 24px;
      border-radius: var(--button-radius);
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--animation-speed);
    }
    .process-controls-row .btn-small {
      padding: 8px 18px;
      font-size: 13px;
    }
    .process-controls-row .btn-primary {
      background-color: var(--primary);
      color: var(--on-primary);
    }
    .process-controls-row .btn-primary:hover:not(:disabled) {
      background-color: var(--primary-hover);
    }
    .process-controls-row .btn-secondary {
      background-color: transparent;
      color: var(--text-main);
      border: var(--border-style);
    }
    .process-controls-row .btn-secondary:hover:not(:disabled) {
      border-color: var(--primary);
      color: var(--primary);
    }
    .process-controls-row .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .process-controls-row .btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px var(--focus-ring);
    }`;
}

export function generateJS(config, instanceId) {
  return `
    var activeProcessIndex = 0;
    var totalProcessSteps = ${config.items.length};

    function moveProcessStep(direction) {
      var nextIdx = activeProcessIndex + direction;
      if (nextIdx < 0 || nextIdx >= totalProcessSteps) return;

      document.querySelectorAll('.process-slide').forEach(function(s) {
        s.classList.remove('active');
        s.hidden = true;
      });
      document.querySelectorAll('.p-dot').forEach(function(d) { d.classList.remove('active'); });

      activeProcessIndex = nextIdx;

      var activeSlide = document.getElementById('${instanceId}-process-slide-' + activeProcessIndex);
      activeSlide.hidden = false;
      activeSlide.classList.add('active');
      document.querySelectorAll('.p-dot')[activeProcessIndex].classList.add('active');
      document.getElementById('${instanceId}-current-process-num').textContent = activeProcessIndex + 1;

      document.getElementById('${instanceId}-btn-process-prev').disabled = (activeProcessIndex === 0);
      document.getElementById('${instanceId}-btn-process-next').disabled = (activeProcessIndex === totalProcessSteps - 1);
      announce('Step ' + (activeProcessIndex + 1) + ' of ' + totalProcessSteps + ': ' + activeSlide.querySelector('h3').textContent);

      viewedItems.add(activeProcessIndex);
      updateProgress();
    }

    function initComponent() {
      var prevProcessBtn = document.getElementById('${instanceId}-btn-process-prev');
      var nextProcessBtn = document.getElementById('${instanceId}-btn-process-next');
      if (prevProcessBtn) prevProcessBtn.addEventListener('click', function() { moveProcessStep(-1); });
      if (nextProcessBtn) nextProcessBtn.addEventListener('click', function() { moveProcessStep(1); });
      if (document.querySelector('.process-steps-container')) {
        viewedItems.add(0);
        updateProgress();
      }
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length >= 2 ? [] : ['Add at least two process steps.'];
  return { valid: errors.length === 0, errors };
}
