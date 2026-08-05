# Security

This document specifies the threat model, the sanitization contract every generator must honor, and the currently known residual risks. It consolidates and supersedes the security-relevant sections previously scattered across the root `KNOWN-ISSUES.md`.

## Threat model

There is no backend, no database, and no server-side component in this application by design (`docs/ARCHITECTURE.md`). The realistic attack surface is therefore narrow and specific:

1. **Author-controlled content escaping into an executable context** inside generated HTML (the primary risk — an instructional designer's typed content, or an imported project JSON, ending up as live script/markup instead of inert text).
2. **Uploaded files smuggling executable content** (an SVG with a `<script>`, a mislabeled file whose real content differs from its declared type).
3. **Persisted data (localStorage/IndexedDB) being tampered with or corrupted** and re-entering `appState` unchecked, either directly in the browser or via a hand-edited/malicious imported project JSON file.
4. **The generated component's document escaping its intended sandbox** when embedded in a third-party host (Rise, Moodle, or any other page).

There is no SQL injection, command injection, or server-side request forgery surface, because there is no server.

## Sanitization contract (`js/utilities.js`)

Every function below is a hard boundary: content must pass through the correct one before reaching generated output. This is the mechanism that keeps §10 of `docs/ARCHITECTURE.md` (Validation) actually enforced rather than aspirational.

| Function                                 | Used for                                                      | Behavior                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `escapeHTML` / `escapeHtml`              | Plain text interpolated into HTML                             | Escapes `& < > " '`                                                                                                                                                                                                                                                                   |
| `escapeAttribute`                        | Text interpolated into an HTML attribute                      | `escapeHTML` plus backtick/CR/LF/tab escaping                                                                                                                                                                                                                                         |
| `sanitizeRichText`                       | Rich-text fields (item content, labels, transcripts)          | Allowlists `p, br, strong, b, em, i, u, ul, ol, li` and a narrowly-parsed `<a href="...">` (URL itself passed through `sanitizeURL`); everything else is HTML-escaped, not stripped silently                                                                                          |
| `sanitizeURL`                            | Any URL-shaped value (links, media `src`, background images)  | Rejects `javascript:`/`vbscript:` outright; constrains `data:` to a fixed image-MIME allowlist (`png/jpeg/gif/webp/avif`, base64 only); constrains `blob:` to URLs the app itself registered (`localBlobURLs`); otherwise requires `http:`/`https:` and a `new URL()`-parseable value |
| `escapeJavaScriptString`                 | Values interpolated into inline `<script>` string literals    | Escapes backslash, quotes, backtick, `$`, angle brackets, `&`, line/paragraph separators                                                                                                                                                                                              |
| `serializeForInlineScript`               | Structured values interpolated into inline `<script>` as JSON | `JSON.stringify` plus `< > &` and line/paragraph-separator escaping (defeats `</script>` breakout and JSONP-style callback injection)                                                                                                                                                 |
| `sanitizeCSSColor` / `sanitizeCSSNumber` | Style values                                                  | Regex/range validation with a safe fallback — never passes an unvalidated value into a `<style>` block                                                                                                                                                                                |

`js/preview.js`'s `sanitizePreviewConfig(config, componentId)` is the single call site that applies the correct sanitizer to every field of a component's configuration, keyed by field semantics (rich text vs. URL vs. color vs. numeric), immediately before compilation (`docs/ARCHITECTURE.md` §4). **No generator — registered or legacy — should interpolate a config value into HTML/CSS/JS output without it having passed through `sanitizePreviewConfig` first.**

## External links and object URL lifecycle (verified, no change needed)

- **Tabnabbing**: every generated `target="_blank"` link carries `rel="noopener noreferrer"` — both the dedicated Quick Link Buttons component (`components/button-list.js`) and the rich-text `<a href target="_blank">` allowlist pattern (`js/utilities.js#sanitizeRichText`) apply it unconditionally; there is no code path that emits a `target="_blank"` link without it. `js/preview.js#openPreview()` additionally sets `previewWindow.opener = null` before writing to a popped-out preview window, the standard mitigation for `window.open()`-based reverse tabnabbing.
- **Object URL leaks**: all `URL.createObjectURL()` calls in the codebase (`js/media-storage.js`, `js/media-upload.js`, `js/export.js`, `app.js`) are paired with a revoke, either immediately after a synchronous one-shot use (theme/project/asset downloads, media-duration probing) or through `js/media-storage.js`'s reference-counted cache (`ensureMediaObjectURL`/`releaseMediaObjectURL`/`pruneMediaObjectURLs`/`releaseAllMediaObjectURLs`), which is invoked on project load (restore), every live-preview recompilation (prune anything no longer referenced), "New Project" (release all), and `beforeunload` (release all) — confirmed by reading every call site in this pass; no fix was needed.

## Uploaded file safety (`js/media.js`)

- **Extension/MIME allowlist**: every upload kind (`image`, `audio`, `video`, `captions`) has a fixed map of accepted extensions to accepted MIME types; anything else is rejected.
- **Byte-signature verification** (`hasExpectedFileSignature`): after the extension/MIME check, the file's actual leading bytes (magic numbers) are checked against the declared type — JPEG/PNG/GIF/WebP/WAV/MP3/MP4/WebM signatures, and a `WEBVTT` text-prefix check for captions. This catches a renamed/mislabeled file before it is trusted.
- **SVG is never trusted as an image and passed through** — it is parsed as text and rejected wholesale (not lossily repaired) if it contains any of: `<!DOCTYPE`/`<!ENTITY`, `<script>`/`<foreignObject>`/`<iframe>`/`<object>`/`<embed>`/`<audio>`/`<video>`/`<canvas>`, any `on*=` event-handler attribute, `javascript:`/`vbscript:` URLs, `data:text/html`, external `href`/`xlink:href`/`src` references, or external `@import`/`url()` style references. Only a passing SVG is stored, as a plain-text `Blob`.
- **Size limits** are configurable per media kind in Builder Settings, clamped to a safe bounded range (`MEDIA_LIMIT_BOUNDS_MB` in `js/storage.js`) so an author cannot configure an effectively unlimited upload size.

## Persisted-data integrity (`js/storage.js`, `js/themes.js`)

- `validateProject()` and `validateTheme()` are the only paths by which a stored or imported value becomes part of `appState`. Both reject anything that doesn't match their exact expected shape (required fields, string patterns for colors/ids, enum membership for shadow/font/density values) rather than coercing unknown shapes best-effort. `validateTheme()` additionally never copies attacker-controlled keys through at all — its return value is reconstructed field-by-field from a fixed key list (`TOKEN_KEYS`), and an unrecognized token key is rejected outright, so imported theme JSON has no path to prototype pollution regardless of key names.
- `isSafeProjectValue()` additionally allowlists project-JSON key names (`/^[a-zA-Z0-9_-]+$/`) and, as of this pass, explicitly denies `__proto__`, `constructor`, and `prototype` as key names even though they match that character-class pattern — the character allowlist alone was not sufficient, since those three names are exactly the ones a `target[key] = value`-shaped merge could use to repoint an object's prototype rather than set an ordinary field. It also rejects any `objectUrl`/`blob` property outright, and bounds nesting depth (12), array length (1000), and object key count (100) per level — a defense against pathological or malicious imported JSON (oversized documents, deeply nested payloads) in addition to prototype-pollution shapes. Verified with harmless `__proto__`/`constructor`-keyed payloads in `tests/unit/storage.test.js`.
- **DOM clobbering** (an attacker-controlled `id`/`name` attribute shadowing a global lookup) is closed by construction, not by a runtime filter: `sanitizeRichText`'s allowlist (`js/utilities.js`) only accepts bare tags with zero attributes (`p, br, strong, b, em, i, u, ul, ol, li`) plus a narrowly-parsed `<a href>`/`target="_blank"` — there is no grammar path for an attacker to attach an `id` or `name` attribute to anything through rich text. Every `id`/`name` attribute in generated markup is generator-authored, built from `${instanceId}-fixed-suffix-${numericIndex}`, never from an author-supplied string value. Verified in `tests/security.test.mjs`.
- **CSP bypass via injected `<meta>`/`<base>` tags** is not reachable: author content can only ever land inside `<body>` (`blockLabel`/`blockHeadline`/`blockDesc`/`componentHTML`, all escaped/sanitized before interpolation) — the `<head>` is entirely shell-authored and never receives interpolated content, so there is no path to inject a second CSP `<meta>` tag or a `<base>` tag into the document. `base-uri 'none'` in the CSP is kept as defense-in-depth regardless.
- Media references embedded in project config are structurally validated by `isMediaReference()` (`js/media.js`) as part of the same check — a reference-shaped object must have the exact expected key types, or it's rejected.

## Generated-document sandbox (`docs/EXPORT-CONTRACT.md`)

Every compiled document — preview, popout, and every export format — carries the same Content-Security-Policy:

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com data:; img-src 'self' http: https: data: blob:;
media-src 'self' http: https: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'
```

Key properties:

- **`connect-src 'none'`** — a generated component can never make a network request of its own (no exfiltration channel), regardless of what content an author puts into it.
- **`script-src 'unsafe-inline'`** is required because the compiler always emits its own inline `<script>` and never loads an external script file. This is a real, bounded trade-off: it means the CSP cannot block _the app's own_ inline script (there is no alternative — no external script is ever referenced), but it does nothing to relax the sanitization contract above, which is what actually prevents _author content_ from becoming script.
- The live-preview iframe (`iframe.srcdoc`) and the exported iframe embed snippet both use `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"`. **`allow-same-origin` was previously included and has been removed in this pass** after review found it unnecessary: no generator or shared script (`js/export-shell.js`) ever touches `localStorage`, `sessionStorage`, `document.cookie`, or IndexedDB from within the generated document, and postMessage-based completion notification does not require it either. This was verified empirically, not just by code inspection — a compiled fixture was loaded in a real sandboxed iframe with `allow-same-origin` omitted, and both direct interaction (accordion click → `aria-expanded` toggling) and postMessage completion notification worked identically. Removing it closes what was previously the single highest-consequence residual risk in this document: had a sanitizer bug ever let a script through, `allow-same-origin` would have given it same-origin privileges relative to the parent rather than an isolated opaque origin. `allow-popups allow-popups-to-escape-sandbox allow-forms` remain, needed for legitimate component behavior (opening an external resource link, submitting a form-shaped interaction) in the _host_ page's context.
- `js/preview.js`'s `openPreview()` sets `previewWindow.opener = null` before writing to the popped-out window — the standard mitigation against reverse-tabnabbing via `window.open()`.

## Rise/LMS message safety

The completion adapter (`js/completion.js`, `docs/ARCHITECTURE.md` §11) defaults to a wildcard target origin (`postMessage(..., '*')`) when the author has not configured a specific one in Builder Settings ("Expected parent frame origin"). The payload is a fixed, non-sensitive, versioned completion signal (`{ channel, schemaVersion, type: 'completion', componentId, componentVersion, instanceId, status, timestamp }`) with no author-controlled or learner-identifying data, so the wildcard default is a documented, low-severity trade-off (the component doesn't know its host's origin in advance, and the payload carries nothing worth protecting) rather than an oversight — see `docs/COMPLETION-INTEGRATION.md` "Why the default targetOrigin is '*'". When an author does configure an expected origin, both outbound `postMessage` and inbound message validation use that exact origin instead. If a future message ever carries anything more sensitive, it must require a configured origin rather than falling back to `'*'`.

The adapter also validates every **inbound** message before acting on it (origin, when configured; exact `channel`/`schemaVersion`; `type` against a fixed allowlist — currently only `'reset'`) and silently ignores anything that doesn't match, rather than throwing or acting on unrecognized data. This is exercised directly by `tests/e2e/completion.spec.js`'s malformed-message and origin-mismatch cases.

## Error handling: what the user sees vs. what gets logged

Every error this app deliberately throws (project/theme/import validation, storage quota exceeded, export failure, malformed drag/media input) is already caught at its call site in `app.js` and shown as a specific, human-readable toast — these messages are all authored by this codebase, not raw platform exceptions, and are exercised by existing tests (e.g. `tests/unit/storage.test.js`'s quota/corruption cases).

For the residual case — a genuinely unanticipated bug (an uncaught exception or unhandled promise rejection) — `app.js` registers top-level `window.addEventListener('error', ...)` and `window.addEventListener('unhandledrejection', ...)` handlers. These log the full error (message, stack) to the console via `console.error` — a safe place for it, since only someone who already has this browser's devtools open (the same person who hit the bug) can see it — and show one generic, rate-limited toast ("Something unexpected went wrong… check the browser console for technical details") rather than surfacing the raw message, which could otherwise name internal variables, function names, or file paths meaningless (and mildly alarming) to a non-technical author. Verified in `tests/e2e/application.spec.js`.

## Known residual risks

- **No Subresource Integrity (SRI)** on the Google Fonts `<link>` tags in the builder shell or generated output — low severity, same trust tier as any other external asset the app already depends on, but worth closing if the app ever tightens its external-dependency posture.
- **No server-side or automated malware scanning of uploads** — file-signature checks (above) catch mismatched/spoofed types, not malicious payloads disguised as valid files of the correct type. This is an accepted limitation of a browser-only, no-backend tool.
- **External font/media tracking**: Google Fonts and any author-supplied `http(s)` media URL are genuine third-party requests the browser makes outside this app's control, which can reveal the learner's IP/user-agent to that third party. This is inherent to using web fonts and remote media at all (there is no local-only mode), and is a pre-existing, accepted trade-off rather than a new finding — noted here for completeness of the threat model.
- **No automated malware/CVE scanning of the two runtime dependencies actually shipped to learners** (Google Fonts, and whatever CDN/host serves author-supplied media URLs) — out of this project's control by design (no vendoring, no bundling of third-party runtime code into exports).

### Dependency audit (this pass)

`npm audit` was re-run fresh: **0 vulnerabilities** (info/low/moderate/high/critical), across all 265 dependencies (1 production, the rest dev/optional/tooling). `npm audit --omit=dev` independently confirms 0 in the production dependency tree. The previously-documented high-severity `brace-expansion` ReDoS advisory (a transitive dependency of ESLint 9's `minimatch` chain) no longer appears — `npm ls brace-expansion` now resolves to `1.1.18`, a patched version pulled in by the existing semver range without any major-version upgrade. No dependency changes were needed to reach this state; it reflects the current lockfile resolution as of this pass. Re-run `npm audit` periodically, since a clean result today is not a permanent guarantee.

## What this document does not cover

Accessibility-specific risk (advisory vs. blocking alt-text/caption warnings) is covered in `docs/ARCHITECTURE.md` §7 and `docs/KNOWN-ISSUES.md`, not here, since it is a correctness/inclusion concern rather than a confidentiality/integrity/availability one.
