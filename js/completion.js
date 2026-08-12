import { serializeForInlineScript } from './utilities.js';

// Completion adapter for exported components. This module owns concept #3 (parent-window
// notification) from docs/COMPLETION-INTEGRATION.md's separated model; js/export-shell.js's
// shared accessibility script owns concepts #1/#2 (internal interaction progress and the
// one-time percent-reaches-100 transition) and calls into the adapter this module generates
// whenever progress reaches 100%.
//
// The outbound message matches Rise's own documented "Vibe Coding" completion contract
// verbatim: window.parent.postMessage({ type: 'complete' }, '*') — see
// docs/COMPLETION-INTEGRATION.md. There is no custom envelope, schema version, or
// host-initiated reset protocol; this project sends exactly what Rise's own guidance shows
// and nothing more.
//
// Everything below is authored as a JS *text template* — like the rest of
// js/export-shell.js, it is emitted into the compiled export's single top-level IIFE
// (js/export-shell.js#renderShell), never executed by this application's own runtime.
// Generated in plain ES5-style syntax (var, function declarations) to match the rest of
// the exported script and avoid depending on a modern JS runtime in the host.

/**
 * Renders the completion adapter script. Only ever included when trackCompletion is
 * true (js/export-shell.js) — a component with completion tracking turned off ships no
 * messaging code at all, per the required-vs-optional distinction in
 * docs/COMPLETION-INTEGRATION.md.
 *
 * Adapter selection (concept #3 — parent-window notification):
 *   - "standalone": window.parent === window (opened directly, not embedded). Completion
 *     is tracked internally only; there is no host to notify.
 *   - "parent-message": embedded (window.parent !== window) and postMessage is available.
 *     Sends { type: 'complete' } to window.parent.
 *   - "noop": embedded, but postMessage is unavailable for some reason (defensive
 *     fallback for a restrictive host; not expected in any modern browser). Does nothing
 *     rather than throw.
 *
 * `allowedOrigin` (string or null/undefined): when set, this exact origin is used verbatim
 * as the outbound postMessage targetOrigin. When unset, the adapter posts to '*' — matching
 * Rise's own documented example — see docs/COMPLETION-INTEGRATION.md "Why the default
 * targetOrigin is '*'" for the documented reasoning (no sensitive data in the payload; the
 * embedding host's origin is unknowable at export time unless the author supplies it).
 */
export function renderCompletionAdapterScript({ allowedOrigin }) {
  const allowedOriginLiteral = serializeForInlineScript(allowedOrigin || null);

  return `
    var RiseComponentCompletion = (function() {
      var allowedOrigin = ${allowedOriginLiteral};
      var hasCompletedFlag = false;

      function targetOrigin() { return allowedOrigin || '*'; }

      function isEmbedded() {
        try { return Boolean(window.parent) && window.parent !== window; }
        catch (error) { return false; }
      }

      function selectAdapterName() {
        if (!isEmbedded()) return 'standalone';
        try { if (typeof window.parent.postMessage === 'function') return 'parent-message'; }
        catch (error) { /* accessing window.parent.postMessage itself threw — treat as unsupported */ }
        return 'noop';
      }

      var adapterName = selectAdapterName();

      function notifyComplete() {
        if (hasCompletedFlag) return; // prevent duplicate completion events
        hasCompletedFlag = true;
        if (adapterName !== 'parent-message') return; // standalone/noop: nothing to send
        try { window.parent.postMessage({ type: 'complete' }, targetOrigin()); }
        catch (error) { /* a host that rejects the postMessage call should not break the component */ }
      }

      function hasCompleted() { return hasCompletedFlag; }

      return { notifyComplete: notifyComplete, hasCompleted: hasCompleted, adapterName: adapterName };
    })();`;
}
