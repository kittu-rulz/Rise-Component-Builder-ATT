# Component schema

This document describes the data model authors edit and the contract a component must satisfy to be a first-class citizen of the registry described in `docs/ARCHITECTURE.md` §1. It supersedes the root-level `COMPONENT-SCHEMA.md`, which is now a pointer to this file.

## Current project configuration model

Projects persist a `config` object with shared component configuration plus component-specific item data:

```js
{
  blockTitle,
  blockHeadline,
  blockHeadingLevel,
  blockDesc,
  colorPrimary,
  colorAccent,
  colorBg,
  colorText,
  borderRadius,
  shadowDepth,
  borderOutline,
  accordionMulti,
  accordionAnimation,
  iconStyle,
  trackCompletion,
  completionMsg,
  themeTokens,
  items: []
}
```

Item fields are driven by `js/editor-schemas.js` (`docs/ARCHITECTURE.md` §2). A field definition can contain `id`, `label`, `type`, `default`, `required`, `requiredOne`, `groupAcrossItems`, `min`, `max`, `step`, `suffix`, `maxLength`, `pattern`, `patternMessage`, `preferredDimensions`, `warningWhen`/`warningUnless`/`warningUnlessAny`/`warningMessage`, and `options`.

## Shared configuration properties

| Property        |   Type | Purpose                                                                |
| --------------- | -----: | ---------------------------------------------------------------------- |
| `blockTitle`    | string | Multiline eyebrow/category label; line breaks render in preview/export |
| `blockHeadline` | string | Multiline generated heading; line breaks render in preview/export      |
| `blockHeadingLevel` | string | HTML tag (`h1`–`h6`, default `h2`) used for the exported `blockHeadline` element — author-selectable so an embedded block doesn't force a second `h1` into a Rise lesson's own heading outline. Normalized by `js/utilities.js#normalizeHeadingLevel`; see `docs/ACCESSIBILITY-CONFORMANCE.md`. |
| `blockDesc`     | string | Learner instructions or introduction                                   |
| `items`         |  array | Ordered component-specific authoring records                           |

## Theme and style properties

| Property        |           Type | Current values                      |
| --------------- | -------------: | ----------------------------------- |
| `colorPrimary`  |     hex string | Six-digit color                     |
| `colorAccent`   |     hex string | Six-digit color                     |
| `colorBg`       |     hex string | Six-digit color                     |
| `colorText`     |     hex string | Six-digit color                     |
| `borderRadius`  | numeric string | Legacy resolved value, 0–32         |
| `shadowDepth`   |         string | `none`, `soft`, `medium`, `premium` |
| `borderOutline` |        boolean | Show/hide component borders         |
| `iconStyle`     |         string | `chevron`, `plus-minus`, `arrow`    |

These properties are synchronized from the active theme plus component overrides (`docs/ARCHITECTURE.md` §6) and remain for generator compatibility. `themeTokens` contains the resolved exported-component tokens. The builder UI mode and legacy application setting `settings.defaultFont` are separate from the exported component theme.

## Theme model

Projects store a validated theme snapshot with `schemaVersion: 1`, identity and lock metadata, timestamps, and these tokens:

```text
fontFamily, headingFontFamily, primary, primaryHover, accent,
background, surface, text, mutedText, border, success, warning,
danger, borderRadius, buttonRadius, shadow, spacingDensity,
animationSpeed
```

Supported fonts are Merriweather, Lato, Roboto, Montserrat, and Open Sans. Shadows are `none`, `soft`, `medium`, or `premium`; spacing is `compact`, `comfortable`, or `spacious`; radii are integers from 0–32 and animation speed is an integer from 0–2000 milliseconds.

`componentOverrides` may contain `primary`, `accent`, `background`, `text`, `borderRadius`, `shadow`, and `fontFamily`. Missing keys inherit the active theme. Resetting overrides removes these keys rather than copying theme values into them.

## Behavior properties

| Property               |    Type | Purpose                                                                   |
| ----------------------- | ------: | -------------------------------------------------------------------------- |
| `accordionMulti`       | boolean | Allows multiple accordion panels to remain open                          |
| `accordionAnimation`   | boolean | Records author preference for accordion animation                        |
| `iconStyle`            |  string | Selects accordion indicator presentation                                 |
| `flipCardsMode`        |  string | `'explore'` (default, original click-to-reveal behavior) or `'study'`    |
| `flipCardsShuffle`     | boolean | Study mode only: randomizes card order on load                           |
| `flipCardsCategories`  | boolean | Study mode only: enables category filter chips, driven by each front face's `category` item field |
| `flipCardsSummary`     | boolean | Study mode only: shows an end-of-set summary once every card is classified |
| `flipCardsReset`       | boolean | Study mode only: shows a "Restart study set" action                      |
| `flipCardsFrontLabel`  |  string | Screen-reader label for the front face (both modes), default `'Front'`   |
| `flipCardsBackLabel`   |  string | Screen-reader label for the back face (both modes), default `'Back'`     |
| `mcConfidenceMode`     | boolean | Enables the confidence self-rating step before submit (Multiple Choice Check) |
| `mcRequireConfidence`  | boolean | Confidence mode only: blocks Submit until a confidence level is chosen   |
| `mcConfidenceLowLabel` |  string | Label for the low-confidence option, default `'Not sure'`                |
| `mcConfidenceMidLabel` |  string | Label for the mid-confidence option, default `'Somewhat sure'`           |
| `mcConfidenceHighLabel`|  string | Label for the high-confidence option, default `'Very sure'`              |
| `mcMaxAttempts`        |  number | Attempts allowed before the question concludes, default `1` (no retry)   |
| `mcShowCorrectAfterFinal` | boolean | Reveals the correct option (as text, not color alone) after the final attempt |
| `mcHintText`           |  string | Hint shown after an incorrect attempt, if attempts remain                |
| `mcFinalExplanation`   |  string | Explanation shown once the question concludes, correct or not            |
| `mcAllowReset`         | boolean | Shows a "Try Again" action once the question concludes                   |
| `mcShowResultSummary`  | boolean | Confidence mode only: shows a supportive correctness + confidence interpretation |

Some interaction behavior is currently fixed in `js/preview.js` rather than represented in configuration.

### Flip Cards Study mode

An optional recall-practice layer over the original Explore mode, added without changing Explore mode's own behavior — every `flipCards*` property is additive/optional, and a project saved before this feature existed loads with `flipCardsMode` effectively `'explore'`, since `components/flip-cards.js`'s generators and `validate()` treat a missing value the same as the documented default (`docs/ARCHITECTURE.md` §2; `app.js#applyMissingSchemaDefaults`/`syncEditorControls` apply the same undefined-safe fallback to the editor UI).

- **Know / Needs review** classification per card, tracked in a component-local in-memory object (not persisted, not centralized in `js/export-shell.js` — kept local for this first pass; see "Recommended schema improvements" below).
- **Category filter chips**, derived from each card's front-face `category` field, shown only when `flipCardsCategories` is on and at least one card has a non-empty category.
- **"Show Review cards only"** toggle, independent of the category filter — both can combine.
- **Live counts** ("Not viewed / Know / Review"), a summary panel once every card is classified, and an optional "Restart study set" action, all layered on top of — not replacing — the existing shared completion tracker (`viewedItems`/`updateProgress()`), which still completes exactly as before (every card flipped at least once) regardless of Know/Review state.
- **State does not persist** across a page reload and is **not** reported to Rise/an LMS beyond the existing `{ type: 'complete' }` signal (`docs/COMPLETION-INTEGRATION.md`) — Know/Review classification is a session-local study aid only.
- **Known caveat, inherited from the existing architecture, not new to this feature**: the HTML-fragment export format has no per-instance DOM scoping (`docs/EXPORT-CONTRACT.md` "CSS isolation, by format" — unique element *ids* are guaranteed, generic class-based `document.querySelectorAll(...)` calls are not). If two Flip Cards components are pasted onto the same fragment-format host page, each instance's script attaches its own listeners to every `.flip-card`/`.flip-classify-btn` element on the page, not just its own — true of the original Explore-mode implementation already, unchanged by Study mode. Prefer the Iframe Snippet or Web Package ZIP export format (structurally isolated by the `<iframe>` boundary) when multiple Flip Cards instances share one page.
- **Verified**: automated (`tests/unit/generators.test.js` hostile-input fixtures, `export-isolation`/`export-determinism`) and manual browser testing of a compiled Study-mode export (classification, counts, category filter, review-only filter, summary, restart, keyboard operability via direct event dispatch). **Not yet verified**: inside Rise's own authoring preview or a published Rise course — see `docs/RISE-TEST-CHECKLIST.md`.

### Multiple Choice Check Confidence mode

An optional layer over the original one-shot submit/feedback flow, added without changing that flow's own behavior when left off — `mcMaxAttempts` defaults to `1` (the original no-retry behavior), and every `mc*` property is additive/optional with an undefined-safe fallback in both the generator and the editor UI, so a project saved before this feature existed behaves identically.

- **Confidence self-rating** (Not sure / Somewhat sure / Very sure, all relabelable) shown before Submit when `mcConfidenceMode` is on; optionally required (`mcRequireConfidence`) before Submit is accepted.
- **Multiple attempts**, via `mcMaxAttempts` (default 1). An incorrect attempt with attempts remaining clears the selection, shows a "N attempts remaining" message, and reveals the configured hint (`mcHintText`) if one is set — it does not reveal the correct answer mid-attempt.
- **Reveal correct answer** (`mcShowCorrectAfterFinal`) — text-based ("— Correct answer"), not color-only, shown next to the correct option only after the final attempt.
- **Final explanation** (`mcFinalExplanation`) — shown once the question concludes, correct or not.
- **Confidence + correctness interpretation** (`mcShowResultSummary`, confidence mode only) — four short, deliberately supportive (not diagnostic) messages covering correct/incorrect × high/other confidence. Not a score, not reported anywhere, and not framed as a psychological or diagnostic claim.
- **Scoring is unchanged**: correctness is still the item's existing `correct` boolean; no confidence-weighted score is computed or reported — confidence only drives which interpretation message is shown.
- **Reset** (`mcAllowReset`) clears all state (selection, confidence, attempts, revealed answer) and returns focus to the first option.
- **Accessibility**: both the answer and confidence groups use `role="radiogroup"`/`role="radio"` with roving tabindex and arrow-key navigation; concluded (disabled) options are marked `aria-disabled` and removed from tab order rather than deleted, so their content remains readable; feedback receives focus on every submit so a keyboard/screen-reader user reliably lands on the result, not just on whatever triggered `aria-live`.
- **Verified**: automated (`tests/unit/generators.test.js`, `export-isolation`/`export-determinism`) and manual browser testing of a compiled Confidence-mode export — validation gating (no option/no confidence), retry with hint, correct/incorrect × confidence interpretation text, reveal-correct-after-final, reset, and the concluded/disabled state. **Not yet verified**: inside Rise's own authoring preview or a published Rise course.

## Completion tracking

| Property          |    Type | Purpose                               |
| ----------------- | ------: | ------------------------------------- |
| `trackCompletion` | boolean | Enables generated progress tracking   |
| `completionMsg`   |  string | Screen-reader completion announcement |

The preview runtime calculates trackable counts per component. Content-reveal components generally complete after all items are viewed; assessments complete on success; media completes on the `ended` event. Completion also triggers the completion adapter described in `docs/ARCHITECTURE.md` §11 and `docs/COMPLETION-INTEGRATION.md`, which sends a versioned outbound message only when the component is actually embedded in a host page.

## Current item structures by component

| Component ID          | Item fields currently authored                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `accordion`           | `title`, `content`                                                                                                                     |
| `tab-blocks`          | `title`, `content`                                                                                                                     |
| `flip-cards`          | `title`, `content`, optional `iconImage`, `iconAltText`, `iconDecorative`, `iconFit`, `category`; consecutive entries form front/back pairs        |
| `hotspots`            | `title`, `content`, `x`, `y`                                                                                                           |
| `button-list`         | `title`, `content` (destination URL)                                                                                                   |
| `menu-list`           | `title`, `content`                                                                                                                     |
| `multiple-choice`     | `label`, `content` (feedback), `correct`                                                                                               |
| `multiple-select`     | `label`, `content` (feedback), `correct` (multiple allowed)                                                                            |
| `sorting-activity`    | `title`, `content`, `category`                                                                                                         |
| `fill-blank`          | `title` containing `[blank]`, `content` (accepted answer)                                                                              |
| `vertical-timeline`   | `title`, `content`                                                                                                                     |
| `horizontal-timeline` | `title`, `content`                                                                                                                     |
| `process-flow`        | `title`, `content`, `durationMinutes`                                                                                                  |
| `scenario`            | `title`, `content`; first item acts as prompt and later items as choices                                                               |
| `profile-cards`       | `title`, `content`, `image`, `altText`, `decorative`, `imageCrop`                                                                      |
| `info-grid`           | `title`, `content`, optional `iconImage`, `iconAltText`, `iconDecorative`, `iconFit`, `accentColor`                                    |
| `pricing-comparison`  | `title`, `content`, `highlighted`, `actionUrl`                                                                                         |
| `audio-player`        | `title`, `content` (audio source), `contentDuration`, optional `iconImage`, `iconAltText`, `iconDecorative`, `iconFit`, `transcript`   |
| `video-frame`         | `title`, `content` (video source), `posterImage`, `posterAltText`, `posterDecorative`, `captionsUrl`, `transcript`, `audioDescription` |
| `image-gallery`       | `content` (image source), `title`, `caption`, `altText`, `decorative`, `imageFit`                                                      |

Rich text is supported for selected content fields and sanitized to an allowlist before rendering (`docs/SECURITY.md`).

Hotspots additionally use component-level fields: `backgroundImage`, `backgroundAltText`, `backgroundDecorative`, `backgroundFit`, `backgroundFocalX`, and `backgroundFocalY`.

## Media reference model

External media remains a validated HTTP(S) URL string. A local upload is represented in configuration as JSON-safe metadata:

```js
{
  source: ('upload', mediaId, schemaVersion, kind, name, mimeType, size, createdAt, duration);
}
```

The corresponding IndexedDB record (`docs/ARCHITECTURE.md` §9) additionally contains the Blob and editable metadata fields. Object URLs are created only at runtime and are not part of the schema.

For optional custom item artwork, an empty `iconImage` means "use the built-in icon." Removing an upload therefore restores the default without storing a separate reset flag. Meaningful artwork uses `iconAltText`; decorative artwork sets `iconDecorative: true`. `iconFit` accepts `contain` or `cover`.

All image fields define advisory `preferredDimensions`: 256×256 for custom icons, 800×800 for profile images, 1600×900 for hotspot backgrounds, 1280×720 for video posters, and 1600×1200 for gallery images. The upload control also lists JPG/JPEG, PNG, WebP, SVG, and GIF as supported formats. Existing 10 MB image and 2 MB SVG limits remain enforced independently of the preferred dimensions (configurable in Builder Settings; see `docs/ARCHITECTURE.md` §9).

## Component registry contract

To be registered in `componentRegistry` (`docs/ARCHITECTURE.md` §1), a component module must export exactly:

```text
id                          string, matches its js/catalog.js entry id
name                        string, display name
category                    string, matches its js/catalog.js entry category
defaultConfig                object, the item/config defaults for a new instance
editorSchema                object, same shape as js/editor-schemas.js entries
generateHTML(config)         → string
generateCSS(config)          → string
generateJS(config)           → string
validate(config)             → { valid: boolean, errors: string[] }
```

Only the six modular components (`accordion`, `tabs`, `flip-cards`, `vertical-timeline`, `multiple-choice`, `multiple-select`) currently export this contract. The remaining fifteen catalog entries are implemented as conditional branches inside `js/preview.js` and default-data selection inside `app.js`; they do not yet expose an independent `validate()`. This is the primary migration target described in `docs/KNOWN-ISSUES.md` — **no new component-specific special-casing should be added to `preview.js`/`app.js`; new components should be added directly to the registry contract above.**

The automated generator-contract test suite (`tests/unit`) exercises all six modular components with empty, one-item, many-item, long-text, emoji, multilingual, right-to-left, quote, closing-script, and unsafe-URL fixtures. It parses generated HTML, checks id uniqueness within an instance, parses CSS, compiles JavaScript, and rejects accidental `undefined` or object-string output. Any component migrated into the registry should gain the same fixture coverage as part of that migration (`docs/TESTING-STRATEGY.md`).

## Recommended schema improvements

**Planned, not yet implemented:**

- Add stable item IDs so media ownership and reordering do not depend on array position.
- Add component-level schema sections in addition to `itemFields` more broadly (today only `hotspots` uses `componentFields`).
- Add conditional schema visibility so decorative images can hide or disable alternative-text inputs.
- Separate warnings from blocking validation errors more formally in the schema shape (today this is convention — `warningWhen`/`warningUnless`/`warningUnlessAny` vs. `required` — not an enforced separation).
- Add schema migrations per component when new fields are introduced (today only the project-level `schemaVersion` migrates; component item shapes do not version independently).
- Complete registry modularization (§ above) so every generator owns its defaults, schema, validation, and output.
