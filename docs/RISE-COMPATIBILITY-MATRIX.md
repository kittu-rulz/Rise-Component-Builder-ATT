# Rise / LMS compatibility matrix

This is the authoritative compatibility classification for every place an exported component might end up: inside Articulate Rise, inside an LMS via SCORM or a raw HTML embed, or just opened as a file in a browser. It exists because this project's export pipeline (`docs/EXPORT-CONTRACT.md`) has never been run inside a live Rise course or a real LMS as part of its own automation — every claim below says exactly what evidence backs it, so nothing here is asserted on the strength of "this is how the target is documented to work" alone unless labeled that way.

**Do not read "Preview" as "broken."** It means: built to the target's own documented capability, but never independently run against that real target by this project. Read "Confirmed" as: this project has actual automated-test or logged manual-test evidence, not just a plausible design.

The same four tiers back the in-app export compatibility report (`js/compatibility.js`, shown in the Export modal before any copy/download action). If you change a tier in one place, update the other — they are meant to never disagree.

| Tier | Meaning |
| --- | --- |
| **Confirmed** | Verified by this project's own automated tests, or a manual test run logged in `docs/COMPATIBILITY-RESULTS.md`. |
| **Preview** | Technically built to the target's own documented capability, but never independently run against that real target by this project. |
| **Fallback** | Degrades gracefully rather than failing outright, under a known, documented condition (often: only with a non-default host setting). |
| **Unsupported** | Known not to work today, or no working implementation exists yet. |

## Scope

This project targets **Rise 360 delivery only**. Moodle compatibility and SCORM packaging are explicitly **out of scope** — a deliberate decision (recorded `docs/COMPATIBILITY-RESULTS.md`, 2026-08-12), not a gap this project is tracking toward "Confirmed." They're still classified below (mostly **Unsupported**) so this matrix stays literally accurate about what does and doesn't work today, but for those rows specifically, "Unsupported" means "not a goal of this project," not "broken and pending a fix."

## Export workflows

| Workflow | Tier | Why |
| --- | --- | --- |
| Standalone `.html` file opened directly in a browser | **Confirmed** | The compiled document is exercised by this project's own Playwright suite (`tests/e2e/persistence-export.spec.js`, `tests/e2e/exported-fixtures.spec.js`) in real Chromium/Firefox/WebKit builds, loaded exactly as a user would open the downloaded file. |
| Iframe snippet (`<iframe srcdoc="...">`) pasted into Rise's **Code › Add code** block | **Confirmed**, with a **known completion-tracking limitation** | Manually tested in both the Rise authoring preview and a published Rise 360 course — see `docs/COMPATIBILITY-RESULTS.md` (2026-08-07). Rise's block editor preserves the pasted `srcdoc` attribute and the nested iframe renders and responds to interaction correctly. **Confirmed broken for completion tracking** (`docs/COMPATIBILITY-RESULTS.md`, 2026-08-12): this format's extra iframe nests the component one level too deep inside Rise's own sandbox for Rise's Continue-block gating to detect the completion signal — use the HTML fragment format below when completion tracking is required (`docs/COMPLETION-INTEGRATION.md` "Export-format caveat"). |
| HTML fragment (style + markup + script) pasted into Rise's **Code › Add code** block | **Confirmed** | Manually tested in both the Rise authoring preview and a published Rise 360 course — see `docs/COMPATIBILITY-RESULTS.md` (2026-08-07). Its CSS class names are still not scoped against the host page — a known, deliberate trade-off (`docs/EXPORT-CONTRACT.md` "CSS isolation, by format"), not a bug, and unrelated to whether Rise accepts the format. Also the only format confirmed to work with completion tracking — see `docs/COMPATIBILITY-RESULTS.md` (2026-08-12) and `docs/COMPLETION-INTEGRATION.md` "Export-format caveat". |
| HTML fragment pasted into a generic (non-Rise) CMS/LMS rich-text HTML field, default configuration | **Unsupported** | Most rich-text editors (Moodle's Atto/TinyMCE included — see below) strip inline `<script>` tags by default unless the site/user has an elevated "trust content" capability. The static markup may render; the interactive behavior will not run. |
| Standalone `.html` file uploaded to a host and displayed via an iframe/file-resource embed (no script-stripping involved) | **Fallback** | Sidesteps the rich-text-editor script-stripping problem entirely, at the cost of an extra authoring step (upload + embed instead of paste). Not independently tested against a specific host by this project. |
| Web Package ZIP, extracted and hosted externally, embedded the same way as the standalone-`.html`-plus-iframe row above | **Confirmed** | The ZIP itself cannot be "run through Rise" — it isn't a Rise-native upload format, and Rise has no documented "upload a ZIP for a custom block" mechanism. What's now confirmed is that the extracted `index.html`, hosted externally, works correctly when embedded inside a Rise 360 course — see `docs/COMPATIBILITY-RESULTS.md` (2026-08-12). This is the recommended path whenever the component uses uploaded audio, video, or a large image, since those can't travel through the single-file/paste formats at all (`docs/MEDIA-ASSET-PIPELINE.md`). |
| SCORM 1.2 package | **Unsupported** | Out of scope for this project (see "Scope" above), not a pending gap. No archive is produced — the Web Package ZIP above is a plain static bundle (`index.html` + `assets/`), not a SCORM-conformant package (no `imsmanifest.xml`, no SCORM API wrapper), and none is planned. |
| SCORM 2004 package | **Unsupported** | Same as SCORM 1.2 — out of scope for this project, not a pending gap. |

## Rise-specific surfaces

| Surface | Tier | Why |
| --- | --- | --- |
| Rise authoring preview (the "Preview" button while editing a course) | **Confirmed** | Manually tested with both the Iframe Snippet and HTML Block Fragment export formats — see `docs/COMPATIBILITY-RESULTS.md` (2026-08-07). |
| Rise published course | **Confirmed** | Manually tested with both the Iframe Snippet and HTML Block Fragment export formats after publishing — see `docs/COMPATIBILITY-RESULTS.md` (2026-08-07). |
| Rise share-link preview (a shareable pre-publish preview link) | **Preview** | Not yet tested directly — the authoring preview and published course are now confirmed (above), but a share-link preview is a distinct rendering context that hasn't been separately checked. |
| Rise web export (Rise's own "Export" to a static HTML5 bundle, if used instead of publishing to Rise 360 hosting) | **Preview**, with a known **Fallback** caveat | Untested directly. If the resulting bundle is later run fully offline, this project's exported component still degrades gracefully for typography (see "Offline/restricted font behaviour" below) but any author-supplied *external* media URL (not uploaded through this tool) has no offline fallback at all. |

## Learning management systems

**Out of scope for this project** — see "Scope" above. The rows below are kept for reference (they're still factually accurate descriptions of generic Moodle behavior, useful if this scope ever changes), not because Moodle support is planned or being tracked.

| Surface | Tier | Why |
| --- | --- | --- |
| Moodle desktop (browser), HTML pasted into a default rich-text field | **Unsupported** | Moodle's default HTML filtering strips `<script>` content for any user without the "trust content" capability — a standard, widely-documented Moodle behavior, not specific to this tool's output. |
| Moodle desktop (browser), standalone `.html` uploaded as a File resource and embedded via an IFrame-type activity/plugin | **Fallback** | A well-known Moodle workaround that avoids the rich-text filter entirely. Plausible and commonly used, but not independently tested by this project against a specific Moodle version. |
| Moodle desktop (browser), via SCORM package | **Unsupported** | This project produces no SCORM package — out of scope (see above). |
| Moodle mobile app | **Unsupported / unverified** | The Moodle mobile app renders content in its own constrained webview and requires a downloaded SCORM package for full offline support — neither condition is met here. |

## Browsers (opening the standalone export directly)

| Browser | Tier | Why |
| --- | --- | --- |
| Chrome | **Confirmed** | Playwright's `chromium` project passes fully across the e2e suite. |
| Edge | **Preview** | Chromium-based, same rendering engine as the Confirmed Chrome result above — very likely equivalent, but Edge itself is never a distinct automated project in this repo, so this is an inference, not a direct run. |
| Firefox | **Fallback** | Playwright's `firefox` project exists and is expected to work, but `docs/KNOWN-ISSUES.md` records 12 tests failing on `page.goto`/setup timeouts in this development sandbox specifically — unconfirmed whether that's environment latency or a real defect. Re-verify in an unrestricted CI runner before calling Firefox either broken or fine. |
| Safari | **Fallback** | Playwright's `webkit` project passes (one test skipped for an unrelated Windows/WebKit/IndexedDB test-environment limitation — `docs/KNOWN-ISSUES.md`). Playwright's WebKit-on-Windows is not the same runtime as real macOS/iOS Safari, so this remains an inference rather than a Confirmed result. |

## Operational conditions

| Condition | Tier | Why |
| --- | --- | --- |
| Keyboard-only operation | **Confirmed**, for: Accordion, Tabs, Flip Cards, Multiple Choice, Multiple Select, Timeline, Hotspots, Audio Player | Dedicated e2e keyboard-interaction assertions exist for all of these (`tests/e2e/interactions.spec.js`, plus the new `tests/e2e/exported-fixtures.spec.js` added alongside this matrix, which specifically closed the pre-existing Hotspots/Audio gap). |
| Keyboard-only operation | **Preview**, for all other components | Structural ARIA/keyboard-handling patterns are consistent across every generator (`docs/ARCHITECTURE.md` §7), and hostile-input unit coverage exists for all 20 (`tests/unit/generators.test.js`), but not every component has a dedicated e2e keyboard-interaction assertion yet. |
| Restricted corporate network — typography | **Confirmed** | `tests/e2e/exported-fixtures.spec.js` blocks requests to `fonts.googleapis.com`/`fonts.gstatic.com` and asserts the component still renders visible, legible text via the built-in `sans-serif` fallback baked into every theme's font tokens (`js/preview.js`: `--font-family: '<font>', sans-serif;`). |
| Restricted corporate network — externally-linked media | **Unsupported** | Only *uploaded* media is embedded (as a `data:` URL or asset-relative path) or otherwise made portable. An author-supplied *external* image/audio/video URL has no offline/blocked-network fallback — the CSP's `img-src`/`media-src` explicitly permit `http:`/`https:` fetches, so a blocked destination simply fails to load. |
| Restricted corporate network — everything else | **Confirmed by construction** | The compiled document's CSP sets `connect-src 'none'` unconditionally (`docs/EXPORT-CONTRACT.md`), so no exported component can make an XHR/fetch call of any kind, blocked network or not — there is nothing else to reach out to a restricted network for. |
| Offline / restricted font behaviour | **Confirmed** | Same automated test as above: every theme's font stack ends in a generic `sans-serif` fallback, so blocking Google Fonts degrades typography (a serif heading font renders in the fallback sans-serif) without ever breaking layout or hiding text. |

## How to move a Preview row to Confirmed

1. Follow `docs/RISE-TEST-CHECKLIST.md`. (`docs/MOODLE-SCORM-TEST-CHECKLIST.md` exists for reference only — Moodle/SCORM are out of scope for this project, see "Scope" above.)
2. Record the exact result — pass, fail, or partial, with the specific Rise version — in `docs/COMPATIBILITY-RESULTS.md`.
3. Update the tier in this file and in `js/compatibility.js` together.

## Non-goals of this matrix

- It does not certify this application as "Rise-certified" or "SCORM-conformant" in any formal sense — those are third-party certification programs this project has not pursued.
- It does not cover component-specific content accessibility (alt text quality, color contrast of author-chosen colors, etc.) — see `docs/KNOWN-ISSUES.md` "Accessibility gaps" for that.
- It will go stale the moment Rise, Moodle, or a browser changes behavior. Tiers here reflect the state described in `docs/COMPATIBILITY-RESULTS.md` as of its last update, not a permanent guarantee.
