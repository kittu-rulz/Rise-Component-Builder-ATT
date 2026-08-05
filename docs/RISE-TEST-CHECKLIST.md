# Manual Rise test checklist

**Requires:** a real Articulate Rise 360 account with a course you can edit, or a sandbox/trial course. This cannot be automated — see `docs/RISE-COMPATIBILITY-MATRIX.md` for why (Rise itself, not just this project's output, is the untested variable).

Run this once per component you need Confirmed for, and once per Rise-side change (Rise updates its own editor regularly; a passing result today is not permanent — re-run periodically, see `docs/COMPATIBILITY-RESULTS.md`).

## Before you start

1. In this application, select the component to test, configure it (or leave defaults), and open **Export Block**.
2. Read the compatibility report at the top of the modal for whichever option you're about to test — it names the specific thing that's unverified.
3. Have `docs/COMPATIBILITY-RESULTS.md` open in another tab; you'll fill in a row at the end.

## Test A — Option A: Iframe snippet (srcdoc)

1. With **Option A: Iframe Snippet (srcdoc)** selected, click **Copy Code**.
2. In Rise, open the lesson where the block should appear → **Block library** → **`</>` Code** → **Add code**.
3. Paste the copied code into the code editor exactly as copied. Do not manually edit the `srcdoc` attribute.
4. Save the code block.
5. Click Rise's own **Preview** for that lesson.
6. Check, in order — stop and record a **fail** at the first one that doesn't hold:
   - a. Does the block appear at all, or is it blank/missing?
   - b. Does it render at roughly the expected width/height, or is it clipped/scrolled awkwardly inside Rise's block frame?
   - c. Click every interactive element (e.g. an accordion header, a quiz option, a hotspot pin). Does each respond?
   - d. Tab to the block using only the keyboard (no mouse). Can you reach every interactive control and activate it with Enter/Space/arrow keys, matching what `docs/RISE-COMPATIBILITY-MATRIX.md` claims for that component?
   - e. If the component has completion tracking enabled, complete it. Does Rise's own lesson-completion state change, or does nothing happen on Rise's side? (A visible in-block progress bar reaching 100% is expected either way — that part is this project's own UI, not Rise's. What you're checking is whether *Rise* also marks the lesson/block complete.)
7. Repeat step 6 in Rise's **share-link preview** (a shareable pre-publish link, not just the in-editor preview) if your Rise plan supports it — this is a separate row in the matrix.
8. If you have access to publish to a test/sandbox course, repeat step 6 once more against the fully published lesson.

## Test B — Option B: HTML block fragment

1. Switch to **Option B: HTML Block Fragment**, click **Copy Fragment**.
2. Repeat steps 2–8 above, pasting the fragment instead of the iframe snippet.
3. Additionally check: does anything on the *rest* of the Rise lesson page look visually broken after adding this block (unexpected color/spacing changes elsewhere on the page)? This format's CSS class names are not scoped against the host page by design — a collision here is expected to be possible, not a surprise.

## Test C — Rise web export (if applicable)

Only run this if your workflow actually uses Rise's own "Export" to a static HTML5 bundle rather than publishing to Rise 360 hosting.

1. Publish/export the course containing your test block per your normal Rise web-export process.
2. Open the exported bundle's lesson page **with your machine's network connection disabled** (airplane mode, or block `fonts.googleapis.com`/`fonts.gstatic.com` at the OS/hosts-file level).
3. Confirm the block's text is still visible and legible (it should fall back to a system sans-serif font — see `docs/RISE-COMPATIBILITY-MATRIX.md` "Offline / restricted font behaviour"), even though the intended font didn't load.
4. Confirm interactive behavior (step 6c/6d above) still works fully offline — it should, since the compiled document never makes network calls of its own (`connect-src 'none'`) except for the font request and any author-supplied external media URLs.

## Recording your result

For each test (A/B/C) and each Rise surface (editor preview / share-link preview / published / web-export), add a row to `docs/COMPATIBILITY-RESULTS.md` with:

- Date, tester, Rise version/plan (Rise doesn't expose a version number in the UI the way desktop software does — note the date instead, since that's what the entry is really pinned to).
- Component tested, and its configuration (default vs. customized, completion tracking on/off).
- Pass / Fail / Partial, with the specific step number that failed if not a full pass.
- Whether this changes the tier for that row in `docs/RISE-COMPATIBILITY-MATRIX.md` — if so, update both the matrix and `js/compatibility.js` in the same change.
