// Single source of truth for how confident this project actually is that a given
// export format works in a real host (Rise, an LMS, a plain browser). The tiers here
// are the same ones used in docs/RISE-COMPATIBILITY-MATRIX.md — this module is the
// UI-facing half of that classification; the doc is the narrative/testing-guidance half.
// Neither invents a claim the other doesn't also make: if you change a tier here, update
// the matching row in the matrix doc, and vice versa.

/**
 * CONFIRMED — verified by this project's own automated tests, or a recorded manual
 *             test run logged in docs/COMPATIBILITY-RESULTS.md.
 * PREVIEW   — technically built to the target's own documented capability, but never
 *             independently run against that real target by this project.
 * FALLBACK  — degrades gracefully rather than breaking outright, under a known,
 *             documented condition (e.g. only with a non-default host setting).
 * UNSUPPORTED — known not to work today, or no working implementation exists yet.
 */
export const COMPATIBILITY_TIERS = {
  confirmed: { id: 'confirmed', label: 'Confirmed', badgeClass: 'compat-badge-confirmed' },
  experimental: { id: 'experimental', label: 'Preview', badgeClass: 'compat-badge-experimental' },
  fallback: { id: 'fallback', label: 'Fallback', badgeClass: 'compat-badge-fallback' },
  unsupported: { id: 'unsupported', label: 'Unsupported', badgeClass: 'compat-badge-unsupported' }
};

// Keyed by the export modal's own `data-export-type` values, plus `standaloneDownload`
// for the "Download .HTML File" action in the Option B pane.
// Popup copy stays decision-focused: what this format is for, and what to watch out for.
// File paths and engineering detail (which test file, which doc) belong in the docs
// themselves (docs/COMPATIBILITY-RESULTS.md, docs/RISE-COMPATIBILITY-MATRIX.md), not here.
export const EXPORT_FORMAT_COMPATIBILITY = {
  iframe: {
    tier: 'confirmed',
    summary: 'Best for reliable isolation. Paste the snippet into a Rise 360 Code › Add code block.',
    details: [
      'Keeps the component’s styles and scripts separate from the Rise page.',
      'Uses a fixed height, which you may need to adjust after pasting.',
      'Isolation holds as long as Rise accepts the pasted snippet unchanged — a host could still strip attributes or reject srcdoc, though that was not observed in testing.',
      'If a component needs downloads, popups, forms, or autoplaying media, verify that specific behavior — sandboxing improves isolation but does not by itself guarantee every capability works.',
      'If this component uses completion tracking, use Option B (HTML Block Fragment) instead — Rise already sandboxes whatever you paste, and this format\'s extra iframe nests it one level too deep for Rise\'s own Continue-block gating to detect completion (confirmed by live testing, 2026-08-12).',
      'Confirmed in Rise authoring preview and a published course.'
    ]
  },
  code: {
    tier: 'confirmed',
    summary: 'Best when the component should expand naturally with its content. Paste it directly into a Rise 360 Code › Add code block.',
    details: [
      'Automatically expands with its content.',
      'Shares the host page, so styles could conflict with other content.',
      'Requires the host platform to allow inline JavaScript.',
      'Confirmed in Rise authoring preview and a published course.'
    ]
  },
  'rise-zip': {
    tier: 'confirmed',
    summary: 'Best for components containing uploaded audio, video, or large images.',
    details: [
      'Includes index.html and referenced media files in an assets folder.',
      'Extract and host the files on a web server, then embed the hosted page in Rise.',
      'Cannot be uploaded directly to Rise as a custom block.',
      'This is not a SCORM package — SCORM packaging is out of scope for this project.',
      'Confirmed: hosted externally and embedded in a Rise 360 course.'
    ]
  },
  standaloneDownload: {
    tier: 'confirmed',
    summary: 'Opening the downloaded .html file directly works as a plain web page in Chrome, Firefox, and Safari (WebKit).',
    details: [
      'This confirms the file opens and runs correctly on its own — it says nothing about compatibility with Rise or any other host.',
      'Firefox and WebKit pass with minor caveats specific to this project’s own test environment.'
    ]
  }
};

export function getExportFormatCompatibility(formatKey) {
  return EXPORT_FORMAT_COMPATIBILITY[formatKey] || null;
}
