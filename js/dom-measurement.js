// Renders a compiled export's HTML into a hidden, offscreen iframe to measure real layout
// dimensions (P07) — the one thing this project's otherwise-pure preflight rules can't
// determine from config data alone. Feeds js/validation.js's clipping-risk and
// mobile-overflow heuristics; see docs/VALIDATION-RULES.md "Rules requiring manual
// judgment" for what this can't guarantee.
//
// Deliberately does NOT use `allow-same-origin` on the measurement iframe, matching this
// project's existing convention for every iframe that renders compiled component output
// (the live-preview iframe, index.html; the exported Iframe Snippet, js/export.js) — see
// docs/SECURITY.md. `allow-scripts` + `allow-same-origin` together would let the iframe's
// content script access the parent page (localStorage, IndexedDB media) if sanitization
// were ever imperfect; this module never needs that, since it reads dimensions via
// postMessage from inside the iframe instead of reaching in via `contentDocument` —
// the same cross-sandbox channel js/completion.js already uses for completion reporting.

const MEASUREMENT_MESSAGE_TYPE = 'rcb-dom-measurement';

function buildMeasurementScript() {
  return `<script>(function() {
  function report() {
    var doc = document.documentElement;
    try {
      window.parent.postMessage({ type: ${JSON.stringify(MEASUREMENT_MESSAGE_TYPE)}, scrollHeight: doc.scrollHeight, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth }, '*');
    } catch (e) {}
  }
  if (document.readyState === 'complete') report();
  else window.addEventListener('load', report);
})();</script>`;
}

function injectMeasurementScript(html) {
  const script = buildMeasurementScript();
  return html.includes('</body>') ? html.replace('</body>', `${script}</body>`) : `${html}${script}`;
}

function createHiddenIframe(widthPx) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.sandbox = 'allow-scripts';
  // The iframe's own box height must stay minimal, not a "reasonable-looking" fixed
  // value: the compiled export's base CSS sets `body { min-height: 100vh }`
  // (js/export-shell.js), and `100vh` inside an iframe resolves against *this* iframe's
  // own height — a larger value here would inflate documentElement.scrollHeight to at
  // least that height regardless of the component's actual content height, defeating the
  // measurement entirely. 1px keeps 100vh negligible so real content always dominates.
  iframe.style.cssText = `position:absolute; top:-9999px; left:-9999px; width:${widthPx}px; height:1px; border:0; visibility:hidden;`;
  document.body.appendChild(iframe);
  return iframe;
}

function measureAtWidth(html, widthPx, timeoutMs, signal) {
  return new Promise(resolve => {
    const iframe = createHiddenIframe(widthPx);
    let settled = false;

    const finish = result => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      iframe.remove();
      resolve(result);
    };
    const onMessage = event => {
      if (event.source !== iframe.contentWindow || event.data?.type !== MEASUREMENT_MESSAGE_TYPE) return;
      finish({ scrollHeight: event.data.scrollHeight, scrollWidth: event.data.scrollWidth, clientWidth: event.data.clientWidth });
    };
    const onAbort = () => finish(null);
    const timer = setTimeout(() => finish(null), timeoutMs);

    window.addEventListener('message', onMessage);
    signal?.addEventListener('abort', onAbort, { once: true });
    iframe.srcdoc = injectMeasurementScript(html);
  });
}

/**
 * Best-effort: any failure (timeout, aborted, no DOM environment) resolves to `null` for
 * that dimension rather than throwing or hanging — a broken measurement must never crash
 * Preflight or block export. Runs the desktop and mobile measurements in parallel (two
 * disposable iframes, not one resized+reflowed, for simplicity/reliability over a
 * ResizeObserver-based single-iframe approach).
 *
 * @param {string} html - the fully compiled export HTML (js/preview.js#generateIframeContent)
 * @param {{ desktopWidth?: number, mobileWidth?: number, timeoutMs?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<{ desktopContentHeight: number|null, mobileOverflowPx: number|null } | null>}
 *   `null` overall only when there was nothing to measure (no html, no DOM). Otherwise each
 *   field is independently `null` only if that specific measurement failed/timed out.
 */
export async function measureRenderedDimensions(html, options = {}) {
  const { desktopWidth = 740, mobileWidth = 375, timeoutMs = 4000, signal } = options;
  if (typeof document === 'undefined' || !html) return null;
  if (signal?.aborted) return null;

  const [desktop, mobile] = await Promise.all([
    measureAtWidth(html, desktopWidth, timeoutMs, signal),
    measureAtWidth(html, mobileWidth, timeoutMs, signal)
  ]);

  return {
    desktopContentHeight: desktop ? desktop.scrollHeight : null,
    mobileOverflowPx: mobile ? Math.max(0, mobile.scrollWidth - mobile.clientWidth) : null
  };
}
