import { describe, expect, test } from 'vitest';
import { collectSyncIssues, summarizePreflight } from '../../js/validation.js';
import { COMPONENT_REGISTRY, getComponentById, getDefaultConfig } from '../../js/component-registry.js';
import { applyThemeToConfig, getBuiltInTheme, DEFAULT_THEME_ID } from '../../js/themes.js';

describe('AT&T Compliance Preflight & Export Flow (Phase 6)', () => {
  const theme = getBuiltInTheme(DEFAULT_THEME_ID);

  function buildContext(componentId, overrides = {}) {
    const entry = getComponentById(COMPONENT_REGISTRY, componentId);
    const config = applyThemeToConfig({
      blockTitle: 'TEST BLOCK',
      blockHeadline: 'Test Headline',
      blockDesc: 'Test description.',
      borderRadius: '12',
      shadowDepth: 'soft',
      borderOutline: true,
      trackCompletion: false,
      completionMsg: 'Done!',
      ...getDefaultConfig(entry),
      ...overrides
    }, theme);

    return {
      componentId,
      schema: entry.editorSchema,
      config,
      theme,
      componentOverrides: {},
      settings: { mediaLimitsMb: { image: 10, audio: 50, video: 100, svg: 2 }, completionParentOrigin: 'https://example.com' }
    };
  }

  test('clean default component passes preflight without blocking errors', () => {
    const context = buildContext('accordion');
    const issues = collectSyncIssues(context);
    const summary = summarizePreflight(issues);
    expect(summary.canExport).toBe(true);
    expect(summary.blocking.length).toBe(0);
  });

  test('detects blocking errors when required items or text are missing', () => {
    const context = buildContext('accordion', { items: [] });
    const issues = collectSyncIssues(context);
    const summary = summarizePreflight(issues);
    expect(summary.canExport).toBe(false);
    expect(summary.blocking.length).toBeGreaterThan(0);
  });
});
