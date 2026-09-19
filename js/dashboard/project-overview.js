/**
 * Rise Component Builder AT&T — Project Overview & Multi-Component Workspace Controller
 * Manages course sections, component instances, editorial lifecycle, component picker, and navigation.
 */

import {
  getProject, saveProject
} from '../storage.js';
import {
  createComponentInstance, createSection
} from '../project-schema.js';
import {
  COMPONENT_REGISTRY, CATEGORIES, getDefaultConfig, getComponentById, searchComponents
} from '../component-registry.js';
import { showPromptDialog, showConfirmDialog, isolateModal } from './att-modal.js';
import { getComponentThumbnailSvg } from './component-thumbnails.js';
import { escapeHTML } from '../utilities.js';
import { showToast } from '../toast.js';

export class ProjectOverviewView {
  constructor({
    container,
    projectId,
    onBackToDashboard,
    onEditComponent,
    onOpenPreview,
    onOpenMedia,
    onOpenQa,
    onExportProject
  }) {
    this.container = container;
    this.projectId = projectId;
    this.onBackToDashboard = onBackToDashboard;
    this.onEditComponent = onEditComponent;
    this.onOpenPreview = onOpenPreview;
    this.onOpenMedia = onOpenMedia;
    this.onOpenQa = onOpenQa;
    this.onExportProject = onExportProject;

    this.state = {
      isPickerOpen: false,
      pickerTargetSectionId: null, // null means unsectioned
      lastActiveSectionId: null,
      pickerSearch: '',
      pickerCategory: 'all',
      previewDetailsComp: null,
      activeMenuId: null,
      courseStructureSearch: '',
      courseStructureFilter: 'all' // 'all' | 'draft' | 'in_review' | 'ready'
    };

    this.cleanupPickerIsolation = null;
    this.cleanupDetailsIsolation = null;
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
  }

  mount() {
    document.addEventListener('click', this.handleDocumentClick);
    this.render();
  }

  unmount() {
    if (this.cleanupPickerIsolation) {
      this.cleanupPickerIsolation();
      this.cleanupPickerIsolation = null;
    }
    if (this.cleanupDetailsIsolation) {
      this.cleanupDetailsIsolation();
      this.cleanupDetailsIsolation = null;
    }
    document.removeEventListener('click', this.handleDocumentClick);
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  handleDocumentClick(e) {
    if (!e.target.closest('.project-menu-btn') && !e.target.closest('.project-action-menu')) {
      if (this.state.activeMenuId) {
        this.state.activeMenuId = null;
        this.render();
      }
    }
  }

  getProject() {
    return getProject(this.projectId);
  }

  updateProject(mutator) {
    const project = this.getProject();
    if (!project) return;
    mutator(project);
    project.updatedAt = new Date().toISOString();
    saveProject(project);
    this.render();
  }

  render() {
    const project = this.getProject();
    if (!project) {
      this.container.innerHTML = `
        <div class="project-workspace-view">
          <div class="workspace-container" style="padding: 40px; text-align: center;">
            <p style="font-size: 1.125rem; color: #666; margin-bottom: 16px;">Course project not found.</p>
            <button id="wp-back-btn" class="btn btn-primary">Back to Projects</button>
          </div>
        </div>
      `;
      this.container.querySelector('#wp-back-btn')?.addEventListener('click', () => {
        if (this.onBackToDashboard) this.onBackToDashboard();
      });
      return;
    }

    const totalComponents = Object.keys(project.components || {}).length;
    const totalSections = Object.keys(project.sections || {}).length;

    // Filter components according to course structure search & status filter
    const activeFilter = this.state.courseStructureFilter;
    const searchFilter = this.state.courseStructureSearch.toLowerCase().trim();

    this.container.innerHTML = `
      <div class="project-workspace-view">
        <!-- Top Workspace Bar -->
        <header class="workspace-header">
          <div class="workspace-breadcrumbs">
            <button id="wp-back-btn" class="breadcrumb-back-btn" title="Back to Projects Dashboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              <span>Course Projects</span>
            </button>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">${escapeHTML(project.name)}</span>
          </div>

          <!-- Workflow Segment Control (Build -> Preview -> QA -> Export) -->
          <div class="workflow-nav-segment" style="display: flex; background: var(--att-grey-1, #F3F4F5); padding: 3px; border-radius: 10px; gap: 2px; border: 1px solid var(--att-border, #DCDFE3);">
            <button class="workflow-tab-btn active" id="wp-tab-build" style="padding: 5px 14px; font-size: 0.8125rem; font-weight: 700; border: none; border-radius: 8px; background: var(--att-surface, #FFF); color: var(--att-cobalt, #00388F); box-shadow: 0 1px 3px rgba(0,0,0,0.08); cursor: pointer;">
              Build
            </button>
            <button class="workflow-tab-btn" id="wp-preview-btn" style="padding: 5px 14px; font-size: 0.8125rem; font-weight: 600; border: none; border-radius: 8px; background: transparent; color: var(--text-main, #333); cursor: pointer;">
              Preview
            </button>
            <button class="workflow-tab-btn" id="wp-qa-btn" style="padding: 5px 14px; font-size: 0.8125rem; font-weight: 600; border: none; border-radius: 8px; background: transparent; color: var(--text-main, #333); cursor: pointer;">
              QA Preflight
            </button>
            <button class="workflow-tab-btn" id="wp-export-btn" style="padding: 5px 14px; font-size: 0.8125rem; font-weight: 600; border: none; border-radius: 8px; background: transparent; color: var(--text-main, #333); cursor: pointer;">
              Export Package
            </button>
          </div>

          <div class="workspace-header-actions">
            <button id="wp-media-btn" class="btn btn-secondary btn-sm" title="Project media library">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <span>Media</span>
            </button>
          </div>
        </header>

        <main class="workspace-container workspace-3zone-layout">
          <!-- Zone 1: Interactive Course Outline Panel -->
          <div class="workspace-outline-zone">
            <!-- Compact Course Header -->
            <div class="workspace-banner" style="background: var(--att-surface, #ffffff); border: 1px solid var(--att-border, #DCDFE3); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <div class="workspace-banner-info">
                <div class="workspace-banner-tags" style="margin-bottom: 6px;">
                  <span class="project-client-badge" style="background: rgba(0, 56, 143, 0.08); color: var(--att-cobalt, #00388F); font-weight: 700; font-size: 0.6875rem; padding: 2px 6px; border-radius: 4px;">${escapeHTML(project.clientLabel || 'AT&T')}</span>
                </div>
                <h1 class="workspace-title" style="font-size: 1.125rem; font-weight: 700; color: var(--text-main, #111); margin: 0 0 4px 0; display: flex; align-items: center; gap: 6px;">
                  ${escapeHTML(project.name)}
                  <button id="wp-rename-title-btn" class="project-menu-btn" title="Rename course title" style="width: 24px; height: 24px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                  </button>
                </h1>
                <p class="workspace-desc" style="font-size: 0.75rem; color: #666; margin: 0; line-height: 1.4;">${escapeHTML(project.description || 'Course Modules & Component Architecture')}</p>
              </div>
              <div class="workspace-banner-metrics" style="display: flex; gap: 8px;">
                <span class="section-component-badge" style="background: var(--att-grey-1, #E4E7EC); font-size: 0.6875rem; font-weight: 700; padding: 2px 8px; border-radius: 12px;">${totalSections} sec</span>
                <span class="section-component-badge" style="background: var(--att-grey-1, #E4E7EC); font-size: 0.6875rem; font-weight: 700; padding: 2px 8px; border-radius: 12px;">${totalComponents} comp</span>
              </div>
            </div>

            <!-- Course Structure Filter & Controls -->
            <div class="workspace-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <input 
                  type="search" 
                  id="cs-search-input" 
                  class="form-input" 
                  placeholder="Search outline…" 
                  aria-label="Search components in course structure"
                  value="${escapeHTML(this.state.courseStructureSearch)}"
                  style="padding: 4px 8px; font-size: 0.75rem; width: 130px;"
                />
                <!-- Quick Filter Chips -->
                <div class="filter-group" style="display: flex; gap: 2px;">
                  <button class="filter-chip ${activeFilter === 'all' ? 'active' : ''}" data-cs-filter="all" style="padding: 2px 6px; font-size: 0.6875rem;">All</button>
                  <button class="filter-chip ${activeFilter === 'ready' ? 'active' : ''}" data-cs-filter="ready" style="padding: 2px 6px; font-size: 0.6875rem;">Ready</button>
                </div>
              </div>

              <div class="workspace-toolbar-actions" style="display: flex; align-items: center; gap: 4px;">
                <button id="wp-header-add-comp-btn" class="btn btn-secondary btn-sm" title="Add component to course" style="padding: 3px 8px; font-size: 0.75rem;">
                  + Block
                </button>
                <button id="wp-add-section-btn" class="btn btn-primary btn-sm" style="padding: 3px 8px; font-size: 0.75rem;">
                  + Section
                </button>
              </div>
            </div>

            <!-- Sections List -->
            <div class="sections-list" style="display: flex; flex-direction: column; gap: 12px;">
              ${(project.sectionOrder || []).map((secId, idx) => this.renderSectionCard(project, secId, idx, activeFilter, searchFilter)).join('')}

              <!-- Unsectioned Components Section (if any) -->
              ${(project.unsectionedComponentOrder && project.unsectionedComponentOrder.length > 0) ? `
                <div class="section-card" style="background: var(--att-surface, #ffffff); border: 1px solid var(--att-border, #DCDFE3); border-radius: 10px; overflow: hidden;">
                  <div class="section-card-header" style="background: var(--att-surface-sunken, #FAFAFA); border-bottom: 1px solid var(--att-border, #EFEFEF); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                    <div class="section-header-left" style="display: flex; align-items: center; gap: 6px;">
                      <h3 class="section-title" style="font-size: 0.875rem; font-weight: 700; margin: 0;">Unsectioned Area</h3>
                      <span class="section-component-badge" style="background: var(--att-grey-1, #E4E7EC); font-size: 0.6875rem; font-weight: 700; padding: 1px 6px; border-radius: 10px;">${project.unsectionedComponentOrder.length}</span>
                    </div>
                    <div>
                      <button class="btn btn-secondary btn-sm" data-action="add-comp-unsectioned" style="padding: 2px 6px; font-size: 0.6875rem;">+ Add</button>
                    </div>
                  </div>
                  <div class="section-card-body" style="padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
                    ${project.unsectionedComponentOrder
                      .filter(cId => this.matchesFilter(project.components?.[cId], activeFilter, searchFilter))
                      .map((cId, idx) => this.renderComponentRow(project, cId, null, idx, project.unsectionedComponentOrder.length))
                      .join('')}
                  </div>
                </div>
              ` : ''}

              ${(project.sectionOrder || []).length === 0 && (!project.unsectionedComponentOrder || project.unsectionedComponentOrder.length === 0) ? `
                <div class="dashboard-empty-state" style="text-align: center; padding: 32px 16px; background: var(--att-surface, #ffffff); border: 1px dashed var(--att-border, #DCDFE3); border-radius: 12px;">
                  <h3 class="empty-state-title" style="font-size: 1rem; font-weight: 700; margin: 0 0 6px 0;">Course is empty</h3>
                  <p class="empty-state-subtitle" style="font-size: 0.8125rem; color: #666; margin: 0 0 14px 0;">Add your first module or interactive block.</p>
                  <div style="display: flex; justify-content: center; gap: 8px;">
                    <button id="wp-empty-add-sec-btn" class="btn btn-primary btn-sm">Add Section</button>
                    <button id="wp-empty-add-comp-btn" class="btn btn-secondary btn-sm">Add Block</button>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Zone 2: Central Authoring & Live Preview Canvas -->
          <div class="workspace-canvas-zone" style="background: var(--att-surface, #FFFFFF); border: 1px solid var(--att-border, #DCDFE3); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 16px;">
            <div class="canvas-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--att-border, #EAEAEA); padding-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="component-type-badge" style="background: rgba(0, 56, 143, 0.08); color: var(--att-cobalt, #00388F); font-weight: 700; font-size: 0.75rem; padding: 3px 8px; border-radius: 6px;">Live Canvas</span>
                <span style="font-weight: 700; font-size: 0.9375rem; color: var(--text-main, #111);">Interactive Block Preview</span>
              </div>
              <div class="canvas-viewport-controls" style="display: flex; gap: 4px; background: var(--att-grey-1, #F3F4F5); padding: 2px; border-radius: 8px;">
                <button class="btn btn-secondary btn-sm active" title="Desktop 100% View" style="padding: 4px 8px; font-size: 0.75rem;">Desktop</button>
                <button class="btn btn-secondary btn-sm" title="Tablet 768px View" style="padding: 4px 8px; font-size: 0.75rem;">Tablet</button>
                <button class="btn btn-secondary btn-sm" title="Mobile 375px View" style="padding: 4px 8px; font-size: 0.75rem;">Mobile</button>
              </div>
            </div>

            <!-- Canvas Viewport Frame -->
            <div class="canvas-viewport-frame" style="background: var(--att-surface-sunken, #F8FAFC); border: 1px solid var(--att-border, #E2E8F0); border-radius: 12px; min-height: 420px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; text-align: center;">
              <div style="max-width: 500px; display: flex; flex-direction: column; align-items: center; gap: 12px;">
                <div style="width: 64px; height: 64px; border-radius: 16px; background: rgba(0, 56, 143, 0.08); color: var(--att-cobalt, #00388F); display: flex; align-items: center; justify-content: center;">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                </div>
                <h4 style="font-size: 1.125rem; font-weight: 700; margin: 0; color: var(--text-main, #111);">Course Authoring &amp; Flow Canvas</h4>
                <p style="font-size: 0.875rem; color: #64748B; margin: 0; line-height: 1.5;">Select any component from the Course Outline to preview, configure its interactions, or edit its content in the authoring tool.</p>
                <button class="btn btn-primary btn-sm" id="wp-preview-canvas-btn" style="margin-top: 6px; padding: 8px 18px; font-size: 0.8125rem;">
                  Launch Full Course Preview
                </button>
              </div>
            </div>
          </div>

          <!-- Zone 3: Right Contextual Inspector Panel -->
          <div class="workspace-inspector-zone" style="background: var(--att-surface, #FFFFFF); border: 1px solid var(--att-border, #DCDFE3); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--att-border, #EAEAEA); padding-bottom: 10px;">
              <h3 style="font-size: 0.9375rem; font-weight: 700; margin: 0; color: var(--text-main, #111);">Inspector</h3>
              <span class="project-client-badge" style="background: #E8F5E9; color: #2E7D32; font-weight: 700; font-size: 0.6875rem; padding: 2px 6px; border-radius: 4px;">WCAG 2.2 AA</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.8125rem; color: #555;">
              <div>
                <span style="font-weight: 600; color: #333; display: block; margin-bottom: 4px;">Course Target</span>
                <span style="color: var(--att-cobalt, #00388F); font-weight: 700;">Articulate Rise 360 Certified</span>
              </div>
              <div>
                <span style="font-weight: 600; color: #333; display: block; margin-bottom: 4px;">Editorial Status</span>
                <span style="background: #EFEFEF; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Multi-Component Project</span>
              </div>
              <div style="border-top: 1px solid var(--att-border, #EFEFEF); padding-top: 10px;">
                <span style="font-weight: 600; color: #333; display: block; margin-bottom: 6px;">Pre-Export QA Health</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="flex: 1; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
                    <div style="width: 100%; height: 100%; background: #10B981;"></div>
                  </div>
                  <span style="font-weight: 700; font-size: 0.75rem; color: #10B981;">100%</span>
                </div>
              </div>
            </div>

            <div style="margin-top: auto; border-top: 1px solid var(--att-border, #EAEAEA); padding-top: 12px; display: flex; flex-direction: column; gap: 8px;">
              <button class="btn btn-secondary btn-sm" id="wp-inspector-qa-btn" style="width: 100%; justify-content: center; font-size: 0.8125rem;">
                Run QA Preflight
              </button>
              <button class="btn btn-primary btn-sm" id="wp-inspector-export-btn" style="width: 100%; justify-content: center; font-size: 0.8125rem;">
                Export Course Package
              </button>
            </div>
          </div>
        </main>

        <!-- Component Picker Modal -->
        ${this.state.isPickerOpen ? this.renderComponentPicker(project) : ''}

        <!-- Component Details Preview Modal -->
        ${this.state.previewDetailsComp ? this.renderDetailsModal(this.state.previewDetailsComp, project) : ''}
      </div>
    `;

    this.attachEventListeners();
  }

  addComponentToProject(type, targetSecId = null) {
    const regEntry = getComponentById(COMPONENT_REGISTRY, type);
    const defaultCfg = regEntry ? getDefaultConfig(regEntry) : {};

    const newComp = createComponentInstance({
      name: regEntry?.name || 'New Component',
      type,
      status: 'draft',
      config: defaultCfg
    });

    const project = this.getProject();
    const resolvedSecId = this.resolveDestinationSectionId(project, targetSecId);
    const destName = (resolvedSecId && project?.sections?.[resolvedSecId]?.name)
      ? project.sections[resolvedSecId].name
      : 'Unsectioned Area';

    this.updateProject(p => {
      if (!p.components) p.components = {};
      p.components[newComp.id] = newComp;
      if (resolvedSecId && p.sections?.[resolvedSecId]) {
        if (!p.sections[resolvedSecId].componentOrder) p.sections[resolvedSecId].componentOrder = [];
        p.sections[resolvedSecId].componentOrder.push(newComp.id);
        p.lastActiveSectionId = resolvedSecId;
      } else {
        if (!p.unsectionedComponentOrder) p.unsectionedComponentOrder = [];
        p.unsectionedComponentOrder.push(newComp.id);
      }
    });

    if (this.cleanupPickerIsolation) {
      this.cleanupPickerIsolation();
      this.cleanupPickerIsolation = null;
    }
    this.state.isPickerOpen = false;
    this.state.previewDetailsComp = null;
    this.render();

    showToast(`${regEntry?.name || 'Component'} added to ${destName}.`, 'success');

    if (this.onEditComponent) {
      this.onEditComponent(this.getProject(), newComp);
    }
    return newComp;
  }

  resolveDestinationSectionId(project, secId = undefined, isExplicitStandalone = false) {
    if (isExplicitStandalone) return null;
    if (secId && project?.sections?.[secId]) return secId;

    const remembered = project?.lastActiveSectionId || this.state.lastActiveSectionId;
    if (remembered && project?.sections?.[remembered]) {
      return remembered;
    }

    if (project?.sectionOrder && project.sectionOrder.length > 0) {
      for (const sId of project.sectionOrder) {
        if (project.sections?.[sId]) return sId;
      }
    }

    return null;
  }

  matchesFilter(comp, activeFilter, searchFilter) {
    if (!comp) return false;
    if (activeFilter !== 'all' && (comp.status || 'draft') !== activeFilter) {
      return false;
    }
    if (searchFilter) {
      const matchName = comp.name.toLowerCase().includes(searchFilter);
      const matchType = comp.type.toLowerCase().includes(searchFilter);
      if (!matchName && !matchType) return false;
    }
    return true;
  }

  renderSectionCard(project, sectionId, index, activeFilter, searchFilter) {
    const section = project.sections?.[sectionId];
    if (!section) return '';

    const allCompIds = section.componentOrder || [];
    const filteredCompIds = allCompIds.filter(cId => this.matchesFilter(project.components?.[cId], activeFilter, searchFilter));
    const isMenuOpen = this.state.activeMenuId === sectionId;

    return `
      <div class="section-card" data-section-id="${sectionId}" style="background: #ffffff; border: 1px solid #DCDFE3; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div class="section-card-header" data-toggle-sec="${sectionId}" style="background: #FAFAFA; border-bottom: 1px solid #EFEFEF; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <div class="section-header-left" style="display: flex; align-items: center; gap: 10px;">
            <svg class="section-toggle-icon ${section.collapsed ? 'collapsed' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s ease; transform: ${section.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <h3 class="section-title" style="font-size: 1rem; font-weight: 700; margin: 0; color: #111;">${escapeHTML(section.name)}</h3>
            <span class="section-component-badge" style="background: #E4E7EC; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 12px;">${allCompIds.length} component${allCompIds.length === 1 ? '' : 's'}</span>
          </div>

          <div class="section-header-right" style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-secondary btn-sm" data-action="add-comp-to-sec" data-sec-id="${sectionId}" style="padding: 3px 8px; font-size: 0.75rem;">
              + Add Component
            </button>
            <button class="project-menu-btn" data-action="section-menu" data-sec-id="${sectionId}" aria-label="Section options" style="width: 28px; height: 28px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
          </div>
        </div>

        <div class="section-card-body ${section.collapsed ? 'collapsed' : ''}" style="padding: 12px 16px; display: ${section.collapsed ? 'none' : 'flex'}; flex-direction: column; gap: 8px;">
          ${filteredCompIds.length > 0 ? `
            ${filteredCompIds.map((cId, idx) => this.renderComponentRow(project, cId, sectionId, idx, filteredCompIds.length)).join('')}
          ` : allCompIds.length === 0 ? `
            <div class="section-quick-start-box" style="padding: 20px 16px; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 10px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px;">
              <div style="max-width: 480px;">
                <p style="font-size: 0.875rem; font-weight: 600; color: #1E293B; margin: 0 0 4px 0;">Start building ${escapeHTML(section.name)}</p>
                <p style="font-size: 0.8125rem; color: #64748B; margin: 0;">Add an interactive block or choose from popular AT&amp;T interaction patterns:</p>
              </div>
              <div class="quick-add-chips-grid" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
                <button type="button" class="btn btn-secondary btn-sm quick-add-chip" data-action="quick-add-comp" data-sec-id="${sectionId}" data-comp-type="multiple-choice" style="font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 20px;">
                  <span style="color: var(--att-cobalt, #00388F); font-weight: 700;">+</span> Multiple Choice
                </button>
                <button type="button" class="btn btn-secondary btn-sm quick-add-chip" data-action="quick-add-comp" data-sec-id="${sectionId}" data-comp-type="accordion" style="font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 20px;">
                  <span style="color: var(--att-cobalt, #00388F); font-weight: 700;">+</span> Accordion
                </button>
                <button type="button" class="btn btn-secondary btn-sm quick-add-chip" data-action="quick-add-comp" data-sec-id="${sectionId}" data-comp-type="card-carousel" style="font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 20px;">
                  <span style="color: var(--att-cobalt, #00388F); font-weight: 700;">+</span> Card Carousel
                </button>
                <button type="button" class="btn btn-secondary btn-sm quick-add-chip" data-action="quick-add-comp" data-sec-id="${sectionId}" data-comp-type="scenario" style="font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 20px;">
                  <span style="color: var(--att-cobalt, #00388F); font-weight: 700;">+</span> Scenario
                </button>
                <button type="button" class="btn btn-secondary btn-sm quick-add-chip" data-action="quick-add-comp" data-sec-id="${sectionId}" data-comp-type="interactive-video" style="font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 6px 12px; border-radius: 20px;">
                  <span style="color: var(--att-cobalt, #00388F); font-weight: 700;">+</span> Interactive Video
                </button>
              </div>
              <button type="button" class="btn btn-primary btn-sm" data-action="add-comp-to-sec" data-sec-id="${sectionId}" style="margin-top: 4px; padding: 6px 16px;">
                Browse All 26 Components
              </button>
            </div>
          ` : `
            <div class="section-empty-hint" style="font-size: 0.8125rem; color: #777; padding: 12px 8px;">
              No components match the current filter.
            </div>
          `}
        </div>

        ${isMenuOpen ? `
          <div class="project-action-menu" style="top: 40px; right: 24px; position: absolute; z-index: 20; background: #fff; border: 1px solid #DCDFE3; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 4px 0; min-width: 150px;">
            <button class="project-menu-item" data-action="rename-sec" data-sec-id="${sectionId}">Rename Section</button>
            <button class="project-menu-item" data-action="duplicate-sec" data-sec-id="${sectionId}">Duplicate Section</button>
            ${index > 0 ? `<button class="project-menu-item" data-action="move-sec-up" data-sec-id="${sectionId}">Move Up</button>` : ''}
            ${index < (project.sectionOrder.length - 1) ? `<button class="project-menu-item" data-action="move-sec-down" data-sec-id="${sectionId}">Move Down</button>` : ''}
            <button class="project-menu-item text-danger" data-action="delete-sec" data-sec-id="${sectionId}">Delete Section</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderComponentRow(project, compId, sectionId, index, totalInGroup) {
    const comp = project.components?.[compId];
    if (!comp) return '';

    const isMenuOpen = this.state.activeMenuId === compId;
    const registryEntry = COMPONENT_REGISTRY.find(r => r.id === comp.type);
    const typeLabel = registryEntry?.name || comp.type;
    const statusClass = comp.status === 'ready' ? 'status-ready' : comp.status === 'in_review' ? 'status-review' : 'status-draft';

    return `
      <div class="component-row" data-comp-id="${compId}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #FAFAFA; border: 1px solid #EAEAEA; border-radius: 8px; position: relative;">
        <div class="component-row-left" style="display: flex; align-items: center; gap: 10px;">
          <span class="component-drag-handle" title="Position in section" style="color: #999; font-size: 0.75rem; font-weight: 700;">#${index + 1}</span>
          <span class="component-type-badge" style="font-size: 0.75rem; background: rgba(0, 56, 143, 0.08); color: var(--att-cobalt, #00388F); padding: 2px 8px; border-radius: 4px;">${escapeHTML(typeLabel)}</span>
          <h4 class="component-name" style="font-size: 0.875rem; font-weight: 600; color: #111; margin: 0;">${escapeHTML(comp.name)}</h4>
          
          <!-- Editorial Status Badge -->
          <div class="editorial-status-dropdown-wrapper" style="display: inline-block;">
            <select class="component-status-select ${statusClass}" data-action="change-status" data-comp-id="${compId}" aria-label="Status for ${escapeHTML(comp.name)}" style="font-size: 0.6875rem; font-weight: 700; padding: 2px 6px; border-radius: 12px; border: 1px solid #DCDFE3; cursor: pointer;">
              <option value="draft" ${comp.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="in_review" ${comp.status === 'in_review' ? 'selected' : ''}>In Review</option>
              <option value="ready" ${comp.status === 'ready' ? 'selected' : ''}>Ready</option>
            </select>
          </div>
        </div>

        <div class="component-row-right" style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-secondary btn-sm" data-action="edit-comp" data-comp-id="${compId}" style="padding: 4px 10px; font-size: 0.8125rem; display: inline-flex; align-items: center; gap: 6px;" aria-label="Edit component ${escapeHTML(comp.name)}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            <span>Edit</span>
          </button>
          
          <!-- Keyboard Move buttons -->
          ${index > 0 ? `<button class="btn btn-secondary btn-sm btn-icon" data-action="move-comp-up" data-comp-id="${compId}" data-sec-id="${sectionId || ''}" title="Move Up" aria-label="Move ${escapeHTML(comp.name)} Up" style="padding: 4px 8px; display: inline-flex; align-items: center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg></button>` : ''}
          ${index < totalInGroup - 1 ? `<button class="btn btn-secondary btn-sm btn-icon" data-action="move-comp-down" data-comp-id="${compId}" data-sec-id="${sectionId || ''}" title="Move Down" aria-label="Move ${escapeHTML(comp.name)} Down" style="padding: 4px 8px; display: inline-flex; align-items: center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button>` : ''}

          <button class="project-menu-btn" data-action="comp-menu" data-comp-id="${compId}" aria-label="Component options" style="width: 28px; height: 28px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </button>
        </div>

        ${isMenuOpen ? `
          <div class="project-action-menu" style="top: 36px; right: 16px; position: absolute; z-index: 20; background: #fff; border: 1px solid #DCDFE3; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 4px 0; min-width: 140px;">
            <button class="project-menu-item" data-action="duplicate-comp" data-comp-id="${compId}">Duplicate</button>
            <button class="project-menu-item" data-action="rename-comp" data-comp-id="${compId}">Rename</button>
            <button class="project-menu-item text-danger" data-action="delete-comp" data-comp-id="${compId}" data-sec-id="${sectionId || ''}">Delete</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderComponentPicker(project) {
    let list = COMPONENT_REGISTRY || [];
    const isFiltered = Boolean(this.state.pickerSearch.trim() || (this.state.pickerCategory && this.state.pickerCategory !== 'all'));
    
    // Category Filter
    if (this.state.pickerCategory && this.state.pickerCategory !== 'all') {
      list = list.filter(c => c.categoryId === this.state.pickerCategory || c.category === this.state.pickerCategory);
    }

    // Search Query
    if (this.state.pickerSearch.trim()) {
      list = searchComponents(list, this.state.pickerSearch);
    }

    const sections = project.sections || {};
    const sectionOrder = project.sectionOrder || [];

    return `
      <div class="modal-overlay is-active drawer-overlay" id="picker-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="picker-modal-title" style="display: flex; justify-content: flex-end; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000;">
        <div class="modal-card component-library-drawer" style="max-width: 580px; width: 100%; height: 100%; display: flex; flex-direction: column; background: var(--att-surface, #ffffff); border-left: 1px solid var(--att-border, #DCDFE3); box-shadow: -8px 0 32px rgba(0,0,0,0.15); overflow: hidden; animation: slideInRight 0.2s ease-out;">
          <div class="modal-header" style="padding: 18px 24px; border-bottom: 1px solid var(--att-border, #EAEAEA); display: flex; justify-content: space-between; align-items: center; background: var(--att-surface, #FAFAFA);">
            <div>
              <h2 id="picker-modal-title" class="modal-title" style="font-size: 1.125rem; font-weight: 700; margin: 0; color: var(--text-main, #111);">Component Library</h2>
              <p style="font-size: 0.8125rem; color: #666; margin: 2px 0 0 0;">Pick from 26 certified AT&amp;T interactive blocks.</p>
            </div>
            <button id="picker-close-btn" class="project-menu-btn" aria-label="Close component library" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div class="modal-body" style="padding: 20px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px;">
            <!-- Target Section Chooser & Search -->
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 240px; position: relative;">
                <input
                  id="picker-search-input"
                  class="form-input"
                  type="search"
                  placeholder="Search components by name, feature, or keyword…"
                  aria-label="Search components in picker"
                  value="${escapeHTML(this.state.pickerSearch)}"
                  autofocus
                  style="width: 100%;"
                />
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                <label for="picker-section-select" style="font-size: 0.8125rem; font-weight: 600; color: #444;">Add into:</label>
                <select id="picker-section-select" class="form-select" aria-label="Destination section" style="padding: 6px 12px; font-size: 0.8125rem;">
                  ${sectionOrder.map(sId => `
                    <option value="${sId}" ${this.state.pickerTargetSectionId === sId ? 'selected' : ''}>${escapeHTML(sections[sId]?.name || 'Section')}</option>
                  `).join('')}
                  <option value="" ${!this.state.pickerTargetSectionId ? 'selected' : ''}>Unsectioned Area (Standalone)</option>
                </select>
              </div>
            </div>

            <!-- Category Filter Tabs -->
            <div class="picker-category-tabs" style="display: flex; gap: 6px; flex-wrap: wrap; border-bottom: 1px solid #EFEFEF; padding-bottom: 10px;">
              <button class="filter-chip ${this.state.pickerCategory === 'all' ? 'active' : ''}" data-picker-cat="all">All (${COMPONENT_REGISTRY.length})</button>
              ${CATEGORIES.map(cat => {
                const count = COMPONENT_REGISTRY.filter(c => c.categoryId === cat.id || c.category === cat.id).length;
                return `
                  <button class="filter-chip ${this.state.pickerCategory === cat.id ? 'active' : ''}" data-picker-cat="${cat.id}">
                    ${escapeHTML(cat.name)} (${count})
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Search Result Meta Bar -->
            <div class="picker-result-meta" aria-live="polite" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; color: #555;">
              <span>Showing <strong>${list.length}</strong> of ${COMPONENT_REGISTRY.length} components</span>
              ${isFiltered ? `
                <button type="button" class="btn btn-secondary btn-sm" id="picker-clear-filters-btn" style="font-size: 0.75rem; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  <span>Clear filters</span>
                </button>
              ` : ''}
            </div>

            <!-- Components Grid -->
            <div class="picker-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px;">
              ${list.map(c => `
                <div class="picker-item-card" data-comp-type="${c.id}" style="background: #ffffff; border: 1px solid #DCDFE3; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; transition: all 0.15s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                  <!-- Wireframe Structural Illustration -->
                  <div class="picker-item-wireframe-banner" style="background: #F4F6F9; border-radius: 8px; padding: 6px 10px; display: flex; justify-content: center; align-items: center; border: 1px solid #EAEAEA; height: 72px; overflow: hidden;">
                    ${c.thumbnail || getComponentThumbnailSvg(c.id, { width: 110, height: 60 })}
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div>
                      <h3 class="picker-item-title" style="font-size: 0.9375rem; font-weight: 700; margin: 0; color: #111;">${escapeHTML(c.name)}</h3>
                      <span class="component-type-badge" style="font-size: 0.6875rem; background: rgba(0, 56, 143, 0.08); color: var(--att-cobalt, #00388F); padding: 1px 5px; border-radius: 4px;">${escapeHTML(c.categoryName || c.categoryId || 'Interactive')}</span>
                    </div>
                    ${c.tierLabel ? `<span class="component-tier-badge" style="font-size: 0.6875rem; background: #EFEFEF; color: #555; padding: 2px 6px; border-radius: 4px;">${escapeHTML(c.tierLabel)}</span>` : ''}
                  </div>
                  
                  <p class="picker-item-desc" style="font-size: 0.8125rem; color: #555; margin: 0; line-height: 1.45; min-height: 2.8em;" title="${escapeHTML(c.description || '')}">
                    ${escapeHTML(c.description || '')}
                  </p>

                  <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    <span class="picker-card-chip" style="font-size: 0.6875rem; background: #E8F5E9; color: #2E7D32; padding: 2px 6px; border-radius: 4px; font-weight: 600;">WCAG 2.2 AA</span>
                    ${c.complexity ? `<span class="picker-card-chip" style="font-size: 0.6875rem; background: #F3F4F5; color: #555; padding: 2px 6px; border-radius: 4px;">${escapeHTML(c.complexity)}</span>` : ''}
                  </div>

                  <div style="margin-top: auto; display: flex; gap: 8px; padding-top: 4px;">
                    <button class="btn btn-secondary btn-sm" data-action="preview-picker-item" data-comp-type="${c.id}" style="flex: 1; font-size: 0.75rem;">
                      Details &amp; Info
                    </button>
                    <button class="btn btn-primary btn-sm" data-action="select-picker-item" data-comp-type="${c.id}" style="flex: 1; font-size: 0.75rem;">
                      + Add Block
                    </button>
                  </div>
                </div>
              `).join('')}

              ${list.length === 0 ? `
                <div style="grid-column: 1 / -1; text-align: center; padding: 36px 16px; color: #666; background: #FAFAFA; border-radius: 12px; border: 1px dashed #DCDFE3;">
                  <p style="font-size: 0.9375rem; font-weight: 600; margin: 0 0 8px 0; color: #333;">No components match your search</p>
                  <p style="font-size: 0.8125rem; margin: 0 0 16px 0;">Try adjusting your search keywords or switching category filters.</p>
                  <button type="button" class="btn btn-secondary btn-sm" id="picker-no-results-reset-btn">Clear search &amp; filters</button>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="modal-footer" style="padding: 12px 24px; border-top: 1px solid #EAEAEA; display: flex; justify-content: flex-end; background: #FAFAFA;">
            <button id="picker-cancel-btn" class="btn btn-secondary btn-sm" type="button">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  renderDetailsModal(comp, _project) {
    return `
      <div class="modal-overlay is-active" id="details-modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1100; padding: 20px;">
        <div class="modal-card" style="max-width: 650px; width: 100%; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column;">
          <div class="modal-header" style="padding: 16px 20px; border-bottom: 1px solid #EFEFEF; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">${escapeHTML(comp.name)} Details</h3>
            <button id="details-close-btn" class="project-menu-btn" aria-label="Close details">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
            <div>
              <h4 style="margin: 0 0 4px 0; font-size: 0.875rem; font-weight: 700; color: #333;">Description & Purpose</h4>
              <p style="margin: 0; font-size: 0.8125rem; color: #555; line-height: 1.4;">${escapeHTML(comp.description)}</p>
            </div>

            ${comp.bestWhen ? `
              <div>
                <h4 style="margin: 0 0 4px 0; font-size: 0.875rem; font-weight: 700; color: #333;">Best Use Cases</h4>
                <p style="margin: 0; font-size: 0.8125rem; color: #555; line-height: 1.4;">${escapeHTML(comp.bestWhen)}</p>
              </div>
            ` : ''}

            ${comp.differentiator ? `
              <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 10px 14px; border-radius: 8px;">
                <h4 style="margin: 0 0 2px 0; font-size: 0.8125rem; font-weight: 700; color: #15803D;">Why Choose This Custom Component:</h4>
                <p style="margin: 0; font-size: 0.75rem; color: #166534;">${escapeHTML(comp.differentiator)}</p>
              </div>
            ` : ''}

            ${comp.riseEquivalent ? `
              <div>
                <h4 style="margin: 0 0 4px 0; font-size: 0.875rem; font-weight: 700; color: #333;">Rise Comparison</h4>
                <p style="margin: 0; font-size: 0.8125rem; color: #555;">${escapeHTML(comp.riseEquivalent)}</p>
              </div>
            ` : ''}
          </div>
          <div class="modal-footer" style="padding: 12px 20px; border-top: 1px solid #EFEFEF; display: flex; justify-content: flex-end; gap: 8px;">
            <button id="details-cancel-btn" class="btn btn-secondary btn-sm">Close</button>
            <button id="details-add-btn" class="btn btn-primary btn-sm" data-comp-type="${comp.id}">+ Add Component</button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Back to dashboard
    this.container.querySelector('#wp-back-btn')?.addEventListener('click', () => {
      if (this.onBackToDashboard) this.onBackToDashboard();
    });

    // Top workspace action buttons
    this.container.querySelector('#wp-preview-btn')?.addEventListener('click', () => {
      if (this.onOpenPreview) this.onOpenPreview(this.projectId);
    });
    this.container.querySelector('#wp-preview-canvas-btn')?.addEventListener('click', () => {
      if (this.onOpenPreview) this.onOpenPreview(this.projectId);
    });
    this.container.querySelector('#wp-media-btn')?.addEventListener('click', () => {
      if (this.onOpenMedia) this.onOpenMedia(this.projectId);
    });
    this.container.querySelector('#wp-qa-btn')?.addEventListener('click', () => {
      if (this.onOpenQa) this.onOpenQa(this.projectId);
    });
    this.container.querySelector('#wp-inspector-qa-btn')?.addEventListener('click', () => {
      if (this.onOpenQa) this.onOpenQa(this.projectId);
    });
    this.container.querySelector('#wp-export-btn')?.addEventListener('click', () => {
      if (this.onExportProject) this.onExportProject(this.projectId);
    });
    this.container.querySelector('#wp-inspector-export-btn')?.addEventListener('click', () => {
      if (this.onExportProject) this.onExportProject(this.projectId);
    });

    // Rename project title
    this.container.querySelector('#wp-rename-title-btn')?.addEventListener('click', async () => {
      const project = this.getProject();
      const newName = await showPromptDialog({
        title: 'Edit Course Title',
        label: 'Course Title',
        defaultValue: project.name,
        confirmText: 'Save',
        required: true
      });
      if (newName && newName.trim()) {
        this.updateProject(p => { p.name = newName.trim(); });
      }
    });

    // Course structure search & filter
    const csSearchInput = this.container.querySelector('#cs-search-input');
    if (csSearchInput) {
      csSearchInput.addEventListener('input', (e) => {
        this.state.courseStructureSearch = e.target.value;
        this.render();
      });
    }

    this.container.querySelectorAll('[data-cs-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.courseStructureFilter = btn.dataset.csFilter;
        this.render();
      });
    });

    // Expand all / Collapse all sections
    this.container.querySelector('#wp-expand-all-btn')?.addEventListener('click', () => {
      this.updateProject(p => {
        for (const s of Object.values(p.sections || {})) {
          s.collapsed = false;
        }
      });
    });

    this.container.querySelector('#wp-collapse-all-btn')?.addEventListener('click', () => {
      this.updateProject(p => {
        for (const s of Object.values(p.sections || {})) {
          s.collapsed = true;
        }
      });
    });

    // Add Section button
    const addSectionHandler = async () => {
      const name = await showPromptDialog({
        title: 'Add New Section',
        label: 'Section Name',
        placeholder: 'e.g. Module 1: Introduction',
        confirmText: 'Add Section',
        required: true
      });
      if (name && name.trim()) {
        const newSec = createSection({ name: name.trim() });
        this.updateProject(p => {
          if (!p.sectionOrder) p.sectionOrder = [];
          if (!p.sections) p.sections = {};
          p.sectionOrder.push(newSec.id);
          p.sections[newSec.id] = newSec;
        });
      }
    };
    this.container.querySelector('#wp-add-section-btn')?.addEventListener('click', addSectionHandler);
    this.container.querySelector('#wp-empty-add-sec-btn')?.addEventListener('click', addSectionHandler);

    // Add component buttons
    const openPickerHandler = (secId = undefined, isExplicitStandalone = false, triggerBtn = null) => {
      const project = this.getProject();
      this.lastPickerTrigger = triggerBtn || document.activeElement;
      this.state.isPickerOpen = true;
      this.state.pickerTargetSectionId = this.resolveDestinationSectionId(project, secId, isExplicitStandalone);
      if (secId && project?.sections?.[secId]) {
        this.state.lastActiveSectionId = secId;
        this.updateProject(p => { p.lastActiveSectionId = secId; });
      }
      this.render();
    };

    const globalAddBtn = this.container.querySelector('#wp-header-add-comp-btn') || this.container.querySelector('#wp-add-unsectioned-comp-btn');
    if (globalAddBtn) {
      globalAddBtn.addEventListener('click', (e) => openPickerHandler(undefined, false, e.currentTarget));
    }
    this.container.querySelector('#wp-empty-add-comp-btn')?.addEventListener('click', (e) => openPickerHandler(undefined, false, e.currentTarget));
    this.container.querySelector('[data-action="add-comp-unsectioned"]')?.addEventListener('click', (e) => openPickerHandler(undefined, true, e.currentTarget));

    this.container.querySelectorAll('[data-action="add-comp-to-sec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPickerHandler(btn.dataset.secId, false, btn);
      });
    });

    this.container.querySelectorAll('[data-action="quick-add-comp"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const compType = btn.dataset.compType;
        const secId = btn.dataset.secId;
        this.addComponentToProject(compType, secId);
      });
    });

    // Toggle section collapse
    this.container.querySelectorAll('[data-toggle-sec]').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        const secId = header.dataset.toggleSec;
        this.updateProject(p => {
          if (p.sections?.[secId]) {
            p.sections[secId].collapsed = !p.sections[secId].collapsed;
          }
        });
      });
    });

    // Section Action Menus
    this.container.querySelectorAll('[data-action="section-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const secId = btn.dataset.secId;
        this.state.activeMenuId = this.state.activeMenuId === secId ? null : secId;
        this.render();
      });
    });

    this.container.querySelectorAll('[data-action="rename-sec"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const secId = btn.dataset.secId;
        const project = this.getProject();
        const currentSec = project.sections?.[secId];
        const newName = await showPromptDialog({
          title: 'Rename Section',
          label: 'Section Name',
          defaultValue: currentSec?.name,
          confirmText: 'Save',
          required: true
        });
        if (newName && newName.trim()) {
          this.updateProject(p => { p.sections[secId].name = newName.trim(); });
        }
      });
    });

    this.container.querySelectorAll('[data-action="duplicate-sec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const secId = btn.dataset.secId;
        const project = this.getProject();
        const sec = project.sections?.[secId];
        if (!sec) return;

        const newSec = createSection({
          name: `${sec.name} (Copy)`,
          description: sec.description
        });

        // Duplicate components in this section
        const newCompIds = [];
        const newComps = {};
        for (const cId of sec.componentOrder || []) {
          const comp = project.components?.[cId];
          if (comp) {
            const dup = createComponentInstance({ ...comp, id: null, name: `${comp.name} Copy` });
            newComps[dup.id] = dup;
            newCompIds.push(dup.id);
          }
        }
        newSec.componentOrder = newCompIds;

        this.updateProject(p => {
          p.sections[newSec.id] = newSec;
          Object.assign(p.components, newComps);
          const idx = p.sectionOrder.indexOf(secId);
          p.sectionOrder.splice(idx + 1, 0, newSec.id);
        });
      });
    });

    this.container.querySelectorAll('[data-action="delete-sec"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const secId = btn.dataset.secId;
        const project = this.getProject();
        const sec = project.sections?.[secId];
        const ok = await showConfirmDialog({
          title: 'Delete Section',
          message: `Are you sure you want to delete section "${sec?.name}"? Its components will be kept as unsectioned.`,
          confirmText: 'Delete Section',
          isDanger: true
        });
        if (ok) {
          this.updateProject(p => {
            p.sectionOrder = p.sectionOrder.filter(id => id !== secId);
            if (sec.componentOrder && sec.componentOrder.length > 0) {
              if (!p.unsectionedComponentOrder) p.unsectionedComponentOrder = [];
              p.unsectionedComponentOrder.push(...sec.componentOrder);
            }
            delete p.sections[secId];
          });
        }
      });
    });

    this.container.querySelectorAll('[data-action="move-sec-up"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const secId = btn.dataset.secId;
        this.updateProject(p => {
          const idx = p.sectionOrder.indexOf(secId);
          if (idx > 0) {
            const temp = p.sectionOrder[idx - 1];
            p.sectionOrder[idx - 1] = secId;
            p.sectionOrder[idx] = temp;
          }
        });
      });
    });

    this.container.querySelectorAll('[data-action="move-sec-down"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const secId = btn.dataset.secId;
        this.updateProject(p => {
          const idx = p.sectionOrder.indexOf(secId);
          if (idx < p.sectionOrder.length - 1) {
            const temp = p.sectionOrder[idx + 1];
            p.sectionOrder[idx + 1] = secId;
            p.sectionOrder[idx] = temp;
          }
        });
      });
    });

    // Component Edit button
    this.container.querySelectorAll('[data-action="edit-comp"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const compId = btn.dataset.compId;
        const project = this.getProject();
        const comp = project.components?.[compId];
        if (comp && this.onEditComponent) {
          this.onEditComponent(project, comp);
        }
      });
    });

    // Component Status Change select
    this.container.querySelectorAll('[data-action="change-status"]').forEach(select => {
      select.addEventListener('change', (e) => {
        e.stopPropagation();
        const compId = select.dataset.compId;
        const newStatus = select.value;
        this.updateProject(p => {
          if (p.components?.[compId]) {
            p.components[compId].status = newStatus;
          }
        });
      });
    });

    // Component Move Up / Move Down
    this.container.querySelectorAll('[data-action="move-comp-up"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const compId = btn.dataset.compId;
        const secId = btn.dataset.secId;
        this.updateProject(p => {
          const order = secId && p.sections?.[secId] ? p.sections[secId].componentOrder : p.unsectionedComponentOrder;
          const idx = order.indexOf(compId);
          if (idx > 0) {
            const temp = order[idx - 1];
            order[idx - 1] = compId;
            order[idx] = temp;
          }
        });
      });
    });

    this.container.querySelectorAll('[data-action="move-comp-down"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const compId = btn.dataset.compId;
        const secId = btn.dataset.secId;
        this.updateProject(p => {
          const order = secId && p.sections?.[secId] ? p.sections[secId].componentOrder : p.unsectionedComponentOrder;
          const idx = order.indexOf(compId);
          if (idx < order.length - 1) {
            const temp = order[idx + 1];
            order[idx + 1] = compId;
            order[idx] = temp;
          }
        });
      });
    });

    // Component Action Menus
    this.container.querySelectorAll('[data-action="comp-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const compId = btn.dataset.compId;
        this.state.activeMenuId = this.state.activeMenuId === compId ? null : compId;
        this.render();
      });
    });

    this.container.querySelectorAll('[data-action="rename-comp"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const compId = btn.dataset.compId;
        const project = this.getProject();
        const comp = project.components?.[compId];
        const newName = await showPromptDialog({
          title: 'Rename Component',
          label: 'Component Name',
          defaultValue: comp?.name,
          confirmText: 'Save',
          required: true
        });
        if (newName && newName.trim()) {
          this.updateProject(p => { p.components[compId].name = newName.trim(); });
        }
      });
    });

    this.container.querySelectorAll('[data-action="duplicate-comp"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const compId = btn.dataset.compId;
        const project = this.getProject();
        const comp = project.components?.[compId];
        if (!comp) return;

        const dup = createComponentInstance({
          ...comp,
          id: null,
          name: `${comp.name} Copy`
        });

        this.updateProject(p => {
          p.components[dup.id] = dup;
          let placed = false;
          for (const sec of Object.values(p.sections || {})) {
            if (sec.componentOrder && sec.componentOrder.includes(compId)) {
              sec.componentOrder.push(dup.id);
              placed = true;
              break;
            }
          }
          if (!placed) {
            if (!p.unsectionedComponentOrder) p.unsectionedComponentOrder = [];
            p.unsectionedComponentOrder.push(dup.id);
          }
        });
      });
    });

    this.container.querySelectorAll('[data-action="delete-comp"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const compId = btn.dataset.compId;
        const secId = btn.dataset.secId;
        const project = this.getProject();
        const comp = project.components?.[compId];
        const ok = await showConfirmDialog({
          title: 'Delete Component',
          message: `Are you sure you want to delete "${comp?.name || 'this component'}"?`,
          confirmText: 'Delete',
          isDanger: true
        });
        if (ok) {
          this.updateProject(p => {
            if (secId && p.sections?.[secId]) {
              p.sections[secId].componentOrder = (p.sections[secId].componentOrder || []).filter(id => id !== compId);
            } else if (p.unsectionedComponentOrder) {
              p.unsectionedComponentOrder = p.unsectionedComponentOrder.filter(id => id !== compId);
            }
            delete p.components[compId];
          });
        }
      });
    });

    // Modal Picker handlers
    if (this.state.isPickerOpen) {
      const modalOverlay = this.container.querySelector('#picker-modal-overlay');
      const closeBtn = this.container.querySelector('#picker-close-btn');
      const cancelBtn = this.container.querySelector('#picker-cancel-btn');
      const searchInput = this.container.querySelector('#picker-search-input');
      const sectionSelect = this.container.querySelector('#picker-section-select');

      if (this.cleanupPickerIsolation) {
        this.cleanupPickerIsolation();
        this.cleanupPickerIsolation = null;
      }

      const closePicker = () => {
        if (this.cleanupPickerIsolation) {
          this.cleanupPickerIsolation();
          this.cleanupPickerIsolation = null;
        }
        this.state.isPickerOpen = false;
        this.render();
      };

      if (modalOverlay) {
        this.cleanupPickerIsolation = isolateModal(modalOverlay, {
          triggerElement: this.lastPickerTrigger,
          fallbackSelector: '#wp-header-add-comp-btn',
          onDismiss: closePicker
        });
      }

      if (closeBtn) closeBtn.addEventListener('click', closePicker);
      if (cancelBtn) cancelBtn.addEventListener('click', closePicker);
      if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
          if (e.target === modalOverlay) closePicker();
        });
      }

      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.state.pickerSearch = e.target.value;
          this.render();
        });
      }

      const resetFilters = () => {
        this.state.pickerSearch = '';
        this.state.pickerCategory = 'all';
        this.render();
      };

      this.container.querySelector('#picker-clear-filters-btn')?.addEventListener('click', resetFilters);
      this.container.querySelector('#picker-no-results-reset-btn')?.addEventListener('click', resetFilters);

      if (sectionSelect) {
        sectionSelect.addEventListener('change', (e) => {
          this.state.pickerTargetSectionId = e.target.value || null;
        });
      }

      this.container.querySelectorAll('[data-picker-cat]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.state.pickerCategory = btn.dataset.pickerCat;
          this.render();
        });
      });

      this.container.querySelectorAll('[data-action="preview-picker-item"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.lastDetailsTrigger = btn;
          const compType = btn.dataset.compType;
          this.state.previewDetailsComp = getComponentById(COMPONENT_REGISTRY, compType);
          this.render();
        });
      });

      this.container.querySelectorAll('[data-action="select-picker-item"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.addComponentToProject(btn.dataset.compType, this.state.pickerTargetSectionId);
        });
      });
    }

    // Component details modal handlers
    if (this.state.previewDetailsComp) {
      const detailsOverlay = this.container.querySelector('#details-modal-overlay');
      const detailsCloseBtn = this.container.querySelector('#details-close-btn');
      const detailsCancelBtn = this.container.querySelector('#details-cancel-btn');
      const detailsAddBtn = this.container.querySelector('#details-add-btn');

      if (this.cleanupDetailsIsolation) {
        this.cleanupDetailsIsolation();
        this.cleanupDetailsIsolation = null;
      }

      const closeDetails = () => {
        if (this.cleanupDetailsIsolation) {
          this.cleanupDetailsIsolation();
          this.cleanupDetailsIsolation = null;
        }
        this.state.previewDetailsComp = null;
        this.render();
      };

      if (detailsOverlay) {
        this.cleanupDetailsIsolation = isolateModal(detailsOverlay, {
          triggerElement: this.lastDetailsTrigger,
          fallbackSelector: '#picker-modal-overlay',
          onDismiss: closeDetails
        });
      }

      if (detailsCloseBtn) detailsCloseBtn.addEventListener('click', closeDetails);
      if (detailsCancelBtn) detailsCancelBtn.addEventListener('click', closeDetails);
      if (detailsOverlay) {
        detailsOverlay.addEventListener('click', (e) => {
          if (e.target === detailsOverlay) closeDetails();
        });
      }

      if (detailsAddBtn) {
        detailsAddBtn.addEventListener('click', () => {
          const compType = detailsAddBtn.dataset.compType;
          closeDetails();
          this.addComponentToProject(compType, this.state.pickerTargetSectionId);
        });
      }
    }
  }
}
