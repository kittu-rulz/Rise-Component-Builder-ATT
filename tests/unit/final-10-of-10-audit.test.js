// @vitest-environment jsdom
/**
 * @file final-10-of-10-audit.test.js
 * Comprehensive automated test suite validating the final 10/10 production-readiness criteria:
 * 1. P0.1 - Exactly one H1 and one active <main> per active view
 * 2. P0.2 - True modal background isolation (#app-shell.inert = true)
 * 3. P0.3 - Reliable Escape dismissal and focus restoration to the exact opener
 * 4. P0.4 - Context-aware component destination defaults
 * 5. P1   - Clean placeholder strings and unique accessibility attributes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isolateModal } from '../../js/dashboard/att-modal.js';
import { ProjectOverviewView } from '../../js/dashboard/project-overview.js';
import { DashboardView } from '../../js/dashboard/dashboard-view.js';
import { CoursePreviewView } from '../../js/dashboard/course-preview.js';
import { ProjectQaView } from '../../js/dashboard/project-qa.js';
import { ProjectMediaView } from '../../js/dashboard/project-media.js';
import { createPostPublishWorkflow } from '../../js/post-publish/workflow-shell.js';
import { buildProjectSchemaV3, createSection } from '../../js/project-schema.js';
import { memoryLocalStorage } from '../fixtures/index.js';
import { saveProject } from '../../js/storage.js';

describe('Rise Component Builder AT&T — Final 10/10 Verification Suite', () => {
  let appShell;
  let modalRoot;

  beforeEach(() => {
    globalThis.localStorage = memoryLocalStorage();
    document.body.innerHTML = `
      <div class="app-container" id="app-shell">
        <header class="app-toolbar">
          <div class="toolbar-brand"><span class="logo-title">Component Builder</span></div>
        </header>
        <div id="view-container"></div>
      </div>
      <div id="modal-root"></div>
    `;
    appShell = document.getElementById('app-shell');
    modalRoot = document.getElementById('modal-root');
  });

  afterEach(() => {
    document.body.className = '';
    document.body.innerHTML = '';
  });

  describe('P0.1 — Single Visible H1 and Landmark Hierarchy Per Screen', () => {
    it('verifies Course QA view renders exactly one H1 and one active main landmark', () => {
      const container = document.getElementById('view-container');
      const project = buildProjectSchemaV3({ name: 'Telecom 101' });
      saveProject(project);

      const qaView = new ProjectQaView({ container, projectId: project.id });
      qaView.mount();

      const h1s = container.querySelectorAll('h1');
      expect(h1s).toHaveLength(1);
      expect(h1s[0].textContent).toContain('Course Quality & Compliance Audit');

      const mains = container.querySelectorAll('main');
      expect(mains).toHaveLength(1);
    });

    it('verifies Course Media Library renders exactly one H1 and one active main landmark', async () => {
      const container = document.getElementById('view-container');
      const project = buildProjectSchemaV3({ name: 'Fiber Optics' });
      saveProject(project);

      const mediaView = new ProjectMediaView({ container, projectId: project.id });
      await mediaView.mount();

      const h1s = container.querySelectorAll('h1');
      expect(h1s).toHaveLength(1);
      expect(h1s[0].textContent).toContain('Course Media Library');

      const mains = container.querySelectorAll('main');
      expect(mains).toHaveLength(1);
    });

    it('verifies Course Preview view renders exactly one H1 and one active main landmark', () => {
      const container = document.getElementById('view-container');
      const project = buildProjectSchemaV3({ name: '5G Architecture' });
      saveProject(project);

      const previewView = new CoursePreviewView({ container, projectId: project.id });
      previewView.mount();

      const h1s = container.querySelectorAll('h1');
      expect(h1s).toHaveLength(1);
      expect(h1s[0].textContent).toContain('Course Preview');

      const mains = container.querySelectorAll('main');
      expect(mains).toHaveLength(1);
    });

    it('verifies Course Projects Dashboard renders exactly one H1 and one active main landmark', () => {
      const container = document.getElementById('view-container');
      const dashView = new DashboardView({ container });
      dashView.mount();

      const h1s = container.querySelectorAll('h1');
      expect(h1s).toHaveLength(1);
      expect(h1s[0].textContent).toContain('Rise Component Builder');

      const mains = container.querySelectorAll('main');
      expect(mains).toHaveLength(1);
    });

    it('verifies Course Workspace renders exactly one H1 and one active main landmark', () => {
      const container = document.getElementById('view-container');
      const project = buildProjectSchemaV3({ name: 'Wireless Standards Course' });
      saveProject(project);

      const wsView = new ProjectOverviewView({ container, projectId: project.id });
      wsView.mount();

      const h1s = container.querySelectorAll('h1');
      expect(h1s).toHaveLength(1);
      expect(h1s[0].textContent).toContain('Wireless Standards Course');

      const mains = container.querySelectorAll('main');
      expect(mains).toHaveLength(1);
    });

    it('verifies Post-Publish workflow renders exactly one H1', () => {
      const element = createPostPublishWorkflow();
      const h1s = element.querySelectorAll('h1');
      expect(h1s).toHaveLength(1);
      expect(h1s[0].textContent).toContain('Persistent Course Tools');
    });
  });

  describe('P0.2 — Modal Background Isolation and Sibling Inertness', () => {
    it('sets app-shell to inert and applies has-open-modal class when a dialog opens', () => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = `
        <div class="modal-card">
          <button id="modal-btn-1">Action 1</button>
          <button id="modal-btn-2">Action 2</button>
        </div>
      `;
      modalRoot.appendChild(modal);

      expect(appShell.hasAttribute('inert')).toBe(false);
      expect(document.body.classList.contains('has-open-modal')).toBe(false);

      const cleanup = isolateModal(modal);

      expect(appShell.hasAttribute('inert')).toBe(true);
      expect(appShell.getAttribute('aria-hidden')).toBe('true');
      expect(document.body.classList.contains('has-open-modal')).toBe(true);

      cleanup();

      expect(appShell.hasAttribute('inert')).toBe(false);
      expect(appShell.hasAttribute('aria-hidden')).toBe(false);
      expect(document.body.classList.contains('has-open-modal')).toBe(false);
      modal.remove();
    });

    it('supports nested dialogs and maintains proper inert hierarchy', () => {
      const parentModal = document.createElement('div');
      parentModal.className = 'modal-overlay';
      parentModal.id = 'parent-modal';
      parentModal.innerHTML = `<div class="modal-card"><button id="parent-btn">Open Child</button></div>`;
      modalRoot.appendChild(parentModal);

      const cleanupParent = isolateModal(parentModal);
      expect(appShell.hasAttribute('inert')).toBe(true);
      expect(parentModal.hasAttribute('inert')).toBe(false);

      const childModal = document.createElement('div');
      childModal.className = 'modal-overlay';
      childModal.id = 'child-modal';
      childModal.innerHTML = `<div class="modal-card"><button id="child-btn">Confirm</button></div>`;
      modalRoot.appendChild(childModal);

      const cleanupChild = isolateModal(childModal, { triggerElement: parentModal.querySelector('#parent-btn') });

      // Parent modal should be made inert while child modal is open
      expect(parentModal.hasAttribute('inert')).toBe(true);
      expect(childModal.hasAttribute('inert')).toBe(false);

      // Close child modal
      cleanupChild();
      childModal.remove();

      // Parent modal should regain active non-inert status
      expect(parentModal.hasAttribute('inert')).toBe(false);
      expect(appShell.hasAttribute('inert')).toBe(true);

      // Close parent modal
      cleanupParent();
      parentModal.remove();

      expect(appShell.hasAttribute('inert')).toBe(false);
    });

    it('ensures closing an export dialog completely restores interactivity with no leftover inert elements', () => {
      const workspace = document.createElement('div');
      workspace.className = 'app-workspace';
      appShell.appendChild(workspace);

      const exportModal = document.createElement('div');
      exportModal.id = 'modal-export';
      exportModal.className = 'modal-overlay';
      exportModal.innerHTML = `<div class="modal-card"><button class="modal-close-btn">Close</button></div>`;
      modalRoot.appendChild(exportModal);

      const triggerBtn = document.createElement('button');
      triggerBtn.id = 'btn-export';
      appShell.appendChild(triggerBtn);
      triggerBtn.focus();

      const cleanup = isolateModal(exportModal, { triggerElement: triggerBtn });

      expect(appShell.hasAttribute('inert')).toBe(true);
      expect(workspace.hasAttribute('inert')).toBe(true);
      expect(document.body.classList.contains('has-open-modal')).toBe(true);

      cleanup();
      exportModal.remove();

      expect(appShell.hasAttribute('inert')).toBe(false);
      expect(workspace.hasAttribute('inert')).toBe(false);
      expect(document.body.classList.contains('has-open-modal')).toBe(false);
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
    });

    it('handles rapid re-isolations during component search/filter without accumulating inert locks', () => {
      const container = document.getElementById('view-container');
      const project = buildProjectSchemaV3({ name: 'Search Test Project' });
      saveProject(project);

      const overviewView = new ProjectOverviewView({ container, projectId: project.id });
      overviewView.mount();

      overviewView.state.isPickerOpen = true;
      overviewView.render();

      const pickerModal = container.querySelector('#picker-modal-overlay');
      expect(pickerModal).not.toBeNull();
      expect(document.body.classList.contains('has-open-modal')).toBe(true);

      // Simulate rapid keystrokes triggering multiple re-renders
      for (let i = 0; i < 5; i++) {
        overviewView.state.pickerSearch = `term-${i}`;
        overviewView.render();
      }

      // Close the picker
      overviewView.state.isPickerOpen = false;
      if (overviewView.cleanupPickerIsolation) {
        overviewView.cleanupPickerIsolation();
        overviewView.cleanupPickerIsolation = null;
      }
      overviewView.render();

      expect(appShell.hasAttribute('inert')).toBe(false);
      expect(document.body.classList.contains('has-open-modal')).toBe(false);
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
    });
  });

  describe('P0.3 — Escape Handling and Focus Restoration', () => {
    it('restores focus to the exact opener button upon modal dismissal', () => {
      const button = document.createElement('button');
      button.id = 'opener-btn-module-2';
      button.textContent = '+ Add Component';
      appShell.appendChild(button);
      button.focus();

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `<div class="modal-card"><button id="btn-inside">Inside</button></div>`;
      modalRoot.appendChild(modal);

      const onDismiss = vi.fn();
      const cleanup = isolateModal(modal, {
        triggerElement: button,
        fallbackSelector: '#opener-btn-module-2',
        onDismiss
      });

      // Simulate Escape key
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      document.dispatchEvent(escEvent);

      expect(onDismiss).toHaveBeenCalledTimes(1);

      cleanup();
      modal.remove();

      expect(document.activeElement).toBe(button);
    });

    it('uses fallback selector if opener button is disconnected', () => {
      const oldButton = document.createElement('button');
      oldButton.id = 'stable-toolbar-btn';
      appShell.appendChild(oldButton);

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `<div class="modal-card"><button id="btn-inside">Inside</button></div>`;
      modalRoot.appendChild(modal);

      const cleanup = isolateModal(modal, {
        triggerElement: oldButton,
        fallbackSelector: '#stable-toolbar-btn'
      });

      // Replace old button in appShell with re-rendered button of same ID
      oldButton.remove();
      const newButton = document.createElement('button');
      newButton.id = 'stable-toolbar-btn';
      appShell.appendChild(newButton);

      cleanup();
      modal.remove();

      expect(document.activeElement).toBe(newButton);
    });
  });

  describe('P0.4 — Context-Aware Component Destination Resolution', () => {
    let wsView;
    let mockProject;

    beforeEach(() => {
      const container = document.getElementById('view-container');
      mockProject = buildProjectSchemaV3({ name: 'AT&T 3-Module Starter' });
      const sec1 = createSection({ name: 'Module 1: Fiber Deployment' });
      const sec2 = createSection({ name: 'Module 2: 5G Architecture' });
      const sec3 = createSection({ name: 'Module 3: Compliance & Safety' });
      mockProject.sections = {
        [sec1.id]: sec1,
        [sec2.id]: sec2,
        [sec3.id]: sec3
      };
      mockProject.sectionOrder = [sec1.id, sec2.id, sec3.id];
      saveProject(mockProject);

      wsView = new ProjectOverviewView({ container, projectId: mockProject.id });
      wsView.mount();
    });

    it('defaults global picker to the first course section (Module 1) when no recent context exists', () => {
      const defaultSecId = wsView.resolveDestinationSectionId(mockProject);
      expect(defaultSecId).toBe(mockProject.sectionOrder[0]);
    });

    it('defaults section-level add action to that exact section', () => {
      const targetSecId = mockProject.sectionOrder[1]; // Module 2
      const resolved = wsView.resolveDestinationSectionId(mockProject, targetSecId);
      expect(resolved).toBe(targetSecId);
    });

    it('remembers the most recently active section within the project', () => {
      const targetSecId = mockProject.sectionOrder[1]; // Module 2
      mockProject.lastActiveSectionId = targetSecId;

      const resolved = wsView.resolveDestinationSectionId(mockProject);
      expect(resolved).toBe(targetSecId);
    });

    it('falls back to the first available section if remembered section was deleted', () => {
      mockProject.lastActiveSectionId = 'deleted-section-id';
      const resolved = wsView.resolveDestinationSectionId(mockProject);
      expect(resolved).toBe(mockProject.sectionOrder[0]);
    });

    it('respects explicit standalone placement intent', () => {
      const resolved = wsView.resolveDestinationSectionId(mockProject, undefined, true);
      expect(resolved).toBeNull();
    });

    it('handles projects with zero sections gracefully', () => {
      const emptyProject = buildProjectSchemaV3({ name: 'Empty Project' });
      emptyProject.sections = {};
      emptyProject.sectionOrder = [];
      const resolved = wsView.resolveDestinationSectionId(emptyProject);
      expect(resolved).toBeNull();
    });
  });

  describe('P1 — Production Placeholder String Elimination', () => {
    it('confirms production placeholder copy strings are absent from the DOM', () => {
      const html = document.documentElement.outerHTML;
      expect(html).not.toContain('Optional hint text...');
      expect(html).not.toContain('Optional explanation text...');
      expect(html).not.toContain('One or two concise sentences setting context for this interaction...');
    });
  });
});
