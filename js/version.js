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
export const APP_VERSION = '2.0.0+20260902.1433';

// The build-metadata suffix above is stamped as YYYYMMDD.HHmm — compact and sortable,
// but raw semver build metadata can't contain spaces or colons (semver.org #spec-item-10),
// so it can't just be "31st Aug 2026" directly. The header badge should still read
// naturally, so this parses that suffix back into a real Date for display via
// utilities.js's formatReadableDate() (app.js#init), leaving APP_VERSION itself untouched.
// Returns null if the suffix is missing or malformed, so the caller can fall back to
// showing the raw version string rather than "Invalid Date".
export function parseVersionBuildDate(version) {
  const match = /\+(\d{4})(\d{2})(\d{2})\.(\d{2})(\d{2})$/.exec(version);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(date.getTime()) ? null : date;
}
