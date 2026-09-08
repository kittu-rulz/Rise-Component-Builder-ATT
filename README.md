# Rise Component Builder (AT&T Edition)

Rise Component Builder is a standalone browser-based authoring tool designed to create, preview, and export interactive eLearning components built specifically to **AT&T Brand Identity Standards** for Articulate Rise 360 and compatible HTML learning platforms.

---

## Brand Compliance

All component templates, stylesheets, and export generators in this repository strictly adhere to the official **AT&T Brand Standards** specified in [`design/ATT-Rise-Design-Standards.md`](design/ATT-Rise-Design-Standards.md).

### 1. Color System & Design Tokens
- Sourced directly from `design/att-tokens.css`.
- **AT&T Blue (`#009FDB`)** is the primary, dominant brand color.
- **Cobalt (`#00388F`)** is reserved for actionable CTA buttons and interactive emphasis.
- **Neutrals**: Surface White (`#FFFFFF`), Sunken Neutral (`#F3F4F5`), Border Grey 2 (`#DCDFE3`), Border Strong Grey 3 (`#BDC2C7`), Text Black (`#000000`).
- **No unapproved color literals**: Hardcoded colors outside the token palette are blocked by preflight validation and linting.

### 2. Typography
- Standardized on the official **AT&T Aleck Sans** font family (`var(--att-font-sans)`).
- **Five self-hosted WOFF2 cuts** embedded directly into exported HTML (Regular 400, Italic 400, Medium 500, Bold 700, Bold Italic 700).
- **16px body floor**: All learner-facing body copy maintains a 16px minimum floor with `1.5` line-height for optimal readability.
- Headings use `--att-fs-h1` through `--att-fs-h4` scale; uppercase eyebrows use `--att-fs-eyebrow` (12px, letterspaced).

### 3. Curvature & Geometry
- Strict container hierarchy:
  - Outer block shells: `--att-radius-xl` (32px)
  - Content cards & accordion rows: `--att-radius-lg` (20px)
  - Buttons & form controls: `--att-radius-md` (12px)
  - Badges, filter chips & progress tracks: `--att-radius-pill` / `--att-radius-sm` (8px)
  - Media & video player frames: `--att-radius-lg` with `overflow: hidden`

### 4. Iconography
- Standardized on the official **AT&T Functional SVG Icon Library**.
- Replaces all ad-hoc unicode symbols, emojis, and third-party icon fonts.
- Built-in accessible SVGs with `currentColor` scaling.

### 5. Interaction States & Accessibility
- **Focus visible**: 3px solid `--att-cobalt` (`#00388F`) focus outline with 2px offset on all keyboard interactive targets.
- **Touch targets**: 44×44px minimum touch target size.
- **Motion**: Transitions zeroed out under `@media (prefers-reduced-motion: reduce)`.
- **WCAG AA Compliance**: High-contrast text/surface pairs with specific protections against low-contrast small blue text.

---

## Preflight Brand Validation

The built-in Preflight Check (`js/validation.js`) prevents non-compliant exports by enforcing:

| Rule | Severity | Enforcement |
|---|---|---|
| `brand-color-literal` | **Blocking** | Blocks export if unapproved color literals or non-brand hexes are configured. |
| `brand-font-family` | **Blocking** | Blocks export if learner-facing text references non-Aleck font families. |
| `brand-font-size-floor` | **Blocking** | Blocks export if learner-facing body copy is configured below 16px. |
| `brand-icon-source` | **Blocking** | Blocks export if emoji characters or unapproved glyphs are used instead of AT&T SVGs. |
| `brand-contrast-ratio` | **Warning** | Warns on low-contrast pairs and flags AT&T Blue (`#009FDB`) on white when text is under 24px. |
| `brand-focus-visible` | **Warning** | Warns if custom styles attempt to strip `:focus-visible` outlines. |

---

## Tooling & Scripts

- **Development server**: `npm run dev`
- **Unit & Integration tests**: `npm test`
- **Brand Compliance Linter**: `npm run lint:brand`
- **Full validation pipeline**: `npm run validate`
- **Capture visual regression snapshots**: `npm run snapshots:brand`
- **Generate export fixtures**: `npm run fixtures:exports`
