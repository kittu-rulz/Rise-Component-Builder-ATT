# Testing strategy

This document explains _why_ the test suite is shaped the way it is and defines the commands introduced in this phase. For step-by-step "how do I run/debug a test" instructions, see the root `TESTING.md`, which remains the practical how-to guide and is unchanged by this phase except for the new command table below.

## The pyramid

```
        ▲  Playwright e2e (tests/e2e/*.spec.js)
        │  Real browsers × 3 engines, full user flows, axe-core a11y scans
        │  Slow, highest confidence for "does this work for a user"
        │
        │  Vitest integration/generator tests (tests/*.test.mjs, tests/unit)
        │  jsdom where needed, hostile-input fixtures, generated-output parsing
        │  Fast, highest confidence for "does this module do the right thing"
        │
        ▼  Static analysis (eslint, tsc --checkJs)
           Fastest, catches syntax/type/style errors before a test even runs
```

Each layer exists to catch a different class of regression as cheaply as possible. Static analysis is new in this phase and sits below the test layers deliberately — it should fail fast, before either test runner spends time on a file that has an obvious defect.

## Commands

| Command                 | Layer            | Purpose                                                                                                                        |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`          | Static analysis  | ESLint over `app.js`, `js/`, `components/`, `tests/`, `build.mjs`, `eslint.config.js`                                          |
| `npm run format`        | Static analysis  | Prettier, writes formatting fixes                                                                                              |
| `npm run format:check`  | Static analysis  | Prettier, fails if any file is unformatted (CI-safe, no writes)                                                                |
| `npm run typecheck`     | Static analysis  | `tsc --noEmit` against the existing `.js` files via JSDoc types (`checkJs`), incrementally adopted — see "Type checking" below |
| `npm run test:unit`     | Unit/integration | `vitest run` — all Vitest suites once                                                                                          |
| `npm run test:watch`    | Unit/integration | `vitest` in watch mode, for local development                                                                                  |
| `npm run test:coverage` | Unit/integration | `vitest run --coverage`, enforcing the existing 70/60/70/70 thresholds                                                         |
| `npm run test:e2e`      | E2E              | `playwright test` — Chromium, Firefox, WebKit                                                                                  |
| `npm run test:e2e:ui`   | E2E              | Playwright's interactive UI                                                                                                    |
| `npm run build`         | Build            | `build.mjs` — assembles and verifies the static `dist/` tree (`docs/ARCHITECTURE.md`, "Build")                                 |
| `npm run validate`      | Composite        | `lint && typecheck && test:coverage && build`, in that order — the single CI-friendly gate described below                     |

`npm run validate` intentionally does **not** include `format:check`. Prettier was introduced in this phase with a config matched as closely as possible to the codebase's existing style (single quotes, semicolons, no trailing commas), but running it once across ~45 pre-existing files would produce a large, purely cosmetic diff unrelated to this phase's architectural goal ("avoid rewriting the entire application"). `npm run format`/`format:check` are available now for new and touched files, and a dedicated one-time repo-wide formatting commit is recommended as a follow-up (`docs/KNOWN-ISSUES.md`) so it can be reviewed and attributed on its own, not buried inside a behavioral or architectural change.

`npm run validate` also intentionally does **not** include `test:e2e`. Playwright's full three-browser run takes several minutes and, per `docs/KNOWN-ISSUES.md`, currently has an environment-dependent Firefox flake — bundling it into the fast local/CI gate would make `validate` unreliable for its actual purpose (a quick "is this change safe" check). `test:e2e` remains a separate, explicit step in CI (`.github/workflows/tests.yml`) and before any release.

## Type checking

TypeScript is **not** used as a compile target — the application still ships as plain `.js` ES modules with no build/transpile step (`docs/ARCHITECTURE.md`). What this phase adds is `tsc --noEmit` running in `checkJs` mode against a `tsconfig.json` with `allowJs: true`, which type-checks the _existing_ JavaScript using its natural JSDoc comments and inferred types, without requiring a single file to be renamed or rewritten. This is the standard "incremental adoption" path for a JS codebase not otherwise using TypeScript.

One file, `app.js`, is opted out with `// @ts-nocheck`: its first type-checking pass surfaced roughly 80 errors, nearly all of the same shape — `document.getElementById(...)` returning the generic `Element`/`HTMLElement` type, so a later `.value`/`.checked`/`.style`/`.files` access on ~40 different element references reads as a type error even though it is correct at runtime. Fixing this properly means adding a JSDoc element-type cast at each of those ~40 call sites — real, mechanical work, but disproportionate to this phase's scope ("fix only issues directly related to this phase," "avoid rewriting the entire application"). It is deferred as a deliberate, visible opt-out (not a silent gap) — see "Deferred work" below.

Every other file — including `js/preview.js`, despite its size and dynamic `componentId` branching — type-checks cleanly today with zero errors, because its logic is largely string/object transformation rather than direct, untyped DOM element access. `js/storage.js`, `js/themes.js`, `js/editor.js`, and `js/media-upload.js` needed a small number of added `@param` JSDoc annotations (documenting existing, correct parameter shapes — no behavior changes) to resolve structural-typing false positives from destructured-parameter inference; those are now clean and enforced going forward. As `app.js`'s DOM wiring is incrementally typed or migrated into the component registry (`docs/ARCHITECTURE.md` §1, `docs/KNOWN-ISSUES.md`), its `@ts-nocheck` should be dropped.

## E2E browser matrix and known flake

Playwright drives three engines (`playwright.config.js`): Chromium, Firefox, and desktop WebKit, against `tests/e2e/server.mjs`, a dependency-free local static server — no hosted environment is required.

**Current status (last verified during the production-readiness audit, `docs/PRODUCTION-READINESS-AUDIT.md`):** Chromium and WebKit pass their full suites. In this sandboxed execution environment, the `firefox` project fails 12 tests, all with `Test timeout of 30000ms exceeded` during `page.goto('/')` or Playwright's page setup — i.e. Firefox never finished loading the local test server within 30 seconds. This has the signature of an environment/sandbox launch-latency issue rather than an application defect (nothing in the failures references application code or assertions — they never get past navigation), but it has **not yet been confirmed against an unrestricted environment** (e.g. the project's own GitHub Actions runner). Treat it as an open item, not a dismissed one, until re-verified there. See `docs/KNOWN-ISSUES.md`.

One test is permanently skipped on WebKit (`flip-card custom artwork uploads per face and removal restores the built-in icon`): Playwright's bundled WebKit build on Windows cannot store a `Blob` in IndexedDB at all in this environment, reproduced with zero application code (`indexedDB.open(...).put({ blob })` fails outright). This is a documented Playwright/WebKit-on-Windows limitation, not an app defect — real Safari is unaffected.

Firefox and WebKit don't support Playwright's `clipboard-read`/`clipboard-write` permission grants (Chromium-only CDP permission). The export copy-to-clipboard test verifies the visible success state (button text/class, toast) on all three engines but only reads back actual clipboard contents on Chromium.

**New (prompt 13):** `application.spec.js`'s full-catalog no-console-error test intermittently observes an internal WebKit RangeError — `Temporal.Duration properties must be finite and of consistent sign` — with no connection to which component is on screen. Reproduced across three different, unrelated components (Grid Photo Gallery, Custom Video Embed, and others) over repeated runs on WebKit only, never on Chromium or Firefox, and "Temporal" does not appear anywhere in this project's own source. This is a WebKit-engine artifact of this sandboxed Windows environment, not an application defect, and the test's error filter documents and tolerates it accordingly (same pattern as the WebKit IndexedDB/Blob limitation above). Also not yet confirmed against an unrestricted environment.

## Coverage scope

**Updated (prompt 13, automated test suite expansion).** The original phase-2 gate covered only four near-leaf modules. It now also covers every schema/registry, validator/sanitizer, and exporter module — the modules whose correctness stakes are highest and whose input space is most tractable to unit-test directly, matching prompt 13's instruction to "set high coverage thresholds for schemas, exporters, validators and sanitizers."

V8 coverage gates (`vitest.config.js`) apply to:

- **Baseline leaf modules:** `js/state.js`, `js/storage.js`, `js/themes.js`, `js/utilities.js`, `components/*.js` (22 registered component generators).
- **Schemas/registry:** `js/component-registry.js`, `js/editor-schemas.js`, `js/catalog.js` — per-file thresholds raised to 85/75/85/85 for the registry (validation-heavy, throws on malformed entries) and editor schemas.
- **Validators/sanitizers:** `js/validation.js`, `js/validation-utils.js`, `js/field-validation.js` — per-file thresholds raised to 85/75/85/85.
- **Exporters:** `js/export.js`, `js/export-shell.js`, `js/zip.js`, `js/project-package.js` — per-file thresholds raised to 80–85% (export.js/export-shell.js at 80/70/80/80, zip.js at 85/75/85/85, since zip.js is a hand-written, dependency-free format implementation with no room for silent corruption).
- **Media pipeline:** `js/media.js`, `js/media-storage.js` — global 70/60/70/70 thresholds apply; two internal functions (`readImageDimensions`, `resizeImageBlob`, both in `js/media.js`) are deliberately excluded from the push toward 100%, see below.

Global thresholds (70% statements, 60% branches, 70% functions, 70% lines) are pooled across all included files, not enforced per-file (`perFile` is left at its default `false`) — a handful of components with lower branch coverage on genuinely defensive fallback branches (e.g. `accordion.js`, `hotspots.js`, `profile-cards.js`, `multiple-select.js`, all in the 44–58% branch range on fallback-icon/default-value paths) do not individually fail the gate, matching prompt 13's instruction to set *reasonable*, not *chasing-100%*, thresholds for this tier. The per-file overrides above are stricter and still apply regardless of `perFile`, since glob-keyed threshold entries are always evaluated per matching file.

`js/preview.js`, `js/editor.js`, `js/media-upload.js`, and `app.js` remain outside the coverage include list and are exercised through integration and E2E tests instead — their DOM-orchestration nature (largely `document.getElementById` wiring) makes line coverage a poor correctness signal, unchanged from the original phase-2 rationale (`docs/ARCHITECTURE.md`, "Important dependencies").

**Known, accepted gap:** `js/media.js`'s `readImageDimensions` and `resizeImageBlob` require a real browser image decoder (`createImageBitmap`/`Image`/`<canvas>`) that this project's Node-based Vitest environment does not provide by design (see the comments directly above each function). Every caller already fails open on decode/resize failure — this fallback path *is* exercised (every Node-run `prepareMediaFile` test takes it) — but the successful-decode/resize branches themselves are not unit-tested here. This is a deliberate, documented exclusion, not an oversight; real image resizing is covered by manual testing and, indirectly, by the fact that the fallback path never blocks an upload if resizing fails.

## Test folder structure

```text
tests/
├── fixtures/                       Reusable project, theme, content, URL, and storage fixtures
├── setup/                          Shared Vitest cleanup
├── unit/                           Schema, registry, validation, export, and generator tests
│   ├── component-registry.test.js    Registry integrity + one throw-case per required field
│   ├── catalog-card.test.js          createCatalogCard (jsdom)
│   ├── compatibility.test.js         Export-format compatibility tier classification
│   ├── validation-utils.test.js      Every shared per-component validator, direct
│   ├── field-validation.test.js      Schema-field-level validation + a11y warnings
│   ├── export.test.js                File-size formatting, prepareMediaExport, buildRiseProjectZip, download helpers (jsdom)
│   ├── media-blob-jsdom.test.js       blobToDataURL's browser FileReader path (jsdom)
│   ├── project-package-download.test.js  downloadProjectPackage (jsdom)
│   └── …                             (device-preview, export-determinism/-isolation/-fixtures, generators, state, storage, utilities, validation, completion)
├── e2e/
│   ├── server.mjs                  Dependency-free local static server
│   ├── application.spec.js         Shell, catalog, mode, responsive, and full-catalog no-console-error tests
│   ├── full-journey.spec.js        One continuous session: create → edit → save → reopen → preflight → export → standalone → keyboard → completion
│   ├── editor-preview.spec.js
│   ├── interactions.spec.js
│   ├── preview-device-modes.spec.js
│   ├── persistence-export.spec.js
│   ├── media-pipeline.spec.js
│   ├── completion.spec.js
│   ├── exported-fixtures.spec.js   Standalone fixture files: no-console-error, keyboard operability, degraded-font handling
│   └── accessibility.spec.js
├── accessibility.test.mjs          Generated-output accessibility integration tests
├── media.test.mjs                  Media validation/storage/export tests
├── project-package.test.mjs        Portable project package (.rise-project.zip) round-trip tests
├── rise-zip.test.mjs               Rise Project ZIP structural tests (asset paths, manifest, missing-asset gating)
├── security.test.mjs               Hostile-input and interpolation tests
└── themes.test.mjs                 Theme model and persistence tests
```

## What's missing (see `docs/KNOWN-ISSUES.md` for the full list)

- `readImageDimensions`/`resizeImageBlob` (`js/media.js`) are not directly unit-tested — see "Coverage scope" above.
- `prepareMediaExport`'s `resolvedMedia` cache (`js/export.js`) never actually dedupes a media reference used twice, because its recursive walk resolves every branch concurrently via `Promise.all` — both branches reach the cache-miss check before either resolves. Documented with a test (`tests/unit/export.test.js`) proving both occurrences still resolve correctly (just as two separate assets, `photo.png`/`photo-2.png`, instead of one shared one). A real fix means changing the traversal to resolve sequentially — a behavioral/performance change out of scope for a test-suite-expansion pass.
- No visual regression/pixel-diff snapshots (a deliberate choice, not an oversight — see `TESTING.md`).
- No fuzz/property-based testing beyond the fixed hostile-input cases already present.
- `npm run test:e2e` is not yet part of `npm run validate` (by design, above) or confirmed green for Firefox in an unrestricted environment.
