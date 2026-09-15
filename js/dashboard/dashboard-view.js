/**
 * Projects Dashboard View Controller
 * Handles project listing, search, filtering, sorting, creation, duplication, export/import, and deletion.
 */

import {
  deleteProject, duplicateProject, exportProjectJson, getProject,
  importProjectJson, loadProjects, saveProject, toggleFavoriteProject
} from '../storage.js';
import {
  buildProjectSchemaV3, createComponentInstance, createSection
} from '../project-schema.js';
import { showPromptDialog, showConfirmDialog } from './att-modal.js';

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
      isCreateModalOpen: false
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

  render() {
    if (!this.container) return;
    const projects = this.getFilteredAndSortedProjects();

    this.container.innerHTML = `
      <div class="project-dashboard-view">
        <!-- Header -->
        <header class="dashboard-header">
          <div class="dashboard-header-brand">
            <span class="dashboard-brand-badge">AT&T</span>
            <div>
              <h1 class="dashboard-header-title">Rise Component Builder</h1>
              <p class="dashboard-header-subtitle">Course Projects & Multi-Component Workspace</p>
            </div>
          </div>
          <div class="dashboard-header-actions">
            <button id="dash-import-btn" class="btn-att-secondary" aria-label="Import Project JSON">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Import JSON
            </button>
            <input type="file" id="dash-import-file-input" accept=".json" style="display:none;" />
            <button id="dash-create-btn" class="btn-att-primary" aria-label="Create New Course Project">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Project
            </button>
          </div>
        </header>

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
              <button class="filter-chip ${this.state.filter === 'all' ? 'active' : ''}" data-filter="all">All Projects</button>
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
          ` : `
            <div class="dashboard-empty-state">
              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <h2 class="empty-state-title">No course projects found</h2>
              <p class="empty-state-subtitle">
                ${this.state.searchQuery ? 'Try adjusting your search query or filter.' : 'Create your first course project to start building and organizing rich interactive components.'}
              </p>
              <button id="dash-empty-create-btn" class="btn-att-primary">Create New Project</button>
            </div>
          `}
        </main>

        <!-- Create Project Modal -->
        ${this.state.isCreateModalOpen ? this.renderCreateModal() : ''}
      </div>
    `;

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
          </div>
          <div class="project-card-actions">
            <button class="project-fav-btn ${project.favorite ? 'is-favorite' : ''}" data-action="favorite" data-id="${project.id}" aria-label="Toggle favorite">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${project.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
            <button class="project-menu-btn" data-action="menu" data-id="${project.id}" aria-label="Project actions">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
          </div>
        </div>

        <h2 class="project-card-title">${this.escapeHtml(project.name)}</h2>
        <p class="project-card-desc">${this.escapeHtml(project.description || 'No description provided.')}</p>

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
    return `
      <div class="modal-overlay" id="create-modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <h2 class="modal-title">Create Course Project</h2>
            <button id="modal-close-btn" class="project-menu-btn" aria-label="Close modal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <form id="new-project-form">
            <div class="modal-body">
              <div class="form-group">
                <label for="np-name" class="form-label">Project Name *</label>
                <input id="np-name" class="form-input" type="text" placeholder="e.g., 5G Network Fundamentals" required autofocus />
              </div>
              <div class="form-group">
                <label for="np-client" class="form-label">Client / Brand Tag</label>
                <input id="np-client" class="form-input" type="text" value="AT&T" />
              </div>
              <div class="form-group">
                <label for="np-desc" class="form-label">Description (optional)</label>
                <textarea id="np-desc" class="form-textarea" rows="2" placeholder="Course overview and objectives..."></textarea>
              </div>
              <div class="form-group">
                <label for="np-template" class="form-label">Starter Layout</label>
                <select id="np-template" class="form-select">
                  <option value="blank">Blank Project (Empty canvas)</option>
                  <option value="standard">Standard 3-Module Course Structure</option>
                  <option value="single">Single Component Starter (Accordion)</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="modal-cancel-btn" class="btn-att-secondary">Cancel</button>
              <button type="submit" class="btn-att-primary">Create Project</button>
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

    // New Project buttons
    const createBtn = this.container.querySelector('#dash-create-btn');
    const emptyCreateBtn = this.container.querySelector('#dash-empty-create-btn');
    const openModal = () => {
      this.state.isCreateModalOpen = true;
      this.render();
    };
    if (createBtn) createBtn.addEventListener('click', openModal);
    if (emptyCreateBtn) emptyCreateBtn.addEventListener('click', openModal);

    // Import JSON button
    const importBtn = this.container.querySelector('#dash-import-btn');
    const fileInput = this.container.querySelector('#dash-import-file-input');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const imported = importProjectJson(text);
          this.render();
          if (this.onOpenProject) {
            this.onOpenProject(imported.id);
          }
        } catch (err) {
          alert(`Could not import project: ${err.message}`);
        }
      });
    }

    // Project card clicks & action handlers
    this.container.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        const actionBtn = e.target.closest('[data-action]');
        const id = card.dataset.projectId;
        if (!actionBtn) {
          // Default click on card -> open project workspace
          if (this.onOpenProject) this.onOpenProject(id);
          return;
        }

        const action = actionBtn.dataset.action;
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
      const modalOverlay = this.container.querySelector('#create-modal-overlay');
      const closeBtn = this.container.querySelector('#modal-close-btn');
      const cancelBtn = this.container.querySelector('#modal-cancel-btn');
      const form = this.container.querySelector('#new-project-form');

      const closeModal = () => {
        this.state.isCreateModalOpen = false;
        this.render();
      };

      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
      if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
          if (e.target === modalOverlay) closeModal();
        });
      }

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = form.querySelector('#np-name').value;
          const client = form.querySelector('#np-client').value;
          const desc = form.querySelector('#np-desc').value;
          const template = form.querySelector('#np-template').value;

          const createdProject = this.createNewProjectFromTemplate({ name, client, desc, template });
          saveProject(createdProject);
          this.state.isCreateModalOpen = false;
          this.render();

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

