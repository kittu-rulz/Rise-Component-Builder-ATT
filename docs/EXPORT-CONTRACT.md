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

`app.js` calls `generateIframeContent(appState, componentRegistry, colorToRgba)` exactly once per regeneration and reuses the resulting string for every consumer: the live preview iframe, the "pop out" preview window, the iframe embed snippet, the HTML fragment, and the standalone HTML download. There is no second code path anywhere in the codebase that re-derives a component's markup from `appState` for export purposes.

**Enforcement rule:** any change to component output must be made inside `generateIframeContent()` (orchestration/shell) or a component's own `generateHTML`/`generateCSS`/`generateJS` in `components/*.js` — never both, and never a separate export-only path. A change that only affects "what gets exported" and not "what the preview shows," or vice versa, is a bug by definition — the two cannot differ, because they are the same string.

## The modular export pipeline

Every one of the 22 catalog components is a real module in `components/*.js` implementing the full contract (`docs/ARCHITECTURE.md` §1). `generateIframeContent()` (`js/preview.js`) is a thin orchestrator over the following stages — nothing else in the codebase assembles a compiled document:

1. **Shared design tokens** — `js/themes.js` resolves the active theme + per-component overrides into token values; `generateIframeContent()` turns them into the `:root { --primary: ...; }` CSS custom properties every component's CSS references.
2. **Shared export shell** (`js/export-shell.js`) — owns the outer document shape: the `<!DOCTYPE html>`/`<head>`/CSP meta/fonts link, the `<style>`/`<script>` wrapper, the block header (title/headline/description), and the completion-tracker widget markup (`renderShell`, `renderCompletionTrackerHTML`).
3. **Shared accessibility utilities** (`js/export-shell.js#renderSharedA11yScript`) — the `announce`/`updateProgress`/`updateTrackerComplete`/`setProgressAccessibility` functions every component calls into (`viewedItems.add(idx); updateProgress();`), plus the fixed `.sr-only`/focus-visible/`prefers-reduced-motion`/`forced-colors` CSS (`SHARED_A11Y_CSS`) and the reset/block-chrome CSS (`BASE_RESET_CSS`).
4. **Component-specific markup** — `entry.generateHTML(config, instanceId)`.
5. **Component-specific CSS** — `entry.generateCSS()`. Only the active component's own rules are emitted; nothing from any other component's stylesheet is ever concatenated in.
6. **Component-specific JS** — `entry.generateJS(config, instanceId)`, defining `initComponent()` plus whatever interaction functions that component needs. Only the active component's functions are emitted.
7. **Optional component-specific media** — media reference fields (`image`/`audio`/`video` schema types) resolve through `js/media-storage.js` for preview and through `prepareMediaExport()` (`js/export.js`) for export; see "Media resolution" below.
8. **Export validation** — each component's `validate(config)` (where implemented) plus the schema-driven `minItems`/required-field checks in `js/editor.js` gate saving; `js/component-registry.js#validateRegistry` gates the registry itself at module load (duplicate ids, missing metadata, incomplete renderers all throw immediately with a specific message).
9. **Deterministic output** — see below.

**Requirement 1 in practice:** because stages 4–6 only ever call the *active* component's own module, an Accordion export structurally cannot contain `.quiz-option`, `.gallery-item-card`, `.audio-player-block`, `.ai-generator-preview`, or any other component's markers — this is proven by `tests/unit/export-isolation.test.js`, which compiles every one of the 22 components and asserts the output contains only its own group's markers and none of the other 20 (AI's two mock components are treated as one group, since they intentionally share their mock-UI code with each other — not with anything unrelated).

### Instance scoping and isolation strategy (Requirements 5 & 6)

- **Deterministic per-export instance id.** `js/preview.js#getInstanceId` derives `rcb-<projectId>` (or `rcb-preview` when unsaved) — never `Date.now()`/`Math.random()`. Same input state always compiles to byte-identical output (`tests/unit/export-determinism.test.js`).
- **Instance-scoped element ids.** Every `id="..."` a component emits is prefixed with that instance id (e.g. `id="${instanceId}-quiz-feedback-box"`), including the shared shell's own ids (block headline, completion tracker, `interaction-status`). Two exports pasted onto the same page never collide on an id.
- **A single top-level IIFE per export.** `generateIframeContent()` wraps the shared accessibility script and the active component's script together in one `(function() { ... })();` (see `js/export-shell.js`). Every `function`/`var` declaration in a component's `generateJS()` output — however it's named — is scoped to that IIFE, not the global `window`. Pasting two exports onto one page therefore cannot collide on a JS name, regardless of what either component happens to call its helper functions.
- **CSS isolation, by format:**
  - The **iframe embed** and **standalone HTML download** formats are isolated by the `<iframe>`/document boundary itself plus the strict CSP below — a structural guarantee that needs no additional scoping.
  - The **HTML fragment** format (for pasting directly into a host page's own DOM) has no such boundary. Class names are not automatically rewritten/prefixed for this format — components use reasonably specific class names (e.g. `.accordion-group`, `.hotspot-tooltip-title`) but a host page's own styles could still coincidentally collide on a generic name. This is a deliberate, documented trade-off (not a gap the fragment format claims to close): the export modal labels the iframe embed "Recommended" precisely because it's the only format with a hard isolation guarantee, and the fragment format's own in-app description tells the author to prefer Option A for reliability. The id/JS-global guarantees above hold for the fragment format regardless.

### Sanitization boundary (Requirements 9 & 10)

`sanitizePreviewConfig(config, componentId)` (`js/utilities.js`) is the single sanitization boundary, applied once by `generateIframeContent()` before any component's `generateHTML`/`generateCSS`/`generateJS` ever runs (`docs/SECURITY.md`). Component modules are entitled to assume their input already passed through it — they are not expected to re-sanitize. Plain-text fields are escaped (`escapeHTML`/`escapeAttribute`), permitted rich-text fields are passed through the allowlist parser (`sanitizeRichText`), and URL-shaped fields (media sources, links) go through `sanitizeURL`. `tests/unit/generators.test.js` exercises every component against hostile fixtures (script injection, `javascript:`/`vbscript:`/`data:` URLs, long/multilingual/RTL/multiline text, empty optional fields) routed through this same sanitization step, matching the real pipeline exactly.

## What each export format contains

| Format                   | Source function                                                                | Content                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Iframe embed snippet     | `buildExportPayload()` (`js/export.js`)                                        | `<iframe srcdoc="...">` wrapping the escaped, compiled HTML string, with `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"` (`allow-same-origin` was removed after review — see `docs/SECURITY.md`) |
| HTML fragment            | `generateHtmlFragment()` (`js/utilities.js`), called by `buildExportPayload()` | The `<style>` block and body markup extracted from the same compiled string, for pasting into a host page that already provides `<html>`/`<head>`                            |
| Standalone HTML download | `downloadHtml()` (`js/export.js`)                                              | The complete compiled document, saved as a `.html` file — blocked (not silently broken) when any media requires packaging instead of inlining (see below)                    |
| Rise Project ZIP         | `buildRiseProjectZip()` (`js/export.js`), packaged by `js/zip.js`              | A real ZIP: the compiled document at `index.html` (ZIP root, no wrapper directory), every referenced upload under `assets/<sanitized-filename>`, and `assets/manifest.json` — see `docs/MEDIA-ASSET-PIPELINE.md` |
| Project JSON download    | `downloadProjectJson()` (`js/export.js`)                                       | The versioned project record from `js/storage.js` (§8) — configuration, theme snapshot, overrides — not compiled HTML. Media travels only as references (mediaId); see the Project package row below for the alternative that includes the actual files. |
| Project package (.zip)   | `exportProjectPackage()` (`js/project-package.js`)                             | `project.json` (the same versioned project record above) plus every referenced upload's actual bytes under `media/<mediaId>` — a *portable, re-importable Builder project*, not a Rise-embeddable output. See `docs/MEDIA-ASSET-PIPELINE.md`. |
| Asset manifest           | `downloadAssetManifest()` (`js/export.js`)                                     | `{ schemaVersion, assets: [...] }` describing packaged media — also embedded automatically inside the Rise Project ZIP as `assets/manifest.json`                             |

The exported file size (`getExportedFileSize`/`formatExportedFileSize`, `js/export.js`) is computed and shown in the export modal (`#export-file-size`) before the author downloads — Requirement 13.

## Error handling (Requirement 14)

`setupExportModalContent()` and both download button handlers (`app.js`) wrap the compile step (`prepareCurrentExport()`) in a try/catch. If a component's registry entry is missing (`generateIframeContent` throws a specific "no registered component module for …" error) or media resolution fails, the author sees a toast naming the failure instead of a silent no-op or a broken download.

## Media resolution during export

`prepareMediaExport(config, options)` walks the (already-sanitized) configuration and, for every media reference, resolves it against IndexedDB (`js/media-storage.js`, §9). It takes a `mode`:

- **`mode: 'inline'` (default — iframe snippet, HTML fragment, standalone HTML download)**: small raster images (`kind === 'image'`, not SVG, `size <= SMALL_IMAGE_INLINE_LIMIT` — 1 MB) are converted to a `data:` URL and inlined directly into the exported HTML. Everything else (SVG, large images, audio, video, captions) is assigned a unique `assets/<filename>` relative path, recorded in the manifest — and a warning is added, since these three formats have no way to actually deliver that file alongside themselves. The standalone HTML download is blocked outright (not silently shipped broken) whenever any such warning exists.
- **`mode: 'package'` (Rise Project ZIP)**: every local media reference — regardless of size or kind — always becomes an `assets/<filename>` relative path; nothing is inlined, and no "requires an external file" warning is produced, because `buildRiseProjectZip()` actually packages the file at that path. A reference whose underlying IndexedDB record no longer exists is still reported (via the dedicated `missing` array, not string-matched out of `warnings`) — `app.js` uses this to block the ZIP download outright, the same "never ship a dangling reference" guarantee the standalone HTML download already had.

Filenames are sanitized (`sanitizeAssetFilename`) and de-duplicated (`uniqueFilename()` inside `prepareMediaExport`) before ever being assigned — two different uploads that sanitize to the same name get a `-2`/`-3`/... suffix, never a collision. See `docs/MEDIA-ASSET-PIPELINE.md` for the full per-export-mode breakdown and the ZIP internals (`js/zip.js` — a small, dependency-free, deterministic STORE-only ZIP writer/reader, since this application has no bundler and ships zero runtime dependencies).

This resolution step is the one place export output legitimately differs from the live preview: preview always resolves media to a runtime `blob:` object URL (fast, session-scoped), while export resolves the same reference to either a `data:` URL or an `assets/...` path (portable, but requires the file to travel with the export). Both start from the identical compiled markup — only the _value a media reference resolves to_ changes, never which elements/attributes reference media.

## CSP and sandbox contract

Every compiled document embeds this Content-Security-Policy, unconditionally, regardless of destination (preview, popout, or export):

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com data:; img-src 'self' http: https: data: blob:;
media-src 'self' http: https: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'
```

Full rationale is in `docs/SECURITY.md`. The relevant export-contract point: **the CSP is part of the compiled string, so it travels with every export automatically** — an exported standalone HTML file, an embedded `srcdoc` iframe, and the live preview are equally protected, because they are the same bytes. `connect-src 'none'` also means no exported component can ever make a network call — this is why the two "AI" components' generators are simulated (fixed placeholder output after a delay), not real AI calls; see `docs/KNOWN-ISSUES.md`.

The iframe embed snippet additionally sets `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"` on the `<iframe>` element itself (a host-page-level restriction, separate from the document's own CSP) — `allow-same-origin` was reviewed and removed (`docs/SECURITY.md`) after confirming nothing in the compiler needs it. A consuming LMS/CMS that strips or rejects these sandbox flags is an external compatibility constraint outside this application's control — see `docs/KNOWN-ISSUES.md`.

## Rise/LMS output contract

The only communication a generated/exported component initiates toward its host page is documented in `docs/ARCHITECTURE.md` §11 — a single fixed-shape `postMessage` on completion. This message is part of the shared accessibility script (`js/export-shell.js#renderSharedA11yScript`) and therefore, per the single-compiler guarantee above, identical in preview, popout, and every export format.

**Rise compatibility claim, precisely scoped:** this application produces the iframe-embed and HTML-fragment representations Articulate Rise's "Code" → "Add code" block is documented to accept (standard `<iframe srcdoc>` / raw HTML+CSS+JS), and the sandbox/CSP values are chosen to be compatible with that block type. **This has not been independently tested inside a live Rise course as part of this repository's automation** — all automated coverage (`tests/e2e/*`) runs against a local static server, not Rise, Moodle, or any LMS. Do not represent this as "tested and working in Rise" beyond what is stated here; if that testing is performed and recorded, this section should be updated with the specific Rise version and result.

This claim, its Moodle/SCORM equivalents, and the per-browser/per-condition breakdown (keyboard-only operation, restricted networks, offline fonts) are formalized in **`docs/RISE-COMPATIBILITY-MATRIX.md`**, which classifies every export workflow and target surface into one of four tiers (Confirmed / Experimental / Fallback / Unsupported) and cites the exact evidence behind each. The same tiers drive the export compatibility report shown in the Export modal (`js/compatibility.js`, rendered by `renderExportCompatibilityReport()` in `app.js`) — the in-app UI and this document are required to never disagree. Manual test procedures live in `docs/RISE-TEST-CHECKLIST.md` and `docs/MOODLE-SCORM-TEST-CHECKLIST.md`; actual results (not just claims) are logged in `docs/COMPATIBILITY-RESULTS.md`.

## Non-goals of this contract

- It does not guarantee exported HTML renders identically in every host (Rise, Moodle, a raw browser) — only that the _bytes the application produces_ are identical across every export surface. Host-specific rendering differences are covered in `docs/KNOWN-ISSUES.md`.
- Component-level portability (a ZIP of the compiled component plus its own media) is now real (Rise Project ZIP, above). Project-level portability (re-importing the *editable Builder project*, media included) is also real (Project package, above). **SCORM packaging remains entirely unimplemented** — no `imsmanifest.xml`, no SCORM API wrapper is produced by anything in this application; see `docs/KNOWN-ISSUES.md` and `docs/RISE-COMPATIBILITY-MATRIX.md`.
- It does not cover the _application's own_ production build (`build.mjs`, `docs/ARCHITECTURE.md` "Build" section) — that assembles the builder app for hosting and is unrelated to a user's exported component output.
- It does not claim the HTML-fragment export format is collision-proof against an arbitrary host page's CSS — see "CSS isolation, by format" above.
