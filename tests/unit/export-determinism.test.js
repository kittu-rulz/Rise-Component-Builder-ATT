import { describe, expect, test } from 'vitest';
import { generateIframeContent } from '../../js/preview.js';
import { COMPONENT_REGISTRY, getComponentById, getDefaultConfig } from '../../js/component-registry.js';
import { BUILT_IN_THEMES, DEFAULT_THEME_ID, applyThemeToConfig } from '../../js/themes.js';
import { toRgba } from '../../js/utilities.js';
import { JSDOM } from 'jsdom';

const theme = BUILT_IN_THEMES.find(entry => entry.id === DEFAULT_THEME_ID);
const componentRegistry = Object.fromEntries(COMPONENT_REGISTRY.map(entry => [entry.id, { ...entry.renderer, version: entry.version }]));

const baseFields = {
  blockTitle: 'TEST BLOCK', blockHeadline: 'Test Headline', blockDesc: 'Test description.',
  colorPrimary: '#2563EB', colorAccent: '#F59E0B', colorBg: '#FFFFFF', colorText: '#1F2937',
  borderRadius: '12', shadowDepth: 'soft', borderOutline: true,
  trackCompletion: true, completionMsg: 'Activity Complete!'
};

function buildAppState(componentId, currentProjectId) {
  const entry = getComponentById(COMPONENT_REGISTRY, componentId);
  const config = applyThemeToConfig({ ...baseFields, ...getDefaultConfig(entry) }, theme);
  return { selectedComponent: { id: componentId }, activeTheme: theme, componentOverrides: {}, config, currentProjectId };
}

describe('export determinism', () => {
  test.each(['accordion', 'multiple-choice', 'image-gallery', 'ai-generator'])('compiling %s twice from the same state yields byte-identical output', componentId => {
    const appState = buildAppState(componentId, 'fixture-project');
    const first = generateIframeContent(appState, componentRegistry, toRgba);
    const second = generateIframeContent(buildAppState(componentId, 'fixture-project'), componentRegistry, toRgba);
    expect(first).toBe(second);
  });

  test('an unsaved (no project id) compile is also deterministic', () => {
    const first = generateIframeContent(buildAppState('accordion', null), componentRegistry, toRgba);
    const second = generateIframeContent(buildAppState('accordion', null), componentRegistry, toRgba);
    expect(first).toBe(second);
  });

  test('different project ids produce different (but each internally consistent) instance ids', () => {
    const a = generateIframeContent(buildAppState('accordion', 'project-a'), componentRegistry, toRgba);
    const b = generateIframeContent(buildAppState('accordion', 'project-b'), componentRegistry, toRgba);
    expect(a).not.toBe(b);
  });
});

describe('multiple instances do not collide', () => {
  test.each(['accordion', 'multiple-choice', 'multiple-select', 'audio-player', 'image-gallery'])(
    'two %s exports pasted onto the same page share no duplicate ids and no leaked globals',
    componentId => {
      const htmlA = generateIframeContent(buildAppState(componentId, 'project-a'), componentRegistry, toRgba);
      const htmlB = generateIframeContent(buildAppState(componentId, 'project-b'), componentRegistry, toRgba);

      const idsOf = html => [...new JSDOM(html).window.document.querySelectorAll('[id]')].map(el => el.id);
      const idsA = idsOf(htmlA);
      const idsB = idsOf(htmlB);
      expect(idsA.length).toBeGreaterThan(0);
      expect(idsA.some(id => idsB.includes(id))).toBe(false);

      // Every generated <script> body is wrapped in a single top-level IIFE, so even if two
      // exports were concatenated into one page, their function/var declarations never touch
      // the shared global scope (Requirement 5) — verify that wrapper is actually present.
      [htmlA, htmlB].forEach(html => {
        const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
        expect(scriptMatch).not.toBeNull();
        const scriptBody = scriptMatch[1].trim();
        expect(scriptBody.startsWith('(function()')).toBe(true);
        expect(scriptBody.endsWith('})();')).toBe(true);
      });
    }
  );
});
