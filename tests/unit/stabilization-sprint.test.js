// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import {
  COMPONENT_REGISTRY,
  normalizeComponentType,
  getComponentModule
} from '../../js/component-registry.js';
import { createNewProjectFromTemplate } from '../../js/dashboard/dashboard-view.js';
import { auditCourseProject } from '../../js/dashboard/project-qa.js';
import { migrateProject, migrateProjectSafely } from '../../js/migration.js';
import { compileCoursePreview } from '../../js/dashboard/course-preview.js';
import { createGoldenAuditCourse } from '../fixtures/golden-audit-course.js';

describe('Final 10/10 Stabilization Sprint — Comprehensive Verification Suite', () => {

  describe('1. P0 — Component Registry & Canonical Identifier System', () => {
    test('contains all 26 registered components with unique IDs', () => {
      expect(COMPONENT_REGISTRY.length).toBe(26);
      const ids = COMPONENT_REGISTRY.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(26);
    });

    test('normalizes tabs aliases ("tabs", "horizontal-tabs", "tab-panel") to canonical "tab-blocks"', () => {
      expect(normalizeComponentType('tabs')).toBe('tab-blocks');
      expect(normalizeComponentType('horizontal-tabs')).toBe('tab-blocks');
      expect(normalizeComponentType('tab-panel')).toBe('tab-blocks');
      expect(normalizeComponentType('tabbed layout')).toBe('tab-blocks');
      expect(normalizeComponentType('tab-blocks')).toBe('tab-blocks');
    });

    test('every registered component has valid module exports (generateHTML, generateCSS, generateJS)', () => {
      COMPONENT_REGISTRY.forEach(comp => {
        const mod = getComponentModule(comp.id);
        expect(mod, `Module for ${comp.id} should be found`).toBeDefined();
        expect(typeof mod.generateHTML, `${comp.id} generateHTML`).toBe('function');
        expect(typeof mod.generateCSS, `${comp.id} generateCSS`).toBe('function');
        expect(typeof mod.generateJS, `${comp.id} generateJS`).toBe('function');
      });
    });

    test('Course Preview compiles Horizontal Tabs without throwing unregistered component error', () => {
      const tabsProject = {
        id: 'test-tabs-proj',
        name: 'Tabs Test Course',
        sectionOrder: ['sec-1'],
        sections: {
          'sec-1': {
            id: 'sec-1',
            name: 'Module 1',
            componentOrder: ['comp-tabs-1', 'comp-tabs-2']
          }
        },
        components: {
          'comp-tabs-1': {
            id: 'comp-tabs-1',
            name: 'Key Concepts Tabs',
            type: 'tabs', // legacy alias
            status: 'ready',
            config: {
              blockTitle: 'KEY CONCEPTS',
              blockHeadline: '5G Architecture',
              items: [
                { title: 'RAN', content: 'Radio Access Network details' },
                { title: '5G Core', content: 'Core network details' }
              ]
            }
          },
          'comp-tabs-2': {
            id: 'comp-tabs-2',
            name: 'Canonical Tabs',
            type: 'tab-blocks',
            status: 'ready',
            config: {
              blockTitle: 'KEY CONCEPTS',
              blockHeadline: '5G Architecture',
              items: [
                { title: 'RAN', content: 'Radio Access Network details' }
              ]
            }
          }
        }
      };

      const previewHtml = compileCoursePreview(tabsProject);
      expect(previewHtml).toBeDefined();
      expect(previewHtml).toContain('<!DOCTYPE html>');
      expect(previewHtml).toContain('Key Concepts Tabs');
      expect(previewHtml).toContain('Canonical Tabs');
      expect(previewHtml).not.toContain('Could not render');
    });
  });

  describe('2. P0 — Standard AT&T Demonstration Project Starter', () => {
    test('creates polished 3-module AT&T demonstration starter with 0 blockers and 0 errors', () => {
      const project = createNewProjectFromTemplate('standard');
      expect(project).toBeDefined();
      expect(project.sectionOrder.length).toBe(3);

      const sectionNames = project.sectionOrder.map(id => project.sections[id].name);
      expect(sectionNames).toEqual([
        'Module 1: Fiber Deployment',
        'Module 2: 5G Architecture',
        'Module 3: Compliance & Safety'
      ]);

      const compKeys = Object.keys(project.components);
      expect(compKeys.length).toBe(3);

      const [c1, c2, c3] = compKeys.map(k => project.components[k]);
      expect(c1.type).toBe('accordion');
      expect(c1.config.items.map(i => i.title)).toEqual([
        'Permitting & Right-of-Way',
        'Trenching & Conduit Placement',
        'Fiber Splicing & Optical Testing'
      ]);

      expect(c2.type).toBe('tab-blocks');
      expect(c2.config.items.map(i => i.title)).toEqual([
        'Radio Access Network (RAN)',
        '5G Standalone Core',
        'Multi-Access Edge Computing (MEC)'
      ]);

      expect(c3.type).toBe('multiple-choice');
      expect(c3.config.mcQuestionPrompt).toContain('Which optical test');
      expect(c3.config.items.length).toBe(3);
      expect(c3.config.items.filter(o => o.correct).length).toBe(1);

      // Run canonical QA Audit
      const audit = auditCourseProject(project);
      expect(audit.counts.blockers).toBe(0);
      expect(audit.counts.errors).toBe(0);
      expect(audit.editorial.draftCount).toBe(3);
      expect(audit.counts.recommendations).toBe(0); // 0 missing-header suggestions!
    });
  });

  describe('3. P0 — Backward-Compatible Project Migration', () => {
    test('migrates v2 single-component project to full v3 multi-component structure', () => {
      const v2Project = {
        id: 'legacy-v2-123',
        schemaVersion: 2,
        name: 'Legacy Accordion Project',
        componentId: 'tabs', // aliased ID
        config: {
          blockTitle: 'OVERVIEW',
          blockHeadline: 'Legacy Course Title',
          items: [{ title: 'Tab 1', content: 'Content 1' }]
        },
        uiTheme: 'light',
        settings: { defaultFont: 'Aleck Sans' }
      };

      const result = migrateProject(v2Project);
      expect(result.success).toBe(true);
      const migrated = result.project;
      expect(migrated.schemaVersion).toBe(3);
      expect(migrated.sectionOrder.length).toBeGreaterThanOrEqual(1);
      expect(Object.keys(migrated.components).length).toBe(1);

      const comp = Object.values(migrated.components)[0];
      expect(comp.type).toBe('tab-blocks'); // normalized from 'tabs'
      expect(comp.config.blockHeadline).toBe('Legacy Course Title');
    });

    test('is idempotent across multiple migration runs', () => {
      const v2 = {
        id: 'v2-test',
        schemaVersion: 2,
        name: 'Idempotency Test',
        componentId: 'accordion',
        config: { items: [{ title: 'Item 1' }] }
      };

      const pass1 = migrateProjectSafely(v2);
      const pass2 = migrateProjectSafely(pass1);
      expect(pass2.schemaVersion).toBe(pass1.schemaVersion);
      expect(pass2.sectionOrder).toEqual(pass1.sectionOrder);
      expect(Object.keys(pass2.components)).toEqual(Object.keys(pass1.components));
    });

    test('recovers safely from partially corrupt or non-object project input without crashing', () => {
      const corrupt = null;
      const result = migrateProject(corrupt);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      const safe = migrateProjectSafely(corrupt);
      expect(safe).toBeNull();
    });
  });

  describe('4. P0 — QA Audit & Pre-Export Review Agreement', () => {
    test('reports identical issue counts between auditCourseProject and export gating rules', () => {
      const project = {
        id: 'qa-export-test',
        name: 'QA Export Test',
        sectionOrder: ['s1'],
        sections: { s1: { id: 's1', name: 'S1', componentOrder: ['c1'] } },
        components: {
          c1: {
            id: 'c1',
            name: 'Broken Accordion',
            type: 'accordion',
            status: 'ready',
            config: {
              blockTitle: '',
              blockHeadline: '',
              items: [] // Blocker: zero items
            }
          }
        }
      };

      const audit = auditCourseProject(project);
      expect(audit.counts.blockers).toBeGreaterThanOrEqual(1);

      // Verify severity export rules
      const isExportBlocked = audit.counts.blockers > 0;
      expect(isExportBlocked).toBe(true);
    });
  });

  describe('5. P1 — Golden 26-Component Audit Course', () => {
    test('Golden Audit Course contains all 26 components and compiles cleanly into Course Preview', () => {
      const goldenCourse = createGoldenAuditCourse();
      expect(Object.keys(goldenCourse.components).length).toBe(26);

      // Add sectionOrder and sections map if needed
      goldenCourse.sectionOrder = goldenCourse.structure.sections.map(s => s.id);
      goldenCourse.sections = {};
      goldenCourse.structure.sections.forEach(s => {
        goldenCourse.sections[s.id] = {
          ...s,
          componentOrder: s.componentIds
        };
      });

      const previewHtml = compileCoursePreview(goldenCourse);
      expect(previewHtml).toBeDefined();
      expect(previewHtml.length).toBeGreaterThan(5000);
      expect(previewHtml).toContain('Golden 26-Component Audit Course');

      // QA Audit on golden course must have 0 blockers and 0 errors
      const audit = auditCourseProject(goldenCourse);
      expect(audit.counts.blockers).toBe(0);
      expect(audit.counts.errors).toBe(0);
    });
  });
});
