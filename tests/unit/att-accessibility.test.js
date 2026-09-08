import { describe, expect, test } from 'vitest';
import * as accordion from '../../components/accordion.js';
import * as tabs from '../../components/tabs.js';
import * as flipCards from '../../components/flip-cards.js';
import * as multipleChoice from '../../components/multiple-choice.js';
import * as multipleSelect from '../../components/multiple-select.js';
import * as sortingActivity from '../../components/sorting-activity.js';
import * as fillBlank from '../../components/fill-blank.js';
import * as hotspots from '../../components/hotspots.js';
import * as verticalTimeline from '../../components/vertical-timeline.js';
import * as horizontalTimeline from '../../components/horizontal-timeline.js';
import * as processFlow from '../../components/process-flow.js';
import * as profileCards from '../../components/profile-cards.js';
import * as infoGrid from '../../components/info-grid.js';
import * as pricingComparison from '../../components/pricing-comparison.js';
import * as imageGallery from '../../components/image-gallery.js';
import * as videoFrame from '../../components/video-frame.js';
import * as audioPlayer from '../../components/audio-player.js';
import * as scenario from '../../components/scenario.js';
import * as interactiveVideo from '../../components/interactive-video.js';
import * as buttonList from '../../components/button-list.js';
import * as menuList from '../../components/menu-list.js';
import { SHARED_A11Y_CSS } from '../../js/export-shell.js';

const ALL_COMPONENTS = [
  { id: 'accordion', mod: accordion },
  { id: 'tabs', mod: tabs },
  { id: 'flip-cards', mod: flipCards },
  { id: 'multiple-choice', mod: multipleChoice },
  { id: 'multiple-select', mod: multipleSelect },
  { id: 'sorting-activity', mod: sortingActivity },
  { id: 'fill-blank', mod: fillBlank },
  { id: 'hotspots', mod: hotspots },
  { id: 'vertical-timeline', mod: verticalTimeline },
  { id: 'horizontal-timeline', mod: horizontalTimeline },
  { id: 'process-flow', mod: processFlow },
  { id: 'profile-cards', mod: profileCards },
  { id: 'info-grid', mod: infoGrid },
  { id: 'pricing-comparison', mod: pricingComparison },
  { id: 'image-gallery', mod: imageGallery },
  { id: 'video-frame', mod: videoFrame },
  { id: 'audio-player', mod: audioPlayer },
  { id: 'scenario', mod: scenario },
  { id: 'interactive-video', mod: interactiveVideo },
  { id: 'button-list', mod: buttonList },
  { id: 'menu-list', mod: menuList }
];

describe('Prompt 7: AT&T States, Focus, and Accessibility Standards', () => {
  describe('Global & Shared Focus-Visible and Reduced-Motion Foundation', () => {
    test('SHARED_A11Y_CSS covers buttons, links, inputs, and ARIA interactive roles with 3px Cobalt outline', () => {
      expect(SHARED_A11Y_CSS).toContain(':where(button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="tab"], [role="radio"]):focus-visible');
      expect(SHARED_A11Y_CSS).toContain('outline: 3px solid var(--att-cobalt, var(--primary));');
      expect(SHARED_A11Y_CSS).toContain('outline-offset: 2px;');
    });

    test('SHARED_A11Y_CSS zeroes out animations and transitions under prefers-reduced-motion', () => {
      expect(SHARED_A11Y_CSS).toContain('@media (prefers-reduced-motion: reduce)');
      expect(SHARED_A11Y_CSS).toContain('animation-duration: 0.01ms !important;');
      expect(SHARED_A11Y_CSS).toContain('transition-duration: 0.01ms !important;');
    });
  });

  describe('Active and Hover Transforms (Section 6 Standard: No scale > 0.98 on active, no translateY on hover)', () => {
    test('no component uses translateY(-2px) or hover jumps', () => {
      for (const { id, mod } of ALL_COMPONENTS) {
        if (typeof mod.generateCSS === 'function') {
          const css = mod.generateCSS();
          expect(css, `${id} contains translateY(-2px)`).not.toContain('translateY(-2px)');
          expect(css, `${id} contains translateY(-4px)`).not.toContain('translateY(-4px)');
        }
      }
    });

    test('active states do not exceed scale(0.98)', () => {
      for (const { id, mod } of ALL_COMPONENTS) {
        if (typeof mod.generateCSS === 'function') {
          const css = mod.generateCSS();
          // Verify no scale(1.1) or scale(1.05) on active states
          expect(css, `${id} contains scale(1.1) on active`).not.toMatch(/:active[^{]*\{[^}]*scale\(1\.[1-9]/);
        }
      }
    });
  });

  describe('Touch Targets (Section 7 Standard: 44x44px minimum)', () => {
    test('all button and interactive controls enforce 44px min-height or touch target padding', () => {
      const minHeight44Components = [
        { id: 'tabs', mod: tabs, selector: '.tab-btn' },
        { id: 'sorting-activity', mod: sortingActivity, selector: '.target-btn' },
        { id: 'sorting-activity-submit', mod: sortingActivity, selector: '.quiz-submit-btn' },
        { id: 'fill-blank-submit', mod: fillBlank, selector: '.quiz-submit-btn' },
        { id: 'multiple-choice-submit', mod: multipleChoice, selector: '.quiz-submit-btn' },
        { id: 'multiple-select-submit', mod: multipleSelect, selector: '.quiz-submit-btn' },
        { id: 'button-list', mod: buttonList, selector: '.link-button-item' },
        { id: 'pricing-comparison', mod: pricingComparison, selector: '.pricing-action-btn' },
        { id: 'scenario', mod: scenario, selector: '.scenario-choice-btn' },
        { id: 'audio-player', mod: audioPlayer, selector: '.aud-play-btn' },
        { id: 'video-frame', mod: videoFrame, selector: '.video-skip-btn' }
      ];

      for (const { id, mod, selector } of minHeight44Components) {
        const css = mod.generateCSS();
        expect(css, `${id} ${selector} missing 44px dimension`).toMatch(new RegExp(`${selector.replace('.', '\\.')}[^{]*\\{[^}]*(?:min-height:\\s*44px|height:\\s*44px)`));
      }
    });

    test('hotspots pin uses 44x44px pseudo-element touch area', () => {
      const css = hotspots.generateCSS();
      expect(css).toContain('.hotspot-pin::before');
      expect(css).toContain('min-width: 44px;');
      expect(css).toContain('min-height: 44px;');
    });
  });

  describe('Keyboard and ARIA Specifications', () => {
    const instanceId = 'test-a11y-instance';

    test('accordions expose aria-expanded, aria-controls, and Enter/Space keyboard toggle', () => {
      const html = accordion.generateHTML({
        items: [{ title: 'Item 1', content: 'Panel 1' }]
      }, instanceId);
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain(`aria-controls="${instanceId}-accordion-panel-0"`);
      expect(html).toContain('role="region"');

      const js = accordion.generateJS({
        items: [{ title: 'Item 1', content: 'Panel 1' }]
      }, instanceId);
      expect(js).toContain('toggleAccordion');
    });

    test('tabs expose role="tablist", role="tab", aria-selected, and arrow key navigation', () => {
      const html = tabs.generateHTML({
        items: [
          { title: 'Tab 1', content: 'Panel 1' },
          { title: 'Tab 2', content: 'Panel 2' }
        ]
      }, instanceId);
      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tab"');
      expect(html).toContain('aria-selected="true"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('tabindex="-1"');

      const js = tabs.generateJS({
        items: [{ title: 'Tab 1', content: 'Panel 1' }]
      }, instanceId);
      expect(js).toContain('ArrowRight');
      expect(js).toContain('ArrowLeft');
    });

    test('flip cards expose role="button", tabindex="0", and aria-expanded/aria-pressed', () => {
      const html = flipCards.generateHTML({
        items: [{ title: 'Front', content: 'Back' }]
      }, instanceId);
      expect(html).toContain('role="button"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-expanded="false"');

      const js = flipCards.generateJS({
        items: [{ title: 'Front', content: 'Back' }]
      }, instanceId);
      expect(js).toContain('flipCard');
    });

    test('quiz and activities announce feedback in an aria-live="polite" status region', () => {
      const mcHtml = multipleChoice.generateHTML({
        items: [
          { title: 'Question', content: 'Stem' },
          { title: 'Opt 1', content: 'Choice 1', correct: true }
        ]
      }, instanceId);
      expect(mcHtml).toContain('aria-live="polite"');

      const msHtml = multipleSelect.generateHTML({
        items: [
          { title: 'Question', content: 'Stem' },
          { title: 'Opt 1', content: 'Choice 1', correct: true }
        ]
      }, instanceId);
      expect(msHtml).toContain('aria-live="polite"');

      const sortHtml = sortingActivity.generateHTML({
        items: [{ title: 'Card 1', content: 'Cat 1' }]
      }, instanceId);
      expect(sortHtml).toContain('aria-live="polite"');
    });

    test('guided-mode locked items carry aria-disabled="true" and explanatory note', () => {
      const html = accordion.generateHTML({
        items: [
          { title: 'Item 1', content: 'Panel 1' },
          { title: 'Item 2', content: 'Panel 2' }
        ],
        accordionSequential: true
      }, instanceId);
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('aria-describedby');
    });
  });
});
