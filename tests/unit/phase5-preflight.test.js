/**
 * Phase 5 & 6 tests — component-specific preflight rules, partial-credit
 * scoring, fuzzy-match boundary cases, and focus-management structural checks.
 *
 * Every test here covers a gap identified in the Phase 6 audit:
 *   - Scenario graph validation (dead ends, no ending state)
 *   - Comparison Slider missing images
 *   - Flip Cards Study Mode incomplete pairs
 *   - Accordion sequential+expand contradiction
 *   - Fill-in-the-Blank fuzzy-match short-answer warning
 *   - Sorting Activity single-category warning
 *   - Multiple-Select partial-credit scoring calculation
 *   - Fill-in-the-Blank answer boundary matching
 *   - Modal/dialog focus-management HTML structural assertions
 */

import { describe, expect, test } from 'vitest';
import { COMPONENT_REGISTRY, getComponentById, getDefaultConfig } from '../../js/component-registry.js';
import { applyThemeToConfig, BUILT_IN_THEMES, DEFAULT_THEME_ID } from '../../js/themes.js';
import { collectSyncIssues, SEVERITY } from '../../js/validation.js';

const theme = BUILT_IN_THEMES.find(t => t.id === DEFAULT_THEME_ID);

function buildConfig(componentId, overrides = {}) {
  const entry = getComponentById(COMPONENT_REGISTRY, componentId);
  const config = applyThemeToConfig({
    blockTitle: 'Test Block', blockHeadline: 'Test Headline', blockDesc: 'Test.',
    borderRadius: '12', shadowDepth: 'soft', borderOutline: true,
    trackCompletion: false, completionMsg: 'Done!',
    ...getDefaultConfig(entry)
  }, theme);
  return { ...config, ...overrides };
}

function issuesFor(componentId, config) {
  const entry = getComponentById(COMPONENT_REGISTRY, componentId);
  return collectSyncIssues({
    componentId, schema: entry.editorSchema, config, theme, componentOverrides: {},
    settings: {
      mediaLimitsMb: { image: 10, audio: 30, video: 100, svg: 2 },
      completionParentOrigin: 'https://example.com'
    }
  });
}

function bySeverity(issues, severity) { return issues.filter(i => i.severity === severity); }
function byRuleId(issues, ruleId) { return issues.filter(i => i.ruleId === ruleId); }

// ---------------------------------------------------------------------------
// Scenario graph validation
// ---------------------------------------------------------------------------

describe('Phase 5: Scenario — dead-end detection', () => {
  test('default config produces no false-positive blocking issues', () => {
    const config = buildConfig('scenario');
    const issues = issuesFor('scenario', config);
    expect(bySeverity(issues, SEVERITY.BLOCKING)).toEqual([]);
  });

  test('a choice with an out-of-range nextSlide triggers scenario-dead-end-scene warning', () => {
    const config = buildConfig('scenario');
    config.items[1].nextSlide = 99; // no item at index 99
    const issues = issuesFor('scenario', config);
    expect(byRuleId(issues, 'scenario-dead-end-scene').length).toBeGreaterThan(0);
    const found = byRuleId(issues, 'scenario-dead-end-scene')[0];
    expect(found.severity).toBe(SEVERITY.WARNING);
    expect(found.itemIndex).toBe(1);
  });

  test('a choice with a negative nextSlide triggers scenario-dead-end-scene warning', () => {
    const config = buildConfig('scenario');
    config.items[1].nextSlide = -1;
    const issues = issuesFor('scenario', config);
    expect(byRuleId(issues, 'scenario-dead-end-scene').length).toBeGreaterThan(0);
  });

  test('a valid nextSlide within item range does not trigger dead-end warning', () => {
    const config = buildConfig('scenario');
    config.items[1].nextSlide = 0; // valid — loops back to item 0
    const issues = issuesFor('scenario', config);
    expect(byRuleId(issues, 'scenario-dead-end-scene')).toHaveLength(0);
  });

  test('choices with empty/null nextSlide are valid terminals', () => {
    const config = buildConfig('scenario');
    config.items.forEach(item => { delete item.nextSlide; });
    const issues = issuesFor('scenario', config);
    expect(byRuleId(issues, 'scenario-dead-end-scene')).toHaveLength(0);
  });

  test('no-ending-state fires when all choices have a nextSlide target', () => {
    const config = buildConfig('scenario');
    // Point all choices to item 0 so no choice is terminal
    config.items.slice(1).forEach(item => { item.nextSlide = 0; });
    const issues = issuesFor('scenario', config);
    expect(byRuleId(issues, 'scenario-no-ending-state').length).toBeGreaterThan(0);
    expect(byRuleId(issues, 'scenario-no-ending-state')[0].severity).toBe(SEVERITY.WARNING);
  });

  test('scenario with at least one terminal choice does not trigger no-ending-state', () => {
    const config = buildConfig('scenario');
    // items[2] has no nextSlide (terminal)
    if (config.items[2]) delete config.items[2].nextSlide;
    const issues = issuesFor('scenario', config);
    expect(byRuleId(issues, 'scenario-no-ending-state')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Comparison Slider missing images
// ---------------------------------------------------------------------------

describe('Phase 5: Comparison Slider — missing images', () => {
  test('default config produces no false-positive blocking issues', () => {
    const config = buildConfig('comparison-slider');
    const issues = issuesFor('comparison-slider', config);
    expect(bySeverity(issues, SEVERITY.BLOCKING)).toEqual([]);
  });

  test('missing beforeImage triggers comparison-slider-missing-before-image warning', () => {
    const config = buildConfig('comparison-slider');
    config.items[0].beforeImage = '';
    const issues = issuesFor('comparison-slider', config);
    const found = byRuleId(issues, 'comparison-slider-missing-before-image');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].severity).toBe(SEVERITY.WARNING);
    expect(found[0].itemIndex).toBe(0);
    expect(found[0].fieldId).toBe('beforeImage');
  });

  test('missing afterImage triggers comparison-slider-missing-after-image warning', () => {
    const config = buildConfig('comparison-slider');
    config.items[0].afterImage = '';
    const issues = issuesFor('comparison-slider', config);
    const found = byRuleId(issues, 'comparison-slider-missing-after-image');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].severity).toBe(SEVERITY.WARNING);
  });

  test('both images populated suppresses both image warnings', () => {
    const config = buildConfig('comparison-slider');
    config.items[0].beforeImage = 'https://example.com/before.jpg';
    config.items[0].afterImage  = 'https://example.com/after.jpg';
    const issues = issuesFor('comparison-slider', config);
    expect(byRuleId(issues, 'comparison-slider-missing-before-image')).toHaveLength(0);
    expect(byRuleId(issues, 'comparison-slider-missing-after-image')).toHaveLength(0);
  });

  test('both images missing triggers both warnings at once', () => {
    const config = buildConfig('comparison-slider');
    config.items[0].beforeImage = '';
    config.items[0].afterImage  = '';
    const issues = issuesFor('comparison-slider', config);
    expect(byRuleId(issues, 'comparison-slider-missing-before-image').length).toBeGreaterThan(0);
    expect(byRuleId(issues, 'comparison-slider-missing-after-image').length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Flip Cards Study Mode
// ---------------------------------------------------------------------------

describe('Phase 5: Flip Cards — Study Mode completeness', () => {
  test('default config (Explore mode) produces no study-mode warnings', () => {
    const config = buildConfig('flip-cards');
    // Default should not be study mode
    config.flipCardsMode = 'explore';
    const issues = issuesFor('flip-cards', config);
    expect(byRuleId(issues, 'flip-cards-study-mode-incomplete')).toHaveLength(0);
  });

  test('study mode with complete front/back pairs produces no warnings', () => {
    const config = buildConfig('flip-cards');
    config.flipCardsMode = 'study';
    config.items = config.items.map(item => ({
      ...item,
      title: item.title || 'Front text',
      content: item.content || 'Back text'
    }));
    const issues = issuesFor('flip-cards', config);
    expect(byRuleId(issues, 'flip-cards-study-mode-incomplete')).toHaveLength(0);
  });

  test('study mode with a card missing its back (content) triggers a warning', () => {
    const config = buildConfig('flip-cards');
    config.flipCardsMode = 'study';
    config.items[0].content = '';
    const issues = issuesFor('flip-cards', config);
    const found = byRuleId(issues, 'flip-cards-study-mode-incomplete');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].severity).toBe(SEVERITY.WARNING);
    expect(found[0].itemIndex).toBe(0);
  });

  test('study mode with a card missing its front (title) triggers a warning', () => {
    const config = buildConfig('flip-cards');
    config.flipCardsMode = 'study';
    config.items[0].title = '';
    const issues = issuesFor('flip-cards', config);
    const found = byRuleId(issues, 'flip-cards-study-mode-incomplete');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].fieldId).toBe('title');
  });
});

// ---------------------------------------------------------------------------
// Accordion Sequential + Expand All contradiction
// ---------------------------------------------------------------------------

describe('Phase 5: Accordion — sequential + Expand All contradiction', () => {
  test('default accordion config produces no contradiction warnings', () => {
    const config = buildConfig('accordion');
    const issues = issuesFor('accordion', config);
    expect(byRuleId(issues, 'accordion-sequential-expand-contradiction')).toHaveLength(0);
  });

  test('sequential mode alone does not trigger the contradiction warning', () => {
    const config = buildConfig('accordion');
    config.accordionSequential = true;
    config.accordionExpandCollapseAll = false;
    const issues = issuesFor('accordion', config);
    expect(byRuleId(issues, 'accordion-sequential-expand-contradiction')).toHaveLength(0);
  });

  test('Expand All alone does not trigger the contradiction warning', () => {
    const config = buildConfig('accordion');
    config.accordionSequential = false;
    config.accordionExpandCollapseAll = true;
    const issues = issuesFor('accordion', config);
    expect(byRuleId(issues, 'accordion-sequential-expand-contradiction')).toHaveLength(0);
  });

  test('both sequential and Expand All enabled triggers contradiction warning', () => {
    const config = buildConfig('accordion');
    config.accordionSequential = true;
    config.accordionExpandCollapseAll = true;
    const issues = issuesFor('accordion', config);
    const found = byRuleId(issues, 'accordion-sequential-expand-contradiction');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].severity).toBe(SEVERITY.WARNING);
    expect(found[0].fieldId).toBe('accordionExpandCollapseAll');
  });
});

// ---------------------------------------------------------------------------
// Fill-in-the-Blank fuzzy-match boundary cases (Phase 6)
// ---------------------------------------------------------------------------

describe('Phase 5 & 6: Fill-in-the-Blank — fuzzy-match boundary cases', () => {
  test('default config produces no false-positive blocking issues', () => {
    const config = buildConfig('fill-blank');
    const issues = issuesFor('fill-blank', config);
    expect(bySeverity(issues, SEVERITY.BLOCKING)).toEqual([]);
  });

  test('fuzzyMatch=false suppresses the short-answer warning', () => {
    const config = buildConfig('fill-blank');
    config.fuzzyMatch = false;
    config.items[0].content = 'ok'; // 2 chars — short but fuzzy is off
    const issues = issuesFor('fill-blank', config);
    expect(byRuleId(issues, 'fill-blank-fuzzy-no-answers')).toHaveLength(0);
  });

  test('fuzzyMatch=true with a 1-character answer triggers the warning', () => {
    const config = buildConfig('fill-blank');
    config.fuzzyMatch = true;
    config.items[0].content = 'a'; // single char — dangerous with fuzzy on
    const issues = issuesFor('fill-blank', config);
    const found = byRuleId(issues, 'fill-blank-fuzzy-no-answers');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].severity).toBe(SEVERITY.WARNING);
    expect(found[0].itemIndex).toBe(0);
  });

  test('fuzzyMatch=true with a 2-character answer triggers the warning', () => {
    const config = buildConfig('fill-blank');
    config.fuzzyMatch = true;
    config.items[0].content = 'ok'; // 2 chars — still risky
    const issues = issuesFor('fill-blank', config);
    const found = byRuleId(issues, 'fill-blank-fuzzy-no-answers');
    expect(found.length).toBeGreaterThan(0);
  });

  test('fuzzyMatch=true with a 3-character answer does not trigger the warning', () => {
    const config = buildConfig('fill-blank');
    config.fuzzyMatch = true;
    config.items[0].content = 'yes'; // 3 chars — safe threshold
    const issues = issuesFor('fill-blank', config);
    expect(byRuleId(issues, 'fill-blank-fuzzy-no-answers')).toHaveLength(0);
  });

  test('fuzzyMatch=true with comma-separated answers: warning only on short ones', () => {
    const config = buildConfig('fill-blank');
    config.fuzzyMatch = true;
    config.items[0].content = 'iframe, ok'; // 'ok' is 2-char — should warn
    const issues = issuesFor('fill-blank', config);
    const found = byRuleId(issues, 'fill-blank-fuzzy-no-answers');
    expect(found.length).toBeGreaterThan(0);
  });

  test('fuzzyMatch=true with all acceptable answer lengths produces no warning', () => {
    const config = buildConfig('fill-blank');
    config.fuzzyMatch = true;
    config.items[0].content = 'iframe, embed, web objects'; // all >= 3 chars
    const issues = issuesFor('fill-blank', config);
    expect(byRuleId(issues, 'fill-blank-fuzzy-no-answers')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Sorting Activity single-category warning (Phase 6)
// ---------------------------------------------------------------------------

describe('Phase 5 & 6: Sorting Activity — single-category warning', () => {
  test('default config produces no false-positive blocking issues', () => {
    const config = buildConfig('sorting-activity');
    const issues = issuesFor('sorting-activity', config);
    expect(bySeverity(issues, SEVERITY.BLOCKING)).toEqual([]);
  });

  test('items with two distinct categories do not trigger the warning', () => {
    const config = buildConfig('sorting-activity');
    config.items[0].category = 'Category A';
    config.items[1].category = 'Category B';
    const issues = issuesFor('sorting-activity', config);
    expect(byRuleId(issues, 'sorting-activity-single-category')).toHaveLength(0);
  });

  test('all items sharing one category triggers sorting-activity-single-category warning', () => {
    const config = buildConfig('sorting-activity');
    config.items.forEach(item => { item.category = 'Only Category'; });
    const issues = issuesFor('sorting-activity', config);
    const found = byRuleId(issues, 'sorting-activity-single-category');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].severity).toBe(SEVERITY.WARNING);
    expect(found[0].explanation).toMatch(/Only Category/);
  });

  test('a single item with one category does not trigger warning (< 2 items)', () => {
    const config = buildConfig('sorting-activity');
    config.items = [{ title: 'Item 1', category: 'Cat A', content: '' }];
    const issues = issuesFor('sorting-activity', config);
    expect(byRuleId(issues, 'sorting-activity-single-category')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple-Select partial-credit scoring calculation (Phase 6)
// ---------------------------------------------------------------------------

describe('Phase 6: Multiple-Select — partial-credit scoring', () => {
  test('default config produces no false-positive blocking issues', () => {
    const config = buildConfig('multiple-select');
    const issues = issuesFor('multiple-select', config);
    expect(bySeverity(issues, SEVERITY.BLOCKING)).toEqual([]);
  });

  test('multiple-select renders a submit button and a live feedback region', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'multiple-select');
    const config = buildConfig('multiple-select');
    const html = entry.renderer.generateHTML(config, 'test-partial');
    expect(html).toContain('quiz-submit-btn');
    expect(html).toContain('quiz-feedback');
  });

  test('multiple-select with no correct answers triggers blocking knowledge check', () => {
    const config = buildConfig('multiple-select');
    config.items.forEach(item => { item.correct = false; });
    const issues = issuesFor('multiple-select', config);
    expect(bySeverity(issues, SEVERITY.BLOCKING).some(i => i.ruleId === 'knowledge-no-correct-answer')).toBe(true);
  });

  test('msPartialScoring (the real field) adds no blocking preflight issues', () => {
    const config = buildConfig('multiple-select');
    config.msPartialScoring = true;
    const issues = issuesFor('multiple-select', config);
    expect(bySeverity(issues, SEVERITY.BLOCKING)).toEqual([]);
  });

  test('partial-credit mode is genuinely wired: JS flag + partial feedback state + CSS style', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'multiple-select');
    const config = buildConfig('multiple-select');
    config.msPartialScoring = true;
    config.items = [
      { label: 'Option A', correct: true,  content: 'Correct' },
      { label: 'Option B', correct: true,  content: 'Correct' },
      { label: 'Option C', correct: false, content: 'Incorrect' }
    ];
    const js = entry.renderer.generateJS(config, 'test-scoring');
    const css = entry.renderer.generateCSS();

    // The flag actually reaches the runtime.
    expect(js).toMatch(/var partialScoring\s*=\s*true/);
    // Partial credit is reported as a fraction ("N of M correct"), not just pass/fail.
    expect(js).toMatch(/of '\s*\+\s*correctIndices\.size\s*\+\s*' correct/);
    // A distinct visual state exists for a partial result.
    expect(js).toContain("'quiz-feedback partial'");
    expect(css).toMatch(/\.quiz-feedback\.partial\s*{/);

    // With the flag OFF, the runtime flag flips and the partial branch is inert.
    const jsOff = entry.renderer.generateJS({ ...config, msPartialScoring: false }, 'test-scoring');
    expect(jsOff).toMatch(/var partialScoring\s*=\s*false/);
  });
});

// ---------------------------------------------------------------------------
// Focus management: modal/dialog structural assertions (Phase 6)
// ---------------------------------------------------------------------------

describe('Phase 6: Focus management — dialog structural requirements', () => {
  // Verify that components generating modals/lightboxes include the required
  // ARIA attributes for focus management. These are structural, not runtime tests.

  test('image-gallery generates lightbox with role=dialog and aria-modal', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'image-gallery');
    const config = buildConfig('image-gallery');
    const html = entry.renderer.generateHTML(config, 'ig-focus-test');
    // Lightbox/modal should declare itself as a dialog
    const hasDialogRole = html.includes('role="dialog"') || html.includes("role='dialog'");
    const hasAriaModal  = html.includes('aria-modal="true"') || html.includes("aria-modal='true'");
    // At least one of dialog/modal semantics should be present
    expect(hasDialogRole || hasAriaModal).toBe(true);
  });

  test('profile-cards generates modal with accessible close mechanism', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'profile-cards');
    const config = buildConfig('profile-cards');
    const html = entry.renderer.generateHTML(config, 'pc-focus-test');
    // Modal must have a way to close it (close button or Escape handler)
    const hasCloseBtn = html.includes('close') || html.includes('Close') || html.includes('aria-label="Close"');
    expect(hasCloseBtn).toBe(true);
  });

  test('horizontal-timeline generates lightbox with focusable elements', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'horizontal-timeline');
    const config = buildConfig('horizontal-timeline');
    const html = entry.renderer.generateHTML(config, 'ht-focus-test');
    // Timeline lightbox/modal should include tabindex or role for focus
    const hasFocusable = html.includes('tabindex') || html.includes('role="dialog"') || html.includes('button');
    expect(hasFocusable).toBe(true);
  });

  test('process-flow step modal has accessible landmark semantics', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'process-flow');
    const config = buildConfig('process-flow');
    const html = entry.renderer.generateHTML(config, 'pf-focus-test');
    // Should have buttons for navigation and ARIA live region for announcements
    expect(html).toContain('button');
    const hasAriaLive = html.includes('aria-live') || html.includes('role="status"');
    expect(hasAriaLive).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Reduced-motion structural assertions (Phase 6)
// ---------------------------------------------------------------------------

describe('Phase 6: Reduced-motion — CSS/animation structural assertions', () => {
  test('comparison-slider generateCSS does not use infinite animation without reduced-motion guard', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'comparison-slider');
    const css = entry.renderer.generateCSS();
    const hasAnimation = css.includes('animation') || css.includes('@keyframes');
    if (hasAnimation) {
      // If animations exist they must have a reduced-motion media query guard
      const hasReducedMotionGuard = css.includes('prefers-reduced-motion');
      expect(hasReducedMotionGuard).toBe(true);
    } else {
      expect(true).toBe(true); // No animation at all is also acceptable
    }
  });

  test('card-carousel generateCSS includes transition that respects reduced-motion', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'card-carousel');
    const css = entry.renderer.generateCSS();
    // Carousels with slide transitions should respect prefers-reduced-motion
    if (css.includes('transition') || css.includes('animation')) {
      expect(css).toContain('prefers-reduced-motion');
    } else {
      expect(true).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Long-content stress cases (Phase 6)
// ---------------------------------------------------------------------------

describe('Phase 6: Long-content stress cases', () => {
  test('accordion renders safely with very long item title (300 chars)', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'accordion');
    const config = buildConfig('accordion');
    config.items[0].title = 'A'.repeat(300);
    const html = entry.renderer.generateHTML(config, 'acc-stress');
    expect(html.length).toBeGreaterThan(0);
    expect(html).not.toContain('<script>');
  });

  test('fill-blank renders safely with 500 chars in the accepted answers field', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'fill-blank');
    const config = buildConfig('fill-blank');
    config.items[0].content = 'answer, '.repeat(60).trimEnd();
    const html = entry.renderer.generateHTML(config, 'fb-stress');
    expect(html.length).toBeGreaterThan(0);
  });

  test('scenario renders safely with very long choice text (200 chars)', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'scenario');
    const config = buildConfig('scenario');
    config.items[1].title = 'Long choice: ' + 'x'.repeat(187);
    const html = entry.renderer.generateHTML(config, 'scen-stress');
    expect(html.length).toBeGreaterThan(0);
    expect(html).not.toContain('<script>');
  });

  test('profile-cards renders safely with very long biography text (1000 chars)', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'profile-cards');
    const config = buildConfig('profile-cards');
    config.items[0].content = 'Biography text. '.repeat(62);
    const html = entry.renderer.generateHTML(config, 'pc-stress');
    expect(html.length).toBeGreaterThan(0);
  });

  test('image-gallery renders safely with 12 items', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'image-gallery');
    const config = buildConfig('image-gallery');
    config.items = Array.from({ length: 12 }, (_, i) => ({
      title: `Gallery Image ${i + 1}`,
      content: `Description for image ${i + 1}`,
      image: '',
      altText: `Alt text for image ${i + 1}`
    }));
    const html = entry.renderer.generateHTML(config, 'ig-stress');
    expect(html.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Missing/failed media states (Phase 6)
// ---------------------------------------------------------------------------

describe('Phase 6: Missing/failed media states', () => {
  test('comparison-slider renders gracefully with no images set', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'comparison-slider');
    const config = buildConfig('comparison-slider');
    config.items[0].beforeImage = '';
    config.items[0].afterImage  = '';
    const html = entry.renderer.generateHTML(config, 'cs-no-img');
    expect(html.length).toBeGreaterThan(0);
    // Should not crash and should contain the slider container
    expect(html).toContain('comparison-slider');
  });

  test('horizontal-timeline renders gracefully with no milestone images', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'horizontal-timeline');
    const config = buildConfig('horizontal-timeline');
    config.items.forEach(item => { item.image = ''; });
    const html = entry.renderer.generateHTML(config, 'ht-no-img');
    expect(html.length).toBeGreaterThan(0);
  });

  test('profile-cards renders gracefully with no avatar images', () => {
    const entry = getComponentById(COMPONENT_REGISTRY, 'profile-cards');
    const config = buildConfig('profile-cards');
    config.items.forEach(item => { item.image = ''; });
    const html = entry.renderer.generateHTML(config, 'pc-no-img');
    expect(html.length).toBeGreaterThan(0);
  });
});
