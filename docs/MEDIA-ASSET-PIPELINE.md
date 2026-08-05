# Media asset pipeline

This documents the full lifecycle of an uploaded (or externally linked) image, SVG, audio, video, or caption file: what's validated at upload, what's stored, what's checked before export, and — for every export mode — whether that mode actually embeds, packages, links, or simply cannot include a given asset. As with `docs/SECURITY.md` and `docs/VALIDATION-RULES.md`, nothing here is claimed unless it's backed by code and (where practical) an automated test.

## Where things live

- `js/media.js` — file validation, SVG sanitization, dimension/resize logic, content hashing. No DOM/browser-storage dependency; the pure decision functions (`computeResizeTarget`) are unit-testable in this project's Node-only test environment (`tests/media.test.mjs`); the browser-only pieces (`readImageDimensions`, `resizeImageBlob`, `computeFileHash`'s `crypto.subtle` dependency) fail open when unavailable rather than throwing.
- `js/media-storage.js` — the IndexedDB-backed store: save/get/delete, duplicate lookup, object-URL lifecycle (see `docs/SECURITY.md` "External links and object URL lifecycle").
- `js/media-upload.js` — the authoring UI control (drop zone, URL field, preview, source badge, error/status messaging).
- `js/export.js#prepareMediaExport` — resolves every media reference in a config at export time: embed as a `data:` URL, or resolve to a relative-path packaged asset (with or without a "can't be included" warning, depending on `mode`).
- `js/zip.js` — dependency-free ZIP writer/reader (STORE method), since this application has no bundler and ships no runtime dependencies. Used by both the Rise Project ZIP export and the project package below.
- `js/export.js#buildRiseProjectZip` — packages a compiled component (`index.html` + `assets/`) into a downloadable ZIP.
- `js/project-package.js` — packages/restores an *editable Builder project* (`project.json` + `media/`) so it can travel with its media between browsers/devices.

## Upload-time validation (`js/media.js#prepareMediaFile`)

Every uploaded file passes through these checks, in order, before it is ever stored:

1. **Extension + declared MIME type**, both checked against a fixed allowlist per kind (`image`: jpg/jpeg/png/webp/svg/gif; `audio`: mp3/wav; `video`: mp4/webm; `captions`: vtt). A mismatched extension/MIME pair (e.g. a `.png` claiming `image/jpeg`) is rejected. **MP3 is recommended (not enforced) for packaged audio**: it's universally playable and produces the smallest packaged file, whereas WAV — still fully supported, never rejected — is uncompressed and multiplies the ZIP's size for the same audio length. No transcoding happens automatically; this is authoring guidance, not a validation rule, since this is a client-only tool with no server-side conversion capability.
2. **Configurable file-size limit**, per kind, author-adjustable in Builder Settings and clamped to a safe bounded range (`MEDIA_LIMIT_BOUNDS_MB`, `js/storage.js`) so an effectively-unlimited size can't be configured.
3. **Byte-signature verification** (`hasExpectedFileSignature`) — the file's actual leading bytes are checked against its declared type (JPEG/PNG/GIF/WebP/WAV/MP3/MP4/WebM magic numbers, a `WEBVTT` text-prefix for captions), independent of what the extension/MIME claim. This is what catches a renamed/mislabeled file.
4. **SVG-specific sanitization**: SVG is never trusted as an opaque binary — it's parsed as text and rejected wholesale (not lossily repaired) if it contains scripts, event handlers, external references, or embedded HTML. See `docs/SECURITY.md` for the exact check list.
5. **Image-dimension limit** (new): a raster image (not SVG) is decoded via `createImageBitmap` (falling back to `Image()`), and rejected outright if its long edge exceeds `MAX_IMAGE_DIMENSION_PX` (8000px) — a guard against a pathological/decompression-bomb-style file, not a limit real photography would ever hit. This step requires a real browser image decoder; in this project's Node-based unit test environment it's a no-op (fails open), and is instead verified in a real browser by `tests/e2e/media-pipeline.spec.js`.
6. **Automatic downscale/compression** (new): if the image is under the hard limit but its long edge still exceeds `IMAGE_RESIZE_THRESHOLD_PX` (2000px), it's downscaled via `<canvas>` to fit within that threshold before storing — most authoring photos/screenshots are far larger than any component will ever render them, and shipping the original only inflates IndexedDB storage and, for small-enough files, the inlined base64 export payload. The author is told this happened (upload status message: "N image(s) were resized to fit within 2000px for optimal performance"). Same fail-open policy as the dimension check.
7. **Duplicate detection** (new): the file's content is hashed (SHA-256 via `crypto.subtle`, see `computeFileHash`) and compared against every already-stored record of the same kind. A byte-for-byte match — even under a different filename — reuses the existing stored asset instead of storing a second copy, and the author is told ("N file(s) matched an asset already uploaded to this project and reused it instead of storing a duplicate"). A `null` hash (digest unavailable — e.g. an insecure, non-localhost context) simply disables this optimization; it never blocks an upload.
8. **Safe filenames**: `sanitizeAssetFilename` (used at export time, see below) strips anything outside `[a-z0-9_-]` and normalizes Unicode before a file is ever written into an export's `assets/` manifest — an author-supplied filename never reaches an export path unsanitized.

## Author-facing metadata (per file)

Every stored record carries: `name`, `sanitizedName`, `mimeType`, `size`, `duration` (audio/video), `dimensions` (`{ width, height }`, images only — the final, post-downscale dimensions if resized), `kind`, `createdAt`, `resized`, `contentHash`, and four author-editable fields: `altText`, `decorative`, `caption`, `transcript`. Whether each is *required* is enforced by `js/validation.js`'s preflight engine (`docs/VALIDATION-RULES.md`), not by the media pipeline itself:

- **Alternative text**: required unless the image is explicitly marked decorative (`general-missing-alt-text`, Warning severity).
- **Caption field**: video's `captionsUrl` — wires a real `<track kind="captions">` element into the exported `<video>` when present (`components/video-frame.js`).
- **Transcript field**: present on both Audio Player and Video Player items, rendered as a `<details>` disclosure in the exported markup; recommended (not required) via preflight when absent.

## Clear local-vs-external indication

Every media-capable field shows an explicit, always-visible badge — not just an implied state from which sub-control happens to be active:

- **"Local upload (stored in this browser)"** — an uploaded file, resolvable right now.
- **"External URL"** — a plain `http(s)` URL, not an upload.
- **"Missing local file"** — an uploaded-file *reference* exists (from a saved/reopened project) but its underlying IndexedDB record doesn't (cleared browser data, a different browser/profile, or a different device). The field additionally shows an inline recovery message directing the author to "Replace file."
- **"No file selected"** — the field is empty.

This is implemented in `js/media-upload.js`'s `updateSourceBadge()`, verified in `tests/e2e/media-pipeline.spec.js`.

## Missing-asset recovery

Two layers, covering two different moments:

1. **On project open**: `restoreMediaReferences` (`js/media-storage.js`) attempts to resolve every media reference in the reopened config and returns `{ restored, missing }`. If anything is missing, `app.js` shows one summary toast ("N uploaded media files are missing from this browser").
2. **Per field** (new): the specific field(s) affected show the "Missing local file" badge and inline notice described above, so the author knows *which* image/audio/video needs re-uploading, not just that something, somewhere, does. Recovery itself is manual — re-upload via "Replace file" — there is no automatic fetch-from-elsewhere, since the original bytes only ever lived in that one browser's IndexedDB.

## Export manifest and per-export-mode asset handling

`js/export.js#prepareMediaExport(config, { mode })` resolves every media reference in a config exactly once (`resolvedMedia` cache). Its behavior depends on `mode`:

- **`mode: 'inline'`** (default — iframe snippet, HTML fragment, standalone HTML download): a small raster image (not SVG, at or under `SMALL_IMAGE_INLINE_LIMIT`, 1MB) is **embedded as a `data:` URL**. This is the one path prompt #12 explicitly warns against doing silently for large media — hence the threshold. Everything else (SVG, oversized images, all audio, all video, all captions) is **referenced by relative path** (`assets/<safe-filename>`) and a warning is generated ("`<name>` requires an external asset file at `assets/<name>`; it cannot be safely included in a single HTML file"), since none of these three formats can actually deliver that file alongside themselves.
- **`mode: 'package'`** (Rise Project ZIP, prompt 12A): every local media reference — regardless of size or kind — is **always referenced by relative path and actually packaged**, since delivering the file alongside `index.html` is the entire point. No "requires an external file" warning is produced in this mode.

A third outcome applies in both modes: if the media record no longer exists in IndexedDB (see missing-asset recovery above), the field is exported as an **empty string**, and the missing asset's name is added to a dedicated `missing` array (not just the human-readable `warnings` array) — this is what a caller gates blocking on, rather than string-matching warning text.

The **asset manifest** (`{ schemaVersion, assets: [{ filename, sourceMediaId, mimeType, relativePath }] }`) is de-duplicated per export (`uniqueFilename()` inside `prepareMediaExport`) so two different uploads that happen to share a sanitized filename never collide — one gets a `-2`, `-3`, ... suffix. It's available standalone (`downloadAssetManifest`) and is automatically embedded inside the Rise Project ZIP as `assets/manifest.json`.

| Export mode | Small image | Large image / SVG / audio / video / captions |
| --- | --- | --- |
| **Iframe embed snippet** (`srcdoc`, copy-paste) | Embedded as `data:` URL — works immediately, no extra step | Emits `assets/<name>` in the markup, but nothing actually delivers that file alongside a pasted snippet — the author must place it there manually, or the reference will 404. The compatibility report's warning box surfaces this before the author copies anything. **Use Rise Project ZIP instead if this applies.** |
| **Paste-friendly HTML fragment** | Same as iframe snippet | Same caveat as iframe snippet |
| **Standalone HTML download** | Embedded — the downloaded file is fully self-contained | **Blocked outright**, not silently broken: `app.js`'s download handler refuses the download and shows a toast pointing to Rise Project ZIP whenever `prepareMediaExport`'s warnings are non-empty. A standalone HTML download you actually receive is guaranteed to have every asset embedded. |
| **Rise Project ZIP** (`js/export.js#buildRiseProjectZip`, `js/zip.js`) | Packaged as a real file under `assets/`, same as everything else in this mode (never inlined — see `mode: 'package'` above) | **Implemented and real.** `index.html` at the ZIP root, every referenced upload under `assets/<name>`, `assets/manifest.json` included. **Blocked outright** (button disabled, blocking message shown) if any required asset is missing from local storage — never ships a dangling reference. Deterministic: the same project input always produces byte-identical ZIP bytes (`tests/rise-zip.test.mjs`). |
| **Project package** (`.rise-project.zip`, `js/project-package.js`) | N/A — packages the *project*, not a compiled component; see "Editable project portability" below | Every media reference's actual bytes travel under `media/<mediaId>`, restored into IndexedDB on import if not already present there. |
| **SCORM package** | N/A | **Not implemented** at all — visible in Settings as a selectable export format, produces no output. This is a real gap, not a documentation gap: no `imsmanifest.xml`, no SCORM API wrapper exists anywhere in this codebase. |

### Why a hand-written ZIP writer (`js/zip.js`)

This application ships zero runtime dependencies and has no bundler — every module loads directly in the browser as authored (`docs/ARCHITECTURE.md`). A normal npm ZIP package (`jszip`, `fflate`, ...) isn't an option without introducing a build step this project deliberately doesn't have, so `js/zip.js` is a small, self-contained STORE-method (uncompressed) ZIP writer and reader: CRC32, local file headers, central directory, end-of-central-directory record — nothing else. STORE-only keeps it simple and fully deterministic (a fixed timestamp, not `new Date()`, so re-compiling identical input always produces byte-identical output); it is still a genuinely spec-compliant archive, verified directly against a real OS unzip tool (Windows' `Expand-Archive`) during development, not just against its own reader.

### Editable project portability

A saved project's uploaded media lives only in the current browser's IndexedDB — the plain `.rise.json` project export (`js/storage.js#downloadProjectJson`/`importProjectJson`, unchanged) carries only media *references* (a `mediaId` + metadata), so opening it in a different browser reproduces the existing "missing media" experience, never something worse. `js/project-package.js` adds a second, opt-in format: `exportProjectPackage(project)` produces a `.rise-project.zip` containing `project.json` plus every referenced upload's actual bytes under `media/<mediaId>`; `importProjectPackage(zipBlob)` validates `project.json` through the exact same `validateProject()` every other project-load path uses, then restores any media the target browser doesn't already have from the package before returning — so the normal open-project flow (`restoreMediaReferences`) never has anything to report missing that the package actually included. A reference the package *doesn't* have and the browser doesn't either is reported via `missingMedia`, with the same readable-error posture as every other validation path here (`tests/project-package.test.mjs`).

## External dependency warnings

Two independent things a component can depend on over the network, both already surfaced to the author before export:

- **External media URLs**: `js/validation.js`'s `media-external-asset-dependency` rule (Recommendation) flags any field pointing at an external URL rather than an upload — "it will require network access after export and won't travel with the exported file." A plain `http://` (not `https://`) URL additionally gets `media-insecure-http-url` (Warning) — mixed-content blocking risk on an `https` host page.
- **Google Fonts**: loaded via `<link>` in every generated document (`js/export-shell.js`) — a hard, undocumented-elsewhere dependency on Google's CDN being reachable from the learner's network. There is no local-font/offline-font mode currently; see `docs/SECURITY.md`'s residual risks.

## Storage quota handling

- **IndexedDB** (media blobs): `saveMediaRecord` (`js/media-storage.js`) catches a `QuotaExceededError` from the underlying `put()` and rewrites it to a specific, actionable message ("This browser's local media storage is full. Delete unused projects/media or free up disk space, then try again."), matching the same friendly-rewrite policy `js/storage.js` already applies to `localStorage`. Any other storage failure gets a clear, if generic, fallback message — never a raw browser exception.
- **localStorage** (projects/settings/themes/drafts): already covered in `docs/SECURITY.md` and exercised by `tests/unit/storage.test.js`'s quota-failure tests.
- There is currently **no proactive "storage nearly full" warning** before an upload is attempted — quota failures are handled reactively (a clear error when they occur), not predicted in advance. The sidebar's storage-usage meter shows current usage but does not warn at a threshold.

## Known limitations / deliberate scope boundaries

- **No reachability-based garbage collection of orphaned media.** Removing a file from a specific field (or deleting a project) does not delete its underlying IndexedDB record — `deleteMediaRecord` exists and is exercised in tests, but nothing in the running app currently calls it from the UI. This is a deliberate scope boundary, not an oversight: an uploaded asset's `mediaId` can legitimately be referenced by more than one saved project (this is exactly what duplicate detection formalizes — the same picture reused across projects points at one stored record), so a naive "delete on remove" would risk silently breaking a *different* project that still references the same asset. Real reachability tracking (reference-counting across every saved project, not just the currently-open one) is a larger, separate feature. The practical effect today: local media storage only grows, never shrinks automatically. Duplicate detection (this pass) mitigates the growth rate for repeat uploads of the same file; it does not solve unbounded growth from genuinely distinct files.
- **Resolved**: ZIP export (both Rise Project ZIP and the project package) is now real — see the per-export-mode table above. **SCORM export remains entirely unimplemented.**
- **The Rise Project ZIP is not a documented Rise upload format.** Rise has no "upload a ZIP for a custom block" mechanism as far as this project's research establishes — the realistic use is hosting the extracted `index.html` + `assets/` wherever the course's other external content already lives, then embedding it the same way (e.g. an iframe pointed at that URL). This is stated plainly in the export modal and `docs/RISE-COMPATIBILITY-MATRIX.md` — this pipeline does not claim a Rise-native upload path that doesn't exist.
- **No proactive low-storage warning** — see Storage quota handling above.
- **Image compression is fixed-threshold, not author-configurable.** `IMAGE_RESIZE_THRESHOLD_PX`/`MAX_IMAGE_DIMENSION_PX` are constants, not Settings-panel options (unlike the per-kind file-size limits, which are). This was a deliberate simplicity choice for this pass — the thresholds are generous enough that legitimate authoring images are very unlikely to hit the hard limit, and the resize threshold matches what any of this app's components would ever usefully render at.
- **No automated malware scanning of uploads** — restated from `docs/SECURITY.md`: signature checks catch mismatched/spoofed file types, not a malicious payload disguised as a genuinely valid file of the correct type.

## Tests

- `tests/media.test.mjs` (Vitest, Node environment): MIME/extension mismatches, fake-extension/signature mismatches, oversized files, SVG sanitization, `computeResizeTarget`'s pure sizing logic, content hashing and duplicate detection (including the "different kind, same bytes" and "hash unavailable" non-duplicate cases), a missing/deleted record correctly reported by `restoreMediaReferences`, a broken reference correctly warned-and-blanked at export time, and both IndexedDB quota-error and generic-failure message rewrites.
- `tests/e2e/media-pipeline.spec.js` (Playwright, real Chromium): the two browser-only behaviors that need a real image decoder/canvas — automatic downscaling of an oversized image (verified via the stored image's actual decoded pixel dimensions) and hard rejection of an image beyond the maximum dimension — plus the local/external/empty source-badge states in the live UI.
- `tests/e2e/editor-preview.spec.js`: pre-existing coverage for per-item custom artwork upload/removal and configurable size-limit enforcement, unaffected by this pass (re-verified).
- `tests/rise-zip.test.mjs` (prompt 12A): `index.html` at the ZIP root; an uploaded image and an uploaded audio file each resolve to and are packaged at their relative path; an asset no longer referenced by the config is excluded from the ZIP; two uploads sharing a sanitized filename don't collide (plus `createZip` itself rejecting a literal duplicate path outright); a missing/deleted required asset is reported via the dedicated `missing` list rather than shipping a dangling reference; the same project input compiles to byte-identical ZIP bytes on repeated exports; a media-free component still packages a valid ZIP; and `mode: 'inline'` behavior is unchanged by the `mode: 'package'` addition.
- `tests/project-package.test.mjs` (prompt 12A): a project's uploaded media round-trips through a package into a *different, empty* IndexedDB store (simulating a different browser/profile) and comes back intact, byte-for-byte; importing a package doesn't re-fetch media already present locally; a package missing `project.json`, or with an invalid one, fails with the same readable-error posture as every other validation path here rather than throwing something opaque; a project referencing media present in neither the package nor local storage is reported via `missingMedia` without throwing; plain `.rise.json` import remains fully unaffected; and `isProjectPackageFile` correctly distinguishes by extension.
