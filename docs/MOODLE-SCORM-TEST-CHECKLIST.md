# Manual Moodle / SCORM test checklist

**Requires:** a real Moodle site you can edit a course on (a local Moodle sandbox/Docker instance is enough), teacher/manager permissions, and ideally the Moodle mobile app installed on a phone. Like the Rise checklist, this cannot be automated — see `docs/RISE-COMPATIBILITY-MATRIX.md`.

## Before you start

SCORM 1.2/2004 packaging is **Unsupported** today — this project's "Prepare ZIP Asset Manifest" button produces only an asset manifest, not a SCORM-conformant archive (`docs/KNOWN-ISSUES.md`). There is no SCORM package to test yet. Confirm this stays true rather than skipping it silently:

1. In the Export modal, click **Prepare ZIP Asset Manifest**.
2. Confirm you get a manifest JSON download and a toast stating ZIP/SCORM packaging is not implemented — **not** a `.zip`/SCORM archive. If a `.zip` file downloads instead, something changed; stop and update `docs/KNOWN-ISSUES.md` and this checklist before continuing.

Everything below tests the two *actually available* export formats (iframe snippet, HTML fragment) against Moodle's own embedding mechanisms — not SCORM.

## Test A — default rich-text HTML field (expected: Unsupported)

This test exists to confirm the matrix's "Unsupported" call is still accurate, not to find a workaround.

1. Export the component (Option B: HTML Block Fragment), copy it.
2. In Moodle, add a **Label** or **Page** resource to a course section, using the default Atto (or TinyMCE) editor.
3. Switch the editor to its **HTML source** view (the `<>` icon) and paste the fragment in, including the `<script>` block.
4. Save and view the resulting page as a student/teacher without site-wide "Trust content" enabled for that content.
5. Check: is the `<script>` block still present when you re-open HTML source view, or has Moodle silently stripped it? Does the component render as static markup only (no click/keyboard interactivity)?
6. Record the result — this is expected to fail (script stripped, no interactivity), confirming the Unsupported tier. If it unexpectedly passes, your Moodle site likely has "Trust content" enabled for your account; note that in the result, since it changes the applicable tier to Fallback for sites configured that way.

## Test B — File resource + IFrame embed (expected: Fallback)

1. Export the component (Option B, or download the standalone `.html` file).
2. In Moodle, add a **File** resource and upload the standalone `.html` file (or, if your Moodle has the IFrame/embed plugin, point it at the uploaded file).
3. Set the display mode to open the file in an embedded frame (Moodle's File resource supports an "Embed" display option) rather than forcing a download.
4. View the resulting activity as a student.
5. Repeat the same checks as Rise Test A step 6 (renders, correct sizing, every interactive control responds to click and to keyboard-only navigation, completion tracking's in-block progress bar reaches 100% if enabled).
6. Note whether Moodle's own activity-completion tracking (if you enabled "completion tracking" on the File/IFrame activity itself) reacts to the block's completion `postMessage` — it is not expected to, since Moodle's File resource has no built-in listener for this project's message shape. This is informational, not a failure.

## Test C — Moodle mobile app

1. Open the same course in the Moodle mobile app (iOS or Android).
2. Repeat Test B's checks inside the app's webview.
3. Specifically check things the matrix flags as unverified for mobile: does the file resource open at all in the app's embedded viewer, does touch interaction work in place of click, and does anything render differently from the desktop-browser result in Test B.
4. If the course/activity is also available offline in the app (requires it to be marked for offline access and, for SCORM, a downloaded package — not applicable here since no SCORM package exists), note whether the embedded file still loads without a network connection.

## Recording your result

Add a row per test (A/B/C) to `docs/COMPATIBILITY-RESULTS.md` with:

- Date, tester, Moodle version (Moodle does expose a version number — Site administration → Notifications, or the footer of most themes).
- Component tested and its configuration.
- Pass / Fail / Partial, with the specific step that failed.
- Whether this changes the tier for the corresponding row in `docs/RISE-COMPATIBILITY-MATRIX.md` — if so, update the matrix and `js/compatibility.js` together.
