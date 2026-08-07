import { describe, expect, test } from 'vitest';
import { generateIframeContent } from '../../js/preview.js';
import { COMPONENT_REGISTRY, getComponentById, getDefaultConfig } from '../../js/component-registry.js';
import { getEditorSchema } from '../../js/editor-schemas.js';
import { BUILT_IN_THEMES, DEFAULT_THEME_ID, applyThemeToConfig } from '../../js/themes.js';
import { toRgba } from '../../js/utilities.js';

const theme = BUILT_IN_THEMES.find(entry => entry.id === DEFAULT_THEME_ID);
const componentRegistry = Object.fromEntries(COMPONENT_REGISTRY.map(entry => [entry.id, { ...entry.renderer, version: entry.version }]));

function buildAppState(componentId, blockBackgroundImage) {
  const entry = getComponentById(COMPONENT_REGISTRY, componentId);
  const config = applyThemeToConfig({
    blockTitle: 'TEST BLOCK', blockHeadline: 'Test Headline', blockDesc: 'Test description.',
    colorPrimary: '#2563EB', colorAccent: '#F59E0B', colorBg: '#FFFFFF', colorText: '#1F2937',
    borderRadius: '12', shadowDepth: 'soft', borderOutline: true,
    trackCompletion: false, completionMsg: 'Activity Complete!',
    ...getDefaultConfig(entry),
    blockBackgroundImage
  }, theme);
  return { selectedComponent: { id: componentId }, activeTheme: theme, componentOverrides: {}, config, currentProjectId: 'fixture-project' };
}

describe('shared "Block Background Image" field (js/editor-schemas.js)', () => {
  test('is merged into every component\'s editor schema, alongside any component-specific fields', () => {
    const accordionFields = getEditorSchema('accordion').componentFields.map(field => field.id);
    expect(accordionFields).toContain('blockBackgroundImage');

    const hotspotFields = getEditorSchema('hotspots').componentFields.map(field => field.id);
    expect(hotspotFields).toEqual(expect.arrayContaining(['blockBackgroundImage', 'backgroundImage']));
  });

  test('is omitted from the compiled export when unset, for every component', () => {
    for (const { id } of COMPONENT_REGISTRY) {
      const html = generateIframeContent(buildAppState(id, ''), componentRegistry, toRgba);
      expect(html).not.toContain('background-image:url(');
    }
  });

  test('renders as an inline background-image style on the block wrapper when set', () => {
    const html = generateIframeContent(buildAppState('accordion', 'https://example.com/hero.jpg'), componentRegistry, toRgba);
    expect(html).toContain('<main class="rise-block-wrapper" style="background-image:url(\'https://example.com/hero.jpg\')');
  });

  test('rejects an unsafe URL scheme rather than embedding it', () => {
    const html = generateIframeContent(buildAppState('accordion', 'javascript:alert(1)'), componentRegistry, toRgba);
    expect(html).not.toContain('background-image:url(');
    expect(html).not.toContain('javascript:');
  });
});
