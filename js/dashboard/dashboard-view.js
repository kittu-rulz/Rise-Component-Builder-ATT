/**
 * Projects Dashboard View Controller
 * Handles project listing, search, filtering, sorting, visual starter cards, export/import, and deletion.
 */

import {
  deleteProject, duplicateProject, exportProjectJson, getProject,
  importProjectJson, loadProjects, saveProject, toggleFavoriteProject
} from '../storage.js';
import {
  buildProjectSchemaV3, createComponentInstance, createSection
} from '../project-schema.js';
import { showPromptDialog, showConfirmDialog, isolateModal } from './att-modal.js';
import { showToast } from '../toast.js';

export class DashboardView {
  constructor({ container = null, onOpenProject = null, onCreateNewComponent = null } = {}) {
    this.container = container;
    this.onOpenProject = onOpenProject;
    this.onCreateNewComponent = onCreateNewComponent;

    this.state = {
      searchQuery: '',
      filter: 'all', // 'all' | 'favorites' | 'recent'
      sortBy: 'updatedAt', // 'updatedAt' | 'name' | 'componentCount'
      activeMenuProjectId: null,
      isCreateModalOpen: false,
      selectedTemplate: 'standard' // 'standard' | 'blank' | 'single' | 'import'
    };

    this.handleDocumentClick = this.handleDocumentClick.bind(this);
  }

  mount() {
    document.addEventListener('click', this.handleDocumentClick);
    this.render();
  }

  unmount() {
    document.removeEventListener('click', this.handleDocumentClick);
    if (this.cleanupCreateModalIsolation) {
      this.cleanupCreateModalIsolation();
      this.cleanupCreateModalIsolation = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  handleDocumentClick(e) {
    if (!e.target.closest('.project-menu-btn') && !e.target.closest('.project-action-menu')) {
      if (this.state.activeMenuProjectId) {
        this.state.activeMenuProjectId = null;
        this.render();
      }
    }
  }

  getFilteredAndSortedProjects() {
    let list = loadProjects();

    // Text search
    if (this.state.searchQuery.trim()) {
      const q = this.state.searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.clientLabel && p.clientLabel.toLowerCase().includes(q))
      );
    }

    // Filter tabs
    if (this.state.filter === 'favorites') {
      list = list.filter(p => Boolean(p.favorite));
    } else if (this.state.filter === 'recent') {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      list = list.filter(p => Date.parse(p.updatedAt) >= thirtyDaysAgo);
    }

    // Sort
    list.sort((a, b) => {
      if (this.state.sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (this.state.sortBy === 'componentCount') {
        const countA = this.getComponentCount(a);
        const countB = this.getComponentCount(b);
        return countB - countA;
      }
      // default: updatedAt descending
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });

    return list;
  }

  getComponentCount(project) {
    if (project.schemaVersion === 3 && project.components) {
      return Object.keys(project.components).length;
    }
    return 1; // legacy single-component
  }

  getSectionCount(project) {
    if (project.schemaVersion === 3 && project.sections) {
      return Object.keys(project.sections).length;
    }
    return 0;
  }

  formatRelativeDate(isoString) {
    if (!isoString) return 'Unknown';
    const timestamp = Date.parse(isoString);
    if (Number.isNaN(timestamp)) return 'Unknown';

    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getModalHost() {
    return document.getElementById('modal-root') || this.container;
  }

  render() {
    if (!this.container) return;
    const projects = this.getFilteredAndSortedProjects();
    const allProjects = loadProjects();
    const isOnboardingDismissed = localStorage.getItem('rcb_onboarding_dismissed') === 'true';

    // Clear any previous modal rendered in modal host if modal is closed
    const modalHost = this.getModalHost();
    const existingModal = modalHost?.querySelector('#create-modal-overlay');
    if (existingModal && !this.state.isCreateModalOpen) {
      existingModal.remove();
    }

    this.container.innerHTML = `
      <div class="project-dashboard-view">
        <h1 class="sr-only">Course Projects Dashboard | Rise Component Builder</h1>

        <!-- Main Body -->
        <main class="dashboard-container">
          <!-- Controls Bar -->
          <div class="dashboard-controls">
            <div class="dashboard-search-wrapper">
              <svg class="dashboard-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                id="dash-search-input"
                class="dashboard-search-input"
                type="search"
                placeholder="Search courses and projects..."
                value="${this.escapeHtml(this.state.searchQuery)}"
                aria-label="Search projects"
              />
            </div>

            <div class="dashboard-filters-group">
              <button class="filter-chip ${this.state.filter === 'all' ? 'active' : ''}" data-filter="all">All Projects (${allProjects.length})</button>
              <button class="filter-chip ${this.state.filter === 'favorites' ? 'active' : ''}" data-filter="favorites">Favorites</button>
              <button class="filter-chip ${this.state.filter === 'recent' ? 'active' : ''}" data-filter="recent">Recent</button>
            </div>

            <div class="dashboard-sort-wrapper">
              <label for="dash-sort-select" class="dashboard-sort-label">Sort by:</label>
              <select id="dash-sort-select" class="dashboard-sort-select">
                <option value="updatedAt" ${this.state.sortBy === 'updatedAt' ? 'selected' : ''}>Last Modified</option>
                <option value="name" ${this.state.sortBy === 'name' ? 'selected' : ''}>Alphabetical</option>
                <option value="componentCount" ${this.state.sortBy === 'componentCount' ? 'selected' : ''}>Components Count</option>
              </select>
            </div>
          </div>

          <!-- Grid or Empty State -->
          ${projects.length > 0 ? `
            <div class="dashboard-projects-grid">
              ${projects.map(p => this.renderProjectCard(p)).join('')}
            </div>
          ` : (this.state.searchQuery || this.state.filter !== 'all') ? `
            <div class="dashboard-empty-state">
              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <span>Dismiss</span>
                </button>
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: rgba(0, 56, 143, 0.08); color: var(--att-cobalt, #00388F); border-radius: 16px; margin-bottom: 16px;">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 8px 0; color: var(--att-heading-contrast, #000);">Welcome to Rise Component Builder</h2>
                <p style="font-size: 0.9375rem; color: #555; max-width: 600px; margin: 0 auto 28px auto; line-height: 1.5;">
                  Build, preview, audit, and package multi-component interactive courses designed for Articulate Rise 360 with AT&amp;T brand alignment and WCAG 2.2 AA support.
                </p>

                <!-- 3 Options Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; text-align: left;">
                  <div class="onboarding-option-card" id="onboarding-starter-card" style="background: #F0F7FF; border: 2px solid var(--att-cobalt, #00388F); border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column;">
                    <div style="font-weight: 700; font-size: 1rem; color: var(--att-cobalt, #00388F); margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                      3-Module Starter
                    </div>
                    <p style="font-size: 0.8125rem; color: #00388F; margin: 0 0 16px 0; flex: 1;">Recommended structure with Introduction, Deep Dive, and Knowledge Check modules.</p>
                    <button type="button" class="btn btn-primary btn-sm" id="onboarding-create-starter-btn" style="width: 100%; justify-content: center;">Load 3-Module Starter</button>
                  </div>

                  <div class="onboarding-option-card" id="onboarding-blank-card" style="background: var(--att-grey-1, #F3F4F5); border: 1px solid var(--att-border, #DCDFE3); border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column;">
                    <div style="font-weight: 700; font-size: 1rem; color: var(--text-main, #111); margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      Blank Course
                    </div>
                    <p style="font-size: 0.8125rem; color: #666; margin: 0 0 16px 0; flex: 1;">Start fresh with an empty course workspace to create custom modules and interactive blocks.</p>
                    <button type="button" class="btn btn-secondary btn-sm" id="onboarding-create-blank-btn" style="width: 100%; justify-content: center;">Create Blank</button>
                  </div>

                  <div class="onboarding-option-card" id="onboarding-import-card" style="background: var(--att-grey-1, #F3F4F5); border: 1px solid var(--att-border, #DCDFE3); border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column;">
                    <div style="font-weight: 700; font-size: 1rem; color: var(--text-main, #111); margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Import Project
                    </div>
                    <p style="font-size: 0.8125rem; color: #666; margin: 0 0 16px 0; flex: 1;">Load an existing course package (.json) from your device.</p>
                    <button type="button" class="btn btn-secondary btn-sm" id="onboarding-import-btn" style="width: 100%; justify-content: center;">Choose File</button>
                  </div>
                </div>
              </div>
            </div>
          ` : `
            <div class="dashboard-empty-state">
              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <h2 class="empty-state-title">No course projects yet</h2>
              <p class="empty-state-subtitle">Get started by creating a new course project or importing an existing file.</p>
              <button id="dash-empty-create-btn" class="btn btn-primary">Create New Project</button>
            </div>
          `}
        </main>
      </div>
    `;

    // Render Modal into modal host
    if (this.state.isCreateModalOpen) {
      if (modalHost && modalHost !== this.container) {
        let overlay = modalHost.querySelector('#create-modal-overlay');
        if (!overlay) {
          const temp = document.createElement('div');
          temp.innerHTML = this.renderCreateModal();
          overlay = temp.firstElementChild;
          if (overlay) modalHost.appendChild(overlay);
        } else {
          overlay.outerHTML = this.renderCreateModal();
        }
      } else {
        this.container.insertAdjacentHTML('beforeend', this.renderCreateModal());
      }
    } else {
      modalHost?.querySelector('#create-modal-overlay')?.remove();
    }

    this.attachEventListeners();
  }

  renderProjectCard(project) {
    const compCount = this.getComponentCount(project);
    const secCount = this.getSectionCount(project);
    const isMenuOpen = this.state.activeMenuProjectId === project.id;

    return `
      <div class="project-card" data-project-id="${project.id}">
        <div class="project-card-header">
          <div class="project-card-tags">
            <span class="project-client-badge">${this.escapeHtml(project.clientLabel || 'AT&T')}</span>
            ${project.schemaVersion === 3 ? `<span class="project-version-badge">Course Project</span>` : ''}
          </div>
          <div class="project-card-actions">
            <button
              class="project-favorite-btn ${project.favorite ? 'active' : ''}"
              data-action="favorite"
              data-id="${project.id}"
              title="${project.favorite ? 'Remove from favorites' : 'Add to favorites'}"
              aria-label="${project.favorite ? 'Remove from favorites' : 'Add to favorites'}"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${project.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
            <button
              class="project-menu-btn"
              data-action="menu"
              data-id="${project.id}"
              title="Project actions"
              aria-label="Project actions"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
          </div>
        </div>

        <div class="project-card-body" data-action="open" data-id="${project.id}">
          <h2 class="project-card-title">${this.escapeHtml(project.name)}</h2>
          <p class="project-card-desc">${this.escapeHtml(project.description || 'No description provided.')}</p>
        </div>

        <div class="project-card-stats">
          <div class="project-stat-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>${compCount} ${compCount === 1 ? 'component' : 'components'}</span>
          </div>
          ${secCount > 0 ? `
            <div class="project-stat-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <span>${secCount} ${secCount === 1 ? 'section' : 'sections'}</span>
            </div>
          ` : ''}
        </div>

        <div class="project-card-footer">
          <span>Edited ${this.formatRelativeDate(project.updatedAt)}</span>
        </div>

        ${isMenuOpen ? `
          <div class="project-action-menu">
            <button class="project-menu-item" data-action="open" data-id="${project.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              Open Workspace
            </button>
            <button class="project-menu-item" data-action="rename" data-id="${project.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
              Rename
            </button>
            <button class="project-menu-item" data-action="duplicate" data-id="${project.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Duplicate
            </button>
            <button class="project-menu-item" data-action="export-json" data-id="${project.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export JSON
            </button>
            <button class="project-menu-item text-danger" data-action="delete" data-id="${project.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Delete
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderCreateModal() {
    const selectedTemplate = this.state.selectedTemplate || 'standard';

    return `
      <div class="modal-overlay is-active" id="create-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-project-modal-title">
        <div class="modal-card" style="max-width: 680px; width: 100%;">
          <div class="modal-header">
            <div>
              <h2 id="create-project-modal-title" class="modal-title">Create Course Project</h2>
              <p style="margin: 2px 0 0 0; font-size: 0.8125rem; color: #666;">Choose a starting structure and configure project details.</p>
            </div>
            <button id="modal-close-btn" class="project-menu-btn" aria-label="Close dialog" type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <form id="new-project-form">
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
              <!-- 4 Starting-Point Cards -->
              <div>
                <label class="form-label" style="font-weight: 700; margin-bottom: 8px; display: block;">Select Starting Point</label>
                <div class="starter-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
                  <!-- Card 1: 3-Module Starter -->
                  <div class="starter-point-card ${selectedTemplate === 'standard' ? 'active' : ''}" data-starter-tpl="standard" tabindex="0" role="radio" aria-checked="${selectedTemplate === 'standard'}" style="border: 2px solid ${selectedTemplate === 'standard' ? 'var(--att-cobalt, #00388F)' : 'var(--att-border, #DCDFE3)'}; background: ${selectedTemplate === 'standard' ? '#F0F7FF' : 'var(--att-surface, #FFF)'}; border-radius: 10px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-weight: 700; font-size: 0.875rem; color: var(--att-cobalt, #00388F);">3-Module Starter</span>
                      <span style="font-size: 0.75rem; color: ${selectedTemplate === 'standard' ? 'var(--att-cobalt, #00388F)' : '#999'};">★</span>
                    </div>
                    <p style="margin: 0; font-size: 0.75rem; color: #555; line-height: 1.3;">Intro, Deep Dive &amp; Knowledge Check.</p>
                    <span style="font-size: 0.6875rem; background: rgba(0, 56, 143, 0.08); color: var(--att-cobalt, #00388F); padding: 1px 6px; border-radius: 4px; align-self: flex-start; margin-top: auto;">Recommended</span>
                  </div>

                  <!-- Card 2: Blank Course -->
                  <div class="starter-point-card ${selectedTemplate === 'blank' ? 'active' : ''}" data-starter-tpl="blank" tabindex="0" role="radio" aria-checked="${selectedTemplate === 'blank'}" style="border: 2px solid ${selectedTemplate === 'blank' ? 'var(--att-cobalt, #00388F)' : 'var(--att-border, #DCDFE3)'}; background: ${selectedTemplate === 'blank' ? '#F0F7FF' : 'var(--att-surface, #FFF)'}; border-radius: 10px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 6px;">
                    <span style="font-weight: 700; font-size: 0.875rem; color: #111;">Blank Course</span>
                    <p style="margin: 0; font-size: 0.75rem; color: #555; line-height: 1.3;">Empty workspace for custom outlines.</p>
                    <span style="font-size: 0.6875rem; background: #EFEFEF; color: #555; padding: 1px 6px; border-radius: 4px; align-self: flex-start; margin-top: auto;">Custom</span>
                  </div>

                  <!-- Card 3: Single Component -->
                  <div class="starter-point-card ${selectedTemplate === 'single' ? 'active' : ''}" data-starter-tpl="single" tabindex="0" role="radio" aria-checked="${selectedTemplate === 'single'}" style="border: 2px solid ${selectedTemplate === 'single' ? 'var(--att-cobalt, #00388F)' : 'var(--att-border, #DCDFE3)'}; background: ${selectedTemplate === 'single' ? '#F0F7FF' : 'var(--att-surface, #FFF)'}; border-radius: 10px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 6px;">
                    <span style="font-weight: 700; font-size: 0.875rem; color: #111;">Single Block</span>
                    <p style="margin: 0; font-size: 0.75rem; color: #555; line-height: 1.3;">Accordion starter block.</p>
                    <span style="font-size: 0.6875rem; background: #EFEFEF; color: #555; padding: 1px 6px; border-radius: 4px; align-self: flex-start; margin-top: auto;">Quick Edit</span>
                  </div>

                  <!-- Card 4: Import Existing Project -->
                  <div class="starter-point-card ${selectedTemplate === 'import' ? 'active' : ''}" data-starter-tpl="import" tabindex="0" role="radio" aria-checked="${selectedTemplate === 'import'}" style="border: 2px solid ${selectedTemplate === 'import' ? 'var(--att-cobalt, #00388F)' : 'var(--att-border, #DCDFE3)'}; background: ${selectedTemplate === 'import' ? '#F0F7FF' : 'var(--att-surface, #FFF)'}; border-radius: 10px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 6px;">
                    <span style="font-weight: 700; font-size: 0.875rem; color: #111;">Import Project</span>
                    <p style="margin: 0; font-size: 0.75rem; color: #555; line-height: 1.3;">Upload saved JSON package.</p>
                    <span style="font-size: 0.6875rem; background: #EFEFEF; color: #555; padding: 1px 6px; border-radius: 4px; align-self: flex-start; margin-top: auto;">File upload</span>
                  </div>
                </div>
                <input type="hidden" id="np-template" value="${selectedTemplate}" />
              </div>

              ${selectedTemplate === 'import' ? `
                <div class="form-group" style="background: var(--att-surface-sunken, #FAFAFA); padding: 16px; border-radius: 8px; border: 1.5px dashed var(--att-border, #CBD5E1); text-align: center;">
                  <label for="np-import-file" style="display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 8px;">Select Course Project JSON File</label>
                  <input type="file" id="np-import-file" accept=".json" style="font-size: 0.8125rem;" required />
                </div>
              ` : `
                <div class="form-group">
                  <label for="np-name" class="form-label">Project Name *</label>
                  <input id="np-name" class="form-input" type="text" placeholder="e.g., 5G Network Fundamentals" required autofocus value="${selectedTemplate === 'standard' ? 'AT&T 3-Module Starter Course' : ''}" />
                </div>
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px;">
                  <div class="form-group">
                    <label for="np-client" class="form-label">Client / Brand Tag</label>
                    <input id="np-client" class="form-input" type="text" value="AT&T" />
                  </div>
                  <div class="form-group">
                    <label for="np-desc" class="form-label">Description (optional)</label>
                    <input id="np-desc" class="form-input" type="text" placeholder="Course overview and objectives..." value="${selectedTemplate === 'standard' ? 'Interactive 3-module course structure with Introduction, Deep Dive, and Knowledge Check.' : ''}" />
                  </div>
                </div>
              `}
            </div>
            <div class="modal-footer">
              <button type="button" id="modal-cancel-btn" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">${selectedTemplate === 'import' ? 'Import & Open' : 'Create Project'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Search input
    const searchInput = this.container.querySelector('#dash-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value;
        this.render();
      });
    }

    // Filter chips
    this.container.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.filter = btn.dataset.filter;
        this.render();
      });
    });

    // Sort select
    const sortSelect = this.container.querySelector('#dash-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.sortBy = e.target.value;
        this.render();
      });
    }

    // Dismiss onboarding
    this.container.querySelector('#btn-dismiss-onboarding')?.addEventListener('click', () => {
      localStorage.setItem('rcb_onboarding_dismissed', 'true');
      this.render();
    });

    // New Project buttons
    const createBtn = this.container?.querySelector('#dash-create-btn') || document.getElementById('dash-create-btn');
    const emptyCreateBtn = this.container?.querySelector('#dash-empty-create-btn');
    const openModal = (e, tpl = 'standard') => {
      this.lastCreateTrigger = e?.currentTarget || createBtn;
      this.state.selectedTemplate = tpl;
      this.state.isCreateModalOpen = true;
      this.render();
    };
    if (createBtn) createBtn.onclick = (e) => openModal(e, 'standard');
    if (emptyCreateBtn) emptyCreateBtn.addEventListener('click', (e) => openModal(e, 'standard'));

    // Onboarding cards
    this.container.querySelector('#onboarding-create-blank-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(e, 'blank');
    });
    this.container.querySelector('#onboarding-blank-card')?.addEventListener('click', (e) => openModal(e, 'blank'));

    this.container.querySelector('#onboarding-create-starter-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(e, 'standard');
    });
    this.container.querySelector('#onboarding-starter-card')?.addEventListener('click', (e) => openModal(e, 'standard'));

    // Import from dashboard header button
    const dashImportBtn = document.getElementById('dash-import-btn');
    const dashImportFileInput = /** @type {HTMLInputElement|null} */ (document.getElementById('dash-import-file-input'));
    if (dashImportBtn && dashImportFileInput) {
      dashImportBtn.onclick = () => dashImportFileInput.click();
      dashImportFileInput.onchange = async (e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        const file = target?.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const imported = importProjectJson(text);
          showToast(`Project "${imported.name}" imported successfully!`, 'success');
          this.render();
          if (this.onOpenProject) this.onOpenProject(imported.id);
        } catch (err) {
          showToast(`Import failed: ${err.message}`, 'error');
        } finally {
          if (dashImportFileInput) dashImportFileInput.value = '';
        }
      };
    }

    this.container.querySelector('#onboarding-import-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dashImportFileInput) dashImportFileInput.click();
    });
    this.container.querySelector('#onboarding-import-card')?.addEventListener('click', () => {
      if (dashImportFileInput) dashImportFileInput.click();
    });

    // Project card clicks and action menu items
    this.container.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        const actionBtn = e.target.closest('[data-action]');
        const action = actionBtn ? actionBtn.dataset.action : 'open';
        const id = (actionBtn && actionBtn.dataset.id) || card.dataset.projectId;
        if (!id) return;
        e.stopPropagation();

        if (action === 'favorite') {
          toggleFavoriteProject(id);
          this.render();
        } else if (action === 'menu') {
          this.state.activeMenuProjectId = this.state.activeMenuProjectId === id ? null : id;
          this.render();
        } else if (action === 'open') {
          this.state.activeMenuProjectId = null;
          if (this.onOpenProject) this.onOpenProject(id);
        } else if (action === 'rename') {
          this.state.activeMenuProjectId = null;
          const current = getProject(id);
          const newName = await showPromptDialog({
            title: 'Rename Project',
            label: 'Project Name',
            defaultValue: current?.name,
            confirmText: 'Save',
            required: true
          });
          if (newName && newName.trim()) {
            saveProject({ ...current, name: newName.trim(), updatedAt: new Date().toISOString() });
            this.render();
          }
        } else if (action === 'duplicate') {
          this.state.activeMenuProjectId = null;
          duplicateProject(id);
          this.render();
        } else if (action === 'export-json') {
          this.state.activeMenuProjectId = null;
          this.triggerDownloadJson(id);
        } else if (action === 'delete') {
          this.state.activeMenuProjectId = null;
          const current = getProject(id);
          const ok = await showConfirmDialog({
            title: 'Delete Project',
            message: `Are you sure you want to delete "${current?.name}"? This action cannot be undone.`,
            confirmText: 'Delete Project',
            isDanger: true
          });
          if (ok) {
            deleteProject(id);
            this.render();
          }
        }
      });
    });

    // Create Modal handlers
    if (this.state.isCreateModalOpen) {
      const modalHost = this.getModalHost();
      const modalOverlay = modalHost.querySelector('#create-modal-overlay') || this.container.querySelector('#create-modal-overlay');
      const closeBtn = modalOverlay?.querySelector('#modal-close-btn');
      const cancelBtn = modalOverlay?.querySelector('#modal-cancel-btn');
      const form = modalOverlay?.querySelector('#new-project-form');

      if (this.cleanupCreateModalIsolation) {
        this.cleanupCreateModalIsolation();
        this.cleanupCreateModalIsolation = null;
      }

      const closeModal = () => {
        if (this.cleanupCreateModalIsolation) {
          this.cleanupCreateModalIsolation();
          this.cleanupCreateModalIsolation = null;
        }
        this.state.isCreateModalOpen = false;
        this.render();
      };

      if (modalOverlay) {
        this.cleanupCreateModalIsolation = isolateModal(modalOverlay, {
          triggerElement: this.lastCreateTrigger,
          fallbackSelector: '#dash-create-btn',
          onDismiss: closeModal
        });
      }

      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
      if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
          if (e.target === modalOverlay) closeModal();
        });
      }

      // Starter card clicks & keyboard Enter/Space activation
      (modalOverlay || this.container).querySelectorAll('[data-starter-tpl]').forEach(card => {
        const selectCard = () => {
          this.state.selectedTemplate = card.dataset.starterTpl;
          this.render();
        };
        card.addEventListener('click', selectCard);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectCard();
          }
        });
      });

      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const template = this.state.selectedTemplate || 'standard';

          if (template === 'import') {
            const fileInput = form.querySelector('#np-import-file');
            const file = fileInput?.files?.[0];
            if (!file) {
              showToast('Please select a JSON project file to import.', 'error');
              return;
            }
            try {
              const text = await file.text();
              const imported = importProjectJson(text);
              showToast(`Project "${imported.name}" imported successfully!`, 'success');
              closeModal();
              if (this.onOpenProject) this.onOpenProject(imported.id);
            } catch (err) {
              showToast(`Import failed: ${err.message}`, 'error');
            }
            return;
          }

          const name = form.querySelector('#np-name')?.value || 'New Project';
          const client = form.querySelector('#np-client')?.value || 'AT&T';
          const desc = form.querySelector('#np-desc')?.value || '';

          const createdProject = this.createNewProjectFromTemplate({ name, client, desc, template });
          saveProject(createdProject);
          closeModal();

          if (this.onOpenProject) {
            this.onOpenProject(createdProject.id);
          }
        });
      }
    }
  }

  createNewProjectFromTemplate({ name, client, desc, template }) {
    if (template === 'standard') {
      const sec1 = createSection({ name: 'Module 1: Fiber Deployment', description: 'Foundational concepts and physical infrastructure rollout' });
      const sec2 = createSection({ name: 'Module 2: 5G Architecture', description: 'Core technical pillars, RAN, and mobile edge topology' });
      const sec3 = createSection({ name: 'Module 3: Compliance & Safety', description: 'Interactive knowledge check and optical safety standards' });

      const comp1 = createComponentInstance({
        name: 'Fiber Deployment Process',
        type: 'accordion',
        status: 'draft',
        config: {
          blockTitle: 'Fiber Network Deployment',
          blockHeadline: 'Enterprise Fiber Rollout',
          blockSubtext: 'Explore the key technical phases and engineering standards for enterprise fiber optic deployment.',
          title: 'Fiber Network Deployment',
          description: 'Explore the key technical phases and engineering standards for enterprise fiber optic deployment.',
          accordionMulti: true,
          accordionAnimation: true,
          iconStyle: 'chevron',
          items: [
            { title: 'Permitting & Right-of-Way', content: 'Secure municipal permits, utility pole attachment agreements, and environmental clearances prior to construction.' },
            { title: 'Trenching & Conduit Placement', content: 'Execute directional boring and trenching to place heavy-duty HDPE micro-duct conduits following strict depth standards.' },
            { title: 'Fiber Splicing & Optical Testing', content: 'Perform precision fusion splicing, OTDR trace analysis, and power meter testing to certify optical signal loss under 0.2 dB/km.' }
          ]
        }
      });

      const comp2 = createComponentInstance({
        name: '5G Architecture & Core Pillars',
        type: 'tab-blocks',
        status: 'draft',
        config: {
          blockTitle: 'Next-Gen 5G Architecture',
          blockHeadline: 'Network Core & Edge Topology',
          blockSubtext: 'Examine the multi-tier architectural components delivering ultra-reliable low-latency connectivity.',
          title: 'Next-Gen 5G Architecture',
          description: 'Examine the multi-tier architectural components delivering ultra-reliable low-latency connectivity.',
          tabsOrientation: 'horizontal',
          items: [
            { title: 'Radio Access Network (RAN)', content: 'Massive MIMO active antenna units and baseband units dynamically allocate cellular spectrum across mmWave and sub-6GHz bands.' },
            { title: '5G Standalone Core', content: 'Cloud-native service-based architecture (SBA) featuring User Plane Function (UPF) routing and granular network slicing.' },
            { title: 'Multi-Access Edge Computing (MEC)', content: 'Distributed compute nodes co-located near cell towers reduce round-trip application latency to single-digit milliseconds.' }
          ]
        }
      });

      const comp3 = createComponentInstance({
        name: 'Fiber Safety & Compliance Check',
        type: 'multiple-choice',
        status: 'draft',
        config: {
          blockTitle: 'Optical Safety & Compliance',
          blockHeadline: 'Knowledge Check: Field Protocols',
          blockSubtext: 'Test your understanding of laser safety standards and optical field splicing protocols.',
          title: 'Optical Safety & Compliance',
          description: 'Test your understanding of laser safety standards and optical field splicing protocols.',
          mcQuestionPrompt: 'Which optical test must be completed and certified before connecting customer terminal equipment to a newly spliced fiber run?',
          mcSubmitButtonText: 'Submit Answer',
          mcMaxAttempts: 1,
          mcConfidenceMode: false,
          items: [
            { title: 'Visual Fault Locator (VFL) Red Light Check Only', label: 'Visual Fault Locator (VFL) Red Light Check Only', content: 'VFL is a quick continuity indicator, not an insertion-loss certification tool.', correct: false },
            { title: 'OTDR Trace & Power Meter Loss Certification', label: 'OTDR Trace & Power Meter Loss Certification (Required)', content: 'Optical Time-Domain Reflectometry (OTDR) and calibrated optical power loss measurements certify that insertion loss meets enterprise dB specifications.', correct: true },
            { title: 'Standard Ethernet Loopback Ping', label: 'Standard Ethernet Loopback Ping', content: 'Ethernet loopback checks Layer 2 data links after active electronics are powered, not physical fiber cable integrity.', correct: false }
          ]
        }
      });

      sec1.componentOrder = [comp1.id];
      sec2.componentOrder = [comp2.id];
      sec3.componentOrder = [comp3.id];

      return buildProjectSchemaV3({
        name,
        clientLabel: client,
        description: desc,
        sectionOrder: [sec1.id, sec2.id, sec3.id],
        sections: { [sec1.id]: sec1, [sec2.id]: sec2, [sec3.id]: sec3 },
        components: { [comp1.id]: comp1, [comp2.id]: comp2, [comp3.id]: comp3 }
      });
    }

    if (template === 'single') {
      const comp = createComponentInstance({
        name: `${name} Overview`,
        type: 'accordion',
        status: 'draft',
        config: {
          blockTitle: `${name} Overview`,
          blockHeadline: 'Interactive Module',
          blockSubtext: 'Review essential guidance and interactive reference topics.',
          title: `${name} Overview`,
          description: 'Review essential guidance and interactive reference topics.',
          accordionMulti: true,
          accordionAnimation: true,
          iconStyle: 'chevron',
          items: [
            { title: 'Project Overview & Objectives', content: 'Explore core learning objectives, system architecture, and operational expectations.' },
            { title: 'Technical Specifications & Guidelines', content: 'Review standard operating procedures, API contracts, and engineering constraints.' },
            { title: 'Summary & Best Practices', content: 'Reinforce essential takeaways and compliance checkpoints before proceeding.' }
          ]
        }
      });

      return buildProjectSchemaV3({
        name,
        clientLabel: client,
        description: desc,
        unsectionedComponentOrder: [comp.id],
        components: { [comp.id]: comp }
      });
    }

    // Blank project
    return buildProjectSchemaV3({
      name,
      clientLabel: client,
      description: desc,
      sectionOrder: [],
      sections: {},
      unsectionedComponentOrder: [],
      components: {}
    });
  }

  triggerDownloadJson(projectId) {
    try {
      const jsonStr = exportProjectJson(projectId);
      const project = getProject(projectId);
      const filename = `${(project?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v3.json`;
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Could not export JSON: ${err.message}`);
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

export function createNewProjectFromTemplate(options = 'standard') {
  const opts = typeof options === 'string' ? { template: options } : options;
  const view = new DashboardView({});
  return view.createNewProjectFromTemplate({
    name: opts.name || 'Demo Course',
    client: opts.client || 'AT&T',
    desc: opts.desc || 'Interactive demonstration course',
    template: opts.template || 'standard'
  });
}
