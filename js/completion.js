import { serializeForInlineScript } from './utilities.js';

// Completion adapter system for exported components. This module owns concepts #2
// (internal component completion) and #3 (parent-window notification) from
// docs/COMPLETION-INTEGRATION.md's separated model; js/export-shell.js's shared
// accessibility script owns concept #1 (internal interaction progress — viewedItems/
// updateProgress/the visible progress bar) and calls into the adapter this module
// generates whenever progress reaches 100%.
//
// Everything below is authored as a JS *text template* — like the rest of
// js/export-shell.js, it is emitted into the compiled export's single top-level IIFE
// (js/export-shell.js#renderShell), never executed by this application's own runtime.
// Generated in plain ES5-style syntax (var, function declarations) to match the rest of
// the exported script and avoid depending on a modern JS runtime in the host.

export const COMPLETION_CHANNEL = 'rise-component-builder';
export const COMPLETION_SCHEMA_VERSION = 1;

/**
 * Renders the completion adapter script. Only ever included when trackCompletion is
 * true (js/export-shell.js) — a component with completion tracking turned off ships no
 * messaging code and registers no 'message' listener at all, per the required-vs-optional
 * distinction in docs/COMPLETION-INTEGRATION.md.
 *
 * Adapter selection (concept #3 — parent-window notification):
 *   - "standalone": window.parent === window (opened directly, not embedded). Completion
 *     is tracked internally only; there is no host to notify.
 *   - "parent-message": embedded (window.parent !== window) and postMessage is available.
 *     Sends the documented envelope below to window.parent.
 *   - "noop": embedded, but postMessage is unavailable for some reason (defensive
 *     fallback for a restrictive host; not expected in any modern browser). Does nothing
 *     rather than throw.
 * There is no Rise-specific or xAPI adapter today — see docs/COMPLETION-INTEGRATION.md for
 * why, and for the exact extension point a future one would plug into (replace
 * `selectAdapterName`'s branches and `send()`'s dispatch; the envelope/validation code
 * below does not need to change).
 *
 * `allowedOrigin` (string or null/undefined): when set, this exact origin is required for
 * every inbound message AND is used verbatim as the outbound postMessage targetOrigin.
 * When unset, the adapter posts to '*' and accepts inbound messages from any origin — see
 * docs/COMPLETION-INTEGRATION.md "Why the default targetOrigin is '*'" for the documented
 * reasoning (no sensitive data in the payload; the embedding host's origin is unknowable
 * at export time unless the author supplies it).
 */
export function renderCompletionAdapterScript({ componentId, componentVersion, instanceId, allowedOrigin }) {
  const componentIdLiteral = serializeForInlineScript(componentId);
  const componentVersionLiteral = serializeForInlineScript(componentVersion || 'unknown');
  const instanceIdLiteral = serializeForInlineScript(instanceId);
  const allowedOriginLiteral = serializeForInlineScript(allowedOrigin || null);

  return `
    var RiseComponentCompletion = (function() {
      var CHANNEL = ${serializeForInlineScript(COMPLETION_CHANNEL)};
      var SCHEMA_VERSION = ${COMPLETION_SCHEMA_VERSION};
      var componentId = ${componentIdLiteral};
      var componentVersion = ${componentVersionLiteral};
      var instanceId = ${instanceIdLiteral};
      var allowedOrigin = ${allowedOriginLiteral};
      var hasCompletedFlag = false;

      function targetOrigin() { return allowedOrigin || '*'; }

      function buildEnvelope(type, extra) {
        var envelope = {
          channel: CHANNEL, schemaVersion: SCHEMA_VERSION, type: type,
          componentId: componentId, componentVersion: componentVersion, instanceId: instanceId,
          timestamp: new Date().toISOString()
        };
        if (extra) { for (var key in extra) { if (extra.hasOwnProperty(key)) envelope[key] = extra[key]; } }
        return envelope;
      }

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

      function send(envelope) {
        if (adapterName !== 'parent-message') return; // standalone/noop: nothing to send
        try { window.parent.postMessage(envelope, targetOrigin()); }
        catch (error) { /* a host that rejects the postMessage call should not break the component */ }
      }

      function notifyComplete() {
        if (hasCompletedFlag) return; // prevent duplicate completion events
        hasCompletedFlag = true;
        send(buildEnvelope('completion', { status: 'completed' }));
      }

      function hasCompleted() { return hasCompletedFlag; }

      function resetCompletionState() { hasCompletedFlag = false; }

      function isValidInboundMessage(data) {
        if (!data || typeof data !== 'object') return false;
        if (data.channel !== CHANNEL || data.schemaVersion !== SCHEMA_VERSION) return false;
        if (data.type !== 'reset') return false; // 'reset' is the only supported inbound command today
        if (data.instanceId && data.instanceId !== instanceId) return false; // targeted at a different instance
        return true;
      }

      window.addEventListener('message', function(event) {
        if (allowedOrigin && event.origin !== allowedOrigin) return; // origin check, when configured
        if (!isValidInboundMessage(event.data)) return; // silently ignore anything malformed/unrecognized
        resetCompletionState();
        if (typeof resetComponentProgress === 'function') resetComponentProgress();
      });

      return { notifyComplete: notifyComplete, hasCompleted: hasCompleted, reset: resetCompletionState, adapterName: adapterName };
    })();`;
}
