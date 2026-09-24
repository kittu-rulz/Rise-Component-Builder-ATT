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

// Runs INSIDE the sandboxed hidden iframe. Deterministic by construction:
//  1. waits for `load`, web fonts and every image (a reading taken before those settle is
//     what made repeated checks disagree, including the occasional 0px height);
//  2. polls until two consecutive readings are identical (or gives up and reports
//     `settled: false`, which the host treats as "unmeasured", never as a pass or a warning);
//  3. measures the tallest/widest state across the initial view AND every collapsed
//     accordion/disclosure/tab expanded in turn, because most content (and its media) is
//     hidden until opened and a collapsed-only reading misses it entirely.
function buildMeasurementScript() {
  return `<script>(function() {
  var STABLE_READINGS = 2, POLL_MS = 50, MAX_POLLS = 40, MAX_TRIGGERS = 16, ASSET_WAIT_MS = 2500, DEADLINE_MS = 6500;
  var collected = [], reported = false;
  function reading() {
    var d = document.documentElement;
    return { h: d.scrollHeight, sw: d.scrollWidth, cw: d.clientWidth };
  }
  function settle() {
    return new Promise(function(resolve) {
      var last = null, stable = 0, polls = 0;
      (function tick() {
        var r = reading();
        stable = last && r.h === last.h && r.sw === last.sw && r.cw === last.cw ? stable + 1 : 0;
        last = r; polls++;
        if (stable >= STABLE_READINGS) return resolve({ r: r, settled: true });
        if (polls >= MAX_POLLS) return resolve({ r: r, settled: false });
        setTimeout(tick, POLL_MS);
      })();
    });
  }
  function assetsReady() {
    var waits = [];
    // Capped like images: a promise that never resolves in some engines must not hang the run.
    if (document.fonts && document.fonts.ready) waits.push(Promise.race([document.fonts.ready, new Promise(function(done) { setTimeout(done, ASSET_WAIT_MS); })]));
    Array.prototype.forEach.call(document.images, function(img) {
      // loading="lazy" images in an offscreen 1px frame never load; force them eager.
      if (img.loading === 'lazy') img.loading = 'eager';
      // Capped: a blocked or slow asset must never hang the measurement.
      if (!img.complete) waits.push(new Promise(function(done) { img.addEventListener('load', done); img.addEventListener('error', done); setTimeout(done, ASSET_WAIT_MS); }));
    });
    return Promise.all(waits);
  }
  function widest(cw) {
    var worst = null, max = cw;
    Array.prototype.forEach.call(document.body.querySelectorAll('*'), function(el) {
      var box = el.getBoundingClientRect();
      if (!box.width && !box.height) return;
      if (getComputedStyle(el).position === 'fixed') return;
      if (box.right > max + 0.5) { max = box.right; worst = el; }
    });
    if (!worst) return null;
    var cls = typeof worst.className === 'string' ? worst.className.split(/\\s+/)[0] : '';
    return { tag: worst.tagName.toLowerCase(), cls: cls, overflowPx: Math.round(max - cw) };
  }
  function triggers() {
    return Array.prototype.slice.call(document.querySelectorAll('[aria-expanded="false"], [role="tab"][aria-selected="false"]'), 0, MAX_TRIGGERS);
  }
  function run() {
    return assetsReady().then(settle).then(function(first) {
      var states = collected, allSettled = first.settled, offender = widest(first.r.cw), chain = Promise.resolve();
      states.push(first.r);
      triggers().forEach(function(trigger) {
        chain = chain.then(function() {
          try { trigger.click(); } catch (e) {}
          return assetsReady().then(settle).then(function(next) {
            states.push(next.r);
            allSettled = allSettled && next.settled;
            var w = widest(next.r.cw);
            if (w && (!offender || w.overflowPx > offender.overflowPx)) offender = w;
          });
        });
      });
      return chain.then(function() { return { states: states, settled: allSettled, offender: offender }; });
    });
  }
  function send(payload) {
    if (reported) return;
    reported = true;
    try { window.parent.postMessage({ type: ${JSON.stringify(MEASUREMENT_MESSAGE_TYPE)}, payload: payload }, '*'); } catch (e) {}
  }
  function start() {
    // Whatever happens, report before the host gives up: what was measured so far, flagged
    // unsettled (the host treats that as "unmeasured", never as a pass or a warning).
    setTimeout(function() { send({ states: collected, settled: false, offender: null }); }, DEADLINE_MS);
    run().then(send, function() { send(null); });
  }
  // Not \`load\`: a loading="lazy" image in an offscreen frame can keep it from ever firing in
  // some engines, and assets are waited for explicitly (with caps) above.
  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();</script>`;
}

function injectMeasurementScript(html) {
  const script = buildMeasurementScript();
  // No scrollbar: a 1px-tall frame would otherwise show one and shave ~15px off the width
  // the component is laid out at, which real phones (overlay scrollbars) don't do.
  // Also no transitions/animations: Chromium doesn't advance them in an offscreen, invisible
  // frame, so an opened accordion panel (a max-height transition) would stay collapsed and be
  // under-measured there while Firefox and WebKit measured it open.
  const style = '<style>html{overflow:hidden !important}*,*::before,*::after{transition:none !important;animation:none !important}</style>';
  const withStyle = html.includes('</head>') ? html.replace('</head>', `${style}</head>`) : `${style}${html}`;
  return withStyle.includes('</body>') ? withStyle.replace('</body>', `${script}</body>`) : `${withStyle}${script}`;
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

/** Worst case across every measured state. */
function summarize(payload) {
  const states = Array.isArray(payload?.states) ? payload.states : [];
  if (!states.length) return null;
  return {
    scrollHeight: Math.max(...states.map(s => s.h)),
    overflowPx: Math.max(0, ...states.map(s => s.sw - s.cw)),
    statesMeasured: states.length,
    settled: Boolean(payload.settled),
    offender: payload.offender || null
  };
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
      finish(summarize(event.data.payload));
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
 * Preflight or block export. A reading that never stabilised is also reported as `null`
 * (unmeasured) rather than guessed at, so a flaky reading can neither raise a false
 * warning nor hide a real one. Runs the desktop and mobile measurements in parallel (two
 * disposable iframes, not one resized+reflowed, for simplicity/reliability over a
 * ResizeObserver-based single-iframe approach).
 *
 * Collapsed accordions/disclosures/tabs are opened in turn and the worst case is reported,
 * so content (and media) that is hidden by default is included.
 *
 * @param {string} html - the fully compiled export HTML (js/preview.js#generateIframeContent)
 * @param {{ desktopWidth?: number, mobileWidth?: number, timeoutMs?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<{ desktopContentHeight: number|null, mobileOverflowPx: number|null, mobileOffender: {tag: string, cls: string, overflowPx: number}|null, statesMeasured: number } | null>}
 *   `null` overall only when there was nothing to measure (no html, no DOM). Otherwise each
 *   field is independently `null` only if that specific measurement failed/timed out.
 */
export async function measureRenderedDimensions(html, options = {}) {
  const { desktopWidth = 740, mobileWidth = 375, timeoutMs = 10000, signal } = options;
  if (typeof document === 'undefined' || !html) return null;
  // jsdom has no layout engine and never runs iframe scripts; waiting out the timeout would
  // only stall tests. Nothing was measured, which callers already treat as "unmeasured".
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '')) return null;
  if (signal?.aborted) return null;

  const [desktop, mobile] = await Promise.all([
    measureAtWidth(html, desktopWidth, timeoutMs, signal),
    measureAtWidth(html, mobileWidth, timeoutMs, signal)
  ]);

  return {
    desktopContentHeight: desktop && desktop.settled ? desktop.scrollHeight : null,
    mobileOverflowPx: mobile && mobile.settled ? mobile.overflowPx : null,
    mobileOffender: mobile && mobile.settled ? mobile.offender : null,
    statesMeasured: Math.max(desktop?.statesMeasured || 0, mobile?.statesMeasured || 0)
  };
}
