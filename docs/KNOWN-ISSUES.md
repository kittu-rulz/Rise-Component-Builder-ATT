# Known issues

Only confirmed or directly observable implementation limitations are listed here. This supersedes the root-level `KNOWN-ISSUES.md`, which is now a pointer to this file. See `docs/PRODUCTION-READINESS-AUDIT.md` for the full point-in-time audit this file is kept consistent with.

## Placeholders

- AI Scenario Generator and AI Quiz Generator use a local timer and hardcoded example output. They do not call an AI service.
- **Resolved**: ZIP export is now real — "Rise Project ZIP" (component + its media, `js/export.js#buildRiseProjectZip`) and "Project package" (a re-importable Builder project + its media, `js/project-package.js`) both produce genuine, deterministic ZIP archives (`js/zip.js`). See `docs/MEDIA-ASSET-PIPELINE.md` and `docs/EXPORT-CONTRACT.md`. **SCORM packaging remains entirely unimplemented** — no `imsmanifest.xml`, no SCORM API wrapper.
- The export modal contains initial example code in the HTML source, although `app.js` replaces it with generated output when the modal opens.

## Coupling and duplication (the primary architecture debt) — resolved

**Previously:** only 6 of 22 catalog entries were registered components; the rest shared one large, unconditionally-concatenated `js/preview.js` template, so exporting one component (e.g. Accordion) shipped every other component's CSS/JS too, and default sample data was selected through a long conditional in `app.js`.

**Now:** all 22 catalog components are real modules in `components/*.js` implementing the full `generateHTML`/`generateCSS`/`generateJS`/`validate` contract. `js/preview.js` is a thin orchestrator that only ever calls the active component's own module; `js/export-shell.js` owns the shared shell/tokens/accessibility layer every component composes with. `tests/unit/export-isolation.test.js` structurally proves each component's compiled output contains only its own markers and none of the other 21's. See `docs/EXPORT-CONTRACT.md` for the full pipeline.

Remaining, smaller items in this area:
- Theme tokens centralize common colors, typography, radius, shadow, density, and motion values, but not every component-specific spacing or decorative value has been tokenized.
- `index.html` element IDs and `styles.css` class names are coupled to selectors in `app.js` and `js/editor.js` with no enforced boundary — a refactor risk, not a bug.
- Every item card's `<section>` is a native HTML5 drag source so cards can be reordered by dragging, but `dragstart`'s `event.target` is always that section, never the descendant a gesture began on. Native dragging is restricted to the `.drag-handle` button (via a separately tracked `mousedown` origin) so range sliders, text inputs, and other interactive controls inside a card are not hijacked mid-drag. See `docs/ARCHITECTURE.md` §3.
- The HTML-fragment export format (pasting raw markup into a host page) has no automatic CSS class-name scoping — see "CSS isolation, by format" in `docs/EXPORT-CONTRACT.md` for the documented, deliberate trade-off.
- **Resolved**: ZIP/archive packaging now exists for components whose media couldn't be inlined — see "Placeholders" above.

## Persistence and validation

- Projects, drafts, favorites, settings, custom themes, the default component theme, and UI mode are persisted in localStorage only. There is no server synchronization or multi-user support.
- Project schema version 2 validates theme snapshots and overrides and migrates version-1 projects, but it has no component-specific migration or deep schema validation.
- Renaming and creating custom themes, and confirming project/theme deletion, use in-app modal dialogs (`#modal-prompt`, `#modal-confirm`) rather than the browser's native `prompt`/`confirm`; results and errors use reusable toasts.
- Inline editor errors are rendered, and preview updates continue live regardless; clicking Save re-validates all required schema fields, `minItems`, and every component's `validate()` contract (all 22 components now implement one — `docs/ARCHITECTURE.md` §1), blocking saving with a toast naming the first failing field until it is fixed.
- Importing a project creates a new project identity, but external resources referenced by its URLs are not copied or verified.
- A schema-driven, severity-tiered preflight validation engine (`js/validation.js`, `docs/VALIDATION-RULES.md`) now covers general content, knowledge-check, media, and hotspot rules beyond the original required-field/minItems checks, surfaced inline, via item-card badges, a consolidated Preflight panel, and the Export modal. Only Blocking-severity issues prevent export. Item-card badges and the editor header's summary badge update live on every edit (via a targeted DOM patch, not a full re-render); the consolidated panel and the Export modal additionally run the one async rule (broken media references).

## Media limitations

- Uploaded Blobs are durable only in the current browser profile. Project JSON contains references and metadata, not the media files themselves.
- Importing a media-bearing project JSON on another browser reports missing local records; media must be supplied separately by future package support.
- Removing or replacing media revokes unused runtime object URLs, but orphaned IndexedDB records are not yet garbage-collected automatically because saved projects may still reference them.
- Duration metadata depends on the browser successfully reading audio/video metadata.
- SVG sanitization intentionally rejects the complete file when it contains unsafe elements, handlers, script URLs, embedded HTML, or external references; it does not attempt a lossy repair.
- Custom item artwork is currently available for Flip Cards, Information Grid, and Audio Player. Functional interaction symbols — including accordion state indicators, quiz controls, and play/pause buttons — remain fixed to protect recognizable controls and their accessibility behavior.

## Export limitations

See `docs/EXPORT-CONTRACT.md` for the full specification; the confirmed gaps are:

- Self-contained `srcdoc` output depends on browser support and the permissions in the iframe sandbox.
- HTML fragment export assumes the target accepts inline styles and scripts.
- External media requires network access after export; Google Fonts does too, but degrades gracefully to a system sans-serif font when unreachable (confirmed by `tests/e2e/exported-fixtures.spec.js`) rather than breaking.
- Small raster images can be embedded in standalone HTML. SVG, large images, audio, video, and captions are converted to asset-relative paths and block the single-file download with a warning.
- **Resolved**: the Rise Project ZIP export now produces a real, downloadable archive (`index.html` + `assets/` + `assets/manifest.json`) — see `docs/MEDIA-ASSET-PIPELINE.md`. SCORM 1.2/2004 packaging still does not exist at all.
- Full Rise/Moodle/SCORM compatibility classification, an in-app compatibility report, and manual test checklists are now tracked in `docs/RISE-COMPATIBILITY-MATRIX.md`, `docs/RISE-TEST-CHECKLIST.md`, `docs/MOODLE-SCORM-TEST-CHECKLIST.md`, and `docs/COMPATIBILITY-RESULTS.md` — see those for exactly what is Confirmed vs. Experimental vs. Fallback vs. Unsupported, and why.
- Completion is a `postMessage` signal only (`docs/COMPLETION-INTEGRATION.md`), sent when a completion-tracked component is embedded. Rise lesson completion, SCORM completion (1.2/2004), LMS course completion, and xAPI statement generation are all **unsupported** — no code exists for any of them, and whether any host actually consumes the completion message is not verified.

## Accessibility gaps

- Generated component output includes WCAG-oriented semantics and keyboard handling, but conformance still requires manual assistive-technology testing with authored content.
- Alternative text/decorative choices and audio/video alternatives use visible, non-blocking warnings. Conditional field hiding is not implemented.
- Theme contrast checks cover the configured token pairs at authoring time, but they cannot guarantee contrast for arbitrary uploaded imagery, rich text, browser states, or all component-specific combinations.
- Dedicated Playwright axe/keyboard-interaction assertions (`tests/e2e/accessibility.spec.js`) only exercise a handful of components (Accordion, Tabs, Grid Photo Gallery) and stable builder-shell regions directly; the remaining components rely on the unit-level structural/ARIA-markup and hostile-input coverage in `tests/unit/generators.test.js`, which now runs identically against all 22 (`docs/ARCHITECTURE.md` §7), but do not each have a dedicated e2e axe scan.
- `tests/e2e/exported-fixtures.spec.js` adds standalone (non-builder-embedded) keyboard-operability coverage for 7 components — Accordion, Flip Cards, Tabs, Multiple Choice, Hotspots, Vertical Timeline, Audio Player — closing the pre-existing gap where Hotspots and Audio/Video had no dedicated e2e keyboard test at all (`tests/e2e/interactions.spec.js` covers the other 5 of these 7). The remaining 15 components still rely only on the unit-level coverage above for keyboard behavior.

## Security and escaping

See `docs/SECURITY.md` for the full sanitization contract and threat model; the confirmed residual risk points are:

- Author content passes through context-specific sanitizers before generated output, and automated hostile-input tests are present.
- The generated document necessarily permits inline style and script through its Content Security Policy.
- The preview iframe combines `allow-scripts` and `allow-same-origin`; this is needed by current rendering behavior but weakens sandbox isolation if unsafe markup were introduced later.
- `openPreview()` uses `document.write()` with the generated sanitized document. Any future generator bypassing shared sanitization would expand risk.
- File extension, MIME type, and basic file signatures are validated. Signature checks reduce accidental/spoofed mismatches but are not a substitute for server-side malware scanning.
- **New in this phase:** `npm audit` reports a high-severity advisory in `brace-expansion`, a transitive dependency of ESLint 9's own dependency chain (`minimatch`/`@eslint/config-array`). It affects lint tooling only (`npm audit --omit=dev` reports 0 vulnerabilities in production dependencies) and is not exploitable via any application input. Resolving it requires ESLint 10 (a breaking change to the new lint config) — deferred, see below.

## Large-file handling

- Per-type media upload size limits (image, audio, video, SVG) are configurable in Builder Settings and persisted in `settings.mediaLimitsMb`; each is clamped to a safe range (e.g. image 1-50 MB, video 1-500 MB) and invalid values silently fall back to the built-in default rather than rejecting the save. The captions (WebVTT) limit is fixed at 2 MB and is not configurable, since caption files are always small text.
- IndexedDB writes and browser metadata parsing still require the browser to hold selected file data temporarily; files near the configured video limit (100 MB by default) can cause memory pressure on constrained devices.
- The sidebar storage meter uses `navigator.storage.estimate()`, which reports the browser's whole-origin quota usage (localStorage plus IndexedDB) rather than an exact application-level breakdown; it also falls back to "Usage unavailable" in browsers without the Storage API.

## Test coverage limitations

- Chromium, Firefox, and desktop WebKit are automated Playwright projects. Mobile Safari behavior and real touch/assistive-technology combinations are not automated.
- **Firefox e2e: 12 tests fail in this audit/development sandbox** with `page.goto` / page-setup timeouts (30s) — never reaching an application assertion. Chromium and WebKit pass fully. This looks like sandbox launch-latency rather than an application defect, but is **unconfirmed against an unrestricted environment (e.g. the project's actual GitHub Actions runner)** as of this phase. Re-verify there before treating Firefox support as either broken or fine. See `docs/TESTING-STRATEGY.md`.
- One test (`flip-card custom artwork uploads per face and removal restores the built-in icon`) is skipped on WebKit: Playwright's bundled WebKit build on Windows cannot store a `Blob` in IndexedDB at all in this environment (reproduced with zero application code — a bare `indexedDB.open(...).put({ blob })` fails with `"Error preparing Blob/File data to be stored in object store"`). This is a Playwright/WebKit-on-Windows test-environment limitation, not an app defect; real Safari is unaffected.
- Firefox and WebKit don't support Playwright's `clipboard-read`/`clipboard-write` permission grants (a Chromium-only CDP permission). The export copy-to-clipboard test verifies the visible success state (button text/class, toast) on all three engines, but only reads back the actual clipboard contents on Chromium.
- Automated E2E tests use a local static server, not Articulate Rise, Moodle, an LMS, or a production CSP/hosting configuration. Testing inside those specific hosts is manual-only by necessity — see `docs/RISE-TEST-CHECKLIST.md` and `docs/MOODLE-SCORM-TEST-CHECKLIST.md` — and no such manual run has been logged yet (`docs/COMPATIBILITY-RESULTS.md`).
- Unit coverage gates apply to state, persistence, themes, utilities, and the component generators (`components/*.js`, all 22). The orchestrator (`js/preview.js`) and shared shell (`js/export-shell.js`) are exercised through the isolation/determinism unit tests and integration/browser tests rather than included in the coverage-gated file list.
- No pixel-diff snapshots are maintained; visual regressions still require design review at representative viewport sizes.

## Tooling gaps (resolved in this phase, tracked here for history)

As of the production-readiness audit, this project had **no lint, formatting, type-checking, or production-build tooling** — only test commands. This phase (see `docs/ARCHITECTURE.md` "Build", `docs/TESTING-STRATEGY.md` "Commands") adds ESLint, Prettier, incremental JSDoc-based type checking, a static-site `build.mjs`, and a composite `npm run validate` gate. What remains deferred:

- `app.js` is excluded from type checking (`// @ts-nocheck`) — its ~1,500 lines of `document.getElementById(...)` DOM wiring produce roughly 80 type errors that are all the same shape (missing element-type narrowing) rather than real defects. Resolving this properly means adding a JSDoc cast at each of the ~40 element references, deferred as disproportionate to this phase's scope. `js/preview.js` type-checks cleanly already and needed no opt-out.
- `npm run test:e2e` is intentionally not part of `npm run validate` (too slow, currently has the Firefox flake above) — it remains a separate CI step and a pre-release manual gate.
- The ESLint dev-dependency chain carries the `brace-expansion` advisory noted above; upgrading to ESLint 10 to resolve it is deferred as a breaking-change decision for a future phase.
- `npm run format:check` currently fails against most pre-existing files (Prettier was configured to match the existing style as closely as possible, but was deliberately not run repo-wide this phase to avoid a large cosmetic diff alongside architectural changes). A dedicated, standalone "apply repo-wide formatting" commit is recommended as a near-term follow-up so it can be reviewed on its own.
