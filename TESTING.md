# Testing the Rise Component Builder

This is the practical how-to guide. For the *why* behind the pyramid, coverage scope, and the E2E browser-matrix status, see [`docs/TESTING-STRATEGY.md`](docs/TESTING-STRATEGY.md).

## Installation

Install the pinned development dependencies from the repository root:

```sh
npm ci
npx playwright install chromium
```

Use `npm install` only when intentionally updating dependencies and the lockfile. The application remains vanilla HTML, CSS, and JavaScript; npm is used only for test tooling.

## Commands

| Command | Purpose |
|---|---|
| `npm test` | Run all Vitest unit and integration tests once |
| `npm run test:unit` | Run all Vitest unit and integration tests once |
| `npm run test:watch` | Run Vitest in interactive watch mode |
| `npm run test:e2e` | Run Chromium browser, interaction, persistence, export, responsive, and accessibility tests |
| `npm run test:e2e:ui` | Open Playwright's interactive test UI |
| `npm run test:coverage` | Run Vitest with V8 coverage and enforce quality gates |
| `npm run lint` | Run ESLint over application and test code |
| `npm run format` | Apply Prettier formatting |
| `npm run format:check` | Check Prettier formatting without writing (CI-safe) |
| `npm run typecheck` | Run `tsc --noEmit` against JSDoc-typed `.js` files (incremental, see `docs/TESTING-STRATEGY.md`) |
| `npm run build` | Assemble and verify the static `dist/` tree for deployment |
| `npm run validate` | Run lint, typecheck, coverage, and build in one CI-friendly gate |

Coverage thresholds are 70% statements, 60% branches, 70% functions, and 70% lines. HTML and JSON summary reports are written to `coverage/`.

## Test folder structure

```text
tests/
├── fixtures/                 Reusable project, theme, content, URL, and storage fixtures
├── setup/                    Shared Vitest cleanup
├── unit/                     Utility, state, persistence, and generator tests
├── e2e/
│   ├── server.mjs            Dependency-free local static server
│   ├── application.spec.js   Shell, catalog, mode, and responsive tests
│   ├── editor-preview.spec.js
│   ├── interactions.spec.js
│   ├── persistence-export.spec.js
│   └── accessibility.spec.js
├── accessibility.test.mjs    Generated-output accessibility integration tests
├── media.test.mjs            Media validation/storage/export tests
├── security.test.mjs         Hostile-input and interpolation tests
└── themes.test.mjs           Theme model and persistence tests
```

Vitest runs in Node by default. Unit tests that require DOM parsing import jsdom directly. Playwright runs the unbundled application from `http://127.0.0.1:4173` using the local test server.

## Writing unit tests

1. Put focused module tests in `tests/unit/*.test.js`.
2. Import reusable values from `tests/fixtures/index.js` rather than recreating projects and hostile strings.
3. Prefer observable behavior over implementation details.
4. Use the in-memory localStorage fixture for persistence tests and clean any added globals.
5. For component generators, validate HTML with jsdom, compile JavaScript with `Function`, and check escaping and empty/many-item boundaries.
6. Run both `npm run test:unit` and `npm run test:coverage` before submitting changes.

Do not add assertions that merely execute lines without verifying useful behavior.

## Writing Playwright tests

1. Put browser workflows in the closest `tests/e2e/*.spec.js` file.
2. Prefer stable IDs, roles, labels, and existing component text over CSS layout selectors.
3. Use `frameLocator('#live-preview-iframe')` for generated component interactions.
4. Keep persistence-dependent actions in one test or one context; Playwright creates a clean context for each test.
5. Capture downloads through `page.waitForEvent('download')` and exercise downloaded output in a separate page when relevant.
6. Add axe rules only when they express the intended requirement; do not suppress violations without documenting the reason.
7. Add a trace-friendly assertion close to every state transition.

Key shell/editor flows run at 1440×900, 1024×768, 768×1024, and 375×812. Chromium is the initial CI browser; additional browser projects can be added once cross-browser differences are triaged.

## Debugging failures

- Re-run one unit file: `npx vitest run tests/unit/storage.test.js`.
- Re-run one browser file: `npx playwright test tests/e2e/interactions.spec.js`.
- Re-run by name: `npx playwright test --grep "accordion"`.
- Open the Playwright UI: `npm run test:e2e:ui`.
- View a retained trace: `npx playwright show-trace test-results/<test-name>/trace.zip`.
- Open the last HTML report: `npx playwright show-report`.
- Inspect screenshots and videos in `test-results/` after failures.

If the local server port is occupied, stop the existing process or set `PORT=4173` for a manually started `node tests/e2e/server.mjs`. CI always starts an isolated server.

## Snapshots

No visual or text snapshots are currently used. This is intentional: the tests assert semantics and behavior without normalizing large generated documents. If snapshots are introduced later, review the actual diff before updating with `npx vitest -u` or `npx playwright test --update-snapshots`. Never update snapshots solely to make a failure disappear.

## Accessibility scope and manual checks

Automated checks cover accessible names and labels, selected ARIA relationships and states, tab semantics, keyboard traversal, focus indicators, reduced motion, media-alt authoring warnings, and configured color-contrast reporting. axe-core is used where it can reliably inspect the builder DOM.

Automation does not replace these manual checks:

- Screen-reader testing with NVDA/JAWS on Windows and VoiceOver on macOS/iOS
- Browser zoom and text-only zoom through 200–400%
- High-contrast and forced-colors modes
- Keyboard behavior in every modal; focus trapping and focus restoration remain tracked gaps
- Contrast over uploaded imagery and arbitrary rich-text combinations
- Captions, transcripts, and audio descriptions with real instructional media
- Cognitive load, instruction clarity, and correctness of authored alternatives

## Manual Rise testing still required

Standalone, iframe, and fragment output must still be tested manually inside supported Articulate Rise blocks. Verify iframe sizing, CSP/sandbox behavior, focus movement between Rise and the component, course navigation, completion expectations, hosted media paths, and the exact publishing/LMS environment. Automated local-browser tests cannot reproduce Rise's editor or hosted runtime.

## Manual Moodle testing still required

Test exported HTML in the Moodle content type actually used by the organization. Verify HTML filtering, iframe permissions, theme CSS collisions, responsive sizing, keyboard navigation, media paths, completion/grade behavior, and the target Moodle version's security policy. No Moodle or SCORM deployment is performed by this repository.

## CI behavior

`.github/workflows/tests.yml` installs pinned dependencies, runs unit tests and coverage, installs Playwright Chromium, runs E2E tests against the local server, and uploads coverage plus retained Playwright failure artifacts. It does not assume a public deployment.
