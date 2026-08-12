# Compatibility results log

This is the empirical record: what has actually been run, when, by whom, and what happened. `docs/RISE-COMPATIBILITY-MATRIX.md` is the reasoning/classification; this file is the evidence that classification is supposed to be pinned to. When a tier in the matrix changes, there should be a row here justifying it — a tier with no corresponding row here is a claim, not a result.

Add a new row every time you run `docs/RISE-TEST-CHECKLIST.md`, test the Web Package ZIP path, or re-run the automated suite in a new environment. Do not overwrite old rows — append, so drift over time (e.g. a Rise update that breaks something that used to pass) stays visible. (Moodle/SCORM are out of scope for this project — see below — so `docs/MOODLE-SCORM-TEST-CHECKLIST.md` is not part of this cadence.)

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
| 2026-08-07 | Project author | Rise authoring preview | Not recorded — tester did not specify which catalog component(s) | Pass | Both the Iframe Snippet (Option A) and HTML Block Fragment (Option B) export formats were manually pasted into a Rise 360 "Code › Add code" block and confirmed rendering/interactive in the authoring preview. |
| — | — | Rise share-link preview | — | **Not yet tested** | Follow `docs/RISE-TEST-CHECKLIST.md` Test A/B step 7. |
| 2026-08-07 | Project author | Rise published course | Not recorded — tester did not specify which catalog component(s) | Pass | Both the Iframe Snippet (Option A) and HTML Block Fragment (Option B) export formats confirmed working after publishing the course. |
| — | — | Rise web export (offline) | — | **Not yet tested** | Only applicable if your workflow uses Rise's static export instead of Rise 360 hosting; see Test C. |
| 2026-08-12 | Project author | Rise authoring preview, published course | Accordion, with completion tracking on and Rise's own "Set completion requirements" toggle enabled on the code block | Fail (Option A) / Pass (Option B) | Option A (Iframe Snippet): internal progress reached 100%, but Rise's sidebar completion % and the Continue block gated on this component never unlocked, reproduced twice from a fresh reload. Option B (HTML Block Fragment), same component/config: Rise's Continue block unlocked correctly. Root cause: Rise's "Add code" block renders pasted content inside its own sandboxed bridge (`sandbox.articulateusercontent.com`); Option A's extra `<iframe srcdoc="...">` wrapper adds a second level of nesting the `postMessage` call must cross, so it never reaches Rise. See `docs/COMPLETION-INTEGRATION.md` "Export-format caveat" and `docs/RISE-COMPATIBILITY-MATRIX.md`. |

## Manual results — Web Package ZIP

| Date | Tester | Method | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-08-12 | Project author | Extracted the ZIP, hosted `index.html` + `assets/` externally, embedded that hosted page in a Rise 360 course | Pass | Confirms the documented Fallback path (`docs/RISE-COMPATIBILITY-MATRIX.md` "Web Package ZIP, extracted and hosted externally, embedded...") — moves this format from Preview to Confirmed. |

## Out of scope for this project

Moodle compatibility and SCORM packaging are not goals of this project — it targets Rise 360 delivery only. This is a deliberate scope decision (confirmed 2026-08-12), not an outstanding gap. `docs/MOODLE-SCORM-TEST-CHECKLIST.md` is kept for reference only, in case that scope ever changes; no rows are expected here.

## How to add a row

1. Run the relevant checklist or automated command.
2. Add a row above with the date, who ran it, and exactly what happened — including partial passes and the specific step that failed, not just "fail".
3. If the result changes a tier, update `docs/RISE-COMPATIBILITY-MATRIX.md` and `js/compatibility.js` in the same change, and reference this row's date in the commit/PR description.
