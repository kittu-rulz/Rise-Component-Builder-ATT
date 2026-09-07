# Changelog

All notable changes to the Rise Component Builder are recorded here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
version tracks `js/version.js`'s `APP_VERSION` / `package.json` `version` (base
semver plus a `+YYYYMMDD.HHmm` build-metadata stamp). History before 2.1.0 predates
this file.

## [2.1.0] — 2026-09-07

### Added

- **Catalog-positioning metadata on every component.** Each of the 21 template
  cards now shows a classification badge — **Enhanced Rise Alternative** (a
  branded/extended take on a native Rise block) or **Advanced Custom Interaction**
  (a purpose-built interaction Rise has no single native equivalent for) — and a
  **"Why use it?"** line carrying a one-sentence `differentiator`. Both are
  required and enforced by `validateRegistry()` (`js/component-registry.js`
  `CLASSIFICATIONS`; see `docs/COMPONENT-SCHEMA.md`, "Catalog positioning").
- **Classification filter** on the template picker — *All Components* /
  *Enhanced Rise Alternatives* / *Advanced Custom Interactions* — an independent
  facet from the category sidebar that also applies inside Favorites and Recently
  Used (`appState.activeClassification`, `js/catalog.js#filterCatalog`).
- **Search now matches** the category display name, the classification label, and
  the differentiator text, in addition to name/description/keywords
  (`searchComponents` and `filterCatalog`).

### Fixed

- **Stale GitHub Pages assets after a deploy.** The site serves the branch root
  with `Cache-Control: max-age=600` and stable asset URLs, so a returning
  visitor's browser kept the pre-deploy `app.js` / `styles.css` / `js/*.js` — a
  half-updated page (dead classification filter, missing badges, old version
  badge). `scripts/stamp-cache-busting.mjs` (run by `npm run build` / `npm run
  stamp`) now derives a token from `APP_VERSION` and stamps `?v=<token>` onto the
  `fonts.css` / `styles.css` / `app.js` references plus a generated
  `<script type="importmap">` covering every `./js/*.js` and `./components/*.js`
  module, so a new release is picked up without any manual cache clear.
  `index.html` itself is left to Pages' `max-age=600` (self-heals within ten
  minutes, CDN-revalidated on publish). See `docs/ARCHITECTURE.md`,
  "Cache-busting".
- `tsc --noEmit` errors on `describeStorageUsage`'s options parameter
  (`js/utilities.js`) — added a JSDoc `@param` object-literal type.
- Three timing-flaky E2E tests surfaced once the browser suite could run to
  completion in CI: an editor-screen contrast scan that sampled colours mid
  theme-fade (`accessibility.spec.js`), a video scrub-bar keyboard test racing
  the playback `timeupdate` handler (`exported-fixtures.spec.js`), and a
  `video.play()` that rejects with `AbortError` on WebKit when it races the
  Restart button (`interactive-video.spec.js`).

### Build / CI

- New `npm run stamp` and `npm run stamp:check`; `npm run build` runs the stamper
  first, and CI fails a release that bumped `APP_VERSION` without re-stamping
  `index.html`.
- Raised the `test` job's `timeout-minutes` from 20 to 45 (with a 32-minute
  step-level cap on the E2E step) so the serial three-browser Playwright run
  completes instead of being cancelled mid-suite — the full E2E suite now passes
  end-to-end in CI (687 passed across Chromium, Firefox, WebKit).
- New unit coverage (`tests/unit/cache-busting.test.js`) and E2E coverage
  (`tests/e2e/catalog-classification.spec.js`) for the classification catalog and
  the cache-busting stamp.

[2.1.0]: https://github.com/kittu-rulz/Rise-Component-Builder-ATT/releases/tag/v2.1.0
