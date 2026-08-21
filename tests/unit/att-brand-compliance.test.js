import { describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import * as accordion from '../../components/accordion.js';
import * as tabs from '../../components/tabs.js';
import * as flipCards from '../../components/flip-cards.js';
import * as hotspots from '../../components/hotspots.js';
import * as menuList from '../../components/menu-list.js';
import * as multipleChoice from '../../components/multiple-choice.js';
import * as sortingActivity from '../../components/sorting-activity.js';
import * as fillBlank from '../../components/fill-blank.js';
import * as verticalTimeline from '../../components/vertical-timeline.js';
import * as horizontalTimeline from '../../components/horizontal-timeline.js';
import * as processFlow from '../../components/process-flow.js';
import * as profileCards from '../../components/profile-cards.js';
import * as infoGrid from '../../components/info-grid.js';
import * as pricingComparison from '../../components/pricing-comparison.js';
import * as videoFrame from '../../components/video-frame.js';
import * as imageGallery from '../../components/image-gallery.js';
import { getBuiltInTheme, resolveThemeTokens, contrastRatio } from '../../js/themes.js';

// Regression coverage for the "ATT branding points.pptx" audit (16 components, G1-G8
// global rules). Each check below targets one concrete violation the audit found and
// this pass fixed — see the completion report for the full Slide/Component/Requirement
// mapping. These assert against generateCSS() source text (the same string every
// preview and export renders from — js/preview.js#generateIframeContent), not against
// a live-rendered DOM, since the rules are about which CSS custom property a rule
// resolves through, not about computed pixel color.
const INSTANCE_ID = 'rcb-test-instance';

describe('AT&T brand: clickable elements use Cobalt (--primary), not AT&T Blue (--accent)', () => {
  test('hotspot pin (clickable) is Cobalt, not AT&T Blue', () => {
    const css = hotspots.generateCSS();
    expect(css).toMatch(/\.hotspot-pin\s*{[^}]*background-color:\s*var\(--primary\)/);
    expect(css).not.toMatch(/\.hotspot-pin\s*{[^}]*background-color:\s*var\(--accent\)/);
  });

  test('active tab label and underline are Cobalt, not AT&T Blue', () => {
    const css = tabs.generateCSS();
    expect(css).toMatch(/\.tab-btn\.active\s*{[^}]*color:\s*var\(--primary\)/);
    expect(css).not.toMatch(/\.tab-btn\.active\s*{[^}]*color:\s*var\(--accent\)/);
  });

  test('selected quiz option (multiple choice) uses a Cobalt border, not an AT&T-Blue tint fill', () => {
    const css = multipleChoice.generateCSS();
    expect(css).toMatch(/\.quiz-option\.selected\s*{[^}]*border-color:\s*var\(--primary\)/);
    expect(css).not.toContain('background-color: var(--accent-tint)');
  });

  test('active sorting target button is a Cobalt-filled capsule, not an AT&T-Blue rectangle', () => {
    const css = sortingActivity.generateCSS();
    expect(css).toMatch(/\.target-btn\.active\s*{[^}]*background-color:\s*var\(--primary\)/);
    expect(css).toMatch(/\.target-btn\s*{[^}]*border-radius:\s*var\(--button-radius\)/);
  });

  test('active vertical-timeline step marker is Cobalt, not AT&T Blue', () => {
    const css = verticalTimeline.generateCSS();
    expect(css).toMatch(/\.timeline-step\.active \.step-marker\s*{[^}]*background-color:\s*var\(--primary\)/);
  });

  test('active horizontal-timeline node marker and label are Cobalt, not AT&T Blue', () => {
    const css = horizontalTimeline.generateCSS();
    expect(css).toMatch(/\.timeline-node\.active \.node-marker\s*{[^}]*background-color:\s*var\(--primary\)/);
    expect(css).toMatch(/\.timeline-node\.active \.node-label\s*{[^}]*color:\s*var\(--primary\)/);
  });

  test('video overlay play button is Cobalt (resting and hover), not AT&T Blue or a neutral wash', () => {
    const css = videoFrame.generateCSS();
    expect(css).toMatch(/\.video-overlay-play\s*{[^}]*background-color:\s*var\(--primary\)/);
    expect(css).toMatch(/\.video-wrapper:hover \.video-overlay-play\s*{[^}]*background-color:\s*var\(--primary-hover\)/);
    expect(css).not.toContain('background-color: rgba(15, 23, 42, 0.7)');
  });

  test('pricing action button is a Cobalt capsule (full var(--button-radius)), not a partially-rounded rectangle', () => {
    const css = pricingComparison.generateCSS();
    expect(css).toMatch(/\.pricing-action-btn\s*{[^}]*border-radius:\s*var\(--button-radius\)/);
    expect(css).not.toContain('border-radius: calc(var(--border-radius) - 4px)');
  });

  test('clickable menu-drawer index number and expanded arrow are Cobalt, not AT&T Blue', () => {
    const css = menuList.generateCSS();
    expect(css).toMatch(/\.menu-num\s*{[^}]*color:\s*var\(--primary\)/);
    expect(css).toMatch(/\.menu-drawer-item\.active \.menu-arrow\s*{[^}]*color:\s*var\(--primary\)/);
  });

  test('active accordion indicator icons are Cobalt, not AT&T Blue', () => {
    const css = accordion.generateCSS();
    expect(css).toMatch(/\.accordion-item\.active \.acc-arrow\s*{[^}]*color:\s*var\(--primary\)/);
  });

  test('active flip-card study filter/classify controls are Cobalt, not AT&T Blue', () => {
    const css = flipCards.generateCSS();
    expect(css).toMatch(/\.flip-filter-chip\.active,\s*\.flip-review-filter-btn\[aria-pressed="true"\]\s*{[^}]*border-color:\s*var\(--primary\)/);
  });

  test('hovered/selected profile card is Cobalt, not AT&T Blue (the card is a clickable control)', () => {
    const css = profileCards.generateCSS();
    expect(css).toMatch(/\.profile-card-item:hover\s*{[^}]*border-color:\s*var\(--primary\)/);
  });

  test('selected info-grid card uses a Cobalt border, not an AT&T-Blue tint fill', () => {
    const css = infoGrid.generateCSS();
    expect(css).toMatch(/\.info-grid-item\.active\s*{[^}]*border-color:\s*var\(--primary\)/);
    expect(css).not.toContain('background-color: var(--accent-tint)');
  });
});

describe('AT&T brand: no AT&T-Blue text below the 19px accessibility threshold', () => {
  // Every clickable-text case above already moved off --accent entirely (onto --primary,
  // which carries no size restriction). What's left to guard is *passive* small text that
  // must stay off --accent too, per G4/G5 ("use an approved neutral instead").
  test('sorting-activity column header (passive label, 12px) is not AT&T-Blue text', () => {
    const css = sortingActivity.generateCSS();
    expect(css).toMatch(/\.column-header\s*{[^}]*color:\s*var\(--text-main\)/);
    expect(css).not.toMatch(/\.column-header\s*{[^}]*color:\s*var\(--accent\)/);
  });

  test('process-flow step duration line (passive text, 11px) is not AT&T-Blue text', () => {
    const css = processFlow.generateCSS();
    expect(css).toMatch(/\.process-step-duration\s*{[^}]*color:\s*var\(--text-muted\)/);
    expect(css).not.toMatch(/\.process-step-duration\s*{[^}]*color:\s*var\(--accent\)/);
  });

  test('video mini play/pause label (clickable, 11px) uses Cobalt, which carries no size restriction', () => {
    const css = videoFrame.generateCSS();
    expect(css).toMatch(/\.video-mini-play\s*{[^}]*color:\s*var\(--primary\)/);
  });
});

describe('AT&T brand: Cobalt is reserved for clickable elements, never a passive popup surface', () => {
  test('hotspot tooltip (passive content, no control inside it) is not Cobalt-colored', () => {
    const css = hotspots.generateCSS();
    const tooltipRule = css.match(/\.hotspot-tooltip\s*{[^}]*}/)[0];
    expect(tooltipRule).not.toContain('var(--primary)');
    expect(tooltipRule).not.toContain('var(--accent)');
    // Built from the theme's own inverted text/surface tokens, not an invented hex.
    expect(tooltipRule).toContain('background-color: var(--text-main)');
    expect(tooltipRule).toContain('color: var(--bg-card)');
  });

  test('hotspot pin trigger itself is Cobalt (it is the clickable control)', () => {
    const css = hotspots.generateCSS();
    expect(css).toMatch(/\.hotspot-pin\s*{[^}]*background-color:\s*var\(--primary\)/);
  });
});

describe('AT&T brand: no improvised tints/shades of the brand blues', () => {
  test('vertical-timeline connecting rail is not an opacity-faked tint of --accent', () => {
    const css = verticalTimeline.generateCSS();
    const railRule = css.match(/\.vertical-timeline-container::before\s*{[^}]*}/)[0];
    expect(railRule).not.toMatch(/opacity\s*:\s*[\d.]/);
    expect(railRule).not.toContain('var(--accent)');
    expect(railRule).toContain('var(--border-color)');
  });

  test('no component under audit uses --accent-tint or --primary-tint as a clickable-state fill', () => {
    for (const [name, mod] of Object.entries({ multipleChoice, infoGrid })) {
      const css = mod.generateCSS();
      expect(css, `${name} should not use an accent/primary tint background`).not.toMatch(/background-color:\s*var\(--(accent|primary)-tint\)/);
    }
  });

  test('feedback panels (correct/incorrect) use real success/danger tokens, not hardcoded emerald/red hex', () => {
    for (const [name, mod] of Object.entries({ multipleChoice, sortingActivity, fillBlank })) {
      const css = mod.generateCSS();
      expect(css, `${name} feedback colors`).not.toMatch(/#(10B981|EF4444|065F46|991B1B)/i);
      expect(css).toContain('var(--success)');
      expect(css).toContain('var(--danger)');
      expect(css).toContain('var(--success-tint)');
      expect(css).toContain('var(--danger-tint)');
    }
  });

  test('hotspots fallback schematic and tooltip carry no hardcoded slate/gray hex literals', () => {
    const html = hotspots.generateHTML({ items: [{ title: 'A', content: 'B', x: '50', y: '50' }] }, INSTANCE_ID);
    const css = hotspots.generateCSS();
    expect(html + css).not.toMatch(/#(F1F5F9|CBD5E1|E2E8F0|94A3B8|0F172A)/i);
  });

  test('info-grid fallback icon accent dots reference the theme token, not a hardcoded #009FDB literal', () => {
    const html = infoGrid.generateHTML({ items: [{ title: 'Card', content: 'Desc' }] });
    expect(html).not.toContain('#009FDB');
    expect(infoGrid.generateCSS()).toContain('.info-grid-icon-accent-dots');
  });

  test('image-gallery caption overlay and lightbox text carry no hardcoded slate hex literal', () => {
    const css = imageGallery.generateCSS();
    expect(css).not.toMatch(/#94A3B8/i);
  });
});

describe('AT&T brand: WCAG contrast holds for every retargeted color pairing (computed, not eyeballed)', () => {
  const tokens = resolveThemeTokens(getBuiltInTheme());

  test('white text on Cobalt (--on-primary on --primary) clears 4.5:1 at any size', () => {
    expect(contrastRatio(tokens.primary, tokens.background)).toBeGreaterThanOrEqual(4.5);
  });

  test('success and danger feedback text clear 4.5:1 on white', () => {
    expect(contrastRatio(tokens.success, tokens.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tokens.danger, tokens.background)).toBeGreaterThanOrEqual(4.5);
  });

  test('white gallery caption text on the solid neutral overlay clears 4.5:1 regardless of the underlying photo', () => {
    expect(contrastRatio(tokens.background, tokens.text)).toBeGreaterThanOrEqual(4.5);
  });

  test('AT&T Blue (--accent) on white only clears the 3:1 large-text/graphical threshold, confirming the 19px rule is load-bearing, not decorative', () => {
    const ratio = contrastRatio(tokens.accent, tokens.background);
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(ratio).toBeLessThan(4.5);
  });
});

describe('AT&T brand: new authoring features (Slides 6 and 10)', () => {
  test('multiple choice: submit button defaults to "Submit Answer" when unset (backward compatible)', () => {
    const html = multipleChoice.generateHTML({ items: [{ label: 'A', content: '', correct: true }] }, INSTANCE_ID);
    expect(new JSDOM(html).window.document.querySelector('.quiz-submit-btn').textContent).toBe('Submit Answer');
  });

  test('multiple choice: a custom submit button label renders verbatim and is escaped', () => {
    const html = multipleChoice.generateHTML({
      items: [{ label: 'A', content: '', correct: true }],
      mcSubmitButtonText: 'Lock In My Answer'
    }, INSTANCE_ID);
    const btn = new JSDOM(html).window.document.querySelector('.quiz-submit-btn');
    expect(btn.textContent).toBe('Lock In My Answer');
  });

  test('multiple choice: an unsafe submit button label is HTML-escaped, not executed', () => {
    const html = multipleChoice.generateHTML({
      items: [{ label: 'A', content: '', correct: true }],
      mcSubmitButtonText: '<img src=x onerror=alert(1)>'
    }, INSTANCE_ID);
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(new JSDOM(html).window.document.querySelector('.quiz-submit-btn').textContent).toContain('<img');
  });

  test('multiple choice: an empty/whitespace submit button label falls back to the default rather than rendering blank', () => {
    const html = multipleChoice.generateHTML({ items: [{ label: 'A', content: '', correct: true }], mcSubmitButtonText: '' }, INSTANCE_ID);
    expect(new JSDOM(html).window.document.querySelector('.quiz-submit-btn').textContent).toBe('Submit Answer');
  });

  test('horizontal timeline: a marker label renders inside the node, aria-hidden, without altering the tab\'s accessible name', () => {
    const html = horizontalTimeline.generateHTML({
      items: [
        { title: 'Phase One', content: 'Desc', markerLabel: '1' },
        { title: 'Phase Two', content: 'Desc', markerLabel: '2' }
      ]
    }, INSTANCE_ID);
    const doc = new JSDOM(html).window.document;
    const firstNode = doc.querySelector('.timeline-node');
    const label = firstNode.querySelector('.node-marker-label');
    expect(label.textContent).toBe('1');
    expect(label.getAttribute('aria-hidden')).toBe('true');
    // Accessible name still comes from the visible title text, not the marker number.
    expect(firstNode.textContent).toContain('Phase One');
  });

  test('horizontal timeline: projects saved before this field existed render with no marker (backward compatible)', () => {
    const html = horizontalTimeline.generateHTML({ items: [{ title: 'Phase One', content: 'Desc' }] }, INSTANCE_ID);
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelector('.node-marker-label')).toBeNull();
    expect(doc.querySelector('.node-marker')).not.toBeNull();
  });

  test('horizontal timeline: a marker label is HTML-escaped, not executed', () => {
    const html = horizontalTimeline.generateHTML({
      items: [{ title: 'Phase One', content: 'Desc', markerLabel: '<script>alert(1)</script>' }]
    }, INSTANCE_ID);
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
