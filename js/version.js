// Single maintainable source for the version shown in the app header (P09,
// index.html's #app-version-tag, set from here by app.js#init). This project has no
// build/deploy pipeline (docs/ARCHITECTURE.md — deliberately framework/bundler-free, and
// the live GitHub Pages site serves these source files directly, not a generated dist/),
// so this can't be injected automatically at build time the way a bundled app would —
// it must be kept in sync with package.json's own "version" field by hand.
//
// The suffix after "+" is semver build metadata (valid per the spec, ignored for version
// precedence/ordering) stamped with the push date/time — reinstated at explicit user
// request after P09 removed a separate hand-typed date tag; unlike that removed tag, this
// stays attached to the version string itself and is expected to be updated by hand on
// each meaningful release, same as the base version number.
export const APP_VERSION = '2.0.0+20260821.1514';
