// AT&T brand design-token layer, as a CSS custom-property block.
//
// This is the runtime source of the token layer for the *export pipeline*
// (js/preview.js#generateIframeContent injects it into every compiled artifact's
// `:root {}` block, so iframe snippet / HTML fragment / standalone HTML / Web
// Package ZIP all carry it identically — docs/EXPORT-CONTRACT.md's single-compiler
// guarantee). The builder app itself loads the same values from the canonical
// human-readable file, design/att-tokens.css, as its first stylesheet.
//
// design/att-tokens.css is authoritative. ATT_TOKENS_CSS below must stay a
// verbatim copy of that file's `:root { ... }` body — tests/unit/att-tokens.test.js
// fails if they drift. When a value changes, change design/att-tokens.css and copy
// it here (or vice versa) and the test will confirm they match.
//
// Note: only "ATT Aleck Sans" is embedded in exports (js/custom-fonts.js). The
// --att-font-cd / --att-font-slab tokens exist for completeness but their families
// are not bundled yet — a component that references them will fall back to the
// stack's Helvetica/Georgia until the Condensed/Slab cuts are subsetted and added.

export const ATT_TOKENS_CSS = `  /* Primary — AT&T Blue must be dominant wherever possible */
  --att-blue: #009FDB;
  --att-white: #FFFFFF;

  /* Secondary — support only; never out-weigh AT&T Blue. Cobalt is the CTA color. */
  --att-cobalt: #00388F;
  --att-mint: #49EEDC;
  --att-lime: #91DC00;

  /* Neutrals */
  --att-grey-1: #F3F4F5;
  --att-grey-2: #DCDFE3;
  --att-grey-3: #BDC2C7;
  --att-black: #000000;

  /* AT&T Blue gradient — limited use, full ramp only, never partial, never re-authored */
  --att-blue-dark: #0079B1;   /* 15% darker */
  --att-blue-light: #00C9FF;  /* 15% lighter */
  --att-gradient: linear-gradient(90deg, #0079B1 0%, #009FDB 50%, #00C9FF 100%);

  /* Semantic roles (derived only from the values above) */
  --att-text: #000000;
  --att-text-on-dark: #FFFFFF;
  --att-heading: #009FDB;        /* preferred headline color */
  --att-heading-contrast: #000000;
  --att-surface: #FFFFFF;
  --att-surface-sunken: #F3F4F5;
  --att-border: #DCDFE3;
  --att-border-strong: #BDC2C7;
  --att-focus: #00388F;
  --att-cta-bg: #00388F;
  --att-cta-fg: #FFFFFF;
  --att-cta-bg-hover: #002A6B;   /* Cobalt darkened for state only — not a new brand color */

  /* Type */
  --att-font-sans: "ATT Aleck Sans", "AT&T Aleck Sans", Helvetica, Arial, sans-serif;
  --att-font-cd: "ATT Aleck Cd", "ATT Aleck Sans", Helvetica, Arial, sans-serif;
  --att-font-slab: "ATT Aleck Slab", Georgia, serif;

  --att-w-light: 300;
  --att-w-regular: 400;
  --att-w-medium: 500;
  --att-w-bold: 700;
  --att-w-black: 900;

  /* Type scale — component scale, 16px body floor for learner-facing text */
  --att-fs-eyebrow: 0.75rem;   /* 12px, uppercase, letterspaced label */
  --att-fs-body-sm: 0.875rem;  /* 14px — metadata only, never body copy */
  --att-fs-body: 1rem;         /* 16px */
  --att-fs-body-lg: 1.125rem;  /* 18px */
  --att-fs-h4: 1.25rem;
  --att-fs-h3: 1.5rem;
  --att-fs-h2: 1.875rem;
  --att-fs-h1: 2.5rem;

  --att-lh-tight: 1.15;
  --att-lh-heading: 1.25;
  --att-lh-body: 1.5;
  --att-ls-eyebrow: 0.08em;

  /* Spacing — 4px base */
  --att-space-1: 4px;
  --att-space-2: 8px;
  --att-space-3: 12px;
  --att-space-4: 16px;
  --att-space-5: 24px;
  --att-space-6: 32px;
  --att-space-7: 48px;
  --att-space-8: 64px;

  /* Curvature — rounded rectangles are the brand's long-form/digital curvature asset.
     Radius scales with container size so corners read consistently. */
  --att-radius-sm: 8px;    /* chips, badges, inputs */
  --att-radius-md: 12px;   /* buttons, small cards */
  --att-radius-lg: 20px;   /* content cards, accordion rows */
  --att-radius-xl: 32px;   /* full-width block shells */
  --att-radius-pill: 999px;

  /* Elevation — restrained; brand leans on curvature and color, not shadow */
  --att-shadow-1: 0 1px 2px rgba(0,0,0,0.06), 0 1px 8px rgba(0,0,0,0.04);
  --att-shadow-2: 0 4px 16px rgba(0,0,0,0.08);

  /* Motion */
  --att-dur-fast: 150ms;
  --att-dur-base: 250ms;
  --att-dur-slow: 400ms;
  --att-ease: cubic-bezier(0.2, 0, 0.2, 1);

  /* Icons — library ships 32/64px functional icons and 96px pictograms */
  --att-icon-sm: 24px;
  --att-icon-md: 32px;
  --att-icon-lg: 64px;
  --att-pictogram: 96px;`;
