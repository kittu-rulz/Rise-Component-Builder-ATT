# Compatibility results log

This is the empirical record: what has actually been run, when, by whom, and what happened. `docs/RISE-COMPATIBILITY-MATRIX.md` is the reasoning/classification; this file is the evidence that classification is supposed to be pinned to. When a tier in the matrix changes, there should be a row here justifying it — a tier with no corresponding row here is a claim, not a result.

Add a new row every time you run `docs/RISE-TEST-CHECKLIST.md`, `docs/MOODLE-SCORM-TEST-CHECKLIST.md`, or re-run the automated suite in a new environment. Do not overwrite old rows — append, so drift over time (e.g. a Rise update that breaks something that used to pass) stays visible.

## Automated results

| Date | Surface | Method | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-08-03 | Chrome (Chromium), standalone exported fixtures | `npm run test:e2e -- --project=chromium` (`tests/e2e/exported-fixtures.spec.js`, `tests/e2e/persistence-export.spec.js`) | Pass | All 7 fixture components (Accordion, Flip Cards, Tabs, Multiple Choice, Hotspots, Vertical Timeline, Audio Player) load standalone with no console errors and respond to keyboard-only interaction. |
| 2026-08-03 | Offline/restricted-font fallback | `tests/e2e/exported-fixtures.spec.js` (Google Fonts requests blocked) | Pass | Text remains visible via the `sans-serif` fallback token when `fonts.googleapis.com`/`fonts.gstatic.com` are blocked. |
| — | Firefox, standalone exported fixtures | `npm run test:e2e -- --project=firefox` | **Not yet run against this fixture set** | Pre-existing suite has 12 known timeout failures in this sandbox (`docs/KNOWN-ISSUES.md`) unrelated to this fixture set; re-verify in an unrestricted runner. |
| — | Safari (WebKit), standalone exported fixtures | `npm run test:e2e -- --project=webkit` | **Not yet run against this fixture set** | Existing WebKit project passes elsewhere in the suite; run the new spec explicitly and log the result here. |

## Manual results — Rise

| Date | Tester | Rise surface | Component(s) | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| — | — | Rise authoring preview | — | **Not yet tested** | Follow `docs/RISE-TEST-CHECKLIST.md` Test A/B. |
| — | — | Rise share-link preview | — | **Not yet tested** | Follow `docs/RISE-TEST-CHECKLIST.md` Test A/B step 7. |
| — | — | Rise published course | — | **Not yet tested** | Follow `docs/RISE-TEST-CHECKLIST.md` Test A/B step 8. |
| — | — | Rise web export (offline) | — | **Not yet tested** | Only applicable if your workflow uses Rise's static export instead of Rise 360 hosting; see Test C. |

## Manual results — Moodle / SCORM

| Date | Tester | Moodle version | Surface | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| — | — | — | Default rich-text HTML field | **Not yet tested** | Follow `docs/MOODLE-SCORM-TEST-CHECKLIST.md` Test A. Expected to fail (script stripped) under default configuration. |
| — | — | — | File resource / IFrame embed | **Not yet tested** | Follow Test B. |
| — | — | — | Moodle mobile app | **Not yet tested** | Follow Test C. |
| — | — | — | SCORM 1.2 / 2004 package | **N/A — no package exists to test** | Confirmed absent by design today (`docs/KNOWN-ISSUES.md`); re-check this row if ZIP/SCORM packaging is ever implemented. |

## How to add a row

1. Run the relevant checklist or automated command.
2. Add a row above with the date, who ran it, and exactly what happened — including partial passes and the specific step that failed, not just "fail".
3. If the result changes a tier, update `docs/RISE-COMPATIBILITY-MATRIX.md` and `js/compatibility.js` in the same change, and reference this row's date in the commit/PR description.
