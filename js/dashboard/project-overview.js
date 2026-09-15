/**
 * Project Overview & Multi-Component Workspace Controller
 * Manages course sections, component instances, organization, and links to course tools.
 */

import {
  getProject, saveProject
} from '../storage.js';
import {
  createComponentInstance, createSection
} from '../project-schema.js';
import { COMPONENT_REGISTRY, getDefaultConfig } from '../component-registry.js';
import { showPromptDialog, showConfirmDialog } from './att-modal.js';

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
      pickerSearch: '',
      activeMenuId: null
    };

    this.handleDocumentClick = this.handleDocumentClick.bind(this);
  }

  mount() {
    document.addEventListener('click', this.handleDocumentClick);
    this.render();
  }

  unmount() {
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
          <div class="workspace-container">
            <p>Project not found.</p>
            <button id="wp-back-btn" class="btn-att-primary">Back to Projects</button>
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

    this.container.innerHTML = `
      <div class="project-workspace-view">
        <!-- Top Nav -->
        <header class="workspace-header">
          <div class="workspace-breadcrumbs">
            <button id="wp-back-btn" class="breadcrumb-back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Projects
            </button>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">${this.escapeHtml(project.name)}</span>
          </div>

          <div class="workspace-header-actions">
            <button id="wp-preview-btn" class="btn-att-secondary" aria-label="Preview Full Course">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Course Preview
            </button>
            <button id="wp-media-btn" class="btn-att-secondary" aria-label="Manage Course Media">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              Media Library
            </button>
            <button id="wp-qa-btn" class="btn-att-secondary" aria-label="Course QA Checklist">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Course QA
            </button>
            <button id="wp-export-btn" class="btn-att-primary" aria-label="Export Course Package">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export Package
            </button>
          </div>
        </header>

        <!-- Container -->
        <main class="workspace-container">
          <!-- Course Banner -->
          <div class="workspace-banner">
            <div class="workspace-banner-info">
              <div class="workspace-banner-tags">
                <span class="project-client-badge">${this.escapeHtml(project.clientLabel || 'AT&T')}</span>
              </div>
              <h1 class="workspace-title">
                ${this.escapeHtml(project.name)}
                <button id="wp-rename-title-btn" class="project-fav-btn" title="Rename course">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                </button>
              </h1>
              <p class="workspace-desc">${this.escapeHtml(project.description || 'No description provided. Click edit to add course details.')}</p>
            </div>
            <div class="workspace-banner-metrics">
              <div class="metric-card">
                <p class="metric-value">${totalSections}</p>
                <p class="metric-label">Sections</p>
              </div>
              <div class="metric-card">
                <p class="metric-value">${totalComponents}</p>
                <p class="metric-label">Components</p>
              </div>
            </div>
          </div>

          <!-- Toolbar -->
          <div class="workspace-toolbar">
            <h2 class="workspace-toolbar-title">Course Structure</h2>
            <div class="workspace-toolbar-actions">
              <button id="wp-add-unsectioned-comp-btn" class="btn-att-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Component
              </button>
              <button id="wp-add-section-btn" class="btn-att-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Section
              </button>
            </div>
          </div>

          <!-- Sections List -->
          <div class="sections-list">
            ${(project.sectionOrder || []).map((secId, idx) => this.renderSectionCard(project, secId, idx)).join('')}

            <!-- Unsectioned Components Section (if any) -->
            ${(project.unsectionedComponentOrder && project.unsectionedComponentOrder.length > 0) ? `
              <div class="section-card">
                <div class="section-card-header">
                  <div class="section-header-left">
                    <h3 class="section-title">Standalone / Unsectioned Components</h3>
                    <span class="section-component-badge">${project.unsectionedComponentOrder.length}</span>
                  </div>
                </div>
                <div class="section-card-body">
                  ${project.unsectionedComponentOrder.map(cId => this.renderComponentRow(project, cId, null)).join('')}
                </div>
              </div>
            ` : ''}

            ${(project.sectionOrder || []).length === 0 && (!project.unsectionedComponentOrder || project.unsectionedComponentOrder.length === 0) ? `
              <div class="dashboard-empty-state">
                <h3 class="empty-state-title">This project is currently empty</h3>
                <p class="empty-state-subtitle">Start by creating a section to group your course modules or add a component directly.</p>
                <div style="display:flex; justify-content:center; gap:12px;">
                  <button id="wp-empty-add-sec-btn" class="btn-att-primary">Add First Section</button>
                  <button id="wp-empty-add-comp-btn" class="btn-att-secondary">Add Component</button>
                </div>
              </div>
            ` : ''}
          </div>
        </main>

        <!-- Component Picker Modal -->
        ${this.state.isPickerOpen ? this.renderComponentPicker() : ''}
      </div>
    `;

    this.attachEventListeners();
  }

  renderSectionCard(project, sectionId, index) {
    const section = project.sections?.[sectionId];
    if (!section) return '';

    const compCount = (section.componentOrder || []).length;
    const isMenuOpen = this.state.activeMenuId === sectionId;

    return `
      <div class="section-card" data-section-id="${sectionId}">
        <div class="section-card-header" data-toggle-sec="${sectionId}">
          <div class="section-header-left">
            <svg class="section-toggle-icon ${section.collapsed ? 'collapsed' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <h3 class="section-title">${this.escapeHtml(section.name)}</h3>
            <span class="section-component-badge">${compCount} ${compCount === 1 ? 'component' : 'components'}</span>
          </div>

          <div class="section-header-right">
            <button class="btn-att-secondary" data-action="add-comp-to-sec" data-sec-id="${sectionId}" style="padding: 4px 10px; font-size: 0.75rem;">
              + Add Component
            </button>
            <button class="project-menu-btn" data-action="section-menu" data-sec-id="${sectionId}" aria-label="Section options">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
          </div>
        </div>

        <div class="section-card-body ${section.collapsed ? 'collapsed' : ''}">
          ${compCount > 0 ? `
            ${section.componentOrder.map(cId => this.renderComponentRow(project, cId, sectionId)).join('')}
          ` : `
            <div class="section-empty-hint">
              No components in this section yet. Click "+ Add Component" to add your first interactive block.
            </div>
          `}
        </div>

        ${isMenuOpen ? `
          <div class="project-action-menu" style="top: 40px; right: 24px;">
            <button class="project-menu-item" data-action="rename-sec" data-sec-id="${sectionId}">Rename Section</button>
            ${index > 0 ? `<button class="project-menu-item" data-action="move-sec-up" data-sec-id="${sectionId}">Move Up</button>` : ''}
            ${index < (project.sectionOrder.length - 1) ? `<button class="project-menu-item" data-action="move-sec-down" data-sec-id="${sectionId}">Move Down</button>` : ''}
            <button class="project-menu-item text-danger" data-action="delete-sec" data-sec-id="${sectionId}">Delete Section</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderComponentRow(project, compId, sectionId) {
    const comp = project.components?.[compId];
    if (!comp) return '';

    const isMenuOpen = this.state.activeMenuId === compId;

    return `
      <div class="component-row" data-comp-id="${compId}">
        <div class="component-row-left">
          <span class="component-type-badge">${this.escapeHtml(comp.type)}</span>
          <h4 class="component-name">${this.escapeHtml(comp.name)}</h4>
          <span class="component-status-badge ${comp.status || 'draft'}">${(comp.status || 'draft').replace('_', ' ')}</span>
        </div>

        <div class="component-row-right">
          <button class="component-edit-btn" data-action="edit-comp" data-comp-id="${compId}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            Edit
          </button>
          <button class="project-menu-btn" data-action="comp-menu" data-comp-id="${compId}" aria-label="Component options">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </button>
        </div>

        ${isMenuOpen ? `
          <div class="project-action-menu" style="top: 36px; right: 16px;">
            <button class="project-menu-item" data-action="duplicate-comp" data-comp-id="${compId}">Duplicate</button>
            <button class="project-menu-item" data-action="rename-comp" data-comp-id="${compId}">Rename</button>
            <button class="project-menu-item text-danger" data-action="delete-comp" data-comp-id="${compId}" data-sec-id="${sectionId || ''}">Delete</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderComponentPicker() {
    let list = COMPONENT_REGISTRY || [];
    if (this.state.pickerSearch.trim()) {
      const q = this.state.pickerSearch.toLowerCase().trim();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
      );
    }

    return `
      <div class="modal-overlay" id="picker-modal-overlay">
        <div class="modal-card" style="max-width: 680px;">
          <div class="modal-header">
            <h2 class="modal-title">Select Component Type</h2>
            <button id="picker-close-btn" class="project-menu-btn" aria-label="Close modal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="modal-body">
            <input
              id="picker-search-input"
              class="form-input"
              type="search"
              placeholder="Search components (e.g. accordion, video, quiz)..."
              value="${this.escapeHtml(this.state.pickerSearch)}"
              autofocus
            />
            <div class="picker-grid">
              ${list.map(c => `
                <div class="picker-item-card" data-comp-type="${c.id}">
                  <span class="component-type-badge" style="align-self: flex-start;">${this.escapeHtml(c.category || 'Component')}</span>
                  <h4 class="picker-item-title">${this.escapeHtml(c.name)}</h4>
                  <p class="picker-item-desc">${this.escapeHtml(c.description || '')}</p>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button id="picker-cancel-btn" class="btn-att-secondary">Cancel</button>
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
    this.container.querySelector('#wp-media-btn')?.addEventListener('click', () => {
      if (this.onOpenMedia) this.onOpenMedia(this.projectId);
    });
    this.container.querySelector('#wp-qa-btn')?.addEventListener('click', () => {
      if (this.onOpenQa) this.onOpenQa(this.projectId);
    });
    this.container.querySelector('#wp-export-btn')?.addEventListener('click', () => {
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
    const openPickerHandler = (secId) => {
      this.state.isPickerOpen = true;
      this.state.pickerTargetSectionId = secId || null;
      this.render();
    };

    this.container.querySelector('#wp-add-unsectioned-comp-btn')?.addEventListener('click', () => openPickerHandler(null));
    this.container.querySelector('#wp-empty-add-comp-btn')?.addEventListener('click', () => openPickerHandler(null));

    this.container.querySelectorAll('[data-action="add-comp-to-sec"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPickerHandler(btn.dataset.secId);
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
          // Place in same section or unsectioned
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
          message: `Are you sure you want to delete "${comp?.name}"?`,
          confirmText: 'Delete Component',
          isDanger: true
        });
        if (ok) {
          this.updateProject(p => {
            delete p.components[compId];
            if (secId && p.sections?.[secId]?.componentOrder) {
              p.sections[secId].componentOrder = p.sections[secId].componentOrder.filter(id => id !== compId);
            }
            if (p.unsectionedComponentOrder) {
              p.unsectionedComponentOrder = p.unsectionedComponentOrder.filter(id => id !== compId);
            }
          });
        }
      });
    });

    // Picker Modal events
    if (this.state.isPickerOpen) {
      const modalOverlay = this.container.querySelector('#picker-modal-overlay');
      const closeBtn = this.container.querySelector('#picker-close-btn');
      const cancelBtn = this.container.querySelector('#picker-cancel-btn');
      const searchInput = this.container.querySelector('#picker-search-input');

      const closePicker = () => {
        this.state.isPickerOpen = false;
        this.render();
      };

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

      this.container.querySelectorAll('.picker-item-card').forEach(card => {
        card.addEventListener('click', () => {
          const type = card.dataset.compType;
          const regEntry = COMPONENT_REGISTRY.find(r => r.id === type);
          const defaultCfg = regEntry ? getDefaultConfig(regEntry) : {};

          const newComp = createComponentInstance({
            name: regEntry?.name || 'New Component',
            type,
            config: defaultCfg
          });

          const targetSecId = this.state.pickerTargetSectionId;
          this.updateProject(p => {
            if (!p.components) p.components = {};
            p.components[newComp.id] = newComp;
            if (targetSecId && p.sections?.[targetSecId]) {
              if (!p.sections[targetSecId].componentOrder) p.sections[targetSecId].componentOrder = [];
              p.sections[targetSecId].componentOrder.push(newComp.id);
            } else {
              if (!p.unsectionedComponentOrder) p.unsectionedComponentOrder = [];
              p.unsectionedComponentOrder.push(newComp.id);
            }
          });

          this.state.isPickerOpen = false;
          this.render();

          // Immediately open editor for newly added component
          if (this.onEditComponent) {
            this.onEditComponent(this.getProject(), newComp);
          }
        });
      });
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
