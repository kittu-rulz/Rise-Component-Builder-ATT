# Production Readiness Audit — Rise Component Builder v2

Audit date: 2026-07-31
Audited commit: `3c005a5` (branch `main`, clean working tree)
Auditor: automated technical audit (no production code changed)

This document is a point-in-time technical audit. It cross-checks the project's own documentation (`ARCHITECTURE.md`, `PROJECT.md`, `COMPONENT-SCHEMA.md`, `KNOWN-ISSUES.md`, `TESTING.md`) against the current source and live command output, and adds a release-readiness judgment on top. Findings are labeled **Confirmed** (directly observed in source, test output, or command results) or **Assumption** (inferred, not directly verified in this pass).

---

## 0. Method

Inspected: `app.js`, `index.html`, `styles.css`, every file in `js/`, every file in `components/`, `tests/` (unit, e2e, fixtures), `package.json`, `vitest.config.js`, `playwright.config.js`, `.github/workflows/tests.yml`, and all root Markdown docs. No `AGENTS.md` or `CLAUDE.md` exists in the repo. No `docs/` directory existed prior to this audit. A stray root file named `Readme` (no extension) contains only the single word "Readme" — not the real README (`PROJECT.md`/`ARCHITECTURE.md` serve that role); this looks like an accidental leftover file.

Commands executed (exact, from repo root):

| Command                                                         | Result                                                                                                                                                             | Notes                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `npm run test:unit` (`vitest run`)                              | **Pass** — 8 files, 139 tests, 0 failures, 18.81s                                                                                                                  | Confirmed                                |
| `npm run test:coverage` (`vitest run --coverage`)               | **Pass** — 139 tests, 0 failures. Coverage: 86.2% stmts / 73.12% branch / 94.92% funcs / 96.08% lines (all ≥ configured thresholds of 70/60/70/70)                 | Confirmed                                |
| `npm run test:e2e` (`playwright test`, Chromium+Firefox+WebKit) | **116 passed, 12 failed, 1 skipped** (9.8 min)                                                                                                                     | All 12 failures are Firefox-only; see §9 |
| Lint                                                            | **No lint command exists.** `package.json` defines no `lint` script, and no ESLint/Prettier config file is present anywhere in the repo.                           | Confirmed absence                        |
| Build                                                           | **No build step exists.** This is a vanilla ES-module app with no bundler; `npm run dev` just serves the raw files via `http-server`. There is nothing to "build." | Confirmed — by design, not an oversight  |

All 12 e2e failures are `[firefox]` projects failing with `Test timeout of 30000ms exceeded` on `page.goto('/')` or during Playwright's page setup, i.e. Firefox never finished loading `http://127.0.0.1:4173/` inside this sandboxed shell within 30s. Chromium and WebKit ran their full suites with 0 failures. This matches the pattern the project's own `KNOWN-ISSUES.md`/`ARCHITECTURE.md` describe for browser-specific automation limitations in constrained environments (WebKit-on-Windows IndexedDB Blob limitation is the documented example; the Firefox timeout observed here is a new, previously undocumented instance of the same class of problem — environment/sandbox launch latency, not a reproduced application defect). **This should be re-run in an unrestricted environment (e.g. the project's own GitHub Actions runner) before being treated as either "fine" or "a real bug."** Flagged as Confirmed-observation / Assumption-about-cause.

---

## 1. Current architecture

**Confirmed**, from direct inspection (consistent with `ARCHITECTURE.md`):

- Framework-free: vanilla HTML5, CSS, and native ES modules. No bundler, no backend, no database. `npm` is used only for pinned dev/test tooling (`http-server`, `vitest`, `playwright`, `jsdom`, `@axe-core/playwright`).
- Single mutable state object (`js/state.js` → `appState`), no reactive store. `app.js` (1,509 lines) is the central orchestrator: it wires DOM events, mutates `appState`, and explicitly calls render/preview/persistence functions after each mutation.
- Component catalog (`js/catalog.js`, 193 lines) holds static metadata (id, title, description, category, icon) for 21 catalog entries and attaches each entry's schema from `js/editor-schemas.js` (171 lines).
- Only **6 of 21** components are modularized under `components/*.js` (accordion, tabs, flip-cards, vertical-timeline, multiple-choice, multiple-select), each exporting `id/name/category/defaultConfig/editorSchema/generateHTML/generateCSS/generateJS/validate`. The remaining ~15 components (hotspots, button-list, menu-list, sorting-activity, fill-blank, horizontal-timeline, process-flow, scenario, profile-cards, info-grid, pricing-comparison, audio-player, video-frame, image-gallery, ai-generator, ai-quiz-maker) are implemented as large conditional branches inside `js/preview.js` (3,127 lines — by far the largest file in the codebase) and do not expose an independent `validate()` contract.
- Theme system (`js/themes.js`, 276 lines) is a single source of truth for 7 built-in presets, schema validation, per-component override resolution, and WCAG contrast checking.
- Editor rendering (`js/editor.js`, 378 lines) is schema-driven from `js/editor-schemas.js`; drag-reorder is implemented via a manually toggled `draggable` attribute scoped to a `.drag-handle` (a documented, deliberate fix for a native-drag/interactive-control conflict — see `ARCHITECTURE.md` §"Editor rendering flow").
- Preview generation (`js/preview.js`) produces one complete, sandboxed HTML document (inline `<style>` + inline `<script>`) written into an iframe via `.srcdoc`; the same compiler backs the live preview, the popout preview window (`document.write`), and both export formats.
- Export (`js/export.js`, 104 lines) builds an iframe `srcdoc` snippet, an HTML fragment, and standalone HTML/JSON downloads; it also computes a media asset manifest but does not package it.
- Persistence (`js/storage.js`, 330 lines) is versioned localStorage (`schemaVersion: 2`, migrates v0/v1), with full project/theme/settings/favorites/draft validation on every read.
- Media (`js/media.js` 237 lines + `js/media-storage.js` 139 lines + `js/media-upload.js` 207 lines) is IndexedDB-backed Blob storage with extension/MIME/signature validation and SVG text sanitization; only a JSON-safe reference (id + metadata) lives in project config.
- Utilities (`js/utilities.js`, 265 lines) centralizes all HTML/attribute/URL/rich-text/inline-script escaping and CSS value sanitization used by the preview compiler.

## 2. Working features

**Confirmed by passing automated tests plus source inspection** (a large superset also self-reported in `PROJECT.md`, verified here rather than merely trusted):

- Component catalog: search, category filter, favorites (persisted).
- Schema-driven item editor: add/duplicate/delete/move/drag-reorder/collapse, inline field validation, per-schema `minItems`/`required`/`requiredOne`.
- Styling controls: colors, radius, shadow, borders, icon style, font, applied through the resolved theme-token pipeline.
- Theme manager: 7 built-in presets, custom theme CRUD, import/export, default-theme selection, live thumbnails, WCAG AA contrast reporting (advisory only, never auto-applied).
- Live preview: sandboxed `srcdoc` iframe, regenerated on every state change.
- Keyboard/screen-reader behavior for the 6 modular components (validated by `tests/accessibility.test.mjs`, `tests/e2e/accessibility.spec.js`, and axe-core scans).
- Light/dark builder-shell theme, independent from the exported-component theme.
- Project lifecycle: New/Save/Save As/Open/Rename/Duplicate/Delete, JSON import/export, autosave + draft restore, all schema-validated on read.
- Toast notifications, modal-based prompt/confirm dialogs (replacing native `prompt`/`confirm`).
- Sanitization pipeline: HTML/attribute/URL/rich-text/CSS/inline-script escaping exercised by `tests/security.test.mjs`.
- Media uploads: browse/drag-drop, preview, replace/remove, external-URL fallback, extension+MIME+file-signature validation, SVG sanitization, per-type configurable size limits (Builder Settings), IndexedDB persistence and object-URL lifecycle (create on demand, revoke on removal/unload).
- Responsive live preview and responsive builder shell (tested at 1440×900, 1024×768, 768×1024, 375×812 per `TESTING.md`, confirmed present in `tests/e2e/application.spec.js`).

## 3. Incomplete or simulated features

**Confirmed:**

- **AI Scenario Generator / AI Quiz Generator** (`ai-generator`, `ai-quiz-maker`) are local `setTimeout`-based simulations with hardcoded example output (`js/preview.js` around line 2800). No network call, no real AI service. This is honestly disclosed in `KNOWN-ISSUES.md` and the UI itself (per docs), not hidden.
- **ZIP / SCORM export**: the button (`btn-download-zip`, `app.js:1455-1461`) only prepares an asset manifest and shows a warning toast — _"ZIP packaging is not implemented yet."_ No archive is ever produced. `exportFormat` setting accepts `'zip'`/`'scorm'` values but nothing downstream acts on them differently.
- **Standalone single-file HTML export** only inlines small raster images (≤1 MB, non-SVG) as data URLs; SVG, large images, audio, video, and captions are rewritten to `assets/...` relative paths that do not exist anywhere — the single-file download is _blocked_ with a toast in that case (`app.js:1448`), which is correct/safe behavior but means the "self-contained HTML" promise only holds for image-light components.
- **15 of 21 components have no independent `validate()` contract** — they rely only on generic per-field schema validation, not component-specific business-rule validation (e.g., "at least one correct answer," "hotspot coordinates within bounds") the way the 6 modular components do.
- **Media portability**: uploaded Blobs live only in the current browser's IndexedDB and are never embedded in the project JSON. Exporting a project and importing it in another browser (or after clearing site data) yields "missing" media references with no recovery path other than re-uploading.
- **Orphaned IndexedDB records**: removing/replacing media revokes the _runtime_ object URL but does not garbage-collect the underlying IndexedDB record, since a saved project might still reference it. There is no visible sweep/cleanup UI for genuinely orphaned records.

## 4. Confirmed defects

These are things this audit directly reproduced or verified in source, as opposed to items already disclosed as intentional limitations in §3.

1. **Firefox e2e suite times out** (12/129 e2e tests) — `page.goto('/')` exceeds 30s against the local Playwright test server. Chromium and WebKit pass 100%. Not yet root-caused in this pass (see §9); could be sandbox-specific rather than a real cross-browser defect, but is currently unverified either way and should not be assumed benign without a clean-environment re-run.
2. **Stray root file `Readme`** (no extension, single line of text "Readme") sits alongside the real docs (`PROJECT.md`, `ARCHITECTURE.md`). Cosmetic, but likely to confuse anyone looking for the canonical README, and inconsistent with the rest of the documentation quality.
3. **No lint/format tooling configured** despite ~9,850 lines of hand-written JS/HTML/CSS with no bundler-time or CI-time static analysis beyond the test suites themselves (see §9, Missing tests / tooling).

No functional/logic defects were found in the modules read in depth (`state.js`, `storage.js`, `utilities.js`, `media.js`, `media-storage.js`, `export.js`) during this pass — validation, sanitization, and persistence code in those files is consistent, defensive, and matches its test coverage. **Assumption**: `preview.js` (3,127 lines) and `app.js` (1,509 lines) were not read in full line-by-line during this pass given their size; a deeper follow-up review of those two files specifically (the least-modularized, highest-risk surface per §1/§8) is recommended before calling the codebase fully audited.

## 5. Security risks

**Confirmed, by design (defensive, working as intended):**

- Every author-controlled string reaching generated HTML passes through purpose-specific sanitizers (`escapeHTML`, `escapeAttribute`, `sanitizeRichText` with an explicit allowlist of `p/br/strong/b/em/i/u/ul/ol/li` plus a narrowly-parsed `<a href>`, `sanitizeURL` with scheme allowlisting, `escapeJavaScriptString`/`serializeForInlineScript` for inline-script interpolation, `sanitizeCSSColor`/`sanitizeCSSNumber` for style values). `sanitizeURL` explicitly rejects `javascript:`/`vbscript:` schemes, constrains `data:` to a fixed image-MIME allowlist, and only allows `blob:` URLs previously registered by the app itself (`localBlobURLs` set) — this defeats naive blob-URL smuggling.
- `tests/security.test.mjs` exercises hostile input against the generator/sanitization layer; this passed in the unit run.
- Uploaded SVGs are rejected wholesale (not lossily repaired) if they contain `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, `<audio>`, `<video>`, `<canvas>`, any `on*` handler attribute, `javascript:`/`vbscript:` URLs, `data:text/html`, external `href`/`xlink:href`/`src` references, or external `@import`/`url()` style references (`js/media.js:sanitizeSVGText`).
- Uploaded files are checked against a fixed extension→MIME allowlist and a byte-signature check (`hasExpectedFileSignature`) to catch mismatched/spoofed extensions before storage.
- The generated document's CSP (`js/preview.js:465`) is `default-src 'none'; script-src 'unsafe-inline'; ...; connect-src 'none'; base-uri 'none'; form-action 'none'` — network egress from generated components is blocked (`connect-src 'none'`), but `script-src 'unsafe-inline'` is required because the generator emits inline `<script>` blocks (no external script files are ever loaded), which is a real but bounded and self-documented trade-off.

**Confirmed risk points (also disclosed in `KNOWN-ISSUES.md`, verified here rather than only cited):**

- The `srcdoc` preview iframe uses `sandbox="allow-scripts allow-same-origin"` (plus additional flags on the exported iframe snippet: `allow-popups allow-popups-to-escape-sandbox allow-forms`). `allow-scripts` + `allow-same-origin` together are the combination that, if ever paired with attacker-controlled _unsanitized_ markup, would let injected script reach the parent-app-adjacent origin context — the sandbox is not a substitute for the sanitization layer, only defense-in-depth around it. Currently the app never puts unsanitized author content into the document, so this is a latent risk contingent on sanitizer correctness, not an active hole.
- `openPreview()` (`js/preview.js:45-51`) uses `previewWindow.document.write(html)` on a `window.open()` popup with `previewWindow.opener = null` set first (correct reverse-tabnabbing mitigation) — but `document.write` on the _same generated, already-sanitized_ HTML the iframe uses; risk here is entirely inherited from the shared compiler, not an independent injection point.
- **`isSafeProjectValue` in `storage.js`** allow-lists project JSON keys to `/^[a-zA-Z0-9_-]+$/`, rejects `objectUrl`/`blob` properties, caps nesting depth at 12, array length at 1000, and object key count at 100 — a reasonable belt against prototype-pollution-style or oversized payloads in imported project JSON. **Assumption**: this was not fuzz-tested in this pass beyond what `tests/security.test.mjs`/`tests/unit` already cover.
- No Subresource Integrity (SRI) on the Google Fonts `<link>` tags in either the builder shell or generated output; low severity (Google Fonts CSS is same trust tier as any other CDN asset the app already depends on), but worth noting since generated components are meant to be embedded in third-party LMS pages.
- There is no server-side component at all (by design), so this audit did not find any injection surface analogous to SQL/command injection — the realistic threat model here is entirely "does authored/uploaded content escape into executable context inside the generated HTML," which is where the sanitizer coverage above is concentrated.

## 6. Accessibility risks

**Confirmed:**

- Automated coverage (axe-core + direct ARIA/role/state/focus assertions) exists only for the 6 modular components plus stable builder-shell regions (`tests/accessibility.test.mjs`, `tests/e2e/accessibility.spec.js`). The ~15 legacy `preview.js`-branch components have **no automated accessibility assertions** — their keyboard/ARIA behavior is unverified by the test suite, only by manual review claims in the docs.
- Per `KNOWN-ISSUES.md` (verified consistent with what was read of `media.js`/`editor.js`): alt-text/decorative and audio/video-alternative gaps are surfaced as **non-blocking warnings** only (`validateMediaAccessibility` in `media.js` returns advisory `warnings`, never thrown errors) — an author can save and export a project with images missing alt text or instructional video with neither captions nor a transcript.
- Contrast checking is authoring-time only, on the theme's own token pairs; it cannot and does not evaluate contrast for uploaded imagery, arbitrary rich text runs, or every generated component-specific color combination.
- No screen-reader (NVDA/JAWS/VoiceOver), forced-colors/high-contrast, or 200–400% zoom testing has been automated or performed as part of this audit — this remains manual-only per `TESTING.md`, and is unverified here.

## 7. Export compatibility risks

**Confirmed:**

- Exported/preview HTML depends on network access to `fonts.googleapis.com`/`fonts.gstatic.com` at render time in the consuming environment (Rise, Moodle, or a browser) — if that environment blocks outbound font requests, generated components will silently fall back to system fonts rather than fail, per the CSP (`font-src https://fonts.gstatic.com data:`).
- The single-file HTML export's asset-inlining ceiling (small raster images only) means most media-bearing exports are **not actually self-contained**; they reference an `assets/` folder structure that the app currently has no way to produce (ZIP is unimplemented), so those exports are not directly usable without manual asset handling.
- No automated testing exists against real Articulate Rise, Moodle, or any LMS — `TESTING.md` explicitly calls this out as a required manual step never yet performed by CI. This audit did not perform it either.
- The iframe embed snippet's sandbox flags (`allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms`) are a fixed, one-size-fits-all set; some LMS/CMS iframe-embedding policies could reject or strip these attributes, which is outside this app's control but worth surfacing to users before they rely on the snippet in a specific host.

## 8. Technical debt

**Confirmed:**

- `js/preview.js` at 3,127 lines is a single-file monolith handling ~15 components' HTML/CSS/JS generation via conditional branching, plus the shared document template, CSP, and popout-window logic. This is the single largest maintainability and review-risk surface in the codebase (also the one file this audit could not fully read line-by-line — see §4).
- Only 6/21 components follow the modular `id/name/defaultConfig/editorSchema/generate*/validate` contract; the rest are default-data-selected via a long conditional in `app.js` and markup-generated via conditionals in `preview.js`, per `KNOWN-ISSUES.md` (confirmed pattern exists, exact line count not fully enumerated in this pass).
- Theme tokens cover common color/typography/radius/shadow/density/motion values, but not every legacy component's spacing/decorative value is tokenized — meaning some visual properties can't be themed through the official theme system and are effectively hardcoded per component.
- No stable per-item IDs — item identity is positional (array index), which `COMPONENT-SCHEMA.md` itself flags as a recommended future improvement; this matters for correctly tracking media ownership across reorders and could matter more once multi-user or diff-based tooling is added.
- No lint/format/static-analysis tooling (ESLint, Prettier, TypeScript, JSDoc-based type checking) anywhere in the project. All correctness guarantees today come from tests, not from a compiler or linter — increases the chance a class of bug (unused var, accidental global, subtle type coercion) reaches `main` undetected between test runs.

## 9. Missing tests

**Confirmed:**

- No automated tests cover the ~15 legacy `preview.js`-branch components' generated output at the same depth as the 6 modular ones (the modular ones get dedicated generator-contract fixtures per `COMPONENT-SCHEMA.md` — empty/one-item/many-item/long-text/emoji/multilingual/RTL/quote/closing-script/unsafe-URL cases). The legacy components are only exercised indirectly through e2e/integration flows, not the same hostile-input fixture matrix.
- No visual regression / pixel-diff snapshots exist anywhere (explicitly a deliberate choice per `TESTING.md`, not an oversight) — layout/visual regressions in the untested legacy components would not be caught automatically.
- No lint step in CI (`.github/workflows/tests.yml` runs `test:unit`, `test:coverage`, and `test:e2e` only — no `lint`/`typecheck` job, because none exists to run).
- Firefox e2e coverage is currently **not reliably green in this environment** (12 failures observed, all timeouts — see §0). Whether this reproduces in the project's actual GitHub Actions runner (Ubuntu, unrestricted network/process access) is unverified in this pass; this is the single most important open question to resolve before trusting the "Firefox passes" claim implied by having Firefox in the CI matrix.
- No fuzz/property-based testing of `isSafeProjectValue`, `validateProject`, or the media-reference validators beyond the fixed hostile-input cases already in `tests/security.test.mjs`/`tests/unit`.
- No load/stress testing of localStorage or IndexedDB behavior near quota limits (`KNOWN-ISSUES.md` already documents `QuotaExceededError` handling exists in `storage.js`, but there's no automated test forcing that path).

## 10. Recommended implementation phases

This is a **recommendation**, not a description of existing plans found in the repo (no roadmap document exists).

1. **Phase 0 — Stabilize CI signal.** Re-run the Firefox e2e failures in the project's actual CI runner to determine whether §0/§4's timeout is sandbox-specific or a real defect; add a lint/format tool (even a minimal ESLint config) so `preview.js`/`app.js` get baseline static analysis before further growth. Remove or replace the stray `Readme` file.
2. **Phase 1 — Close the modularization gap.** Migrate the remaining ~15 legacy components out of `js/preview.js` into the `components/` contract, one at a time, each landing with its own generator-contract test fixture matrix (mirroring what the 6 modular components already have) and an explicit `validate()`. This directly shrinks the single biggest technical-debt and untested-surface item (§4, §8, §9).
3. **Phase 2 — Finish or formally cut the ZIP/SCORM/AI features.** Each is currently a visible, half-built affordance in the UI. Either implement real ZIP packaging (the manifest/asset groundwork already exists in `export.js`) and a genuine AI backend integration, or remove the UI entry points until they're ready, to avoid users discovering the placeholders in production.
4. **Phase 3 — Media portability.** Decide and implement a path for including media in project JSON exports (e.g., base64 in a dedicated `.rise.zip` project format) so projects are portable across browsers/machines, closing the gap flagged repeatedly in `KNOWN-ISSUES.md`.
5. **Phase 4 — Accessibility hardening.** Extend automated axe/ARIA/keyboard coverage to the legacy components as they're modularized in Phase 1; consider promoting the currently-advisory alt-text/caption warnings to a stronger (but still non-destructive) authoring prompt.
6. **Phase 5 — Real-environment export validation.** Perform the manual Rise/Moodle verification `TESTING.md` calls for and are not yet done, and record the results as a durable checklist/regression reference (not just tribal knowledge).

## 11. Release-blocking issues

Judgment call, made explicit so it can be argued with:

- **Blocking for any release that claims "ZIP/SCORM export" or "AI generation" works**: neither does; both are simulated/placeholder (§3). Shipping with these visible and unlabeled as preview/placeholder would be a false-advertising risk to end users (instructional designers relying on SCORM packaging for LMS delivery).
- **Blocking for any release that claims cross-browser E2E is green**: the 12 Firefox failures are unresolved/unexplained as of this audit (§0, §9) and must be root-caused — either fixed or confirmed as a sandbox artifact — before Firefox support is asserted.
- **Not blocking, but must be disclosed**: media non-portability across browsers/machines (§3), partial single-file export (§7), and the accessibility-warning-not-error posture (§6) are all defensible product decisions already documented in `KNOWN-ISSUES.md` — they're acceptable for an internal MVP tool as long as users are told, which they currently are.
- **Not blocking for an internal/local-only MVP, but should gate any externally-distributed or multi-user release**: no lint/CI static analysis (§8/§9), no per-component `validate()` for 15/21 components (§3/§8), and the un-line-by-line-audited state of `preview.js`/`app.js` (§4) — these raise the cost and risk of the _next_ change, not the correctness of the current one.

## 12. Recommended production acceptance criteria

Recommendation, to be agreed with stakeholders before being treated as a gate:

1. `npm run test:unit`, `npm run test:coverage` (meeting the existing 70/60/70/70 thresholds), and `npm run test:e2e` all pass with **zero unexplained failures across all three configured browsers**, verified on the actual CI runner, not just locally.
2. A lint/static-analysis step exists and passes in CI.
3. Every catalog component (21/21, not 6/21) exposes the modular `generateHTML/generateCSS/generateJS/validate` contract and has its own generator-contract test fixtures.
4. Any UI affordance that does not perform its stated action (current ZIP/SCORM/AI entries) is either functional or explicitly labeled "Preview" / "Coming soon" in the UI itself, not only in developer-facing docs.
5. A documented, tested path exists for media to survive a project JSON export/import across browsers — or the limitation is surfaced to the author at export time, not discovered after the fact.
6. At least one real-environment validation pass (Rise and/or the organization's actual Moodle instance) has been performed and recorded, per `TESTING.md`'s existing (currently unfulfilled) manual-testing checklist.
7. Accessibility acceptance includes at minimum one real screen-reader pass (NVDA or VoiceOver) over each shipped component type, beyond the current axe-core/ARIA automation.

---

## Summary

### Files inspected

`app.js`, `index.html`, `styles.css`, `package.json`, `package-lock.json`, `vitest.config.js`, `playwright.config.js`, `.github/workflows/tests.yml`, `ARCHITECTURE.md`, `PROJECT.md`, `COMPONENT-SCHEMA.md`, `KNOWN-ISSUES.md`, `TESTING.md`, `Readme`, and every file in `js/` (`catalog.js`, `editor.js`, `editor-schemas.js`, `export.js`, `media.js`, `media-storage.js`, `media-upload.js`, `preview.js` [partial — CSP/write/openPreview sections; not read line-by-line in full given its size], `state.js`, `storage.js`, `themes.js`, `toast.js`, `utilities.js`) and `components/` (`accordion.js`, `flip-cards.js`, `multiple-choice.js`, `multiple-select.js`, `tabs.js`, `vertical-timeline.js`). Test suite structure under `tests/` was inspected via `TESTING.md` and directory listing, not read test-by-test. No `AGENTS.md`/`CLAUDE.md` found. Confirmed no `docs/` directory existed before this audit created it.

### Commands executed

- `npm run test:unit` → pass (139/139)
- `npm run test:coverage` → pass, all thresholds met
- `npm run test:e2e` → 116 passed / 12 failed (all Firefox, timeout) / 1 skipped (documented WebKit/Windows IndexedDB limitation)
- No `lint`/`build` commands exist to run (confirmed absence, not a skipped step)
- `git log -1`, `node --version`, `npm --version` for audit metadata

### Test/build results

Unit + coverage: fully green, thresholds exceeded. E2E: green on Chromium and WebKit, red on Firefox with 12 timeout failures whose root cause (sandbox vs. real defect) is unresolved as of this audit. No build step applies to this project.

### Highest-priority findings

1. Firefox e2e failures are unexplained and must be triaged in a clean environment before any "cross-browser tested" claim is made (§0, §9, §11).
2. ZIP/SCORM export and AI generation are non-functional placeholders currently visible in the UI (§3, §11) — release-blocking if advertised as working.
3. 15 of 21 components live in an unmodularized, untested-at-the-same-depth 3,127-line file (`js/preview.js`) with no independent `validate()` — the largest technical-debt and risk concentration in the codebase (§4, §8, §9).
4. No lint/static analysis tooling exists at all (§8, §9, §12).
5. Media is not portable across browsers/machines and is not embedded in project JSON (§3, §7, §10).

### Recommended next implementation step

Re-run the Playwright e2e suite for the `firefox` project alone, in the environment that will actually run CI (or in an unrestricted local shell), to determine whether the 12 failures are a sandbox-networking artifact of this audit environment or a genuine, previously-undocumented cross-browser regression. This is the fastest, lowest-risk action that unblocks an accurate answer to "is this release-ready," and should happen before starting any of the Phase 1+ work in §10.
