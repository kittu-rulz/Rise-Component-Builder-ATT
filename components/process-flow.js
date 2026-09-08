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
          ${config.items.map((_, idx) => `<span class="p-dot ${idx === 0 ? 'active' : ''}" aria-hidden="true">${idx + 1}</span>`).join('')}
        </div>
      </div>
      <div class="process-slides-wrapper">
        ${config.items.map((item, idx) => {
          // durationMinutes arrives as a string once the author edits the number input
          // (control.value is always a string — see js/editor.js), so it must be coerced
          // rather than checked with Number.isFinite directly on the raw item value.
          const duration = Number(item.durationMinutes);
          const durationLine = Number.isFinite(duration) && duration > 0
            ? `<p class="process-step-duration">Estimated time: ${Math.round(duration)} min</p>`
            : '';
          return `
          <div class="process-slide ${idx === 0 ? 'active' : ''}" id="${instanceId}-process-slide-${idx}" role="group" aria-roledescription="step" aria-label="Step ${idx + 1} of ${config.items.length}" tabindex="-1" ${idx === 0 ? '' : 'hidden'}>
            <h3>${escapeHTML(item.title || 'Step Headline')}</h3>
            ${durationLine}
            <p>${item.content || 'Step content description details go here.'}</p>
          </div>
        `;
        }).join('')}
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
      border-radius: var(--att-radius-lg, var(--border-radius, 20px));
      box-shadow: var(--shadow-style);
      padding: var(--att-space-5, 24px);
      display: flex;
      flex-direction: column;
      gap: var(--att-space-5, 20px);
    }
    .process-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .step-badge {
      font-size: var(--att-fs-body-sm, 0.875rem);
      font-weight: var(--att-fw-bold, 700);
      /* Not --accent-light + AT&T Blue text: a derived shade, and below-19px blue
         text fails the brand's own contrast threshold. Neutral background, dark
         text. Not a capsule either — a static "Step X of Y" readout, not a
         clickable control. */
      color: var(--text-main);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: var(--border-color);
      padding: 4px 12px;
      border-radius: var(--att-radius-pill, 999px);
    }
    .process-dots {
      display: flex;
      gap: var(--att-space-2, 6px);
    }
    .p-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: var(--border-color);
      /* Stakeholder request: a visible step number, not just a bare dot. Still
         aria-hidden — the accessible name for "which step" comes from .step-badge's
         own aria-live announcement, so this stays decorative for sighted users. */
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--att-fs-eyebrow, 0.75rem);
      font-weight: var(--att-fw-bold, 700);
      transition: all 0.2s;
    }
    .p-dot.active {
      background-color: var(--accent);
      /* Not --on-accent (white): at 10px this is well under the brand's 19px
         threshold for white text on an AT&T Blue background. */
      color: var(--text-main);
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
      font-size: var(--att-fs-h4, 1.125rem);
      font-weight: var(--att-fw-bold, 700);
      line-height: var(--att-lh-heading, 1.25);
      margin-bottom: 8px;
      color: var(--text-main);
      text-wrap: pretty;
    }
    .process-slide p {
      font-size: var(--att-fs-body, 1rem);
      line-height: var(--att-lh-body, 1.5);
      color: var(--text-muted);
      max-width: 70ch;
      margin: 0;
    }
    .process-step-duration {
      /* AT&T Blue kept, sized up to the brand's own 19px floor for accent
         text (3.01:1 on white — accepted at large-text size, not below it). */
      font-size: var(--att-fs-h3, 1.25rem);
      font-weight: var(--att-fw-bold, 700);
      color: var(--accent);
      margin-bottom: 8px;
    }
    .process-controls-row {
      display: flex;
      justify-content: space-between;
      gap: var(--att-space-3, 12px);
    }
    .process-controls-row .btn {
      padding: 10px 24px;
      border-radius: var(--button-radius, var(--att-radius-pill, 999px));
      border: none;
      font-size: var(--att-fs-body, 1rem);
      font-weight: var(--att-fw-bold, 700);
      cursor: pointer;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      transition: all var(--animation-speed);
    }
    .process-controls-row .btn-small {
      padding: 10px 20px;
      font-size: var(--att-fs-body, 1rem);
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
      background-color: var(--att-grey-2, #DCDFE3);
      color: var(--att-grey-3, #707377);
      border-color: var(--att-grey-2, #DCDFE3);
      cursor: not-allowed;
      opacity: 0.6;
    }
    .process-controls-row .btn:active:not(:disabled) {
      transform: scale(0.98);
    }
    .process-controls-row .btn:focus-visible {
      outline: 3px solid var(--att-cobalt, var(--primary));
      outline-offset: 2px;
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
