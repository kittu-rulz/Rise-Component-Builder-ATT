// Single maintainable source for the version shown in the app header (P09,
// index.html's #app-version-tag, set from here by app.js#init). This project has no
// build/deploy pipeline (docs/ARCHITECTURE.md — deliberately framework/bundler-free, and
// the live GitHub Pages site serves these source files directly, not a generated dist/),
// so this can't be injected automatically at build time the way a bundled app would —
// it must be kept in sync with package.json's own "version" field by hand.
//
// No release date is shown alongside it: this project has no actual release-date
// tracking (no git tags, no changelog, no CI-stamped build timestamp) to source one from
// truthfully, and a hand-typed "today's date" next to the version would incorrectly imply
// one exists (Requirement 5).
export const APP_VERSION = '2.0.0';
