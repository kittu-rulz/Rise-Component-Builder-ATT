import { describe, expect, test } from 'vitest';
import { generateIframeContent } from '../../js/preview.js';
import { COMPONENT_REGISTRY, getComponentById, getDefaultConfig } from '../../js/component-registry.js';
import { BUILT_IN_THEMES, DEFAULT_THEME_ID, applyThemeToConfig } from '../../js/themes.js';
import { toRgba } from '../../js/utilities.js';

const theme = BUILT_IN_THEMES.find(entry => entry.id === DEFAULT_THEME_ID);
const componentRegistry = Object.fromEntries(COMPONENT_REGISTRY.map(entry => [entry.id, { ...entry.renderer, version: entry.version }]));

const baseFields = {
  blockTitle: 'TEST BLOCK', blockHeadline: 'Test Headline', blockDesc: 'Test description.',
  colorPrimary: '#2563EB', colorAccent: '#F59E0B', colorBg: '#FFFFFF', colorText: '#1F2937',
  borderRadius: '12', shadowDepth: 'soft', borderOutline: true,
  trackCompletion: true, completionMsg: 'Activity Complete!'
};

function compile(componentId, { currentProjectId = 'fixture-project' } = {}) {
  const entry = getComponentById(COMPONENT_REGISTRY, componentId);
  const config = applyThemeToConfig({ ...baseFields, ...getDefaultConfig(entry) }, theme);
  const appState = { selectedComponent: { id: componentId }, activeTheme: theme, componentOverrides: {}, config, currentProjectId };
  return generateIframeContent(appState, componentRegistry, toRgba);
}

// Each component's genuinely exclusive markers. ai-generator/ai-quiz-maker are grouped
// together because they intentionally share the same mock-AI markup/behavior — the
// requirement is that UNRELATED categories (quiz, gallery, audio, video, AI, ...) never
// leak into each other, not that the two AI components must be mutually exclusive.
const GROUPS = {
  accordion: { components: ['accordion'], markers: ['accordion-group', 'accordion-trigger', 'toggleAccordion'] },
  'flip-cards': { components: ['flip-cards'], markers: ['flip-cards-grid', 'flip-card-front', 'flip-card-back'] },
  'tab-blocks': { components: ['tab-blocks'], markers: ['tabs-container', 'tab-btn', 'selectTab'] },
  hotspots: { components: ['hotspots'], markers: ['hotspots-container', 'hotspot-pin', 'toggleHotspot'] },
  'button-list': { components: ['button-list'], markers: ['buttons-container', 'link-button-item', 'trackLinkClick'] },
  'menu-list': { components: ['menu-list'], markers: ['menu-drawer-list', 'menu-drawer-item', 'toggleMenuDrawer'] },
  'multiple-choice': { components: ['multiple-choice'], markers: ['option-check-circle', 'selectQuizOption'] },
  'multiple-select': { components: ['multiple-select'], markers: ['option-check-square', 'toggleQuizOption'] },
  'sorting-activity': { components: ['sorting-activity'], markers: ['sorting-activity-container', 'sorting-draggable', 'assignCategory'] },
  'fill-blank': { components: ['fill-blank'], markers: ['fill-blank-container', 'blank-input', 'checkBlanks'] },
  'vertical-timeline': { components: ['vertical-timeline'], markers: ['vertical-timeline-container', 'step-marker'] },
  'horizontal-timeline': { components: ['horizontal-timeline'], markers: ['horizontal-timeline-container', 'timeline-node', 'selectTimelineNode'] },
  'process-flow': { components: ['process-flow'], markers: ['process-steps-container', 'process-slide', 'moveProcessStep'] },
  scenario: { components: ['scenario'], markers: ['scenario-container', 'scenario-choice-btn', 'selectScenarioChoice'] },
  'profile-cards': { components: ['profile-cards'], markers: ['profiles-grid', 'profile-card-item'] },
  'info-grid': { components: ['info-grid'], markers: ['info-grid-container', 'info-grid-item'] },
  'pricing-comparison': { components: ['pricing-comparison'], markers: ['pricing-table-container', 'pricing-card-item'] },
  'audio-player': { components: ['audio-player'], markers: ['audio-player-block', 'audio-scrub-bar', 'toggleAudioPlayback'] },
  'video-frame': { components: ['video-frame'], markers: ['video-player-block', 'video-overlay-play', 'toggleVideoPlayback'] },
  'image-gallery': { components: ['image-gallery'], markers: ['gallery-grid', 'lightbox-overlay', 'openGalleryLightbox'] },
  ai: { components: ['ai-generator', 'ai-quiz-maker'], markers: ['ai-generator-preview', 'ai-spark-icon', 'triggerAiGeneration'] }
};

const groupFor = componentId => Object.values(GROUPS).find(group => group.components.includes(componentId));

describe('export isolation: each component ships only its own markup, CSS, and JS', () => {
  test.each(COMPONENT_REGISTRY.map(entry => entry.id))('%s export contains its own markers and none of any unrelated component', componentId => {
    const html = compile(componentId);
    const ownGroup = groupFor(componentId);
    expect(ownGroup, `no marker group defined for ${componentId}`).toBeTruthy();
    ownGroup.markers.forEach(marker => {
      expect(html, `expected ${componentId} export to contain its own marker "${marker}"`).toContain(marker);
    });

    Object.entries(GROUPS).forEach(([groupName, group]) => {
      if (group === ownGroup) return;
      group.markers.forEach(marker => {
        expect(html, `${componentId} export must not contain "${marker}" from unrelated group "${groupName}"`).not.toContain(marker);
      });
    });
  });

  test('accordion export specifically excludes quiz, gallery, audio, video, and AI code', () => {
    const html = compile('accordion');
    ['quiz-option', 'gallery-item-card', 'audio-player-block', 'video-wrapper', 'ai-generator-preview', 'triggerAiGeneration']
      .forEach(marker => expect(html).not.toContain(marker));
  });
});
