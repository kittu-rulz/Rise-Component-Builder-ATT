// @vitest-environment jsdom
// P1: Course QA used to run five ad-hoc checks and never called Preflight, so it could report
// "100% technical checks passed" while the component's own Preflight panel showed warnings.
// These tests pin the shared result model: same engine, honest status, findings that clear
// when fixed, and no way to reach "passed" while a technical warning exists.
import { beforeEach, describe, expect, test } from 'vitest';
import {
  collectPreflightIssues, describeTechnicalStatus, formatsAffected, mergeReadiness, toReadinessIssue
} from '../../js/dashboard/course-readiness.js';
import { auditCourseProject } from '../../js/dashboard/project-qa.js';
import { COMPONENT_REGISTRY, getDefaultConfig } from '../../js/component-registry.js';
import { createEmptyItemMedia } from '../../js/item-media.js';
import { createIndexedDBMediaStore } from '../../js/media-storage.js';
import { runPreflight, SEVERITY } from '../../js/validation.js';
import { buildProjectSchemaV3, createComponentInstance } from '../../js/project-schema.js';
import { createFakeIndexedDB, memoryLocalStorage } from '../fixtures/index.js';

const accordion = COMPONENT_REGISTRY.find(entry => entry.id === 'accordion');

function courseWith(config, extra = {}) {
  const comp = createComponentInstance({ id: 'c1', name: 'Lesson Accordion', type: 'accordion', status: 'ready', config, ...extra });
  return buildProjectSchemaV3({ id: 'p1', name: 'QA Course', unsectionedComponentOrder: ['c1'], components: { c1: comp } });
}

function imageItem({ alt, mediaId, name }) {
  return {
    title: 'Item', content: 'Body',
    media: { ...createEmptyItemMedia('image'), sourceType: 'upload', mediaId, fileName: name, mimeType: 'image/png', alt, decorative: false }
  };
}

// The registry default has no headline; a headline is the component's accessible name and a
// blocking rule, so a "clean" fixture must set one (as the editor does).
const okConfig = () => ({
  ...getDefaultConfig(accordion),
  blockTitle: 'Module', blockHeadline: 'Overview',
  items: [{ title: 'First', content: 'Body' }]
});
const measured = (height, overflow = 0) => async () => ({ desktopContentHeight: height, mobileOverflowPx: overflow, mobileOffender: null, statesMeasured: 2 });

async function readiness(project, store, height, overflow) {
  const issues = await collectPreflightIssues(project, { mediaStore: store, measure: true, measureFn: measured(height, overflow) });
  return { issues, audit: mergeReadiness(auditCourseProject(project), issues) };
}

describe('Course QA reflects export readiness (P1)', () => {
  let store;
  beforeEach(() => {
    globalThis.localStorage = memoryLocalStorage();
    store = createIndexedDBMediaStore(createFakeIndexedDB());
  });

  test('a clean component reports technical checks passed, with no percentage claim', async () => {
    const { audit } = await readiness(courseWith(okConfig()), store, 200, 0);
    expect(audit.technical.status).toBe('passed');
    expect(audit.exportReadiness.canExport).toBe(true);
    expect(describeTechnicalStatus(audit)).toMatch(/^Technical checks: passed/);
    expect(describeTechnicalStatus(audit)).not.toMatch(/%/);
  });

  test('missing alt text, a missing local asset and a height warning all surface, with severity, format and remediation', async () => {
    const config = okConfig();
    config.items = [imageItem({ alt: '', mediaId: 'gone-1', name: 'diagram.png' })];
    const { audit } = await readiness(courseWith(config), store, 900, 0);

    const issues = audit.componentReports[0].issues.filter(i => i.source === 'preflight');
    const byRule = Object.fromEntries(issues.map(i => [i.ruleId, i]));

    // Missing local asset: always a blocker, and it prevents export.
    expect(byRule['media-broken-reference']).toBeDefined();
    expect(byRule['media-broken-reference'].severity).toBe('blocker');
    expect(byRule['media-broken-reference'].preventsExport).toBe(true);
    expect(byRule['media-broken-reference'].message).toMatch(/export stops/i);

    // Height: a warning that names the format it affects (not "all formats").
    expect(byRule['general-clipping-risk']).toBeDefined();
    expect(byRule['general-clipping-risk'].severity).toBe('warning');
    expect(byRule['general-clipping-risk'].formats.join(' ')).toMatch(/Web Package/);
    expect(byRule['general-clipping-risk'].formats.join(' ')).not.toMatch(/All export formats/);
    expect(byRule['general-clipping-risk'].message).toMatch(/Copy for Rise/);

    // Missing alt text is reported by some accessibility/media rule.
    expect(issues.some(i => /alt/i.test(`${i.ruleId} ${i.title} ${i.message}`))).toBe(true);

    expect(audit.technical.status).toBe('blocked');
    expect(audit.exportReadiness.canExport).toBe(false);
    expect(audit.overallStatus).toBe('Blocked');
    expect(audit.counts.blockers).toBeGreaterThanOrEqual(1);
  });

  test('technical checks never read "passed" while a technical warning exists', async () => {
    const { audit } = await readiness(courseWith(okConfig()), store, 900, 0);
    expect(audit.technical.warnings).toBeGreaterThanOrEqual(1);
    expect(audit.technical.status).toBe('warnings');
    expect(describeTechnicalStatus(audit)).not.toMatch(/passed/i);
    expect(describeTechnicalStatus(audit)).toMatch(/warning/);
    // Editorial 'ready' must not launder it into "Ready to Export".
    expect(audit.overallStatus).toBe('Ready with warnings');
    expect(audit.exportReadiness.canExport).toBe(true); // warnings do not block export
  });

  test('fixing each problem clears it', async () => {
    const broken = okConfig();
    broken.items = [imageItem({ alt: '', mediaId: 'gone-1', name: 'diagram.png' })];
    const before = await readiness(courseWith(broken), store, 900, 0);
    expect(before.audit.technical.status).toBe('blocked');

    // Fix: remove the broken media, shrink the layout.
    const fixed = okConfig();
    const after = await readiness(courseWith(fixed), store, 200, 0);
    expect(after.audit.technical.status).toBe('passed');
    expect(after.audit.componentReports[0].issues.filter(i => i.source === 'preflight' && i.severity !== 'recommendation')).toEqual([]);
  });

  test('uses the same engine as the editor: counts match runPreflight for the same inputs', async () => {
    const config = okConfig();
    config.items = [imageItem({ alt: '', mediaId: 'gone-1', name: 'diagram.png' })];
    const project = courseWith(config);
    const { issues } = await readiness(project, store, 900, 0);

    const direct = await runPreflight({
      componentId: 'accordion', schema: accordion.editorSchema, config, theme: project.theme,
      componentOverrides: project.componentOverrides || {}, settings: project.settings || {}, mediaStore: store,
      domMeasurement: { desktopContentHeight: 900, mobileOverflowPx: 0, mobileOffender: null, statesMeasured: 2 }
    });
    const viaQa = issues.get('c1');
    expect(viaQa).toHaveLength(direct.length);
    expect(viaQa.filter(i => i.severity === 'blocker')).toHaveLength(direct.filter(i => i.severity === SEVERITY.BLOCKING).length + direct.filter(i => i.ruleId === 'media-broken-reference' && i.severity !== SEVERITY.BLOCKING).length);
    expect(viaQa.filter(i => i.severity === 'warning').length).toBeLessThanOrEqual(direct.filter(i => i.severity === SEVERITY.WARNING).length);
  });

  test('an unmeasurable layout is a manual-check suggestion, never a silent pass', async () => {
    const issues = await collectPreflightIssues(courseWith(okConfig()), { mediaStore: store, measure: true, measureFn: async () => null });
    const list = issues.get('c1');
    expect(list.some(i => i.ruleId === 'general-clipping-risk-unmeasured' && i.severity === 'recommendation')).toBe(true);
  });

  test('editorial Draft status stays a separate, non-blocking dimension', async () => {
    const project = courseWith(okConfig(), { status: 'draft' });
    const { audit } = await readiness(project, store, 200, 0);
    expect(audit.technical.status).toBe('passed');
    expect(audit.editorial.draftCount).toBe(1);
    expect(audit.exportReadiness.canExport).toBe(true);
  });

  test('mergeReadiness is pure and formatsAffected scopes format-specific rules', () => {
    const base = auditCourseProject(courseWith(okConfig()));
    const snapshot = JSON.stringify(base.counts);
    mergeReadiness(base, new Map([['c1', [toReadinessIssue({ ruleId: 'x', severity: SEVERITY.WARNING, explanation: 'e', title: 't' }, { name: 'n' })]]]));
    expect(JSON.stringify(base.counts)).toBe(snapshot);
    expect(formatsAffected('general-clipping-risk')).not.toContain('All export formats');
    expect(formatsAffected('brand-color-literal')).toEqual(['All export formats']);
  });
});
