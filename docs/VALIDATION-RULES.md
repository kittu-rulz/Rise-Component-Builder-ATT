# Validation & export-preflight rules

This is the full catalog of the schema-driven, component-specific validation engine (`js/validation.js`). It exists to replace ad hoc, inconsistent checks with one auditable rule set that has a clear, honest contract: **only genuine blocking failures prevent export.** Everything else is advisory.

## Severities

| Severity | Meaning | Blocks export? |
| --- | --- | --- |
| **Blocking error** | The output would be broken, empty, or fundamentally unusable — no correct answer, an empty component, a headline with no accessible name, a position that renders off-frame. | **Yes** |
| **Warning** | A real, demonstrable defect the author should know about — missing alt text, an insecure URL, insufficient color contrast, an oversized file. | No |
| **Recommendation** | A quality/best-practice suggestion, not a defect — a missing (optional) hotspot background image, empty per-option feedback text. | No |

`summarizePreflight(issues)` computes `canExport = blocking.length === 0` — this is the *only* thing gating the Export modal's copy/download buttons (`setExportActionsEnabled()`, `app.js`).

## Where results appear

1. **Existing inline field errors/warnings** (`.field-error`/`.field-warning`, `js/editor.js`) — unchanged: required-field, format (URL/number/color), and accessibility (alt-text/transcript) messages continue to appear directly under their field as the author types, exactly as before this system existed. These reuse the same underlying checks the new engine also calls (`js/field-validation.js`), so there is one source of truth, not two competing ones.
2. **Item-card issue badges** — a small count badge (red for blocking, amber for warning/recommendation) on each item's collapsed-card header, live-updated on every edit via `schemaItemEditor.refreshIssueBadges()` — a targeted DOM patch, not a full re-render, so typing never loses focus or collapsed state.
3. **The consolidated Preflight panel** (`#modal-preflight`, opened via the "Preflight" button in the editor header) — every issue from every rule, grouped by severity, each with a "Go to field" button that closes the panel and scrolls/focuses the exact field.
4. **The Export modal** — runs the same full check (including the one async rule) every time it opens, shows the same grouped results above the compatibility report, and disables Copy/Download when blocking issues exist.

## Architecture

- `collectSyncIssues(context)` — every rule except one, pure and synchronous. Safe to call on every keystroke (badges, the editor header's live badge) and is the bulk of the consolidated panel.
- `runPreflight(context)` — `collectSyncIssues` plus `checkBrokenMediaReferences` (the one rule needing an IndexedDB read). Used by the Preflight panel and the Export modal, where an async round-trip is acceptable.
- Reuses rather than re-implements: `validateSchemaField`/`getAccessibilityWarning` (`js/field-validation.js`, extracted from `js/editor.js` specifically so neither module has to import the other), `validateMediaAccessibility` (`js/media.js`), `resolveThemeTokens` + `contrastRatio` (`js/themes.js`).
- **Fails open.** If the preflight check itself throws (a bug in this engine), the Export modal logs it inline but does not disable export — a broken validator must never become a way to brick a working export.

## General rules

| Rule ID | Severity | Trigger |
| --- | --- | --- |
| `general-required-field` | Blocking | A schema field marked `required` is empty, or a `requiredOne` cross-item field (e.g. multiple-choice's radio-group "correct answer") has no item satisfying it. Reported once per collection for `requiredOne`, not once per item. |
| `general-empty-component` | Blocking | Fewer items exist than the component's schema `minItems`. |
| `general-excessive-length` | Warning (short fields) / Recommendation (long-form fields) | A `text`/`select` field with no explicit `maxLength` exceeds 200 characters (Warning); a `textarea`/`richtext` field exceeds 4000 characters (Recommendation). Fields **with** an explicit `maxLength` are already hard-capped by `general-required-field`'s reuse of `validateSchemaField` — this rule only covers the *un-capped* fields. |
| `general-unsupported-rich-html` | Warning | A `richtext` field's value differs from `sanitizeRichText(value)` — proof that something outside the supported tag allowlist was escaped or altered on save. |
| `general-invalid-url` | Blocking | A `url`-type field's value isn't a valid `http(s)` URL (checked via `sanitizeURL`, the same sanitizer the export pipeline itself uses). |
| `general-missing-accessible-name` | Blocking | `config.blockHeadline` is empty. This field is the `aria-labelledby` target for the whole exported document's `<main>` region (`js/export-shell.js`) — previously **unvalidated anywhere**, since it's a static top-level field outside the dynamic schema-item system. |
| `general-missing-alt-text` | Warning | Delegates entirely to `validateMediaAccessibility` (`js/media.js`) — missing alt text or a missing decorative flag on any image field, missing transcript on audio, missing captions/transcript on video. |
| `general-insufficient-contrast` | Warning | Checks the color pairs this specific component actually renders (body text/card background, muted text/card background, button text/primary), using the fully resolved theme + per-component-override colors, against the WCAG AA 4.5:1 minimum for normal text. |
| `general-duplicate-items` | Warning | Two items share the same normalized primary field (`title`/`label`) *and* the same `content` — see "Duplicate IDs", below, for why this is the rule's actual scope. |
| `general-invalid-completion-config` | Blocking / Warning / Recommendation | Blocking: completion required with zero items (can never complete). Warning: completion required with an empty completion message. Recommendation: completion required with no configured parent origin (see `docs/COMPLETION-INTEGRATION.md`). |
| `general-unsupported-export-feature` | Warning | Builder Settings' default export format is set to "ZIP" or "SCORM 1.2", neither of which is actually implemented (`docs/KNOWN-ISSUES.md`) — only a single HTML file genuinely downloads. |

### "Duplicate IDs", precisely scoped

The task that produced this system asked for a "duplicate IDs" check. There is no author-facing "ID" field anywhere in this application's schemas — every DOM id in an export is deterministically instance-scoped and already structurally guaranteed unique (`docs/EXPORT-CONTRACT.md`, proven by `tests/unit/export-determinism.test.js`). Rather than invent a fictitious ID field to validate, `general-duplicate-items` covers the closest real, useful concern: two items in the same component that are near-verbatim duplicates of each other's content — a genuine authoring mistake (e.g. an item duplicated and never edited), just not literally an "ID."

## Knowledge-check rules

Scoped to `multiple-choice` and `multiple-select` — the two components with an item-level `correct` boolean. `sorting-activity` and `fill-blank` are also in the "knowledge" catalog category but have a structurally different correctness model (a category match / a typed answer) and are covered by the General rules plus their own `component.validate()`.

| Rule ID | Severity | Trigger |
| --- | --- | --- |
| `knowledge-no-correct-answer` | Blocking | Zero items have `correct: true`. |
| `knowledge-impossible-passing` | Blocking | Same underlying condition as above (zero correct, ≥2 items) — a second, consequence-framed message: no possible learner selection can ever satisfy the quiz's pass condition. Deliberately fires alongside `knowledge-no-correct-answer` rather than replacing it — one explains the omission, the other explains the effect. |
| `knowledge-multiple-correct-single-allowed` | Blocking | `multiple-choice` only: more than one item has `correct: true`, contradicting its single-answer (radio-group) design. The editor UI itself prevents this through normal use (selecting one correct answer un-selects the others), so this mainly catches a hand-edited or imported project. |
| `knowledge-duplicate-options` | Warning | Two items share the same normalized `label` text. |
| `knowledge-empty-feedback` | Recommendation | An item's `content` (the "Answer Feedback" field) is empty — the learner sees no explanation when choosing it. |

## Media rules

Schema-driven: scans every field of type `image`, `audio`, or `video` across **every** component's schema (not a hardcoded per-component list) — a custom icon on Flip Cards gets the same scrutiny as an Audio Player's source file.

| Rule ID | Severity | Trigger |
| --- | --- | --- |
| `media-unsupported-file-type` | Blocking | An uploaded media reference's `mimeType` isn't in the supported allowlist for its kind (defensive — normal uploads are already validated at upload time by `js/media.js`; this catches an imported/hand-edited project). |
| `media-oversized-file` | Warning | An uploaded reference's `size` exceeds the configured per-kind limit (Builder Settings, `js/media.js#resolveMediaLimits`). |
| `media-external-asset-dependency` | Recommendation | The field holds a plain external URL rather than an uploaded reference — it will need network access after export and won't travel with the file. |
| `media-insecure-http-url` | Warning | That external URL uses `http://` rather than `https://` — a browser may block it as mixed content on an https page. |
| `media-broken-reference` | Blocking (required field) / Warning (optional field) | The referenced upload no longer exists in local (IndexedDB) storage — the same condition the export pipeline already detects (`prepareMediaExport`, `docs/KNOWN-ISSUES.md`), now surfaced *before* export too. The only rule requiring an async I/O read. |

## Hotspot rules

Scoped to the `hotspots` component.

| Rule ID | Severity | Trigger |
| --- | --- | --- |
| `hotspot-missing-image` | Recommendation | No background image is set. Not a defect — a generic schematic placeholder renders instead — hence Recommendation, not Warning. |
| `hotspot-out-of-range-position` | Blocking | An item's `x`/`y` is non-numeric or outside 0–100 — would render off-frame or with broken CSS. The editor's own range-slider UI cannot produce this; it defends against a corrupted or hand-edited import. |
| `hotspot-overlapping` | Warning | Two hotspots are within 3 percentage points of each other on both axes — likely to visually overlap and be hard to click independently. |
| `hotspot-keyboard-accessibility` | Warning | Two hotspots share the same label — see below for why this is the rule's scope. |

### "Keyboard-accessibility issue", precisely scoped

Hotspot keyboard behavior itself (Escape to close, native `<button>` Enter/Space activation, focus management) is baked unconditionally into the component's generator (`components/hotspots.js`) — it is identical for every export and not something an individual authoring decision can break. The genuine, author-controllable keyboard/screen-reader accessibility risk is **ambiguous naming**: a keyboard or screen-reader user tabbing between hotspot pins hears/reads each one's label as its only way to tell them apart (there's no visual position cue available non-visually). Two pins sharing the same label make that impossible. That is what this rule checks — distinct from `hotspot-overlapping`, which is about visual/spatial proximity, not naming.

## Testing

- `tests/unit/validation.test.js` — one or more tests per rule ID, both a triggering case and (for the less obvious rules) a non-triggering case, plus a sanity sweep asserting every component's *default* configuration produces zero blocking issues.
- `tests/unit/completion.test.js` covers `general-invalid-completion-config`'s interaction with the completion adapter system (`docs/COMPLETION-INTEGRATION.md`) at the compiled-output level.

## Non-goals

- This is not a full accessibility audit. It catches specific, demonstrable defects (missing alt text, insufficient contrast, ambiguous hotspot labels) — it does not replace manual assistive-technology testing (`docs/KNOWN-ISSUES.md` "Accessibility gaps").
- It does not validate against Rise, Moodle, or SCORM-specific constraints — that's `docs/RISE-COMPATIBILITY-MATRIX.md`'s job, a separate concern from "is this component's own content well-formed."
- The excessive-length, duplicate-item, and contrast thresholds are pragmatic heuristics, not derived from a formal spec — they are documented here precisely so they can be tuned in one place if they prove too strict or too lax in practice.
