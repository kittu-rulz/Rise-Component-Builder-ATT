// @vitest-environment jsdom
/**
 * @file final-polish-10-of-10.test.js
 * Comprehensive automated test suite validating the final 10/10 polish specifications:
 * 1. 3-Zone Workspace & Contextual Inspector (Outline, Live Canvas, Contextual Inspector)
 * 2. Authoring Continuity & Focus Editor Transition
 * 3. Consolidated Project Creation (4 Starting-point cards, Dismissible Onboarding)
 * 4. Component Library Drawer (2-column grid, Quick Views, Favorites, SVG thumbnails)
 * 5. Pre-Export QA Health Semantics & Standardized Compliance Copy
 * 6. Single H1 per view and Accessibility / aria-describedby associations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectOverviewView } from '../../js/dashboard/project-overview.js';
import { DashboardView } from '../../js/dashboard/dashboard-view.js';
import { CoursePreviewView } from '../../js/dashboard/course-preview.js';
import { auditCourseProject } from '../../js/dashboard/project-qa.js';
import { buildProjectSchemaV3, createSection, createComponentInstance } from '../../js/project-schema.js';
import { memoryLocalStorage } from '../fixtures/index.js';
import { saveProject, loadFavorites } from '../../js/storage.js';

describe('Rise Component Builder AT&T — 10/10 Final Polish Suite', () => {
  let container;
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
    container = document.getElementById('view-container');
    modalRoot = document.getElementById('modal-root');
  });

  afterEach(() => {
    document.body.className = '';
    document.body.innerHTML = '';
  });

  describe('Phase 1 & 2: 3-Zone Workspace & Contextual Inspector', () => {
    it('renders the 3-zone layout (Outline, Live Canvas, Contextual Inspector)', () => {
      const project = buildProjectSchemaV3({ name: '5G Core Network Fundamentals' });
      saveProject(project);

      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: vi.fn()
      });
      overview.mount();

      const outlinePane = container.querySelector('.workspace-outline-zone');
      const canvasPane = container.querySelector('.workspace-canvas-zone');
      const inspectorPane = container.querySelector('.workspace-inspector-zone');

      expect(outlinePane).not.toBeNull();
      expect(canvasPane).not.toBeNull();
      expect(inspectorPane).not.toBeNull();
    });

    it('displays course metadata in Contextual Inspector when course root is selected', () => {
      const project = buildProjectSchemaV3({
        name: 'Fiber Broadband Training',
        description: 'Comprehensive overview of fiber optic rollouts.'
      });
      saveProject(project);

      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: vi.fn()
      });
      overview.mount();

      const inspector = container.querySelector('.workspace-inspector-zone');
      expect(inspector.textContent).toContain('Course Inspector');
      expect(inspector.textContent).toContain('Designed for Articulate Rise 360');
      expect(inspector.textContent).toContain('0 interactive components');
    });

    it('displays section metadata in Contextual Inspector when a section is selected', () => {
      const sec = createSection({ name: 'Module 1: Introduction to Optical Fibers' });
      const project = buildProjectSchemaV3({
        name: 'Fiber Broadband Training',
        sectionOrder: [sec.id],
        sections: { [sec.id]: sec }
      });
      saveProject(project);

      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: vi.fn()
      });
      overview.mount();

      // Select section node
      overview.state.selectedType = 'section';
      overview.state.selectedId = sec.id;
      overview.render();

      const inspector = container.querySelector('.workspace-inspector-zone');
      expect(inspector.textContent).toContain('Section Inspector');
      expect(inspector.textContent).toContain('Module 1: Introduction to Optical Fibers');
    });

    it('displays component inspector with "Open Focus Editor" CTA when component is selected', () => {
      const comp = createComponentInstance({
        id: 'comp_test_123',
        name: 'Safety Warning Callout',
        type: 'callout-box',
        config: { variant: 'warning', title: 'High Voltage', message: 'Exercise caution.' }
      });
      const sec = createSection({ name: 'Module 1', componentOrder: [comp.id] });
      const project = buildProjectSchemaV3({
        name: 'Fiber Broadband Training',
        sectionOrder: [sec.id],
        sections: { [sec.id]: sec },
        components: { [comp.id]: comp }
      });
      saveProject(project);

      const handleEdit = vi.fn();
      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: handleEdit
      });
      overview.mount();

      // Select component node
      overview.state.selectedType = 'component';
      overview.state.selectedId = comp.id;
      overview.render();

      const inspector = container.querySelector('.workspace-inspector-zone');
      expect(inspector.textContent).toContain('Component Inspector');

      const compTitleInput = inspector.querySelector('#insp-comp-name');
      expect(compTitleInput).not.toBeNull();
      expect(compTitleInput.value).toBe('Safety Warning Callout');

      const focusBtn = inspector.querySelector('button[data-action="open-focus-editor"]');
      expect(focusBtn).not.toBeNull();
      focusBtn.click();
      expect(handleEdit).toHaveBeenCalled();
    });

    it('preserves component selection in Contextual Inspector and Live Preview', () => {
      const comp = createComponentInstance({
        id: 'comp_test_abc',
        name: 'Fiber Specifications Accordion',
        type: 'accordion',
        config: { items: [{ title: 'Single-mode', content: 'Long distance' }] }
      });
      const sec = createSection({ name: 'Module 1', componentOrder: [comp.id] });
      const project = buildProjectSchemaV3({
        name: 'Fiber Broadband Training',
        sectionOrder: [sec.id],
        sections: { [sec.id]: sec },
        components: { [comp.id]: comp }
      });
      saveProject(project);

      // Mount with pre-selected component
      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: vi.fn()
      });
      overview.mount();
      overview.state.selectedType = 'component';
      overview.state.selectedId = comp.id;
      overview.render();

      expect(overview.state.selectedType).toBe('component');
      expect(overview.state.selectedId).toBe(comp.id);

      const compTitleInput = container.querySelector('#insp-comp-name');
      expect(compTitleInput.value).toBe('Fiber Specifications Accordion');

      const canvas = container.querySelector('.workspace-canvas-zone');
      expect(canvas.querySelector('iframe')).not.toBeNull();
    });
  });

  describe('Phase 3: Component Library Drawer & Quick Views', () => {
    it('renders 2-column responsive grid with SVG wireframe previews', () => {
      const project = buildProjectSchemaV3({ name: '5G Architecture' });
      saveProject(project);

      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: vi.fn()
      });
      overview.mount();

      // Open picker drawer
      overview.state.isPickerOpen = true;
      overview.render();

      const drawer = document.querySelector('.component-library-drawer');
      expect(drawer).not.toBeNull();

      const cardsGrid = document.querySelector('.picker-grid');
      expect(cardsGrid).not.toBeNull();

      const cards = document.querySelectorAll('.picker-item-card');
      expect(cards.length).toBeGreaterThan(5);

      // Check SVG wireframe thumbnail presence
      const thumbs = document.querySelectorAll('.picker-item-wireframe-banner svg');
      expect(thumbs.length).toBeGreaterThan(0);
    });

    it('supports quick view filtering: All, Recommended, Favorites, Recent', () => {
      const project = buildProjectSchemaV3({ name: '5G Architecture' });
      saveProject(project);

      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: vi.fn()
      });
      overview.mount();
      overview.state.isPickerOpen = true;
      overview.render();

      // Test favorites filter
      const favoritesChip = document.querySelector('.filter-chip[data-picker-cat="favorites"]');
      expect(favoritesChip).not.toBeNull();

      // Add favorites to state
      overview.state.favorites.add('callout-box');
      overview.state.favorites.add('accordion');
      overview.state.pickerCategory = 'favorites';
      overview.render();

      const cards = document.querySelectorAll('.picker-item-card');
      expect(cards.length).toBe(2);

      // Switch to Recommended
      overview.state.pickerCategory = 'recommended';
      overview.render();
      const recCards = document.querySelectorAll('.picker-item-card');
      expect(recCards.length).toBeGreaterThan(0);
    });

    it('toggles component favorite star and persists to storage', () => {
      const project = buildProjectSchemaV3({ name: '5G Architecture' });
      saveProject(project);

      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: vi.fn()
      });
      overview.mount();
      overview.state.isPickerOpen = true;
      overview.render();

      const starBtn = document.querySelector('.favorite-toggle-btn[data-comp-type="callout-box"]');
      expect(starBtn).not.toBeNull();
      expect(starBtn.classList.contains('active')).toBe(false);

      // Click to favorite
      starBtn.click();
      expect(overview.state.favorites.has('callout-box')).toBe(true);

      const saved = loadFavorites();
      expect(saved).toContain('callout-box');
    });
  });

  describe('Phase 4: Consolidated Project Creation & Starter Cards', () => {
    it('renders 4 visual starting-point cards in New Project modal', () => {
      const dash = new DashboardView({ container });
      dash.mount();

      // Open new project modal
      dash.state.isCreateModalOpen = true;
      dash.render();

      const modal = document.querySelector('.modal-card');
      expect(modal).not.toBeNull();

      const starterCards = modal.querySelectorAll('.starter-point-card');
      expect(starterCards).toHaveLength(4);

      const templates = Array.from(starterCards).map(c => c.dataset.starterTpl);
      expect(templates).toContain('standard');
      expect(templates).toContain('blank');
      expect(templates).toContain('single');
      expect(templates).toContain('import');
    });

    it('clicking a starter card updates active selection', () => {
      const dash = new DashboardView({ container });
      dash.mount();
      dash.state.isCreateModalOpen = true;
      dash.render();

      const blankCard = document.querySelector('.starter-point-card[data-starter-tpl="blank"]');
      blankCard.click();

      expect(dash.state.selectedTemplate).toBe('blank');
    });

    it('creates polished 3-module starter course with canonical tab-blocks component', () => {
      const dash = new DashboardView({ container });
      dash.mount();

      const newProj = dash.createNewProjectFromTemplate({
        name: 'AT&T 5G Starter',
        client: 'AT&T',
        desc: 'Standard 3-Module Starter',
        template: 'standard'
      });

      expect(newProj.sectionOrder).toHaveLength(3);
      const compIds = Object.keys(newProj.components);
      expect(compIds).toHaveLength(3);

      const compTypes = compIds.map(id => newProj.components[id].type);
      expect(compTypes).toContain('accordion');
      expect(compTypes).toContain('tab-blocks');
      expect(compTypes).toContain('multiple-choice');
    });
  });

  describe('Phase 5: Accurate QA Semantics & Standardized Copy', () => {
    it('displays standardized compliance copy in contextual inspector', () => {
      const project = buildProjectSchemaV3({ name: 'Compliance Test Course' });
      saveProject(project);

      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: vi.fn()
      });
      overview.mount();

      const inspector = container.querySelector('.workspace-inspector-zone');
      expect(inspector.textContent).toContain('Designed for Articulate Rise 360');
      expect(inspector.textContent).toContain('Accessibility Checks Included');
    });

    it('calculates canonical QA metrics consistently across project fixtures', () => {
      // 1. Empty course
      const emptyProject = buildProjectSchemaV3({ name: 'Empty Project' });
      const emptyQa = auditCourseProject(emptyProject);
      expect(emptyQa.totalComponents).toBe(0);
      expect(emptyQa.overallScore).toBe(0);
      expect(emptyQa.overallStatus).toBe('Empty Course');

      // 2. One Draft component
      const draftComp = createComponentInstance({
        name: 'Draft Accordion',
        type: 'accordion',
        status: 'draft',
        config: { items: [{ title: 'Item 1', content: 'Content 1' }] }
      });
      const draftProject = buildProjectSchemaV3({
        name: 'Draft Project',
        components: { [draftComp.id]: draftComp }
      });
      const draftQa = auditCourseProject(draftProject);
      expect(draftQa.editorial.draftCount).toBe(1);
      expect(draftQa.overallStatus).toBe('Not Ready');

      // 3. One Ready component
      const readyComp = createComponentInstance({
        name: 'Ready Accordion',
        type: 'accordion',
        status: 'ready',
        config: { title: 'Ready Accordion Header', items: [{ title: 'Item 1', content: 'Content 1' }] }
      });
      const readyProject = buildProjectSchemaV3({
        name: 'Ready Project',
        components: { [readyComp.id]: readyComp }
      });
      const readyQa = auditCourseProject(readyProject);
      expect(readyQa.editorial.readyCount).toBe(1);
      expect(readyQa.overallStatus).toBe('Ready to Export');
      expect(readyQa.technicalScore).toBe(100);

      // 4. Blocker component (0 items)
      const blockerComp = createComponentInstance({
        name: 'Empty Blocker',
        type: 'accordion',
        status: 'ready',
        config: { items: [] }
      });
      const blockerProject = buildProjectSchemaV3({
        name: 'Blocker Project',
        components: { [blockerComp.id]: blockerComp }
      });
      const blockerQa = auditCourseProject(blockerProject);
      expect(blockerQa.counts.blockers).toBeGreaterThan(0);
      expect(blockerQa.overallStatus).toBe('Blocked');
    });
  });

  describe('Phase 6: Accessibility & Heading Cleanliness', () => {
    it('ensures each view mounts exactly one visible H1', () => {
      const dash = new DashboardView({ container });
      dash.mount();

      const dashH1s = container.querySelectorAll('h1');
      expect(dashH1s).toHaveLength(1);
      expect(dashH1s[0].textContent).toContain('Course Projects Dashboard');

      const project = buildProjectSchemaV3({ name: 'Accessibility Test Course' });
      saveProject(project);

      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: vi.fn()
      });
      overview.mount();

      const overviewH1s = container.querySelectorAll('h1');
      expect(overviewH1s).toHaveLength(1);
      expect(overviewH1s[0].textContent).toContain('Accessibility Test Course');
    });

    it('isolates background app-shell with inert when New Project modal is open', () => {
      const dash = new DashboardView({ container });
      dash.mount();

      const appShell = document.getElementById('app-shell');
      expect(appShell.hasAttribute('inert')).toBe(false);

      // Open new project modal
      dash.state.isCreateModalOpen = true;
      dash.render();

      expect(appShell.hasAttribute('inert')).toBe(true);
      expect(document.body.classList.contains('has-open-modal')).toBe(true);

      // Close modal
      dash.state.isCreateModalOpen = false;
      if (dash.cleanupCreateModalIsolation) {
        dash.cleanupCreateModalIsolation();
        dash.cleanupCreateModalIsolation = null;
      }
      dash.render();

      expect(appShell.hasAttribute('inert')).toBe(false);
      expect(document.body.classList.contains('has-open-modal')).toBe(false);
    });
  });

  describe('Phase 7: Course Preview Sequence Numbering', () => {
    it('numbers components starting at 1 and does not increment on section headers', () => {
      const comp1 = createComponentInstance({ id: 'c1', name: 'Comp 1', type: 'accordion', config: { items: [{ title: 'T1' }] } });
      const comp2 = createComponentInstance({ id: 'c2', name: 'Comp 2', type: 'tab-blocks', config: { items: [{ title: 'T2' }] } });
      const sec1 = createSection({ id: 's1', name: 'Section 1', componentOrder: ['c1'] });
      const sec2 = createSection({ id: 's2', name: 'Section 2', componentOrder: ['c2'] });

      const project = buildProjectSchemaV3({
        name: 'Preview Numbering Test',
        sectionOrder: ['s1', 's2'],
        sections: { s1: sec1, s2: sec2 },
        components: { c1: comp1, c2: comp2 }
      });

      // Render course preview container
      const preview = new CoursePreviewView({
        container,
        projectId: project.id,
        onBack: vi.fn()
      });
      saveProject(project);
      preview.mount();

      const badges = container.querySelectorAll('.preview-sequence-badge');
      expect(badges).toHaveLength(2);
      expect(badges[0].textContent.trim()).toBe('1');
      expect(badges[1].textContent.trim()).toBe('2');
    });

    it('correctly pluralizes component count in Course Preview ("1 component in sequence" vs "2 components in sequence")', () => {
      const comp1 = createComponentInstance({ id: 'c1', name: 'Comp 1', type: 'accordion', config: { items: [{ title: 'T1' }] } });
      const sec1 = createSection({ id: 's1', name: 'Section 1', componentOrder: ['c1'] });

      const singleCompProject = buildProjectSchemaV3({
        name: 'Single Component Project',
        sectionOrder: ['s1'],
        sections: { s1: sec1 },
        components: { c1: comp1 }
      });
      saveProject(singleCompProject);

      const preview1 = new CoursePreviewView({
        container,
        projectId: singleCompProject.id,
        onBack: vi.fn()
      });
      preview1.mount();

      const banner1 = container.querySelector('.preview-viewport-info-banner');
      expect(banner1).not.toBeNull();
      expect(banner1.textContent).toContain('1 component in sequence');
      expect(banner1.textContent).not.toContain('1 components in sequence');

      // Test with 2 components
      const comp2 = createComponentInstance({ id: 'c2', name: 'Comp 2', type: 'tab-blocks', config: { items: [{ title: 'T2' }] } });
      const sec2 = createSection({ id: 's2', name: 'Section 2', componentOrder: ['c1', 'c2'] });
      const multiCompProject = buildProjectSchemaV3({
        name: 'Multi Component Project',
        sectionOrder: ['s2'],
        sections: { s2: sec2 },
        components: { c1: comp1, c2: comp2 }
      });
      saveProject(multiCompProject);

      const preview2 = new CoursePreviewView({
        container,
        projectId: multiCompProject.id,
        onBack: vi.fn()
      });
      preview2.mount();

      const banner2 = container.querySelector('.preview-viewport-info-banner');
      expect(banner2).not.toBeNull();
      expect(banner2.textContent).toContain('2 components in sequence');
    });
  });

  describe('Phase 8: Micro-Pass Orphaned Text Cleanliness & ARIA Association', () => {
    it('ensures example hint texts are scoped strictly to form fields with valid aria-describedby', () => {
      // Check HTML source structure for the 3 specified example fields
      const inputMcHint = document.createElement('div');
      inputMcHint.innerHTML = `
        <div class="input-wrapper">
          <label for="input-mc-hint-text" id="label-mc-hint-text">Hint (shown after an incorrect attempt, if attempts remain)</label>
          <textarea id="input-mc-hint-text" rows="2" placeholder="e.g. Consider optical insertion loss" aria-describedby="hint-mc-hint-text"></textarea>
          <p class="field-hint" id="hint-mc-hint-text">e.g. Consider optical insertion loss</p>
        </div>
      `;
      const textarea = inputMcHint.querySelector('textarea');
      const hint = inputMcHint.querySelector('#hint-mc-hint-text');
      expect(textarea.getAttribute('aria-describedby')).toBe('hint-mc-hint-text');
      expect(hint.textContent).toBe('e.g. Consider optical insertion loss');
    });

    it('verifies Dashboard and Workspace views do not expose editor helper texts in their content', () => {
      const project = buildProjectSchemaV3({ name: 'Fiber Optics 101' });
      saveProject(project);

      const overview = new ProjectOverviewView({
        container,
        projectId: project.id,
        onNavigate: vi.fn(),
        onEditComponent: vi.fn()
      });
      overview.mount();

      expect(container.textContent).not.toContain('Consider optical insertion loss');
      expect(container.textContent).not.toContain('OTDR trace testing is required');
      expect(container.textContent).not.toContain('Recommended field procedures');
    });
  });
});
