// Shared export shell: the outer document shape, shared design-token wiring, and the
// shared accessibility/completion utilities every component relies on. Per-component
// markup/CSS/JS live in components/*.js and are composed in here — this file owns none
// of it. See docs/EXPORT-CONTRACT.md for the full pipeline description.

import { normalizeHeadingLevel } from './utilities.js';

export const CSP_META = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' http: https: data: blob:; media-src 'self' http: https: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'";

// Reset + shared block chrome (title/headline/description). No component-specific rules.
export const BASE_RESET_CSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-family);
      background-color: var(--bg-body);
      color: var(--text-main);
      padding: calc(30px * var(--spacing-scale));
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      transition: background-color var(--animation-speed) ease;
    }

    button { border-radius: var(--button-radius); }

    /* Interactive Block Shell */
    .rise-block-wrapper {
      width: 100%;
      max-width: var(--component-max-width);
      margin: 0 auto;
    }

    .block-header {
      margin-bottom: 24px;
      text-align: left;
    }

    .block-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      color: var(--accent);
      text-transform: uppercase;
      margin-bottom: 4px;
      white-space: pre-line;
    }

    .block-headline {
      font-family: var(--heading-font-family);
      white-space: pre-line;
      font-size: 22px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.3;
    }

    .block-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 6px;
      line-height: 1.5;
    }`;

// Shared accessibility primitives + the completion-tracker widget's CSS (used by every
// component whenever completion tracking is enabled — not specific to any one of them).
export const SHARED_A11Y_CSS = `
    [hidden] { display: none !important; }

    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }

    :where(button, [href], input, [tabindex]:not([tabindex="-1"])):focus-visible {
      outline: 3px solid var(--primary);
      outline-offset: 3px;
      box-shadow: 0 0 0 2px var(--bg-card);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Completion Tracker Bar */
    .completion-tracker {
      margin-top: 30px;
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
    }

    .progress-bar-container {
      height: 8px;
      width: 100%;
      background-color: var(--bg-body);
      border-radius: 10px;
      overflow: hidden;
      margin-top: 8px;
    }

    .progress-fill {
      height: 100%;
      background-color: var(--accent);
      width: 0%;
      transition: width 0.3s ease;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        scroll-behavior: auto !important;
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    @media (forced-colors: active) {
      :where(button, [role="button"], [role="radio"], [role="tab"], input) { border: 1px solid ButtonText; }
      :where(button, [role="button"], [role="radio"], [role="tab"], input):focus-visible { outline: 3px solid Highlight; }
      .progress-fill { background: Highlight; }
    }`;

/**
 * The shared accessibility/completion-tracking JS every component calls into
 * (`viewedItems.add(idx); updateProgress();` / `updateTrackerComplete()`), scoped to
 * this export's instanceId so multiple exports pasted onto one page never collide.
 *
 * Three separated concepts (docs/COMPLETION-INTEGRATION.md):
 *   1. Internal interaction progress — `viewedItems`/`updateProgress()`: which items have
 *      been interacted with, and the visible/ARIA percentage. Always active whenever
 *      trackCompletion is on, regardless of whether anything is embedding this component.
 *   2. Internal component completion — `evaluateComponentCompletion()`: the one-time
 *      percent-reaches-100 transition. Purely internal state; does not by itself imply
 *      any host noticed.
 *   3. Parent-window notification — delegated entirely to `RiseComponentCompletion`
 *      (js/completion.js), which decides *whether* and *how* to tell a host, and is the
 *      only thing here that touches window.parent/postMessage.
 */
export function renderSharedA11yScript({ instanceId, trackCompletion, totalItems, completionMessage }) {
  return `
    var viewedItems = new Set();
    var totalItems = ${Number(totalItems) || 1};
    var completionMessage = ${completionMessage};

    function announce(message) {
      var status = document.getElementById('${instanceId}-interaction-status');
      if (!status) return;
      status.textContent = '';
      window.setTimeout(function() { status.textContent = message; }, 20);
    }

    // Concept #1: internal interaction progress (ARIA valuenow/valuetext only — no
    // completion decision here).
    function setProgressAccessibility(percent) {
      var progress = document.getElementById('${instanceId}-progress-bar');
      if (progress) {
        progress.setAttribute('aria-valuenow', String(percent));
        progress.setAttribute('aria-valuetext', percent + ' percent complete');
      }
    }

    // Concept #2: internal component completion. Fires the (adapter-owned) notification
    // exactly once per completed state — see RiseComponentCompletion.notifyComplete().
    function evaluateComponentCompletion(percent) {
      if (percent < 100) return;
      if (typeof RiseComponentCompletion === 'undefined' || RiseComponentCompletion.hasCompleted()) return;
      announce(completionMessage);
      RiseComponentCompletion.notifyComplete();
    }

    function updateProgress() {
      if (!${Boolean(trackCompletion)}) return;
      var percent = Math.min(Math.round((viewedItems.size / totalItems) * 100), 100);
      var txt = document.getElementById('${instanceId}-completion-text');
      var bar = document.getElementById('${instanceId}-progress-fill');
      if (txt && bar) {
        txt.textContent = percent + '%';
        bar.style.width = percent + '%';
      }
      setProgressAccessibility(percent);
      evaluateComponentCompletion(percent);
    }

    function updateTrackerComplete() {
      if (!${Boolean(trackCompletion)}) return;
      var txt = document.getElementById('${instanceId}-completion-text');
      var bar = document.getElementById('${instanceId}-progress-fill');
      if (txt && bar) {
        txt.textContent = '100%';
        bar.style.width = '100%';
      }
      setProgressAccessibility(100);
      evaluateComponentCompletion(100);
    }

    // Inbound-reset target (js/completion.js calls this by name after validating a
    // 'reset' message): clears interaction progress and re-arms completion so a fresh
    // completion can fire again later.
    function resetComponentProgress() {
      viewedItems = new Set();
      updateProgress();
      if (typeof RiseComponentCompletion !== 'undefined') RiseComponentCompletion.reset();
      announce('Progress reset.');
    }`;
}

const BOOTSTRAP_JS = `
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initComponent);
    } else {
      initComponent();
    }`;

/**
 * Assembles the complete standalone HTML document. This is the ONLY place that owns the
 * outer document shape (CSP, fonts, shared CSS/tokens, block header, completion tracker,
 * the combined script IIFE). Every export format and the live preview all go through this
 * same function via js/preview.js#generateIframeContent — see docs/EXPORT-CONTRACT.md.
 */
export function renderShell({
  instanceId, tokensCSS, fontQuery, componentCSS, blockLabel, blockHeadline, blockDesc,
  blockHeadingLevel, componentHTML, completionTrackerHTML, sharedA11yScript, componentJS
}) {
  // Rise embeds this markup inside a lesson page that has its own h1, so the wrapping
  // headline's tag is author-configurable (defaults to h2) rather than a hardcoded h1 —
  // see docs/ACCESSIBILITY-CONFORMANCE.md.
  const headingTag = normalizeHeadingLevel(blockHeadingLevel);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${CSP_META}">
  <link href="https://fonts.googleapis.com/css2?${fontQuery}&display=swap" rel="stylesheet">
  <style>
    :root {
${tokensCSS}
    }
${BASE_RESET_CSS}
${componentCSS}
${SHARED_A11Y_CSS}
  </style>
</head>
<body>

  <main class="rise-block-wrapper" aria-labelledby="${instanceId}-block-headline">
    <div class="block-header">
      <div class="block-label">${blockLabel}</div>
      <${headingTag} class="block-headline" id="${instanceId}-block-headline">${blockHeadline}</${headingTag}>
      <div class="block-desc">${blockDesc}</div>
    </div>

    <div class="block-content">
      ${componentHTML}
    </div>

    ${completionTrackerHTML}
    <div id="${instanceId}-interaction-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
  </main>

  <script>
    (function() {
${sharedA11yScript}
${componentJS}
${BOOTSTRAP_JS}
    })();
  </script>
</body>
</html>
`;
}

export function renderCompletionTrackerHTML(instanceId, trackCompletion) {
  if (!trackCompletion) return '';
  return `
    <div class="completion-tracker" aria-labelledby="${instanceId}-completion-label">
        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600;">
          <span id="${instanceId}-completion-label">Progress Completion</span>
          <span id="${instanceId}-completion-text" aria-hidden="true">0%</span>
        </div>
        <div class="progress-bar-container" id="${instanceId}-progress-bar" role="progressbar" aria-labelledby="${instanceId}-completion-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0 percent complete">
          <div class="progress-fill" id="${instanceId}-progress-fill"></div>
        </div>
      </div>`;
}
