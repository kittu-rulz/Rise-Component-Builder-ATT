# Completion integration

This document is the authoritative spec for how "completion" works in an exported component: what actually happens internally, what (if anything) gets communicated to a host page, and — critically — what is **not** implemented or verified. It exists because the UI used to describe this feature as "eLearning Tracking (Rise Integration)," which implied a Rise-specific guarantee the code never actually provided. Nothing here should ever claim more than the adjacent code/tests demonstrate; if you change the behavior, update this file in the same change.

## Seven separated concepts

Completion is not one thing. Conflating these is exactly what the old naming did wrong.

| # | Concept | Owned by | Status |
| - | --- | --- | --- |
| 1 | **Internal interaction progress** — which items a learner has interacted with, and the resulting percentage | `js/export-shell.js` (`viewedItems`, `updateProgress()`) | **Implemented.** Runs entirely inside the exported component; no host involved. |
| 2 | **Internal component completion** — the one-time transition when progress reaches 100% | `js/export-shell.js` (`evaluateComponentCompletion()`) | **Implemented.** Purely internal state. Happens identically whether or not anything is embedding the component (see `tests/e2e/completion.spec.js` "standalone mode" and "unsupported parent integration"). |
| 3 | **Parent-window notification** — telling an embedding host page that the component completed | `js/completion.js` (`RiseComponentCompletion`) | **Implemented and tested**, scoped exactly to: sending one documented `postMessage` to `window.parent`, when embedded. This project has no way to know what, if anything, is listening on the other end. |
| 4 | **Rise lesson completion** — Rise's own course-player marking its lesson complete | Rise itself, not this project | **Not verified.** No public, documented Rise API for a "Code › Add code" block to mark its own lesson complete is known to this project. See `docs/RISE-COMPATIBILITY-MATRIX.md`. |
| 5 | **SCORM completion** — writing `cmi.core.lesson_status` (SCORM 1.2) or `cmi.completion_status` (SCORM 2004) via the SCORM runtime API | Not implemented | **Unsupported.** No SCORM API discovery/wrapper code exists anywhere in this project. The "SCORM 1.2 Package" option in Builder Settings' export-format list does not change export behavior today — see `docs/KNOWN-ISSUES.md`. |
| 6 | **LMS course completion** — an LMS marking an entire course/module complete based on this block | The LMS, not this project | **Unsupported / not verified.** Would require #4 or #5 to work first, plus LMS-specific configuration this project cannot control. |
| 7 | **xAPI statement generation** — emitting an xAPI (Tin Can) statement to a Learning Record Store | Not implemented | **Unsupported.** No xAPI library, LRS endpoint configuration, or statement-shape code exists. `connect-src 'none'` in the compiled document's CSP means an exported component could not make an LRS network call even if statement generation existed — an xAPI adapter would need to hand the statement to the host via `postMessage` instead (see "Extension points" below), not call an LRS directly. |

**Bottom line:** concepts 1–3 are real, tested, and scoped to this application. Concepts 4–7 depend entirely on a host this project cannot verify and does not implement — do not describe them as working.

## The adapter interface

`js/completion.js` generates the runtime script (emitted inline, inside the same top-level IIFE every exported document already uses — no global leakage, consistent with the rest of `js/export-shell.js`). It selects one of three adapters at runtime:

| Adapter | Selected when | Behavior |
| --- | --- | --- |
| `standalone` | `window.parent === window` (opened directly, not embedded) | Internal-only. There is no host to notify, so nothing is sent. |
| `parent-message` | Embedded (`window.parent !== window`) and `window.parent.postMessage` is a function | Sends the documented envelope (below) via `postMessage`. |
| `noop` | Embedded, but `postMessage` is unavailable | Does nothing. Defensive fallback for a host that has somehow removed `postMessage`; not expected in any real modern browser, but internal completion (concepts 1–2) still works normally either way. |

All three adapters implement the same shape: a `notifyComplete()` call site in `js/export-shell.js` that doesn't need to know or care which adapter is active.

### Extension points (not implemented — described so a future change has one obvious place to go)

- **A future xAPI adapter** would be a fourth branch in `js/completion.js`'s adapter selection, implementing the same call site (`notifyComplete()`) by handing an xAPI-shaped statement to the host via the *same* `postMessage` mechanism (e.g. a `type: 'xapi-statement'` envelope) — since the compiled document's CSP forbids any direct network call, an xAPI adapter cannot itself talk to an LRS; it can only hand the statement to whatever embeds it. This project ships no such adapter today; do not construct one without also adding the same "here's exactly what's tested" rigor this document holds itself to.
- **A future documented Rise adapter** would only make sense once a real, documented Rise mechanism for a Code-block to signal lesson completion is confirmed (`docs/RISE-TEST-CHECKLIST.md`) — until then, there is nothing Rise-specific to adapt to beyond the generic `parent-message` adapter already in place.

No stub/placeholder code for either exists in the generated output — an unfinished xAPI or Rise adapter would either do nothing (misleading — looks implemented, isn't) or throw (breaking exports). Documenting the extension point without shipping dead code was a deliberate choice.

## Required vs. optional completion

This is the existing "Require user to view all items to complete block" checkbox (Behavior tab), now labeled "Required: learner must view every item to complete this block":

- **Unchecked (optional / no tracking):** none of concepts 1–3 exist for this export. No progress bar renders, no `RiseComponentCompletion` object is defined, no `message` event listener is ever registered. Verified by `tests/unit/completion.test.js`'s "ships no completion adapter" case.
- **Checked (required):** concepts 1–3 are all active. Progress is tracked, the one-time completion transition can fire, and — only if the component turns out to be embedded — a notification is attempted.

## Message schema

### Outbound: `completion`

Sent once per completed state (see "Duplicate prevention" below):

```json
{
  "channel": "rise-component-builder",
  "schemaVersion": 1,
  "type": "completion",
  "componentId": "accordion",
  "componentVersion": "1.0.0",
  "instanceId": "rcb-<projectId or 'preview'>",
  "status": "completed",
  "timestamp": "2026-08-05T12:00:00.000Z"
}
```

`componentId`/`componentVersion` come from the same component registry entry that generated the markup (`js/component-registry.js`); `instanceId` is the same deterministic per-export id used for DOM id-scoping (`docs/EXPORT-CONTRACT.md`).

### Inbound: `reset`

The only inbound command currently supported:

```json
{ "channel": "rise-component-builder", "schemaVersion": 1, "type": "reset" }
```

An optional `instanceId` field targets one specific instance when multiple exports share a page; omitting it broadcasts the reset to every completion-tracked instance listening on that page. A `reset` message clears internal progress (`viewedItems`), resets the visible progress bar to 0%, and re-arms completion so a later full pass can fire a fresh `completion` message. It does **not** touch the component's own visual state (e.g. an accordion's open/closed items stay as they were) — resetting completion tracking and resetting UI state are different concerns.

## Target-origin / origin validation

- **Outbound:** posts to a configured origin if the author set one (Builder Settings → "Expected parent frame origin"), otherwise `'*'`.
- **Inbound:** requires messages to come from that same configured origin if set; otherwise accepts from any origin.
- **Why the default targetOrigin is `'*'`:** an exported component is designed to be pasted into a Rise course, an LMS, or opened standalone — its eventual host origin is genuinely unknowable at export time unless the author supplies it. The payload carries no sensitive or learner-identifying data (just a component id/version/instance id and a fixed status string), so there is nothing confidential to protect by restricting the origin, and no author-controlled content is echoed back. This is the "explicit documented reason" for `'*'` as a default, not an oversight — see `docs/SECURITY.md` "Rise/LMS message safety."
- **Malformed/unrecognized inbound messages are silently ignored** — wrong `channel`, wrong `schemaVersion`, an unrecognized `type`, non-object payloads, or (when configured) a mismatched origin. None of these throw or cause any state change. Covered by `tests/e2e/completion.spec.js` "malformed parent messages".

## Duplicate prevention

`RiseComponentCompletion` tracks a single `hasCompletedFlag`. `notifyComplete()` is a no-op if that flag is already set; nothing (repeated clicks, revisiting an already-viewed item, re-triggering `updateProgress()`) can cause a second `completion` message without an intervening `reset`. Verified by `tests/e2e/completion.spec.js` "completion firing once".

## Multi-instance pages

Two exports pasted onto the same host page each get their own `RiseComponentCompletion` instance, scoped inside their own compiled document's top-level IIFE — there is no shared/global state between them (`docs/EXPORT-CONTRACT.md` Requirement 5). Both instances' `message` listeners are real DOM listeners on the shared `window`, though, so a broadcast `reset` (no `instanceId`) reaches every completion-tracked instance on the page; a targeted one (with `instanceId`) reaches only the matching instance.

## What this document is not

- Not a guarantee that Rise, Moodle, any SCORM player, or any LRS does anything with the `completion` message — see `docs/RISE-COMPATIBILITY-MATRIX.md` for the compatibility tiers and `docs/RISE-TEST-CHECKLIST.md` / `docs/MOODLE-SCORM-TEST-CHECKLIST.md` for how to actually find out.
- Not a SCORM or xAPI implementation — see "Extension points" above.
- Not a promise that this schema is final — `schemaVersion` exists precisely so a future breaking change to the envelope shape can be introduced without silently breaking whatever a host built against version 1.

## Tests

- `tests/unit/completion.test.js` — compiled-output checks: adapter shipped/not-shipped per `trackCompletion`, component id/version/origin correctly embedded, no global leakage across two instances.
- `tests/e2e/completion.spec.js` — real-browser behavior: viewing all required items, revisiting an item, multiple-open behavior, completion firing once, resetting, required vs. optional, standalone mode, unsupported parent integration, malformed parent messages, and origin-mismatch rejection (both inbound and outbound).
