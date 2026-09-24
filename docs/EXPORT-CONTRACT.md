# Export contract

This document specifies the guarantee that keeps the live preview and every exported output in sync, the modular pipeline that assembles each compiled document, and exactly what each export format contains. It is the detailed companion to `docs/ARCHITECTURE.md` §1/§4/§5.

## The single-compiler guarantee

**Preview and export must never drift apart, because they are not two implementations — they are one function called from two places.**

```
                          ┌─────────────────────────────────┐
                          │  js/preview.js                   │
 appState, componentRegistry, colorToRgba                    │
        ────────────────▶│  generateIframeContent(...)      │
                          │  → one complete HTML document    │
                          │    string (CSP + <style> +       │
                          │    <script>)                     │
                          └───────────────┬───────────────────┘
                                           │
                     ┌─────────────────────┼─────────────────────┐
                     ▼                     ▼                     ▼
          iframe.srcdoc = html   previewWindow.document   js/export.js consumes
          (writePreview, live      .write(html)             the same string
           preview panel)          (openPreview, popout)     (buildExportPayload,
                                                               prepareMediaExport)
```

`app.js` calls `generateIframeContent(appState, componentRegistry, colorToRgba)` exactly once per regeneration and reuses the resulting string for every consumer: the live preview iframe, the "pop out" preview window, the HTML fragment behind **Copy for Rise**, and the `index.html` inside the **Web Package ZIP**. There is no second code path anywhere in the codebase that re-derives a component's markup from `appState` for export purposes. (`buildExportPayload()` still also returns an `<iframe srcdoc>` snippet and `downloadHtml()` still saves a `.html` file; both are unit-tested but have no caller in the app — see "What each export format contains".)

**Enforcement rule:** any change to component output must be made inside `generateIframeContent()` (orchestration/shell) or a component's own `generateHTML`/`generateCSS`/`generateJS` in `components/*.js` — never both, and never a separate export-only path. A change that only affects "what gets exported" and not "what the preview shows," or vice versa, is a bug by definition — the two cannot differ, because they are the same string.

## The modular export pipeline

Every one of the 21 catalog components is a real module in `components/*.js` implementing the full contract (`docs/ARCHITECTURE.md` §1). `generateIframeContent()` (`js/preview.js`) is a thin orchestrator over the following stages — nothing else in the codebase assembles a compiled document:

1. **Shared design tokens** — `js/themes.js` resolves the active theme + per-component overrides into token values; `generateIframeContent()` turns them into the `:root { --primary: ...; }` CSS custom properties every component's CSS references. The same `:root` block also carries the fixed **AT&T brand token layer** (`--att-*`, from `js/att-tokens.js` ← `design/att-tokens.css`) — present in every artifact so component CSS can build on it; the theme `--primary`/`--accent`/… layer above it is still the one components actually consume today. Kept in sync with the app's own copy by `tests/unit/att-tokens.test.js`.
2. **Shared export shell** (`js/export-shell.js`) — owns the outer document shape: the `<!DOCTYPE html>`/`<head>`/CSP meta/fonts link, the `<style>`/`<script>` wrapper, the block header (title/headline/description), and the completion-tracker widget markup (`renderShell`, `renderCompletionTrackerHTML`).
3. **Shared accessibility utilities** (`js/export-shell.js#renderSharedA11yScript`) — the `announce`/`updateProgress`/`updateTrackerComplete`/`setProgressAccessibility` functions every component calls into (`viewedItems.add(idx); updateProgress();`), plus the fixed `.sr-only`/focus-visible/`prefers-reduced-motion`/`forced-colors` CSS (`SHARED_A11Y_CSS`) and the reset/block-chrome CSS (`BASE_RESET_CSS`).
4. **Component-specific markup** — `entry.generateHTML(config, instanceId)`.
5. **Component-specific CSS** — `entry.generateCSS()`. Only the active component's own rules are emitted; nothing from any other component's stylesheet is ever concatenated in.
6. **Component-specific JS** — `entry.generateJS(config, instanceId)`, defining `initComponent()` plus whatever interaction functions that component needs. Only the active component's functions are emitted.
7. **Optional component-specific media** — media reference fields (`image`/`audio`/`video` schema types) resolve through `js/media-storage.js` for preview and through `prepareMediaExport()` (`js/export.js`) for export; see "Media resolution" below.
8. **Export validation** — each component's `validate(config)` (where implemented) plus the schema-driven `minItems`/required-field checks in `js/editor.js` gate saving; `js/component-registry.js#validateRegistry` gates the registry itself at module load (duplicate ids, missing metadata, incomplete renderers all throw immediately with a specific message).
9. **Deterministic output** — see below.

**Requirement 1 in practice:** because stages 4–6 only ever call the *active* component's own module, an Accordion export structurally cannot contain `.quiz-option`, `.gallery-item-card`, `.aud-player`, or any other component's markers — this is proven by `tests/unit/export-isolation.test.js`, which compiles every one of the 21 components and asserts the output contains only its own group's markers and none of the other 20.

### Instance scoping and isolation strategy (Requirements 5 & 6)

- **Deterministic per-export instance id.** `js/preview.js#getInstanceId` derives `rcb-<projectId>` (or `rcb-preview` when unsaved) — never `Date.now()`/`Math.random()`. Same input state always compiles to byte-identical output (`tests/unit/export-determinism.test.js`).
- **Instance-scoped element ids.** Every `id="..."` a component emits is prefixed with that instance id (e.g. `id="${instanceId}-quiz-feedback-box"`), including the shared shell's own ids (block headline, completion tracker, `interaction-status`). Two exports pasted onto the same page never collide on an id.
- **A single top-level IIFE per export.** `generateIframeContent()` wraps the shared accessibility script and the active component's script together in one `(function() { ... })();` (see `js/export-shell.js`). Every `function`/`var` declaration in a component's `generateJS()` output — however it's named — is scoped to that IIFE, not the global `window`. Pasting two exports onto one page therefore cannot collide on a JS name, regardless of what either component happens to call its helper functions.
- **CSS isolation, by format:**
  - The **Web Package ZIP**'s `index.html` is a complete document hosted and embedded by URL, so it is isolated by the document boundary itself plus the strict CSP below — a structural guarantee that needs no additional scoping.
  - The **HTML fragment** format (for pasting directly into a host page's own DOM) has no such boundary. Class names are not automatically rewritten/prefixed for this format — components use reasonably specific class names (e.g. `.accordion-group`, `.hotspot-tooltip-title`) but a host page's own styles could still coincidentally collide on a generic name. This is a deliberate, documented trade-off (not a gap the fragment format claims to close): it is what lets components whose content should "expand naturally" (accordions, timelines, knowledge checks revealing feedback) grow with their content instead of sitting in a fixed-height frame. The export dialog shows two cards side by side, **Copy for Rise** (the fragment) and **Web Package ZIP**; `updatePrimaryExportSection()` (`app.js`) marks the ZIP card recommended, with a notice, when the component has uploaded media too large to inline or the export has media warnings, and otherwise marks the Copy card. The id/JS-global guarantees above hold for the fragment format regardless.

### Sanitization boundary (Requirements 9 & 10)

`sanitizePreviewConfig(config, componentId)` (`js/utilities.js`) is the single sanitization boundary, applied once by `generateIframeContent()` before any component's `generateHTML`/`generateCSS`/`generateJS` ever runs (`docs/SECURITY.md`). Component modules are entitled to assume their input already passed through it — they are not expected to re-sanitize. Plain-text fields are escaped (`escapeHTML`/`escapeAttribute`), permitted rich-text fields are passed through the allowlist parser (`sanitizeRichText`), and URL-shaped fields (media sources, links) go through `sanitizeURL`. `tests/unit/generators.test.js` exercises every component against hostile fixtures (script injection, `javascript:`/`vbscript:`/`data:` URLs, long/multilingual/RTL/multiline text, empty optional fields) routed through this same sanitization step, matching the real pipeline exactly.

## What each export format contains

| Format                   | Source function                                                                | Content                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML fragment (**Copy for Rise**) | `generateHtmlFragment()` (`js/utilities.js`), called by `buildExportPayload()` | The `<style>` block and body markup extracted from the same compiled string, for pasting into Rise's **Code › Add code** block or a host page that already provides `<html>`/`<head>`. `<head>` is not included, so neither is the CSP `<meta>` — the fragment runs under the host's policy. The `#btn-copy-html` card. |
| Web Package ZIP         | `buildRiseProjectZip()` (`js/export.js`), packaged by `js/zip.js`              | A real ZIP: the compiled document at `index.html` (ZIP root, no wrapper directory), every referenced upload under `assets/<sanitized-filename>`, and `assets/manifest.json` — see `docs/MEDIA-ASSET-PIPELINE.md`. The **Web Package ZIP** card (`#btn-download-rise-zip`); hosted and embedded by URL. |
| Project JSON download    | `downloadProjectJson()` (`js/export.js`)                                       | The versioned project record from `js/storage.js` (§8) — configuration, theme snapshot, overrides — not compiled HTML. Media travels only as references (mediaId); see the Project package row below for the alternative that includes the actual files. |
| Project package (.zip)   | `exportProjectPackage()` (`js/project-package.js`)                             | `project.json` (the same versioned project record above) plus every referenced upload's actual bytes under `media/<mediaId>` — a *portable, re-importable Builder project*, not a Rise-embeddable output. See `docs/MEDIA-ASSET-PIPELINE.md`. |
| Asset manifest           | `downloadAssetManifest()` (`js/export.js`)                                     | `{ schemaVersion, assets: [...] }` describing packaged media — also embedded automatically inside the Web Package ZIP as `assets/manifest.json`                             |

**Not offered in the export dialog any more:** an `<iframe srcdoc="…">` snippet (`buildExportPayload().iframe`, with `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"`; `allow-same-origin` was removed after review — see `docs/SECURITY.md`) and a standalone `.html` download (`downloadHtml()`). Both functions remain in `js/export.js` with unit tests, but nothing in the app calls them. Results recorded against the iframe snippet in `docs/COMPATIBILITY-RESULTS.md` are history for that format and say nothing about the current dialog.

The exported file size (`getExportedFileSize`/`formatExportedFileSize`, `js/export.js`) is computed and shown in the export modal (`#export-file-size`) before the author downloads — Requirement 13.

## Export size baseline (P04, 2026-08-14)

Every compiled export embeds the same five AT&T Aleck Sans weights (Regular/Italic/Medium/Bold/BoldItalic) inline as base64 — before P04 this was the single largest fixed cost in every export by a wide margin, dwarfing a typical component's own markup.

**What changed:** each weight's source `.ttf` (`ATT Design System/All_ATTAleck_Fonts/ATTAleckSans/*.ttf`, gitignored/local-only) was converted to brotli-compressed WOFF2 and subsetted to drop 5 unused private-use glyphs (U+F600–U+F604 — legacy icon-font codepoints; verified via `grep` that no component in this codebase ever emits them, since every icon here is an inline SVG). Every other codepoint is retained unchanged (full Latin Extended-A, combining diacritics, general punctuation, currency symbols — the set this project's own multilingual test fixtures exercise). See `js/custom-fonts.js`'s header comment for the full glyph-coverage verification and the licensing decision behind performing this conversion at all (the font's EULA restricts "adapt, modify, alter, translate, convert" — this was done only after explicit AT&T permission was confirmed for this engagement).

**Measured, reproducible baseline** (measured via `compileExportFixture()` against `tests/fixtures/export-fixture-definitions.mjs`'s representative components — no uploaded media in any of these, since the fixtures don't carry any; see "Largest practical export," below, for the media case):

| Font asset (raw, per weight × 5) | Before (TTF) | After (WOFF2, subsetted) | Change |
| --- | --- | --- | --- |
| Total, 5 weights | 270,076 bytes | 98,024 bytes | −63.7% |

| Compiled export (accordion, representative) | Before | After | Change |
| --- | --- | --- | --- |
| Standalone HTML (historical; no longer offered) | 377,347 bytes | 147,946 bytes | −60.8% |
| HTML fragment (Copy for Rise) | 376,905 bytes | 147,504 bytes | −60.9% |
| Iframe snippet (historical; no longer offered) | 381,730 bytes | 152,329 bytes | −60.1% |

Every other cataloged component measured within a few KB of the accordion figures above (374–379 KB before, 146–155 KB after) — the font dominates every export's size regardless of which component it is, so the percentage improvement is consistent catalog-wide. `tests/unit/export-fixtures.test.js` enforces a 220 KB regression ceiling (generous headroom above the ~150 KB actuals) so a reverted font conversion fails loudly rather than silently creeping back in.

**Largest practical export (with media):** components that accept uploaded audio/video/images (Custom Video Embed, Custom Audio Player, Grid Photo Gallery) add the uploaded file's own size on top of the ~150 KB font baseline — media size dominates for these, not the font, and is unaffected by this optimization (uploaded media is never re-encoded by this project). See `docs/RISE-TEST-CHECKLIST.md` "Before you start" for testing this case manually against a real Rise course.

## Error handling (Requirement 14)

`setupExportModalContent()` and the export button handlers (`app.js`) wrap the compile step (`prepareCurrentExport()`) in a try/catch. If a component's registry entry is missing (`generateIframeContent` throws a specific "no registered component module for …" error) or media resolution fails, the author sees a toast naming the failure instead of a silent no-op or a broken download.

## Media resolution during export

`prepareMediaExport(config, options)` walks the (already-sanitized) configuration and, for every media reference, resolves it against IndexedDB (`js/media-storage.js`, §9). It takes a `mode`:

- **`mode: 'inline'` (default — the Copy for Rise fragment, plus the unwired iframe-snippet and standalone-download helpers)**: small raster images (`kind === 'image'`, not SVG, `size <= SMALL_IMAGE_INLINE_LIMIT` — 1 MB) are converted to a `data:` URL and inlined directly into the exported HTML. Everything else (SVG, large images, audio, video, captions) is assigned a unique `assets/<filename>` relative path, recorded in the manifest — and a warning is added, since a pasted fragment has no way to deliver that file alongside itself. The export dialog reacts to such warnings by recommending the Web Package ZIP card (`updatePrimaryExportSection()`).
- **`mode: 'package'` (Web Package ZIP)**: every local media reference — regardless of size or kind — always becomes an `assets/<filename>` relative path; nothing is inlined, and no "requires an external file" warning is produced, because `buildRiseProjectZip()` actually packages the file at that path. A reference whose underlying IndexedDB record no longer exists is still reported (via the dedicated `missing` array, not string-matched out of `warnings`) — `app.js` uses this to block the ZIP download outright, so a package never ships with a dangling reference.

Filenames are sanitized (`sanitizeAssetFilename`) and de-duplicated (`uniqueFilename()` inside `prepareMediaExport`) before ever being assigned — two different uploads that sanitize to the same name get a `-2`/`-3`/... suffix, never a collision. See `docs/MEDIA-ASSET-PIPELINE.md` for the full per-export-mode breakdown and the ZIP internals (`js/zip.js` — a small, dependency-free, deterministic STORE-only ZIP writer/reader, since this application has no bundler and ships zero runtime dependencies).

This resolution step is the one place export output legitimately differs from the live preview: preview always resolves media to a runtime `blob:` object URL (fast, session-scoped), while export resolves the same reference to either a `data:` URL or an `assets/...` path (portable, but requires the file to travel with the export). Both start from the identical compiled markup — only the _value a media reference resolves to_ changes, never which elements/attributes reference media.

## CSP and sandbox contract

Every compiled document embeds this Content-Security-Policy, unconditionally, regardless of destination (preview, popout, or export):

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com data:; img-src 'self' http: https: data: blob:;
media-src 'self' http: https: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'
```

Full rationale is in `docs/SECURITY.md`. The relevant export-contract point: **the CSP is part of the compiled string, so it travels with every full-document output automatically** — the `index.html` in the Web Package ZIP and the live preview are equally protected, because they are the same bytes. The Copy for Rise fragment is the exception: `generateHtmlFragment()` keeps only the `<style>` and body, so the CSP `<meta>` is not included and the fragment runs under its host page's policy. `connect-src 'none'` also means no exported component can ever make a network call — this is why the two "AI" components' generators are simulated (fixed placeholder output after a delay), not real AI calls; see `docs/KNOWN-ISSUES.md`.

The `<iframe srcdoc>` snippet from `buildExportPayload()` (no longer offered in the export dialog) additionally sets `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"` on the `<iframe>` element itself (a host-page-level restriction, separate from the document's own CSP) — `allow-same-origin` was reviewed and removed (`docs/SECURITY.md`) after confirming nothing in the compiler needs it. A consuming LMS/CMS that strips or rejects these sandbox flags is an external compatibility constraint outside this application's control — see `docs/KNOWN-ISSUES.md`.

## Rise/LMS output contract

The only communication a generated/exported component initiates toward its host page is documented in `docs/ARCHITECTURE.md` §11 — a single fixed-shape `postMessage` on completion. This message is part of the shared accessibility script (`js/export-shell.js#renderSharedA11yScript`) and therefore, per the single-compiler guarantee above, identical in preview, popout, and every export format.

**Rise compatibility claim, precisely scoped:** the export dialog produces the HTML-fragment representation Articulate Rise's "Code" → "Add code" block is documented to accept (raw HTML+CSS+JS). The Web Package ZIP is different: it is hosted and embedded by URL and is not uploaded to Rise directly. **Neither has been independently tested inside a live Rise course as part of this repository's automation** — all automated coverage (`tests/e2e/*`) runs against a local static server, not Rise, Moodle, or any LMS. Do not represent this as "tested and working in Rise" beyond what is stated here; if that testing is performed and recorded, this section should be updated with the specific Rise version and result.

This claim and the per-browser/per-condition breakdown (keyboard-only operation, restricted networks, offline fonts) are formalized in **`docs/RISE-COMPATIBILITY-MATRIX.md`**, which classifies every export workflow and target surface into one of four tiers (Confirmed / Preview / Fallback / Unsupported) and cites the exact evidence behind each — including its "Scope" section, which records that Moodle compatibility and SCORM packaging are explicitly out of scope for this project, not pending gaps. `js/compatibility.js` (`EXPORT_FORMAT_COMPATIBILITY`) holds the same tiers, but the export dialog no longer renders a compatibility report from them; if one is reinstated, the in-app copy and this document must never disagree. The manual test procedure lives in `docs/RISE-TEST-CHECKLIST.md`; actual results (not just claims) are logged in `docs/COMPATIBILITY-RESULTS.md`. (`docs/MOODLE-SCORM-TEST-CHECKLIST.md` is kept for reference only.)

## Non-goals of this contract

- It does not guarantee exported HTML renders identically in every host (Rise, a raw browser) — only that the _bytes the application produces_ are identical across every export surface. Host-specific rendering differences are covered in `docs/KNOWN-ISSUES.md`.
- Component-level portability (a ZIP of the compiled component plus its own media) is now real (Web Package ZIP, above). Project-level portability (re-importing the *editable Builder project*, media included) is also real (Project package, above). **SCORM packaging is out of scope for this project** — a deliberate decision (`docs/RISE-COMPATIBILITY-MATRIX.md` "Scope", `docs/COMPATIBILITY-RESULTS.md`, 2026-08-12), not a pending gap. No `imsmanifest.xml`, no SCORM API wrapper is produced by anything in this application, and none is planned.
- Moodle compatibility is likewise out of scope for this project — see `docs/RISE-COMPATIBILITY-MATRIX.md` "Scope".
- It does not cover the _application's own_ production build (`build.mjs`, `docs/ARCHITECTURE.md` "Build" section) — that assembles the builder app for hosting and is unrelated to a user's exported component output.
- It does not claim the HTML-fragment export format is collision-proof against an arbitrary host page's CSS — see "CSS isolation, by format" above.
