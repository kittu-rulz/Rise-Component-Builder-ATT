// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showPreExportReviewDialog } from '../../js/dashboard/project-export.js';
import { createRichTextEditor, upgradeTextareaToRichText } from '../../js/rich-text-editor.js';
import { COMPONENT_REGISTRY } from '../../js/component-registry.js';
import { createComponentInstance, buildProjectSchemaV3 } from '../../js/project-schema.js';
import { ProjectOverviewView } from '../../js/dashboard/project-overview.js';
import { saveProject } from '../../js/storage.js';
import { memoryLocalStorage } from '../fixtures/index.js';

describe('UI/UX Workflow Fixes & Verification Suite', () => {
  beforeEach(() => {
    globalThis.localStorage = memoryLocalStorage();
    document.body.innerHTML = `
      <div id="modal-root"></div>
      <div id="app"></div>
    `;
  });

  describe('P0.1 & P0.2: Export Dialog Signature Flexibility & Packaging', () => {
    it('supports object argument signature { projectId, onProceed, onViewQa }', async () => {
      const testProject = buildProjectSchemaV3({
        id: 'test-project-1',
        name: 'Export Test Project 1',
        components: {
          c1: createComponentInstance({
            id: 'c1',
            name: 'Intro',
            type: 'accordion',
            config: { items: [{ title: 'Overview', content: 'Intro text' }] }
          })
        },
        unsectionedComponentOrder: ['c1']
      });
      saveProject(testProject);

      const onProceed = vi.fn();
      const onViewQa = vi.fn();

      showPreExportReviewDialog({
        projectId: 'test-project-1',
        onProceed,
        onViewQa
      });

      const overlay = document.getElementById('att-export-review-modal-overlay');
      expect(overlay).toBeTruthy();

      const proceedBtn = overlay.querySelector('#att-export-review-proceed-btn');
      expect(proceedBtn).toBeTruthy();
      expect(proceedBtn.disabled).toBe(false);
      proceedBtn.click();
      await Promise.resolve();

      expect(onProceed).toHaveBeenCalledWith('test-project-1');
    });

    it('supports legacy positional arguments (projectId, onProceed, onViewQa)', async () => {
      const testProject = buildProjectSchemaV3({
        id: 'test-project-2',
        name: 'Export Test Project 2',
        components: {
          c1: createComponentInstance({
            id: 'c1',
            name: 'Intro',
            type: 'accordion',
            config: { items: [{ title: 'Overview', content: 'Intro text' }] }
          })
        },
        unsectionedComponentOrder: ['c1']
      });
      saveProject(testProject);

      const onProceed = vi.fn();
      const onViewQa = vi.fn();

      showPreExportReviewDialog('test-project-2', onProceed, onViewQa);

      const overlay = document.getElementById('att-export-review-modal-overlay');
      expect(overlay).toBeTruthy();

      const proceedBtn = overlay.querySelector('#att-export-review-proceed-btn');
      expect(proceedBtn).toBeTruthy();
      expect(proceedBtn.disabled).toBe(false);
      proceedBtn.click();
      await Promise.resolve();

      expect(onProceed).toHaveBeenCalledWith('test-project-2');
    });

    it('opens QA view when clicking Review QA button in pre-export dialog', async () => {
      const testProject = buildProjectSchemaV3({
        id: 'test-project-3',
        name: 'Export Test Project 3',
        components: {
          c1: createComponentInstance({
            id: 'c1',
            name: 'Intro',
            type: 'accordion',
            config: { items: [{ title: 'Overview', content: 'Intro text' }] }
          })
        },
        unsectionedComponentOrder: ['c1']
      });
      saveProject(testProject);

      const onViewQa = vi.fn();
      showPreExportReviewDialog({
        projectId: 'test-project-3',
        onProceed: vi.fn(),
        onViewQa
      });

      const overlay = document.getElementById('att-export-review-modal-overlay');
      expect(overlay).toBeTruthy();

      const qaBtn = overlay.querySelector('#att-export-review-qa-btn');
      expect(qaBtn).toBeTruthy();
      qaBtn.click();

      expect(onViewQa).toHaveBeenCalledWith('test-project-3');
    });
  });

  describe('P1.4: Outline Component Row 2-Line Layout', () => {
    it('renders component row with title on top and badges on second line without truncation collisions', () => {
      const testProject = buildProjectSchemaV3({
        id: 'proj-outline-test',
        name: 'Outline Layout Course',
        components: {
          comp1: createComponentInstance({
            id: 'comp1',
            name: 'Very Long Comprehensive Technical Documentation Title That Might Truncate',
            type: 'accordion',
            status: 'draft'
          })
        },
        unsectionedComponentOrder: ['comp1']
      });
      saveProject(testProject);

      const container = document.getElementById('app');
      const view = new ProjectOverviewView({
        container,
        projectId: 'proj-outline-test'
      });
      view.mount();

      const compRow = container.querySelector('.component-row');
      expect(compRow).toBeTruthy();

      const titleLine = compRow.querySelector('.component-row-title-line');
      expect(titleLine).toBeTruthy();

      const titleEl = titleLine.querySelector('.component-name');
      expect(titleEl).toBeTruthy();
      expect(titleEl.textContent).toContain('Very Long Comprehensive Technical');

      const metaLine = compRow.querySelector('.component-row-meta-line');
      expect(metaLine).toBeTruthy();

      const typeBadge = metaLine.querySelector('.component-type-badge');
      const statusSelect = compRow.querySelector('.component-status-select');
      expect(typeBadge).toBeTruthy();
      expect(statusSelect).toBeTruthy();
      expect(typeBadge.textContent).toBe('Accordion');
      expect(statusSelect.value).toBe('draft');
    });
  });

  describe('P1.5: Rich Text Editor Accessibility & ARIA labeling', () => {
    it('applies aria-label correctly in createRichTextEditor', () => {
      const rte = createRichTextEditor({
        controlId: 'test-rt-field',
        fieldId: 'testField',
        value: '<p>Initial text</p>',
        ariaLabel: 'Course Introduction Description'
      });

      expect(rte.validationControl.getAttribute('aria-label')).toBe('Course Introduction Description');
      expect(rte.validationControl.getAttribute('role')).toBe('textbox');
    });

    it('transfers aria-label when upgrading textarea to rich text', () => {
      const textarea = document.createElement('textarea');
      textarea.id = 'sample-textarea';
      textarea.setAttribute('aria-label', 'Item Detailed Explanation');
      document.body.appendChild(textarea);

      const rte = upgradeTextareaToRichText(textarea);
      expect(rte.validationControl.getAttribute('aria-label')).toBe('Item Detailed Explanation');
    });
  });

  describe('P2.11: Clean Author-Facing Catalog Guidance', () => {
    it('does not contain internal roadmap phrases in COMPONENT_REGISTRY', () => {
      const forbiddenPhrases = [
        'custom should evolve',
        'requires a real differentiator',
        'retain as a productivity',
        'flagship interaction'
      ];

      for (const entry of COMPONENT_REGISTRY) {
        const text = `${entry.differentiator || ''} ${entry.bestWhen || ''} ${entry.riseRecommendationSummary || ''}`.toLowerCase();
        for (const phrase of forbiddenPhrases) {
          expect(text.includes(phrase)).toBe(false);
        }
      }
    });
  });
});
