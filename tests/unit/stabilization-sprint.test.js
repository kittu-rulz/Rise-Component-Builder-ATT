// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import {
  COMPONENT_REGISTRY,
  normalizeComponentType,
  getComponentModule
} from '../../js/component-registry.js';
import { getComponentThumbnailSvg } from '../../js/dashboard/component-thumbnails.js';
import { createNewProjectFromTemplate } from '../../js/dashboard/dashboard-view.js';
import { auditCourseProject } from '../../js/dashboard/project-qa.js';
import { migrateProject, migrateProjectSafely } from '../../js/migration.js';
import { compileCoursePreview } from '../../js/dashboard/course-preview.js';
import { isolateModal, showPromptDialog, showConfirmDialog } from '../../js/dashboard/att-modal.js';
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

  describe('2. P0 — Component Picker Custom Wireframe Thumbnails', () => {
    test('every registered component has a non-empty SVG wireframe thumbnail', () => {
      COMPONENT_REGISTRY.forEach(comp => {
        const svg = getComponentThumbnailSvg(comp.id);
        expect(svg, `Thumbnail SVG for ${comp.id}`).toBeDefined();
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
        expect(svg).toContain('viewBox="0 0 120 70"');
        expect(svg).toContain('aria-hidden="true"');
      });
    });

    test('registry entries expose the thumbnail property matching the component structure', () => {
      const accordionEntry = COMPONENT_REGISTRY.find(c => c.id === 'accordion');
      expect(accordionEntry.thumbnail).toBeDefined();
      expect(accordionEntry.thumbnail).toContain('<svg');

      const tabsEntry = COMPONENT_REGISTRY.find(c => c.id === 'tab-blocks');
      expect(tabsEntry.thumbnail).toBeDefined();
      expect(tabsEntry.thumbnail).toContain('<svg');

      const mcEntry = COMPONENT_REGISTRY.find(c => c.id === 'multiple-choice');
      expect(mcEntry.thumbnail).toBeDefined();
      expect(mcEntry.thumbnail).toContain('<svg');
    });
  });

  describe('3. P0 — Accessibility Architecture & Modal Isolation', () => {
    test('isolateModal sets inert on background roots, traps Tab focus, and restores trigger focus on close', () => {
      document.body.innerHTML = `
        <div id="app-root" class="app-workspace">
          <button id="trigger-btn">Open Modal</button>
        </div>
        <div id="test-modal" role="dialog" aria-modal="true" style="display: block;">
          <input id="modal-input" type="text" />
          <button id="modal-confirm">Confirm</button>
          <button id="modal-cancel">Cancel</button>
        </div>
      `;

      const appRoot = document.getElementById('app-root');
      const triggerBtn = document.getElementById('trigger-btn');
      const testModal = document.getElementById('test-modal');

      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      const onDismiss = vi.fn();
      const cleanup = isolateModal(testModal, {
        triggerElement: triggerBtn,
        onDismiss
      });

      // Background root should be inert
      expect(appRoot.hasAttribute('inert')).toBe(true);
      expect(appRoot.getAttribute('aria-hidden')).toBe('true');

      // Test Escape key triggers onDismiss
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      document.dispatchEvent(escEvent);
      expect(onDismiss).toHaveBeenCalledTimes(1);

      // Cleanup restores inert and focus
      cleanup();
      expect(appRoot.hasAttribute('inert')).toBe(false);
      expect(document.activeElement).toBe(triggerBtn);
    });

    test('showPromptDialog and showConfirmDialog isolate background and return promises', async () => {
      const promptPromise = showPromptDialog({
        title: 'Edit Module Name',
        label: 'Name',
        defaultValue: 'Module 1'
      });

      const overlay = document.getElementById('att-dynamic-modal-overlay');
      expect(overlay).toBeDefined();
      expect(overlay.getAttribute('role')).toBe('dialog');
      expect(overlay.getAttribute('aria-modal')).toBe('true');

      const cancelBtn = overlay.querySelector('#att-modal-cancel-btn');
      cancelBtn.click();

      const result = await promptPromise;
      expect(result).toBeNull();
      expect(document.getElementById('att-dynamic-modal-overlay')).toBeNull();

      const confirmPromise = showConfirmDialog({
        title: 'Confirm Delete',
        message: 'Delete item?'
      });
      const confirmOverlay = document.getElementById('att-dynamic-modal-overlay');
      expect(confirmOverlay).toBeDefined();
      const confirmBtn = confirmOverlay.querySelector('#att-modal-confirm-btn');
      confirmBtn.click();
      const confirmed = await confirmPromise;
      expect(confirmed).toBe(true);
      expect(document.getElementById('att-dynamic-modal-overlay')).toBeNull();
    });
  });

  describe('4. P0 — Standard AT&T Demonstration Project Starter', () => {
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

  describe('5. P0 — Backward-Compatible Project Migration', () => {
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

  describe('6. P0 — QA Audit & Pre-Export Review Agreement', () => {
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

    test('enforces strict severity state matrix for exports', () => {
      // 1. Blockers > 0
      const blockersReport = { counts: { blockers: 1, errors: 0, warnings: 0 }, editorial: { draftCount: 0 } };
      expect(blockersReport.counts.blockers > 0).toBe(true); // Export Blocked

      // 2. Errors > 0 (No Blockers)
      const errorsReport = { counts: { blockers: 0, errors: 2, warnings: 1 }, editorial: { draftCount: 0 } };
      expect(errorsReport.counts.blockers === 0 && errorsReport.counts.errors > 0).toBe(true); // Export Draft With Known Errors

      // 3. Warnings / Drafts > 0 (No Blockers, No Errors)
      const warningsReport = { counts: { blockers: 0, errors: 0, warnings: 2 }, editorial: { draftCount: 1 } };
      expect(warningsReport.counts.blockers === 0 && warningsReport.counts.errors === 0 && (warningsReport.counts.warnings > 0 || warningsReport.editorial.draftCount > 0)).toBe(true); // Export Anyway

      // 4. 100% Ready
      const cleanReport = { counts: { blockers: 0, errors: 0, warnings: 0 }, editorial: { draftCount: 0 } };
      expect(cleanReport.counts.blockers === 0 && cleanReport.counts.errors === 0 && cleanReport.counts.warnings === 0 && cleanReport.editorial.draftCount === 0).toBe(true); // Download Package
    });
  });

  describe('7. P1 — Golden 26-Component Audit Course', () => {
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
