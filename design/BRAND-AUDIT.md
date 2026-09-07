# Brand audit — Rise Component Builder vs `ATT-Rise-Design-Standards.md`

Read-only audit. No files were modified. Scope: **learner-facing exported output**
(`components/*.js`, `js/preview.js`, `js/export-shell.js`, `js/themes.js`) with
**builder chrome** (`styles.css`, `index.html`, `js/component-registry.js`) noted
separately — the standards exempt builder chrome from the 16px floor and some
polish rules but not from the color, icon, and focus rules.

## Prior state

A brand pass has already happened. `js/themes.js` locks the build to a single
`att-standard` theme traced to the AT&T source (`primary #00388F` Cobalt CTA,
`accent #009FDB` AT&T Blue, white surfaces, black text, `#DCDFE3` Grey-2 border,
`buttonRadius 20`), and `tests/unit/att-brand-compliance.test.js` (393 lines)
enforces "clickable elements are Cobalt, not AT&T Blue" and capsule radii across
most components. This audit is therefore mostly about what that pass **did not**
cover: typography, non-clickable `--accent` text, glyph icons, focus on a few
components, and the semantic (success/warning/danger) colors — plus wiring in the
canonical `att-tokens.css` token names, which the app does not yet use.

The app's CSS custom properties are `--primary` / `--accent` / `--border-radius`
etc. (`js/preview.js` `tokensCSS`, `js/themes.js`). The canonical
`design/att-tokens.css` names (`--att-blue`, `--att-cobalt`, `--att-radius-lg`, …)
are **not referenced anywhere** yet — reconciling the two naming schemes is
Prompt 2's job; this audit flags values, not names.

---

## 1. Hard-coded color literals

### 1a. Learner-facing generators — genuine literals

| Value | file:line | Role | Nearest token | Verdict |
|---|---|---|---|---|
| `#000` | `components/hotspots.js:187`, `components/hotspots.js:276` | hotspot marker/label fill | `--att-black` / `--text-main` | Replace with token |
| `#000` | `components/scenario.js` (dialogue) | text | `--att-black` | Replace with token |
| `rgba(0,0,0,0.5)` | `components/image-gallery.js:100` | lightbox scrim | — (scrim, no brand token) | Acceptable; consider a named `--att-scrim` |
| `rgba(0,0,0,0.15)` | `components/image-gallery.js:116` | lightbox control shadow | `--att-shadow-1/2` | Prefer a shadow token |
| `rgba(15, 23, 42, 0.9)` | `components/menu-list.js:88` | drawer backdrop | — (scrim) | `rgba(15,23,42,…)` is a non-brand slate; use `rgba(0,0,0,…)` or a token |
| `rgba(0, 0, 0, 0.3)` | `components/interactive-video.js:141` | marker/overlay shadow | `--att-shadow-1` | Prefer a shadow token |
| `rgba(0,0,0,0.02)` / `rgba(0,0,0,0.01)` | `components/video-frame.js:149`, `components/hotspots.js:91` | faint wash | `--att-grey-1` surface | Prefer `--att-grey-1` |

The 21 modular components are otherwise colour-tokenised — nearly every fill is
`var(--primary)`, `var(--accent)`, `var(--text-*)`, `var(--border-color)`.

### 1b. `js/preview.js` — non-brand fallback literals

`toRgba()` calls pass literal fallbacks that are used only if a theme colour
fails to parse, but they are off-brand hues sitting in the code:

- `js/preview.js:95-99` — `rgba(37, 99, 235, …)` (a generic blue, **not** `#009FDB`), `rgba(245, 158, 11, …)` (amber)
- `js/preview.js:104-105` — `rgba(16, 185, 129, …)` (green), `rgba(239, 68, 68, …)` (**red — the brand has no red**)
- `js/preview.js:71-73, 138-139` — `rgba(0,0,0,…)` / `rgba(15,23,42,…)` shadow ramps (acceptable as shadows, but `15,23,42` slate should be plain black)

Fix: fallbacks should be brand values (`rgba(0,159,219,…)`, `rgba(145,220,0,…)` lime, `rgba(0,56,143,…)` cobalt).

### 1c. `js/themes.js` — semantic colours are off-brand

`js/themes.js:70` — `success: '#087F5B'` (green), `warning: '#9A6700'` (amber),
`danger: '#B42318'` (**red**). The standards (§2) say:

- correct/success → `--att-lime` (`#91DC00`) **accent + black text**, never a text colour
- incorrect/warning → `--att-cobalt` + an exclamation icon + copy; **the brand has no red**

These three values flow into `--success` / `--warning` / `--danger` (`js/preview.js:130-134`) and are consumed by `multiple-choice`, `multiple-select`, `fill-blank`, `interactive-video`, `scenario`. This is a **blocking brand violation**.

### 1d. Builder chrome — `styles.css`

51 distinct hex literals (`grep -oiE '#[0-9a-f]{3,8}' styles.css | sort -u`).
Highest-count / most-relevant:

| Value | ~count | Likely role | Token |
|---|---|---|---|
| `#FFFFFF` | 15 | surface / inverse text | `--att-white` |
| `#92400e` / `#B45309` / `#FBBF24` / `#FDE68A` / `#FFFBEB` | ~20 combined | amber "warning/preview" chrome | no brand amber — recolour to Cobalt + icon |
| `#FECACA` | 1 | red-ish error chrome | **no brand red** |
| `#047857` / `#34D399` | 5 | green "saved/success" chrome | `--att-lime` accent + icon |
| `#2563EB` | 2 | generic blue | `--att-blue` or `--att-cobalt` |
| `#0F172A` / `#1E293B` / `#334155` / `#94A3B8` / `#4B5563` … | ~20 | dark-mode neutrals | map to `--att-grey-*` / black |

Builder chrome is lower priority than exports, but the amber/red/green status
colours should still move to brand (Cobalt/Lime + icon, no red).

---

## 2. Typography — the biggest gap

### 2a. `font-size` below the 16px learner-facing floor

`components/*.js` + `js/preview.js` contain **~183 `font-size` declarations**, of
which only **6 are ≥ 16px** (three `16px`, three `19px`, one `32px`). Distribution:

```
 51 × 12px    35 × 13px    35 × 11px    7 × 10px    6 × 14px    5 × 9px
  3 × 19px     3 × 16px     3 × 15px    1 × 32px
```

Representative offenders (learner-facing body / label text, not chrome):

- `components/accordion.js:131,162,168,236,260,276,284` — 10-14px
- `components/audio-player.js` — 22 declarations, all 10-13px (transcript, chapter list, takeaways — all reading text)
- `components/flip-cards.js:188,193,216,249,282,295,311` — 10-15px (card face copy)
- `components/fill-blank.js:78,83,110,122` — 11-13px (sentence + feedback)
- `components/button-list.js:45` — 13px (button label)
- similar in `hotspots`, `image-gallery`, `info-grid`, `interactive-video`,
  `pricing-comparison`, `process-flow`, `profile-cards`, `scenario`,
  `sorting-activity`, `vertical-timeline`, `horizontal-timeline`, `video-frame`,
  `menu-list`, `multiple-choice`, `multiple-select`, `tabs`

`js/export-shell.js:71,130` — `.block-desc` / description text at 13px.

**Verdict:** blocking. Learner-facing body copy must be ≥ 16px, line-height 1.5.
Metadata-only text (timestamps, counts) may use `--att-fs-body-sm` (14px) but
nothing should be 9-13px in an exported block.

### 2b. Eyebrow / block label oversized

`js/export-shell.js:47-56` — `.block-label` is `font-size: 19px` + `uppercase` +
`letter-spacing: 0.6px`. The standards (§3) define the eyebrow as **12px**,
weight 700, `0.08em` tracking. A 19px uppercase label is not an eyebrow.
`.block-headline` (`js/export-shell.js:61-64`) is 22px — below the `--att-fs-h2`
(30px) / `--att-fs-h3` (24px) heading scale.

### 2c. Missing prose constraints

- **`max-width` on prose:** 0 occurrences of a `ch`-based max-width in
  `components/*.js`. §3 requires `max-width: 70ch` on prose blocks (accordion
  panels, flip-card backs, scenario dialogue, takeaways, transcript).
- **`text-wrap: pretty`** on headings: 0 occurrences.
- **line-height:** mostly fine — 18 × `1.5`, 10 × `1.6`; one `line-height: 1`
  (find and fix — likely a numeric label).

### 2d. Font family

Good: `js/themes.js` `ALLOWED_THEME_FONTS` is ATT Aleck only; `--font-family`
resolves to `'ATT Aleck Sans'`. `js/export-shell.js` embeds `@font-face` via
`customFontFaceCSS`. No system-font primary family found in generators.
Condensed / Slab cuts are **not used at all** — acceptable (§3 says use them
sparingly), but the eyebrow is a candidate for Condensed.

---

## 3. Curvature / radius

No `border-radius: 0` and no square-cornered containers in learner-facing output
(`grep` clean). Components mostly use `var(--border-radius)` (×40) and
`var(--button-radius)` (×24) — theme-driven. Gaps:

| Issue | Where | Fix |
|---|---|---|
| Hard-coded small radii bypassing the scale | `border-radius: 6px` ×15, `8px` ×9, `4px` ×7, `2px` ×2, `12px` ×1 across `components/*.js` | map to `--att-radius-sm` (8) / `--att-radius-md` (12); chips/tracks → `--att-radius-pill` |
| `borderRadius: 12` as the general container radius | `js/themes.js:70` | §4 wants cards/rows at `--att-radius-lg` (20) and block shells at `--att-radius-xl` (32); 12 is button-scale |
| Concentric nesting not enforced | only `calc(var(--border-radius) / 2)` ×3 and `calc(var(--border-radius) - 4px)` ×2 | §4: inner radius = outer − padding, applied consistently |
| `border-radius: 50%` ×21 | avatars, dots, markers | fine for genuinely circular elements; verify none are pills that should be `--att-radius-pill` |

Spacing: components use a mix of the 4px scale and magic numbers
(`margin: 10px 0`, `padding: 6px 14px`, etc.). §4 wants the `--att-space-*` scale
and flex/grid `gap` over per-element margins — a real but non-blocking pass.

Fluidity: components are largely fluid (`max-width`, `minmax`, `%`), no fixed
pixel widths on shells found. Good.

---

## 4. Icon sources

| Source | Where | Verdict |
|---|---|---|
| **Unicode glyph as icon** | `components/audio-player.js:558` — `content: '▸ '` (U+25B8) active-chapter marker | §5 violation — use a functional icon |
| **Unicode escape as icon** | `components/flip-cards.js:227` — `content: '\2713 '` (✓), `:231` — `content: '\21BB '` (↻ restart) | §5 violation — `communications-and-alerts/check-circle`, `navigation-and-controls/restart` |
| **Custom-drawn inline SVG, hard-coded blue** | `js/component-registry.js` — 21 catalog-card icons, **28 × `fill="#009FDB"`** | builder chrome; not from the AT&T library and hard-codes the blue. Medium priority — swap for library `functional` icons with `currentColor` |
| **Inline SVG in generators** | play/pause/mute/chevron/close/check across `components/*.js` | mostly `currentColor` and reasonable; §5 wants these to be the **named** library functional icons, delivered via one icon module, embedding only what a block uses (Prompt 6) |
| **Emoji** | none found in generators | ✓ (emoji do appear in builder-chrome empty states, e.g. `app.js` `🔍`/`★`/`🕐` — chrome only, but §5 says no emoji anywhere) |
| **Third-party icon sets** (Font Awesome / Material / Lucide) | none | ✓ |

The AT&T icon library itself (439 functional + 1071 pictogram SVGs, ~19 MB, each
carrying C2PA provenance metadata) lives at `ATT Design System/Claude Promts/ATT
Design System Icons/icons/` and is **gitignored** per repo policy (`.gitignore`
"Client design-source files … not versioned"). Prompt 6 should process it the way
the fonts were processed (`docs/EXPORT-CONTRACT.md`): strip metadata, normalise to
`currentColor`, embed only used icons — not commit the raw dump.

---

## 5. Focus styles & touch targets

### 5a. `outline: none` without a visible replacement

| file:line | Has a `:focus-visible` replacement? |
|---|---|
| `components/accordion.js:136` | yes (`:focus-visible` present) |
| `components/process-flow.js:174` | yes |
| `components/fill-blank.js:90` | partial — the input's `border-bottom-color` changes to `--accent` on `:focus` (`:99`), but that is a 2px AT&T-Blue underline, not the spec's 3px Cobalt outline at 2px offset, and it fails contrast at small size |
| `components/interactive-video.js:219` | **no replacement** — `.iv-interaction-panel` is revealed and focused programmatically for screen-reader users; `outline: none` makes that focus invisible |
| `styles.css:265, 398, 1130, 1190, 1337` | builder chrome — verify each has a replacement; `:1190` (a textarea) and `:1337` (inputs) look unreplaced |

Only **2 of 21** components define `:focus-visible` at all
(`accordion`, `process-flow`); 3 define any `:focus`. The standards (§6) require a
`3px --att-cobalt` outline, `2px` offset on every interactive brand surface. The
shared a11y script manages roving tabindex / `aria-*` but not focus *appearance*.

### 5b. Touch targets

Only **one** explicit `min-width: 44px` (`components/interactive-video.js:482`).
Every other interactive control (accordion headers, tab buttons, flip cards,
quiz options, timeline nodes, hotspot pins, drawer rows, gallery thumbs, audio
/ video transport buttons) relies on padding and is unverified against the
44×44px minimum (§6/§7). Needs a per-component check.

### 5c. Reduced motion

`@media (prefers-reduced-motion: reduce)` appears in **5 of 21** components.
§6 requires transitions to drop to 0ms under reduced motion everywhere there is
motion (flip cards, timelines, accordions, process flow, tabs, hotspot reveals,
video overlays).

---

## 6. Contrast (WCAG AA — 4.5:1 body, 3:1 headline-scale)

### 6a. `#009FDB` (AT&T Blue) as small text — **fails**

`#009FDB` on `#FFFFFF` ≈ **2.6–3.0:1** (the standards doc §2 and
`js/themes.js:52` both state this). Used as a **text colour** (`color:
var(--accent)`), on elements whose `font-size` is 11-14px, in:

- `components/audio-player.js:308`
- `components/flip-cards.js:177`
- `components/info-grid.js:75`
- `components/interactive-video.js:474`
- `components/pricing-comparison.js:105`
- `components/process-flow.js:134`
- `components/profile-cards.js:71`
- `components/scenario.js:74`, `:113`
- `components/sorting-activity.js:153`

`js/export-shell.js` `.block-label` also renders in `--accent`-adjacent styling
at eyebrow scale.

**Fix:** small text in blue must be **Cobalt** (`#00388F`, ≈ **11:1** on white).
Swap `color: var(--accent)` → `color: var(--primary)` for text; keep `--accent`
for fills, borders, and headline-scale (≥ 24px) text only.
`att-brand-compliance.test.js` already enforces this for *clickable* elements
(`.menu-num`, `.acc-arrow`, `.timeline-node.active .node-label`, …) — extend the
same rule to non-clickable labels/values.

### 6b. `--muted-text` (`#4B5563`) on white ≈ 7.5:1 — passes, but

Used widely for secondary copy at 11-13px. Ratio is fine; the issue is §3's
"never grey body text below 4.5:1" is satisfied numerically, but a lot of primary
reading content (transcripts, takeaways, card backs) is set in muted grey at
sub-16px — that's a typography/hierarchy problem (see §2), not a raw contrast
fail.

### 6c. Off-brand semantic colours

`#B42318` danger / `#9A6700` warning / `#087F5B` success (`js/themes.js:70`) —
even where they pass contrast, they are the wrong hues (§2: no red; success is
Lime-*accent* with black text, not coloured text). Feedback must not rely on
colour alone regardless.

### 6d. Not yet computed

`--accent` on `--primary` (badge text), `--muted-text` on `--grey-1`, and every
`success/warning/danger` foreground/background pair — needs a scripted axe /
`contrastRatio()` sweep of the rendered exports (Prompt 7 / Prompt 8).

---

## 7. Prioritised fix list

### P0 — Blocking brand violations

| # | Fix | Files (est.) |
|---|---|---|
| 1 | Replace `success/warning/danger` with brand: correct → Lime accent + black text + check icon; incorrect/warning → Cobalt + exclamation icon + copy; **remove every red** (`#B42318`, `#FECACA`, `rgba(239,68,68,…)`) | `js/themes.js`, `js/preview.js`, + `multiple-choice`, `multiple-select`, `fill-blank`, `interactive-video`, `scenario` (~7) |
| 2 | `#009FDB` text → Cobalt everywhere text is < 24px (§6a) | ~10 components + `js/export-shell.js` |
| 3 | Replace glyph icons `▸` `✓` `↻` with named library functional icons | `audio-player.js`, `flip-cards.js` (2) |
| 4 | `js/preview.js` `toRgba()` fallbacks → brand values | `js/preview.js` (1) |

### P1 — Typography (blocking for learner-facing output)

| # | Fix | Files (est.) |
|---|---|---|
| 5 | Raise learner-facing body copy to a 16px floor, line-height 1.5; metadata may stay 14px; nothing below 14px in an export | all 21 `components/*.js` + `js/export-shell.js` |
| 6 | Eyebrow → 12px / 700 / `0.08em`; block headline onto the `--att-fs-h*` scale | `js/export-shell.js` (1) |
| 7 | `max-width: 70ch` + `text-wrap: pretty` on prose blocks and headings | ~10 components |

### P2 — Accessibility

| # | Fix | Files (est.) |
|---|---|---|
| 8 | Add `:focus-visible` (3px Cobalt, 2px offset) wherever `outline: none` has no replacement — `fill-blank.js:90`, `interactive-video.js:219`, `styles.css:1190/1337` — then a shared focus rule for all 21 components | 21 components + `styles.css` |
| 9 | Verify/raise every interactive target to 44×44px | 21 components |
| 10 | `prefers-reduced-motion` → 0ms in the 16 components that lack it | 16 components |

### P3 — Polish / system

| # | Fix | Files (est.) |
|---|---|---|
| 11 | Hard-coded radii (`4/6/8/12px`) → `--att-radius-*`; card/shell radii up to `lg`/`xl`; concentric nesting | 21 components + `js/themes.js` |
| 12 | Magic-number spacing → `--att-space-*` scale + `gap` | 21 components |
| 13 | Catalog-card icons (`js/component-registry.js`, 28 × `#009FDB`) → library functional icons, `currentColor` | `js/component-registry.js` (1) |
| 14 | Builder-chrome amber/green/red status colours (`styles.css`) → Cobalt/Lime + icon | `styles.css` (1) |
| 15 | Builder-chrome empty-state emoji (`app.js` `🔍 ★ 🕐`) → library icons (§5 "no emoji anywhere") | `app.js` (1) |
| 16 | Wire `att-tokens.css` / `att-fonts.css` in and reconcile `--primary`/`--accent` ↔ `--att-*` names | Prompt 2 |

### Notes

- The color pass (P0 #2, #4) is the smallest, highest-value change and is mostly
  a `var(--accent)` → `var(--primary)` substitution guarded by the existing
  `att-brand-compliance.test.js` pattern.
- Typography (P1) is the largest surface — every component and the shell — and
  will force layout adjustments; do it as its own pass (Prompt 4) with
  before/after screenshots.
- Nothing here touches component options, the data model, or the export
  contract — all fixes are visual-layer only.
