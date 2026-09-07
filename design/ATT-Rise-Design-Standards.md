# AT&T Brand Standards — Rise Component Builder

Authoritative reference for the visual layer of every exported Rise block.
Derived from the AT&T Brand identity system deck and the AT&T PowerPoint Icon
Library (updated Jan 2026). If a rule here conflicts with existing builder CSS,
this file wins.

## 1. Non-negotiables

1. **AT&T Blue (#009FDB) is dominant.** Every block should read as blue-led.
   Secondary colors support; they never carry the block.
2. **No invented colors.** Only the values in `att-tokens.css`. State colors
   (hover/active) may darken or lighten a token, but no new hues.
3. **Cobalt (#00388F) is the CTA color.** Primary buttons are Cobalt on white
   text. Do not use AT&T Blue as a button fill when a Cobalt CTA is present.
4. **Curvature everywhere.** Rounded rectangles, never square corners, on cards,
   accordion rows, tabs, buttons, inputs, media frames, badges. Radius scales
   with the container (see `--att-radius-*`).
5. **Type is ATT Aleck only.** Sans for UI and body. Condensed for tight labels.
   Slab sparingly, for editorial emphasis. Never system fonts in an export.
6. **Gradient is limited-use and whole-ramp.** #0079B1 → #009FDB → #00C9FF, full
   ramp, as a background or containing shape only. Never partial, never on text,
   never re-angled into a new gradient. Most blocks should use flat color.

## 2. Color application

| Role | Token | Notes |
|---|---|---|
| Block background | `--att-white` or `--att-grey-1` | Grey 1 for sunken/secondary areas |
| Feature panel | `--att-blue` | White text on it |
| Headline | `--att-blue` | Black if more contrast is needed on light; white on dark |
| Body copy | `--att-black` on light, `--att-white` on dark | Never grey body text below 4.5:1 |
| Primary CTA | bg `--att-cobalt`, fg white | |
| Secondary CTA | transparent bg, 2px `--att-cobalt` border, Cobalt text | |
| Dividers / borders | `--att-grey-2` / `--att-grey-3` | |
| Correct / success | `--att-lime` accent + black text | Lime is never a text color |
| Highlight / progress | `--att-mint` or `--att-blue` | |
| Incorrect / warning | `--att-cobalt` + icon | Brand has no red; use icon + copy, not color alone |

Contrast: 4.5:1 for text under 24px, 3:1 for headline-scale. Note that
**#009FDB text on white is only ~2.6:1** — AT&T Blue is a headline and fill
color, not a small-text color. Small blue text must be Cobalt.

Never signal state with color alone — pair with an icon, label, or shape.

## 3. Typography

- Family: `--att-font-sans`, with Condensed and Slab as noted.
- Learner-facing body copy: 16px minimum, line-height 1.5, `max-width: 70ch`.
- Headline weight: 500 (Medium) or 700 (Bold). Black (900) only for large display.
- Eyebrow / block label: 12px, weight 700, uppercase, 0.08em tracking, Cobalt or Grey 3.
- Sentence case for headings and buttons. No ALL CAPS beyond eyebrows.
- Max two cuts per component (e.g. Sans Medium + Sans Regular).
- `text-wrap: pretty` on headings; never justify.

## 4. Curvature and layout

- Block shell: `--att-radius-xl`, generous internal padding (`--att-space-5`/`6`).
- Cards and accordion rows: `--att-radius-lg`. Buttons/inputs: `--att-radius-md`.
- Chips, badges, progress tracks: `--att-radius-pill` or `--att-radius-sm`.
- Nested corners: inner radius = outer radius − padding, so curves stay concentric.
- Layout with flex/grid and `gap`, on the 4px spacing scale. No magic numbers.
- Fluid: `max-width`, `minmax(0, 1fr)` tracks, no fixed pixel widths — Rise blocks
  render at unpredictable widths inside a lesson column.
- The "blue embrace" curvature asset is for brand comms, not UI chrome. In
  components, express curvature through rounded rectangles and, at most, one
  large soft blue curve as a decorative header shape.

## 5. Iconography

- Source: AT&T PowerPoint Icon Library — 2,075 named SVGs in 16 categories
  (Alphanumeric, Communications & Alerts, Data & Networks, Devices, Documents,
  Health, Location, Media & Content, Navigation & Controls, People,
  Retail & Financial, Security, Time, Transportation, Weather).
- Two types: **functional icons** (32/64px; black or white only) and
  **pictograms** (96px; two-color on white, or white on blue preferred).
- UI affordances (chevrons, close, check, play, search) = functional icons,
  `--att-icon-md`, `currentColor` fill so they inherit text color.
- Concept illustration inside a card = pictogram, `--att-pictogram`, never
  recolored beyond the sanctioned two-color / single-color options.
- Icons support messaging; they are never standalone graphics and never decoration
  filling empty space. Preserve the padding built into each icon as clear space.
- No emoji. No third-party icon sets (Font Awesome, Material, Lucide) anywhere.

## 6. Interaction states (all interactive brand surfaces)

- Hover: darken the fill one step, or raise to `--att-shadow-2`. No color change
  that crosses into another brand hue.
- Focus-visible: 3px `--att-cobalt` outline, 2px offset. Never `outline: none`.
- Active: no transform larger than `scale(0.98)`.
- Selected/current: Cobalt or AT&T Blue fill or a 3px underline bar, plus
  `aria-selected` / `aria-current`.
- Visited/complete: check functional icon + Grey 2 fill, not color alone.
- Transitions: `--att-dur-base` `--att-ease`; respect
  `@media (prefers-reduced-motion: reduce)` by dropping to 0ms.

## 7. Rise-specific constraints

- Rise injects its own styles. Scope every rule under the block wrapper class and
  never style bare `body`, `h1`–`h6`, or `a` globally.
- Set the wrapper's own `font-family`, `color`, `line-height`, and
  `box-sizing: border-box` explicitly — do not inherit from Rise.
- Fonts must be embedded or absolutely referenced; Rise's code block won't
  resolve relative font paths.
- Touch targets 44×44px minimum.
- Keyboard: every interaction reachable and operable; roving tabindex on tabs;
  `aria-expanded` on accordions; live region for answer feedback.
