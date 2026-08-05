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

| Property             |    Type | Purpose                                           |
| -------------------- | ------: | ------------------------------------------------- |
| `accordionMulti`     | boolean | Allows multiple accordion panels to remain open   |
| `accordionAnimation` | boolean | Records author preference for accordion animation |
| `iconStyle`          |  string | Selects accordion indicator presentation          |

Some interaction behavior is currently fixed in `js/preview.js` rather than represented in configuration.

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
| `flip-cards`          | `title`, `content`, optional `iconImage`, `iconAltText`, `iconDecorative`, `iconFit`; consecutive entries form front/back pairs        |
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
| `ai-generator`        | `title`, `content` (prompt) — simulated, see `docs/KNOWN-ISSUES.md`                                                                    |
| `ai-quiz-maker`       | `title`, `content` (prompt) — simulated, see `docs/KNOWN-ISSUES.md`                                                                    |

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
