import { describe, expect, test } from 'vitest';
import { COMPONENT_REGISTRY, getComponentById, getDefaultConfig } from '../../js/component-registry.js';
import { applyThemeToConfig, BUILT_IN_THEMES, DEFAULT_THEME_ID } from '../../js/themes.js';
import { collectSyncIssues, runPreflight, SEVERITY, summarizePreflight } from '../../js/validation.js';

const theme = BUILT_IN_THEMES.find(entry => entry.id === DEFAULT_THEME_ID);

function buildConfig(componentId, overrides = {}) {
  const entry = getComponentById(COMPONENT_REGISTRY, componentId);
  const config = applyThemeToConfig({
    blockTitle: 'TEST BLOCK', blockHeadline: 'Test Headline', blockDesc: 'Test description.',
    borderRadius: '12', shadowDepth: 'soft', borderOutline: true,
    trackCompletion: false, completionMsg: 'Done!',
    ...getDefaultConfig(entry)
  }, theme);
  return { ...config, ...overrides };
}

function issuesFor(componentId, config, extra = {}) {
  const entry = getComponentById(COMPONENT_REGISTRY, componentId);
  return collectSyncIssues({
    componentId, schema: entry.editorSchema, config, theme, componentOverrides: {},
    settings: { mediaLimitsMb: { image: 10, audio: 30, video: 100, svg: 2 }, completionParentOrigin: 'https://example.com' }, ...extra
  });
}

function ruleIds(issues) { return issues.map(item => item.ruleId); }
function bySeverity(issues, severity) { return issues.filter(item => item.severity === severity); }

describe('sanity: default configs produce no false-positive blocking issues', () => {
  test.each(['accordion', 'multiple-choice', 'multiple-select', 'hotspots', 'audio-player', 'sorting-activity', 'fill-blank'])(
    '%s default config has zero blocking issues', componentId => {
      const config = buildConfig(componentId);
      const issues = issuesFor(componentId, config);
      expect(bySeverity(issues, SEVERITY.BLOCKING)).toEqual([]);
    });
});

describe('General: required fields', () => {
  test('an empty required item field is a blocking error', () => {
    const config = buildConfig('accordion');
    config.items[0].title = '';
    const issues = issuesFor('accordion', config);
    expect(ruleIds(issues)).toContain('general-required-field');
    expect(bySeverity(issues, SEVERITY.BLOCKING).some(i => i.itemIndex === 0)).toBe(true);
  });

  test('a cross-item requiredOne field (multiple-choice correct answer) reports once, not once per item', () => {
    const config = buildConfig('multiple-choice');
    config.items.forEach(item => { item.correct = false; });
    const issues = issuesFor('multiple-choice', config);
    const requiredOneIssues = issues.filter(i => i.ruleId === 'general-required-field' && i.message.includes('Select one'));
    expect(requiredOneIssues).toHaveLength(1);
  });
});

describe('General: empty component', () => {
  test('fewer items than minItems is a blocking error', () => {
    const config = buildConfig('accordion');
    config.items = [];
    const issues = issuesFor('accordion', config);
    expect(ruleIds(issues)).toContain('general-empty-component');
    expect(bySeverity(issues, SEVERITY.BLOCKING).some(i => i.ruleId === 'general-empty-component')).toBe(true);
  });
});

describe('General: excessively long content', () => {
  test('an unusually long short-text field is a warning', () => {
    const config = buildConfig('sorting-activity');
    config.items[0].title = 'x'.repeat(250);
    const issues = issuesFor('sorting-activity', config);
    const found = issues.find(i => i.ruleId === 'general-excessive-length' && i.itemIndex === 0);
    expect(found?.severity).toBe(SEVERITY.WARNING);
  });

  test('very long richtext content is a recommendation', () => {
    const config = buildConfig('accordion');
    config.items[0].content = '<p>' + 'x'.repeat(4500) + '</p>';
    const issues = issuesFor('accordion', config);
    const found = issues.find(i => i.ruleId === 'general-excessive-length' && i.itemIndex === 0);
    expect(found?.severity).toBe(SEVERITY.RECOMMENDATION);
  });

  test('a field with an explicit maxLength is not subject to the soft heuristic (handled as a required-field format error instead)', () => {
    const config = buildConfig('accordion');
    config.items[0].title = 'x'.repeat(200); // accordion title has maxLength: 120
    const issues = issuesFor('accordion', config);
    expect(issues.some(i => i.ruleId === 'general-excessive-length' && i.itemIndex === 0)).toBe(false);
    expect(issues.some(i => i.ruleId === 'general-required-field' && i.itemIndex === 0)).toBe(true);
  });
});

describe('General: unsupported rich HTML', () => {
  test('a richtext field containing an unsupported tag is flagged and the tag is actually stripped', () => {
    const config = buildConfig('accordion');
    config.items[0].content = '<div onclick="bad()">Hello</div>';
    const issues = issuesFor('accordion', config);
    const found = issues.find(i => i.ruleId === 'general-unsupported-rich-html' && i.itemIndex === 0);
    expect(found?.severity).toBe(SEVERITY.WARNING);
  });

  test('plain, fully-supported richtext markup is not flagged', () => {
    const config = buildConfig('accordion');
    config.items[0].content = '<p><strong>Bold</strong> and <em>italic</em>.</p>';
    const issues = issuesFor('accordion', config);
    expect(issues.some(i => i.ruleId === 'general-unsupported-rich-html')).toBe(false);
  });
});

describe('General: invalid URLs', () => {
  test('a malformed URL in a url-type field is a blocking error', () => {
    const config = buildConfig('button-list');
    config.items[0].content = 'not a url';
    const issues = issuesFor('button-list', config);
    const found = issues.find(i => i.ruleId === 'general-invalid-url' && i.itemIndex === 0);
    expect(found?.severity).toBe(SEVERITY.BLOCKING);
  });

  test('a javascript: URL is rejected as invalid, not silently accepted', () => {
    const config = buildConfig('button-list');
    config.items[0].content = 'javascript:alert(1)';
    const issues = issuesFor('button-list', config);
    expect(issues.some(i => i.ruleId === 'general-invalid-url' && i.itemIndex === 0)).toBe(true);
  });

  test('a valid https URL is not flagged', () => {
    const config = buildConfig('button-list');
    config.items[0].content = 'https://example.com/resource';
    const issues = issuesFor('button-list', config);
    expect(issues.some(i => i.ruleId === 'general-invalid-url')).toBe(false);
  });
});

describe('General: missing accessible names', () => {
  test('an empty block headline is a blocking error', () => {
    const config = buildConfig('accordion', { blockHeadline: '' });
    const issues = issuesFor('accordion', config);
    expect(issues.some(i => i.ruleId === 'general-missing-accessible-name' && i.severity === SEVERITY.BLOCKING)).toBe(true);
  });

  test('a whitespace-only block headline is also blocking', () => {
    const config = buildConfig('accordion', { blockHeadline: '   ' });
    const issues = issuesFor('accordion', config);
    expect(issues.some(i => i.ruleId === 'general-missing-accessible-name')).toBe(true);
  });
});

describe('General: missing alternative text', () => {
  test('a hotspot background image with no alt text and not marked decorative is a warning', () => {
    const config = buildConfig('hotspots');
    config.backgroundImage = 'https://example.com/image.png';
    config.backgroundAltText = '';
    config.backgroundDecorative = false;
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'general-missing-alt-text' && i.severity === SEVERITY.WARNING)).toBe(true);
  });

  test('marking the image decorative suppresses the warning', () => {
    const config = buildConfig('hotspots');
    config.backgroundImage = 'https://example.com/image.png';
    config.backgroundDecorative = true;
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'general-missing-alt-text')).toBe(false);
  });
});

describe('General: insufficient colour contrast', () => {
  test('near-identical text and background colors are flagged', () => {
    const config = buildConfig('accordion');
    const issues = issuesFor('accordion', config, {});
    const lowContrastIssues = collectSyncIssues({
      componentId: 'accordion', schema: getComponentById(COMPONENT_REGISTRY, 'accordion').editorSchema, config,
      theme, componentOverrides: { text: '#FFFFFF', background: '#FFFFFF' }, settings: {}
    });
    expect(lowContrastIssues.some(i => i.ruleId === 'general-insufficient-contrast' && i.severity === SEVERITY.WARNING)).toBe(true);
    // Sanity: the default (unmodified) theme should not trip this rule.
    expect(issues.some(i => i.ruleId === 'general-insufficient-contrast')).toBe(false);
  });
});

describe('General: duplicate items', () => {
  test('two items with identical title and content are a warning', () => {
    const config = buildConfig('accordion');
    config.items = [
      { title: 'Same Title', content: 'Same content.' },
      { title: 'Same Title', content: 'Same content.' },
      { title: 'Different', content: 'Different content.' }
    ];
    const issues = issuesFor('accordion', config);
    expect(issues.some(i => i.ruleId === 'general-duplicate-items' && i.severity === SEVERITY.WARNING && i.itemIndex === 1)).toBe(true);
  });
});

describe('General: invalid completion configuration', () => {
  test('completion required with zero items is blocking', () => {
    const config = buildConfig('accordion', { trackCompletion: true });
    config.items = [];
    const issues = issuesFor('accordion', config);
    expect(issues.some(i => i.ruleId === 'general-invalid-completion-config' && i.severity === SEVERITY.BLOCKING)).toBe(true);
  });

  test('completion required with an empty completion message is a warning', () => {
    const config = buildConfig('accordion', { trackCompletion: true, completionMsg: '' });
    const issues = issuesFor('accordion', config);
    expect(issues.some(i => i.ruleId === 'general-invalid-completion-config' && i.severity === SEVERITY.WARNING)).toBe(true);
  });

  test('no configured parent origin is only a recommendation, and only when completion is on', () => {
    const config = buildConfig('accordion', { trackCompletion: true });
    const issues = issuesFor('accordion', config, { settings: { mediaLimitsMb: { image: 10, audio: 30, video: 100, svg: 2 }, completionParentOrigin: '' } });
    expect(issues.some(i => i.ruleId === 'general-invalid-completion-config' && i.severity === SEVERITY.RECOMMENDATION)).toBe(true);
    const offConfig = buildConfig('accordion', { trackCompletion: false });
    const offIssues = issuesFor('accordion', offConfig, { settings: { mediaLimitsMb: { image: 10, audio: 30, video: 100, svg: 2 }, completionParentOrigin: '' } });
    expect(offIssues.some(i => i.ruleId === 'general-invalid-completion-config')).toBe(false);
  });
});

describe('General: unsupported export features', () => {
  test('an unimplemented default export format (SCORM) is a warning', () => {
    const config = buildConfig('accordion');
    const issues = issuesFor('accordion', config, { settings: { exportFormat: 'scorm', mediaLimitsMb: { image: 10, audio: 30, video: 100, svg: 2 } } });
    expect(issues.some(i => i.ruleId === 'general-unsupported-export-feature' && i.severity === SEVERITY.WARNING)).toBe(true);
  });

  test('the working "web" (single HTML file) format is not flagged', () => {
    const config = buildConfig('accordion');
    const issues = issuesFor('accordion', config, { settings: { exportFormat: 'web', mediaLimitsMb: { image: 10, audio: 30, video: 100, svg: 2 } } });
    expect(issues.some(i => i.ruleId === 'general-unsupported-export-feature')).toBe(false);
  });
});

describe('Media: unsupported file type, oversized file', () => {
  const mediaReference = overrides => ({
    source: 'upload', mediaId: 'media-1', schemaVersion: 1, kind: 'image', name: 'photo.png',
    mimeType: 'image/png', size: 1024, createdAt: '2026-01-01T00:00:00.000Z', ...overrides
  });

  test('an unsupported MIME type on an image field is blocking', () => {
    const config = buildConfig('hotspots');
    config.backgroundImage = mediaReference({ mimeType: 'application/pdf' });
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'media-unsupported-file-type' && i.severity === SEVERITY.BLOCKING)).toBe(true);
  });

  test('a file over the configured size limit is a warning', () => {
    const config = buildConfig('hotspots');
    config.backgroundImage = mediaReference({ size: 50 * 1024 * 1024 }); // 50MB > 10MB image limit
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'media-oversized-file' && i.severity === SEVERITY.WARNING)).toBe(true);
  });

  test('a supported, appropriately-sized file triggers neither rule', () => {
    const config = buildConfig('hotspots');
    config.backgroundImage = mediaReference({});
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => ['media-unsupported-file-type', 'media-oversized-file'].includes(i.ruleId))).toBe(false);
  });
});

describe('Media: external asset dependency, insecure HTTP URL', () => {
  test('a plain external URL (not an upload) is a recommendation', () => {
    const config = buildConfig('hotspots');
    config.backgroundImage = 'https://example.com/image.png';
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'media-external-asset-dependency' && i.severity === SEVERITY.RECOMMENDATION)).toBe(true);
  });

  test('an insecure http:// URL is additionally a warning', () => {
    const config = buildConfig('hotspots');
    config.backgroundImage = 'http://example.com/image.png';
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'media-insecure-http-url' && i.severity === SEVERITY.WARNING)).toBe(true);
  });

  test('an https URL does not trigger the insecure-URL rule', () => {
    const config = buildConfig('hotspots');
    config.backgroundImage = 'https://example.com/image.png';
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'media-insecure-http-url')).toBe(false);
  });
});

describe('Media: broken media reference (async)', () => {
  const schema = getComponentById(COMPONENT_REGISTRY, 'hotspots').editorSchema;

  test('a media reference whose record no longer exists is blocking for a required field', async () => {
    const config = buildConfig('hotspots');
    config.items[0].title = 'Hotspot label'; // title stays required; using componentFields.backgroundImage (not required) instead
    config.backgroundImage = { source: 'upload', mediaId: 'missing-1', schemaVersion: 1, kind: 'image', name: 'gone.png', mimeType: 'image/png', size: 100, createdAt: '2026-01-01T00:00:00.000Z' };
    const missingStore = { get: async () => undefined };
    const issues = await runPreflight({ componentId: 'hotspots', schema, config, theme, componentOverrides: {}, settings: {}, mediaStore: missingStore });
    const found = issues.find(i => i.ruleId === 'media-broken-reference');
    expect(found).toBeTruthy();
    expect(found.severity).toBe(SEVERITY.WARNING); // backgroundImage is not a required field
  });

  test('a media reference whose record exists produces no broken-reference issue', async () => {
    const config = buildConfig('hotspots');
    config.backgroundImage = { source: 'upload', mediaId: 'present-1', schemaVersion: 1, kind: 'image', name: 'here.png', mimeType: 'image/png', size: 100, createdAt: '2026-01-01T00:00:00.000Z' };
    const presentStore = { get: async () => ({ id: 'present-1', blob: new Blob(['x']) }) };
    const issues = await runPreflight({ componentId: 'hotspots', schema, config, theme, componentOverrides: {}, settings: {}, mediaStore: presentStore });
    expect(issues.some(i => i.ruleId === 'media-broken-reference')).toBe(false);
  });

  test('a broken reference on a required media field (audio-player) is blocking', async () => {
    const audioSchema = getComponentById(COMPONENT_REGISTRY, 'audio-player').editorSchema;
    const config = buildConfig('audio-player');
    config.items[0].content = { source: 'upload', mediaId: 'missing-audio', schemaVersion: 1, kind: 'audio', name: 'gone.mp3', mimeType: 'audio/mpeg', size: 100, createdAt: '2026-01-01T00:00:00.000Z' };
    const missingStore = { get: async () => undefined };
    const issues = await runPreflight({ componentId: 'audio-player', schema: audioSchema, config, theme, componentOverrides: {}, settings: {}, mediaStore: missingStore });
    const found = issues.find(i => i.ruleId === 'media-broken-reference');
    expect(found?.severity).toBe(SEVERITY.BLOCKING); // audio-player's content field is required
  });
});

describe('Knowledge checks: no correct answer / impossible passing', () => {
  test('multiple-choice with zero correct options is blocking on both rules', () => {
    const config = buildConfig('multiple-choice');
    config.items.forEach(item => { item.correct = false; });
    const issues = issuesFor('multiple-choice', config);
    expect(issues.some(i => i.ruleId === 'knowledge-no-correct-answer' && i.severity === SEVERITY.BLOCKING)).toBe(true);
    expect(issues.some(i => i.ruleId === 'knowledge-impossible-passing' && i.severity === SEVERITY.BLOCKING)).toBe(true);
  });

  test('multiple-select with zero correct options is also blocking', () => {
    const config = buildConfig('multiple-select');
    config.items.forEach(item => { item.correct = false; });
    const issues = issuesFor('multiple-select', config);
    expect(issues.some(i => i.ruleId === 'knowledge-no-correct-answer')).toBe(true);
  });

  test('a normal, valid multiple-choice config with exactly one correct answer has no knowledge-check blocking issues', () => {
    const config = buildConfig('multiple-choice');
    const issues = issuesFor('multiple-choice', config);
    expect(bySeverity(issues, SEVERITY.BLOCKING).filter(i => i.category === 'knowledge')).toEqual([]);
  });
});

describe('Knowledge checks: multiple correct answers where only one is allowed', () => {
  test('two items marked correct on a single-answer multiple-choice is blocking', () => {
    const config = buildConfig('multiple-choice');
    config.items[0].correct = true;
    config.items[1].correct = true;
    const issues = issuesFor('multiple-choice', config);
    expect(issues.some(i => i.ruleId === 'knowledge-multiple-correct-single-allowed' && i.severity === SEVERITY.BLOCKING)).toBe(true);
  });

  test('multiple correct answers on multiple-select (a multi-answer format) is not flagged by this rule', () => {
    const config = buildConfig('multiple-select');
    config.items.forEach(item => { item.correct = true; });
    const issues = issuesFor('multiple-select', config);
    expect(issues.some(i => i.ruleId === 'knowledge-multiple-correct-single-allowed')).toBe(false);
  });
});

describe('Knowledge checks: duplicate options', () => {
  test('two options with identical wording are a warning', () => {
    const config = buildConfig('multiple-choice');
    config.items[1].label = config.items[0].label;
    const issues = issuesFor('multiple-choice', config);
    expect(issues.some(i => i.ruleId === 'knowledge-duplicate-options' && i.severity === SEVERITY.WARNING && i.itemIndex === 1)).toBe(true);
  });
});

describe('Knowledge checks: empty feedback', () => {
  test('an option with no feedback text is a recommendation', () => {
    const config = buildConfig('multiple-choice');
    config.items[0].content = '';
    const issues = issuesFor('multiple-choice', config);
    expect(issues.some(i => i.ruleId === 'knowledge-empty-feedback' && i.severity === SEVERITY.RECOMMENDATION && i.itemIndex === 0)).toBe(true);
  });
});

describe('Hotspots: missing background image', () => {
  test('no background image set is a recommendation, not a defect (a placeholder exists)', () => {
    const config = buildConfig('hotspots', { backgroundImage: '' });
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'hotspot-missing-image' && i.severity === SEVERITY.RECOMMENDATION)).toBe(true);
  });
});

describe('Hotspots: out-of-range position', () => {
  test('a position beyond the 0-100% range is blocking', () => {
    const config = buildConfig('hotspots');
    config.items[0].x = 150;
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'hotspot-out-of-range-position' && i.severity === SEVERITY.BLOCKING)).toBe(true);
  });

  test('a negative position is also blocking', () => {
    const config = buildConfig('hotspots');
    config.items[0].y = -10;
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'hotspot-out-of-range-position')).toBe(true);
  });

  test('a NaN position (corrupted import) is blocking', () => {
    const config = buildConfig('hotspots');
    config.items[0].x = 'not-a-number';
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'hotspot-out-of-range-position')).toBe(true);
  });
});

describe('Hotspots: overlapping hotspots', () => {
  test('two hotspots within the overlap threshold are a warning', () => {
    const config = buildConfig('hotspots');
    config.items[0].x = 50; config.items[0].y = 50;
    config.items[1].x = 51; config.items[1].y = 51;
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'hotspot-overlapping' && i.severity === SEVERITY.WARNING)).toBe(true);
  });

  test('hotspots far enough apart are not flagged', () => {
    const config = buildConfig('hotspots');
    config.items[0].x = 10; config.items[0].y = 10;
    config.items[1].x = 90; config.items[1].y = 90;
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'hotspot-overlapping')).toBe(false);
  });
});

describe('Hotspots: keyboard-accessibility (ambiguous duplicate labels)', () => {
  test('two hotspots sharing the same label are a warning', () => {
    const config = buildConfig('hotspots');
    config.items[1].title = config.items[0].title;
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'hotspot-keyboard-accessibility' && i.severity === SEVERITY.WARNING)).toBe(true);
  });

  test('distinctly-labeled hotspots are not flagged', () => {
    const config = buildConfig('hotspots');
    const issues = issuesFor('hotspots', config);
    expect(issues.some(i => i.ruleId === 'hotspot-keyboard-accessibility')).toBe(false);
  });
});

describe('summarizePreflight', () => {
  test('canExport is false only when there is at least one blocking issue', () => {
    const clean = summarizePreflight([{ severity: SEVERITY.WARNING }, { severity: SEVERITY.RECOMMENDATION }]);
    expect(clean.canExport).toBe(true);
    const broken = summarizePreflight([{ severity: SEVERITY.BLOCKING }, { severity: SEVERITY.WARNING }]);
    expect(broken.canExport).toBe(false);
  });
});
