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
export const EXPORT_FORMAT_COMPATIBILITY = {
  iframe: {
    tier: 'confirmed',
    summary: 'Produces a valid, self-contained <iframe srcdoc> that any modern browser renders correctly on its own. Manually confirmed working when pasted into a Rise 360 "Code › Add code" block, in both the authoring preview and a published course (docs/COMPATIBILITY-RESULTS.md).',
    details: [
      'The iframe’s own sandbox flags and this document’s CSP are real and enforced by any browser regardless of host.',
      'This format sits inside a fixed-height box (you may need to adjust the height in Rise after pasting). If a component’s content can grow taller than expected, the HTML Block Fragment format sizes itself naturally instead.',
      'Confirmed on the date/surfaces logged in docs/COMPATIBILITY-RESULTS.md — re-run docs/RISE-TEST-CHECKLIST.md and add a new row there if a future Rise update changes this.'
    ]
  },
  code: {
    tier: 'confirmed',
    summary: 'Produces the raw HTML/CSS/JS fragment format Rise’s "Code › Add code" block is documented to accept directly. Manually confirmed working in both the authoring preview and a published Rise 360 course (docs/COMPATIBILITY-RESULTS.md).',
    details: [
      'This format has no iframe/document boundary of its own, so its CSS class names are not automatically scoped against whatever else is already on the host page — a real, deliberate trade-off, not an oversight (see docs/EXPORT-CONTRACT.md).',
      'Requires the host block to actually execute inline <script> content — confirmed working in Rise. Other general-purpose CMS/LMS "HTML" editors (not Rise specifically) may still strip inline scripts by default — see docs/RISE-COMPATIBILITY-MATRIX.md for Moodle’s behavior.',
      'Confirmed on the date/surfaces logged in docs/COMPATIBILITY-RESULTS.md — re-run docs/RISE-TEST-CHECKLIST.md and add a new row there if a future Rise update changes this.'
    ]
  },
  'rise-zip': {
    tier: 'experimental',
    summary: 'Packages the exact same compiled document every other export format uses, plus every uploaded asset it references as real files under assets/ — automated by this project (a real ZIP, verified byte-for-byte deterministic and readable by standard unzip tools), but never independently run through an actual Rise course.',
    details: [
      'This is not a Rise-native upload format — Rise has no documented "upload a ZIP for a custom block" mechanism. The realistic use is hosting the extracted index.html + assets/ wherever your course’s other external content already lives, then embedding it the same way you would any other externally-hosted page (e.g. an iframe pointed at that URL) — or opening index.html directly to verify it works.',
      'This is also not a SCORM package (no imsmanifest.xml, no SCORM API wrapper) — see docs/RISE-COMPATIBILITY-MATRIX.md for why SCORM remains unsupported.',
      'Uploaded audio, video, and large images travel as real files here instead of being blocked (single HTML) or limited to small inlineable images — the concrete reason to prefer this option whenever the component uses uploaded media.',
      'Follow docs/RISE-TEST-CHECKLIST.md and record the result in docs/COMPATIBILITY-RESULTS.md to move this to Confirmed.'
    ]
  },
  standaloneDownload: {
    tier: 'confirmed',
    summary: 'Opening the downloaded .html file directly in a browser is the one export path this project has actually automated: the compiled document is exercised by this project’s own Playwright suite in real Chromium, Firefox, and WebKit builds.',
    details: [
      'Automated coverage runs against a local static server and standalone fixture files (tests/e2e/exported-fixtures.spec.js), not against Rise, Moodle, or any LMS — this tier covers "opens and works as a plain web page," nothing about a specific host.',
      'See docs/RISE-COMPATIBILITY-MATRIX.md for the per-browser breakdown (Firefox and WebKit have caveats noted there).'
    ]
  }
};

export function getExportFormatCompatibility(formatKey) {
  return EXPORT_FORMAT_COMPATIBILITY[formatKey] || null;
}
