# Rise / LMS compatibility matrix

This is the authoritative compatibility classification for every place an exported component might end up: inside Articulate Rise, inside an LMS via SCORM or a raw HTML embed, or just opened as a file in a browser. It exists because this project's export pipeline (`docs/EXPORT-CONTRACT.md`) has never been run inside a live Rise course or a real LMS as part of its own automation — every claim below says exactly what evidence backs it, so nothing here is asserted on the strength of "this is how the target is documented to work" alone unless labeled that way.

**Do not read "Experimental" as "broken."** It means: built to the target's own documented capability, but never independently run against that real target by this project. Read "Confirmed" as: this project has actual automated-test or logged manual-test evidence, not just a plausible design.

The same four tiers back the in-app export compatibility report (`js/compatibility.js`, shown in the Export modal before any copy/download action). If you change a tier in one place, update the other — they are meant to never disagree.

| Tier | Meaning |
| --- | --- |
| **Confirmed** | Verified by this project's own automated tests, or a manual test run logged in `docs/COMPATIBILITY-RESULTS.md`. |
| **Experimental** | Technically built to the target's own documented capability, but never independently run against that real target by this project. |
| **Fallback** | Degrades gracefully rather than failing outright, under a known, documented condition (often: only with a non-default host setting). |
| **Unsupported** | Known not to work today, or no working implementation exists yet. |

## Export workflows

| Workflow | Tier | Why |
| --- | --- | --- |
| Standalone `.html` file opened directly in a browser | **Confirmed** | The compiled document is exercised by this project's own Playwright suite (`tests/e2e/persistence-export.spec.js`, `tests/e2e/exported-fixtures.spec.js`) in real Chromium/Firefox/WebKit builds, loaded exactly as a user would open the downloaded file. |
| Iframe snippet (`<iframe srcdoc="...">`) pasted into Rise's **Code › Add code** block | **Experimental** | Rise's documented "Add code" mechanism is built to receive raw HTML/CSS/JS directly, which Rise sandboxes itself. Wrapping that content in an additional hand-authored `srcdoc` iframe is a nested-iframe pattern this project has not confirmed Rise's block editor preserves or accepts. See `docs/RISE-TEST-CHECKLIST.md`. |
| HTML fragment (style + markup + script) pasted into Rise's **Code › Add code** block | **Experimental** | Closer to Rise's own documented mechanism than the iframe snippet (no nested-iframe assumption), but still never independently verified in a live Rise course by this project. Its CSS class names are also not scoped against the host page — a known, deliberate trade-off (`docs/EXPORT-CONTRACT.md` "CSS isolation, by format"), not a bug. |
| HTML fragment pasted into a generic (non-Rise) CMS/LMS rich-text HTML field, default configuration | **Unsupported** | Most rich-text editors (Moodle's Atto/TinyMCE included — see below) strip inline `<script>` tags by default unless the site/user has an elevated "trust content" capability. The static markup may render; the interactive behavior will not run. |
| Standalone `.html` file uploaded to a host and displayed via an iframe/file-resource embed (no script-stripping involved) | **Fallback** | Sidesteps the rich-text-editor script-stripping problem entirely, at the cost of an extra authoring step (upload + embed instead of paste). Not independently tested against a specific host by this project. |
| Rise Project ZIP, extracted and hosted externally, embedded the same way as the standalone-`.html`-plus-iframe row above | **Experimental** | The ZIP itself is real, deterministic, and automated (`tests/rise-zip.test.mjs`) — what's unverified is host behavior once extracted and embedded elsewhere, same caveat as the row above. This is the recommended path whenever the component uses uploaded audio, video, or a large image, since those can't travel through the single-file/paste formats at all (`docs/MEDIA-ASSET-PIPELINE.md`). It is not a Rise-native upload format — Rise has no documented "upload a ZIP for a custom block" mechanism. |
| SCORM 1.2 package | **Unsupported** | No archive is produced — the Rise Project ZIP above is a plain static bundle (`index.html` + `assets/`), not a SCORM-conformant package (no `imsmanifest.xml`, no SCORM API wrapper). |
| SCORM 2004 package | **Unsupported** | Same as SCORM 1.2 — no SCORM packaging of any version exists yet. |

## Rise-specific surfaces

| Surface | Tier | Why |
| --- | --- | --- |
| Rise authoring preview (the "Preview" button while editing a course) | **Experimental** | No access to a live Rise course as part of this project's automation. Authoring-mode preview panes in some course-authoring tools sandbox embedded content more strictly than the tool's final published output — untested here either way. |
| Rise share-link preview (a shareable pre-publish preview link) | **Experimental** | Same reasoning as authoring preview; a different rendering context Rise may or may not treat identically to the published course. |
| Rise web export (Rise's own "Export" to a static HTML5 bundle, if used instead of publishing to Rise 360 hosting) | **Experimental**, with a known **Fallback** caveat | Untested directly. If the resulting bundle is later run fully offline, this project's exported component still degrades gracefully for typography (see "Offline/restricted font behaviour" below) but any author-supplied *external* media URL (not uploaded through this tool) has no offline fallback at all. |

## Learning management systems

| Surface | Tier | Why |
| --- | --- | --- |
| Moodle desktop (browser), HTML pasted into a default rich-text field | **Unsupported** | Moodle's default HTML filtering strips `<script>` content for any user without the "trust content" capability — a standard, widely-documented Moodle behavior, not specific to this tool's output. |
| Moodle desktop (browser), standalone `.html` uploaded as a File resource and embedded via an IFrame-type activity/plugin | **Fallback** | A well-known Moodle workaround that avoids the rich-text filter entirely. Plausible and commonly used, but not independently tested by this project against a specific Moodle version. |
| Moodle desktop (browser), via SCORM package | **Unsupported** | No SCORM package exists yet (see above). |
| Moodle mobile app | **Unsupported / unverified** | The Moodle mobile app renders content in its own constrained webview and requires a downloaded SCORM package for full offline support — neither condition is met here. Assume it behaves worse than desktop browser Moodle, not the same, until tested. |

## Browsers (opening the standalone export directly)

| Browser | Tier | Why |
| --- | --- | --- |
| Chrome | **Confirmed** | Playwright's `chromium` project passes fully across the e2e suite. |
| Edge | **Experimental** | Chromium-based, same rendering engine as the Confirmed Chrome result above — very likely equivalent, but Edge itself is never a distinct automated project in this repo, so this is an inference, not a direct run. |
| Firefox | **Fallback** | Playwright's `firefox` project exists and is expected to work, but `docs/KNOWN-ISSUES.md` records 12 tests failing on `page.goto`/setup timeouts in this development sandbox specifically — unconfirmed whether that's environment latency or a real defect. Re-verify in an unrestricted CI runner before calling Firefox either broken or fine. |
| Safari | **Fallback** | Playwright's `webkit` project passes (one test skipped for an unrelated Windows/WebKit/IndexedDB test-environment limitation — `docs/KNOWN-ISSUES.md`). Playwright's WebKit-on-Windows is not the same runtime as real macOS/iOS Safari, so this remains an inference rather than a Confirmed result. |

## Operational conditions

| Condition | Tier | Why |
| --- | --- | --- |
| Keyboard-only operation | **Confirmed**, for: Accordion, Tabs, Flip Cards, Multiple Choice, Multiple Select, Timeline, Hotspots, Audio Player | Dedicated e2e keyboard-interaction assertions exist for all of these (`tests/e2e/interactions.spec.js`, plus the new `tests/e2e/exported-fixtures.spec.js` added alongside this matrix, which specifically closed the pre-existing Hotspots/Audio gap). |
| Keyboard-only operation | **Experimental**, for all other components | Structural ARIA/keyboard-handling patterns are consistent across every generator (`docs/ARCHITECTURE.md` §7), and hostile-input unit coverage exists for all 22 (`tests/unit/generators.test.js`), but not every component has a dedicated e2e keyboard-interaction assertion yet. |
| Restricted corporate network — typography | **Confirmed** | `tests/e2e/exported-fixtures.spec.js` blocks requests to `fonts.googleapis.com`/`fonts.gstatic.com` and asserts the component still renders visible, legible text via the built-in `sans-serif` fallback baked into every theme's font tokens (`js/preview.js`: `--font-family: '<font>', sans-serif;`). |
| Restricted corporate network — externally-linked media | **Unsupported** | Only *uploaded* media is embedded (as a `data:` URL or asset-relative path) or otherwise made portable. An author-supplied *external* image/audio/video URL has no offline/blocked-network fallback — the CSP's `img-src`/`media-src` explicitly permit `http:`/`https:` fetches, so a blocked destination simply fails to load. |
| Restricted corporate network — everything else | **Confirmed by construction** | The compiled document's CSP sets `connect-src 'none'` unconditionally (`docs/EXPORT-CONTRACT.md`), so no exported component can make an XHR/fetch call of any kind, blocked network or not — there is nothing else to reach out to a restricted network for. |
| Offline / restricted font behaviour | **Confirmed** | Same automated test as above: every theme's font stack ends in a generic `sans-serif` fallback, so blocking Google Fonts degrades typography (a serif heading font renders in the fallback sans-serif) without ever breaking layout or hiding text. |

## How to move an Experimental row to Confirmed

1. Follow `docs/RISE-TEST-CHECKLIST.md` (for Rise surfaces) or `docs/MOODLE-SCORM-TEST-CHECKLIST.md` (for Moodle/SCORM).
2. Record the exact result — pass, fail, or partial, with the specific Rise/Moodle version — in `docs/COMPATIBILITY-RESULTS.md`.
3. Update the tier in this file and in `js/compatibility.js` together.

## Non-goals of this matrix

- It does not certify this application as "Rise-certified" or "SCORM-conformant" in any formal sense — those are third-party certification programs this project has not pursued.
- It does not cover component-specific content accessibility (alt text quality, color contrast of author-chosen colors, etc.) — see `docs/KNOWN-ISSUES.md` "Accessibility gaps" for that.
- It will go stale the moment Rise, Moodle, or a browser changes behavior. Tiers here reflect the state described in `docs/COMPATIBILITY-RESULTS.md` as of its last update, not a permanent guarantee.
