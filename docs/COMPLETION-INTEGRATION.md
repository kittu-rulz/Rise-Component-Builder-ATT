# Completion integration

This document is the authoritative spec for how "completion" works in an exported component: what actually happens internally, what (if anything) gets communicated to a host page, and — critically — what is **not** implemented or verified. It exists because the UI used to describe this feature as "eLearning Tracking (Rise Integration)," which implied a Rise-specific guarantee the code never actually provided. Nothing here should ever claim more than the adjacent code/tests demonstrate; if you change the behavior, update this file in the same change.

## Seven separated concepts

Completion is not one thing. Conflating these is exactly what the old naming did wrong.

| # | Concept | Owned by | Status |
| - | --- | --- | --- |
| 1 | **Internal interaction progress** — which items a learner has interacted with, and the resulting percentage | `js/export-shell.js` (`viewedItems`, `updateProgress()`) | **Implemented.** Runs entirely inside the exported component; no host involved. |
| 2 | **Internal component completion** — the one-time transition when progress reaches 100% | `js/export-shell.js` (`evaluateComponentCompletion()`) | **Implemented.** Purely internal state. Happens identically whether or not anything is embedding the component (see `tests/e2e/completion.spec.js` "standalone mode" and "unsupported parent integration"). |
| 3 | **Parent-window notification** — telling an embedding host page that the component completed | `js/completion.js` (`RiseComponentCompletion`) | **Implemented and tested**, scoped exactly to: sending `window.parent.postMessage({ type: 'complete' }, targetOrigin)` once, when embedded. This is Rise's own documented "Vibe Coding" completion contract, sent verbatim — see "Message contract" below. |
| 4 | **Rise lesson completion** — Rise's own course-player marking its lesson complete, unlocking a "Continue" block gated on this component | Rise itself, not this project | **Verified — format-dependent.** Confirmed working live (`docs/COMPATIBILITY-RESULTS.md`, 2026-08-12) when this component is exported using **Option B (HTML Block Fragment)** and Rise's own "Set completion requirements" toggle is enabled on that code block. **Confirmed broken** with **Option A (Iframe Snippet)** — see "Export-format caveat" below. See `docs/RISE-COMPATIBILITY-MATRIX.md`. |
| 5 | **SCORM completion** — writing `cmi.core.lesson_status` (SCORM 1.2) or `cmi.completion_status` (SCORM 2004) via the SCORM runtime API | Out of scope | **Out of scope for this project** (deliberate decision, `docs/RISE-COMPATIBILITY-MATRIX.md` "Scope", 2026-08-12), not a pending gap. No SCORM API discovery/wrapper code exists anywhere in this project, and none is planned — see `docs/KNOWN-ISSUES.md`. |
| 6 | **LMS course completion** — an LMS marking an entire course/module complete based on this block | The LMS, not this project | **Unsupported / not verified.** Would require #4 or #5 to work first, plus LMS-specific configuration this project cannot control. |
| 7 | **xAPI statement generation** — emitting an xAPI (Tin Can) statement to a Learning Record Store | Not implemented | **Unsupported.** No xAPI library, LRS endpoint configuration, or statement-shape code exists. `connect-src 'none'` in the compiled document's CSP means an exported component could not make an LRS network call even if statement generation existed — an xAPI adapter would need to hand the statement to the host via `postMessage` instead (see "Extension points" below), not call an LRS directly. |

**Bottom line:** concepts 1–3 are real, tested, and scoped to this application. Concepts 4–7 depend entirely on a host this project cannot verify and does not implement — do not describe them as working.

## The adapter interface

`js/completion.js` generates the runtime script (emitted inline, inside the same top-level IIFE every exported document already uses — no global leakage, consistent with the rest of `js/export-shell.js`). It selects one of three adapters at runtime:

| Adapter | Selected when | Behavior |
| --- | --- | --- |
| `standalone` | `window.parent === window` (opened directly, not embedded) | Internal-only. There is no host to notify, so nothing is sent. |
| `parent-message` | Embedded (`window.parent !== window`) and `window.parent.postMessage` is a function | Sends `{ type: 'complete' }` via `postMessage` (see "Message contract" below). |
| `noop` | Embedded, but `postMessage` is unavailable | Does nothing. Defensive fallback for a host that has somehow removed `postMessage`; not expected in any real modern browser, but internal completion (concepts 1–2) still works normally either way. |

All three adapters implement the same shape: a `notifyComplete()` call site in `js/export-shell.js` that doesn't need to know or care which adapter is active.

### Extension points (not implemented — described so a future change has one obvious place to go)

- **A future xAPI adapter** would be a fourth branch in `js/completion.js`'s adapter selection, implementing the same call site (`notifyComplete()`) by handing an xAPI-shaped statement to the host via the *same* `postMessage` mechanism — since the compiled document's CSP forbids any direct network call, an xAPI adapter cannot itself talk to an LRS; it can only hand the statement to whatever embeds it. This project ships no such adapter today; do not construct one without also adding the same "here's exactly what's tested" rigor this document holds itself to.

No stub/placeholder code for this exists in the generated output — an unfinished xAPI adapter would either do nothing (misleading — looks implemented, isn't) or throw (breaking exports). Documenting the extension point without shipping dead code was a deliberate choice.

## Required vs. optional completion

This is the existing "Require user to view all items to complete block" checkbox (Behavior tab), now labeled "Required: learner must view every item to complete this block":

- **Unchecked (optional / no tracking):** none of concepts 1–3 exist for this export. No progress bar renders, and no `RiseComponentCompletion` object is defined. Verified by `tests/unit/completion.test.js`'s "ships no completion adapter" case.
- **Checked (required):** concepts 1–3 are all active. Progress is tracked, the one-time completion transition can fire, and — only if the component turns out to be embedded — a notification is attempted.

## Message contract

Sent once per completed state (see "Duplicate prevention" below), and only that once — this is a one-way, fire-and-forget signal with no envelope, schema version, or reset protocol:

```js
window.parent.postMessage({ type: 'complete' }, targetOrigin);
```

This is Rise's own documented "Vibe Coding" completion contract (`window.parent.postMessage({ type: 'complete' }, '*')`), sent verbatim rather than a custom envelope, so that a Rise "Code › Add code" block listening for exactly this shape can recognize it. There is no host-initiated reset mechanism — Rise's own documented contract has none, so this project doesn't invent one either. Once a component completes, `hasCompletedFlag` (see "Duplicate prevention") keeps it from sending a second message for the lifetime of that page load.

## Target-origin

- Posts to a configured origin if the author set one (Builder Settings → "Expected parent frame origin"), otherwise `'*'` — matching Rise's own documented example verbatim.
- **Why the default targetOrigin is `'*'`:** an exported component is designed to be pasted into a Rise course or opened standalone — its eventual host origin is genuinely unknowable at export time unless the author supplies it. The payload carries no sensitive or learner-identifying data (just a fixed `{ type: 'complete' }` literal), so there is nothing confidential to protect by restricting the origin. This is the "explicit documented reason" for `'*'` as a default, not an oversight — see `docs/SECURITY.md` "Rise/LMS message safety."

## Export-format caveat: Iframe Snippet vs HTML Block Fragment

**This signal only reaches Rise's own Continue-block gating when the component is exported using Option B (HTML Block Fragment).** Using Option A (Iframe Snippet) instead, the internal progress bar correctly reaches 100%, but Rise's sidebar completion percentage and any Continue block gated on this code block never unlock. See `docs/COMPATIBILITY-RESULTS.md` for the test record.

Root cause: Rise's "Add code" block already renders whatever you paste inside its own sandboxed bridge (a cross-origin `sandbox.articulateusercontent.com` iframe Rise adds automatically — not something this project controls). Rise's completion detection expects the `postMessage` call to fire from *that* level. Option B pastes raw HTML/CSS/JS directly, so the script runs exactly where Rise's sandbox expects it. Option A additionally wraps the whole document in this project's *own* `<iframe srcdoc="...">`, adding a second level of nesting — the `postMessage` call then fires from one level too deep, and its `window.parent` targets the wrapper iframe rather than Rise's sandbox bridge, so the signal never reaches Rise.

This is a Rise-side architectural constraint, not a defect in this project's message contract (Rise's own documented `{ type: 'complete' }` shape is sent correctly either way) — it's purely about which DOM level the call originates from. `js/validation.js`'s `general-completion-iframe-format` rule (`docs/VALIDATION-RULES.md`) warns about this in the Preflight panel whenever completion tracking is on, and `js/compatibility.js`'s Iframe Snippet entry carries the same caveat in the Export modal.

## Duplicate prevention

`RiseComponentCompletion` tracks a single `hasCompletedFlag`. `notifyComplete()` is a no-op if that flag is already set; nothing (repeated clicks, revisiting an already-viewed item, re-triggering `updateProgress()`) can cause a second message. Verified by `tests/e2e/completion.spec.js` "completion firing once".

## Multi-instance pages

Two exports pasted onto the same host page each get their own `RiseComponentCompletion` instance, scoped inside their own compiled document's top-level IIFE — there is no shared/global state between them (`docs/EXPORT-CONTRACT.md` Requirement 5). Each fires its own independent `{ type: 'complete' }` message when it completes.

## What this document is not

- Not a guarantee that any LRS does anything with the `{ type: 'complete' }` message. Rise itself is now confirmed to act on it — but only via Option B (HTML Block Fragment); see "Export-format caveat" above and `docs/RISE-COMPATIBILITY-MATRIX.md` for the full compatibility tiers. Moodle/SCORM completion consumption is out of scope for this project (see "Scope" in the matrix).
- Not a SCORM or xAPI implementation, and neither is planned — see "Extension points" above.
- Not extensible via a custom envelope/schema version — this project deliberately sends exactly what Rise documents and nothing more, rather than wrapping it in project-specific metadata a Rise listener wouldn't recognize.

## Tests

- `tests/unit/completion.test.js` — compiled-output checks: adapter shipped/not-shipped per `trackCompletion`, configured origin correctly embedded, no global leakage across two instances.
- `tests/e2e/completion.spec.js` — real-browser behavior: viewing all required items, revisiting an item, multiple-open behavior, completion firing once, required vs. optional, standalone mode, unsupported parent integration, and configured-target-origin mismatch.
