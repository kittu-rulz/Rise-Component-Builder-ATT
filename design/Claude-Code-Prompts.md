# Claude Code prompts — bringing the Rise Component Builder onto AT&T standards

Drop `ATT-Rise-Design-Standards.md`, `att-tokens.css`, and `att-fonts.css` into
the repo (suggested: `design/` and `src/styles/`) plus the TTFs in `src/fonts/`,
then run these in order. Each prompt is self-contained — paste one, let it finish,
review the diff, then move on. Do not run them all at once.

---

## Prompt 0 — Set the ground rules (paste once, at the top of the session)

```
Read design/ATT-Rise-Design-Standards.md, src/styles/att-tokens.css, and
src/styles/att-fonts.css. These three files are the authoritative visual
specification for this project. Treat them the way you'd treat a type system:
any CSS value that contradicts them is a bug.

Also add them to CLAUDE.md as required reading for all future visual work, with
this summary of the hard rules:
- Only colors from att-tokens.css. AT&T Blue #009FDB dominant, Cobalt #00388F for CTAs.
- ATT Aleck only. 16px minimum learner-facing body copy.
- Rounded corners on every container; radius scales with container size.
- Only AT&T icon-library SVGs. No emoji, no third-party icon sets.
- Never style bare body/h1-h6/a — everything scoped under the block wrapper.

Do not change any code yet. Reply with a summary of what you understood and any
place the spec is ambiguous for this codebase.
```

---

## Prompt 1 — Audit before touching anything

```
Audit this codebase against design/ATT-Rise-Design-Standards.md. Do not modify
any files. Produce design/BRAND-AUDIT.md containing:

1. Every hard-coded color literal (hex, rgb, hsl, named) with file:line, grouped
   by value, and the nearest legitimate token from att-tokens.css — flag any that
   have no legitimate equivalent.
2. Every font-family declaration and every font-size below 16px that renders in
   learner-facing output (not builder chrome).
3. Every border-radius: 0 or missing radius on a container, button, input, card,
   or media frame.
4. All icon sources currently in use: inline SVG, icon fonts, emoji characters,
   third-party libraries, unicode glyphs like ∨ → and +.
5. Every focus style that is removed or invisible, and every interactive element
   under 44x44px.
6. Text/background pairs failing WCAG AA, with computed ratios. Call out any
   #009FDB text under 24px specifically.
7. A prioritized fix list: blocking brand violations first, then accessibility,
   then polish. Estimate the file count touched by each.

Be exhaustive and cite file:line for everything. This is the work plan for the
prompts that follow.
```

---

## Prompt 2 — Install the token layer

```
Wire att-tokens.css and att-fonts.css into the app and into the export pipeline.

1. Load them as the first stylesheets in the builder app.
2. In the export pipeline, ensure every generated artifact (Copy-for-Rise HTML
   fragment, iframe srcdoc, web package ZIP, single-file HTML) carries the token
   block and the @font-face rules for the cuts that artifact actually uses —
   inlined, not linked, since Rise won't resolve relative paths.
3. For Copy-for-Rise fragments, scope the custom properties to the block wrapper
   class rather than :root, so a Rise page hosting several blocks doesn't
   collide. Keep :root for the builder app itself.
4. Add a build-time check that fails if an exported artifact references a font
   file it doesn't embed.

Don't restyle any components yet — just make the tokens available everywhere and
prove it with a passing check.
```

---

## Prompt 3 — Replace every color literal with tokens

```
Using design/BRAND-AUDIT.md section 1, replace every hard-coded color in
component styles and templates with the correct var(--att-*) token.

Rules:
- Map by role, not by visual similarity: CTAs become --att-cta-bg (Cobalt),
  feature panels --att-blue, sunken areas --att-grey-1, borders --att-grey-2/3.
- Any color with no legitimate brand equivalent: pick the closest role-appropriate
  token and list the substitution in a summary at the end of your response.
- Success/correct states use --att-lime as an accent with black text; Lime is
  never a text or icon color. The brand has no red — incorrect states use Cobalt
  plus an exclamation-circle functional icon plus explicit copy, never color alone.
- Hover/active may darken or lighten a token via color-mix or a documented
  -hover token; they may not introduce a new hue.
- Preserve current layout and behavior exactly. Colors only in this pass.

Then verify: grep the styles for hex/rgb/hsl literals and report anything left,
with the reason it survived.
```

---

## Prompt 4 — Typography pass

```
Bring all typography onto the AT&T type system per section 3 of the standards.

- Every component and every export uses --att-font-sans; Condensed only for
  tight labels, Slab only for deliberate editorial emphasis. No system-font
  fallbacks as the primary family.
- Learner-facing body copy: 16px floor, line-height 1.5, max-width 70ch on
  prose blocks. Builder-chrome text may stay smaller.
- Headings use the --att-fs-h1..h4 scale with --att-lh-heading, weight 500 or
  700, color --att-heading (black where contrast requires it).
- Block labels / eyebrows: --att-fs-eyebrow, weight 700, uppercase,
  --att-ls-eyebrow tracking.
- Sentence case for all headings and button labels; strip ALL CAPS except eyebrows.
- text-wrap: pretty on headings and short prose. Remove any text-align: justify.
- Cap each component at two font cuts. Where a component uses more, consolidate
  and say which cuts you removed.

Report any place where the 16px floor forced a layout change.
```

---

## Prompt 5 — Curvature pass

```
Apply AT&T curvature per section 4 of the standards.

- Block shells --att-radius-xl; cards and accordion rows --att-radius-lg;
  buttons, inputs, selects --att-radius-md; chips, badges, progress tracks
  --att-radius-pill or --att-radius-sm. Media frames and video players get
  --att-radius-lg with overflow: hidden.
- Remove every border-radius: 0 and every square-cornered container in
  learner-facing output.
- Make nested corners concentric: inner radius = outer radius minus the padding
  between them. Fix any case where a child's corner visually fights its parent's.
- Convert spacing to the --att-space-* scale; replace magic-number margins and
  paddings. Prefer flex/grid with gap over per-element margins.
- Keep everything fluid: max-width instead of fixed width, minmax(0, 1fr) grid
  tracks, no fixed heights on text containers. Rise column widths vary and can
  be under 400px.

Show me before/after screenshots of the accordion, tabs, flip cards, and vertical
timeline components at 360px, 768px, and 1200px wide.
```

---

## Prompt 6 — Swap in the real AT&T icon set

```
Replace all ad-hoc iconography with AT&T icon-library SVGs.

Assets: icons/functional/<category>/ and icons/pictograms/<category>/ — 439
functional icons (fills already normalized to currentColor) and 1,071 pictogram
files across 15 categories, with icons/index.json listing every name and
icons/README.md documenting the usage rules. Names are the library's own, e.g.
navigation-and-controls/chevron-down, navigation-and-controls/play,
communications-and-alerts/check-circle, communications-and-alerts/exclamation-triangle,
security/padlock, navigation-and-controls/close, navigation-and-controls/search,
navigation-and-controls/restart.

1. Build a small icon module that inlines an SVG sprite or per-icon symbols,
   sets fill/stroke to currentColor, applies width/height from --att-icon-*,
   and takes an accessible name (aria-hidden when purely decorative, role="img"
   + <title> when meaningful).
2. Replace every unicode glyph, emoji, icon-font glyph, and third-party icon
   with the correct functional icon. Specifically: accordion expand/collapse
   (+/-, chevron, arrow options), tab chevrons, close buttons, check/visited
   badges, correct/incorrect feedback marks, video play/pause/mute, search,
   reset, and lock indicators for guided mode.
3. Functional icons are black or white only, sized --att-icon-md in UI.
   Pictograms are 96px, two-color on white or white on blue, used only as card
   subject imagery — never as a UI affordance and never as filler.
4. Ensure exports embed only the icons a block actually uses; don't ship the
   whole sprite in a Rise code block.

List any UI affordance you couldn't find a library icon for rather than
substituting something off-brand.
```

---

## Prompt 7 — States, focus, and accessibility

```
Standardize interaction states per sections 6 and 7 of the standards, across
every learner-facing component.

- One shared set of state rules: hover (one step darker or --att-shadow-2),
  focus-visible (3px --att-cobalt outline, 2px offset — never outline: none),
  active (no transform beyond scale(0.98)), selected (Cobalt/AT&T Blue fill or
  3px underline bar), disabled (Grey 2 fill, Grey 3 text, not-allowed cursor),
  visited/complete (check icon + Grey 2, never color alone).
- Transitions --att-dur-base --att-ease, zeroed under prefers-reduced-motion.
- Every interactive target 44x44px minimum.
- Keyboard: accordions expose aria-expanded and toggle on Enter/Space; tabs use
  roving tabindex with arrow-key navigation and aria-selected; flip cards are
  buttons with aria-pressed; answer feedback announces in an aria-live="polite"
  region; guided-mode locked items are aria-disabled with an explanation.
- Verify with keyboard-only walkthroughs of the accordion, tabs, flip cards,
  multiple choice, and interactive video components and report what you found.
```

---

## Prompt 8 — Brand-lock the exports and prevent regressions

```
Make brand compliance enforceable rather than a one-time cleanup.

1. Extend the existing Preflight Check with brand rules that block export:
   - a color literal outside att-tokens.css in the generated CSS
   - a font-family other than ATT Aleck on learner-facing text
   - learner-facing font-size below 16px
   - a text/background pair below WCAG AA (flagging #009FDB under 24px)
   - a non-library icon source or an emoji character
   - a missing focus-visible style on an interactive element
   Blocking errors for the first three and the icon rule; warnings for the rest.
2. Add a stylelint config (or equivalent) encoding the same rules so violations
   surface in the editor, not just at export.
3. Add a visual regression snapshot per component template at 360/768/1200px.
4. Update the builder's Settings > Brand font copy to reflect the actual embedded
   cuts, and document the brand system in README under "Brand compliance",
   pointing at design/ATT-Rise-Design-Standards.md.
```

---

## Prompt 9 — Single-component deep pass (repeat per template)

```
Take the <COMPONENT NAME> template only. Rebuild its visual layer to be an
exemplary AT&T Rise block, following design/ATT-Rise-Design-Standards.md exactly.

- AT&T Blue-led composition; Cobalt only for CTAs; at most one large soft blue
  curve as decorative header shape.
- Rounded rectangles throughout with concentric nesting.
- Two font cuts maximum; 16px body floor; sentence case.
- Library functional icons at --att-icon-md; a pictogram only if the content
  genuinely calls for subject imagery.
- Full state set including focus-visible and reduced-motion.
- Fluid from 320px to 1400px.

Change nothing about the component's options, data model, or export contract —
visual layer only. Then show me the exported Rise fragment rendering at three
widths and tell me what you'd still improve.
```

---

## Notes

- **Fonts:** the TTFs are large. Ask Claude Code to convert to WOFF2 and subset to
  Latin (`pyftsubset --flavor=woff2`) before embedding — a Rise code block has a
  practical size limit and six full TTF cuts will blow past it.
- **Order matters:** run 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Prompt 9 is the
  finishing pass, one component at a time, after the system is in place.
- **Review each diff.** These prompts are deliberately scoped to one concern each
  so the diffs stay readable.
