/**
 * Project Shared Media Library Controller
 * Manages project-wide media assets stored in IndexedDB and tracks component references.
 */

import { listMedia, saveMedia, deleteMedia } from '../media-storage.js';
import { createMediaReference } from '../media.js';
import { getProject } from '../storage.js';
import { showConfirmDialog } from './att-modal.js';

export class ProjectMediaView {
  constructor({ container, projectId, onBack }) {
    this.container = container;
    this.projectId = projectId;
    this.onBack = onBack;

    this.state = {
      mediaList: [],
      filterKind: 'all', // 'all' | 'image' | 'video' | 'audio'
      isLoading: true
    };
  }

  async mount() {
    await this.refreshMediaList();
    this.render();
  }

  unmount() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  async refreshMediaList() {
    try {
      this.state.isLoading = true;
      this.state.mediaList = await listMedia();
    } catch (err) {
      console.warn('[ProjectMedia] Could not load media items:', err);
      this.state.mediaList = [];
    } finally {
      this.state.isLoading = false;
    }
  }

  getComponentReferences(mediaId) {
    const project = getProject(this.projectId);
    if (!project || !project.components) return [];

    const matches = [];
    for (const comp of Object.values(project.components)) {
      const configStr = JSON.stringify(comp.config || {});
      if (configStr.includes(mediaId)) {
        matches.push(comp.name);
      }
    }
    return matches;
  }

  render() {
    if (!this.container) return;
    const project = getProject(this.projectId);
    let items = this.state.mediaList;

    if (this.state.filterKind !== 'all') {
      items = items.filter(m => m.kind === this.state.filterKind);
    }

    this.container.innerHTML = `
      <div class="project-workspace-view">
        <header class="workspace-header">
          <div class="workspace-breadcrumbs">
            <button id="media-back-btn" class="breadcrumb-back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              ${this.escapeHtml(project?.name || 'Project')}
            </button>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">Shared Media Library</span>
          </div>

          <div class="workspace-header-actions">
            <input type="file" id="media-upload-input" multiple accept="image/*,video/*,audio/*" style="display:none;" />
            <button id="media-upload-btn" class="btn-att-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Assets
            </button>
          </div>
        </header>

        <main class="workspace-container">
          <div class="dashboard-controls">
            <div class="dashboard-filters-group">
              <button class="filter-chip ${this.state.filterKind === 'all' ? 'active' : ''}" data-kind="all">All Assets (${this.state.mediaList.length})</button>
              <button class="filter-chip ${this.state.filterKind === 'image' ? 'active' : ''}" data-kind="image">Images</button>
              <button class="filter-chip ${this.state.filterKind === 'video' ? 'active' : ''}" data-kind="video">Videos</button>
              <button class="filter-chip ${this.state.filterKind === 'audio' ? 'active' : ''}" data-kind="audio">Audio</button>
            </div>
          </div>

          ${this.state.isLoading ? `
            <p style="text-align:center; padding: 40px; color:#666;">Loading project media library...</p>
          ` : items.length > 0 ? `
            <div class="dashboard-projects-grid">
              ${items.map(item => this.renderMediaCard(item)).join('')}
            </div>
          ` : `
            <div class="dashboard-empty-state">
              <h3 class="empty-state-title">No media assets in library</h3>
              <p class="empty-state-subtitle">Upload graphics, audio files, or videos to share across this course project.</p>
              <button id="media-empty-upload-btn" class="btn-att-primary">Upload Media File</button>
            </div>
          `}
        </main>
      </div>
    `;

    this.attachEventListeners();
  }

  renderMediaCard(item) {
    const refs = this.getComponentReferences(item.id);
    const sizeKb = Math.round((item.size || 0) / 1024);

    return `
      <div class="project-card" style="cursor: default;">
        <div class="project-card-header">
          <span class="project-client-badge" style="text-transform: uppercase;">${this.escapeHtml(item.kind || 'media')}</span>
          <button class="project-menu-btn text-danger" data-action="delete-media" data-id="${item.id}" title="Delete asset">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>

        <h4 class="project-card-title" style="font-size: 1rem; word-break: break-all;">${this.escapeHtml(item.name)}</h4>
        <p class="project-card-desc" style="font-size: 0.75rem;">
          Size: ${sizeKb} KB · Uploaded ${new Date(item.createdAt).toLocaleDateString()}
        </p>

        <div class="project-card-stats" style="flex-direction: column; align-items: flex-start; gap: 4px;">
          <span style="font-size: 0.75rem; font-weight: 700; color: #555;">Used in ${refs.length} ${refs.length === 1 ? 'component' : 'components'}:</span>
          ${refs.length > 0 ? `
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${refs.map(r => `<span class="component-status-badge draft" style="font-size: 11px;">${this.escapeHtml(r)}</span>`).join('')}
            </div>
          ` : `
            <span style="font-size: 11px; color: #999;">Unreferenced</span>
          `}
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    this.container.querySelector('#media-back-btn')?.addEventListener('click', () => {
      if (this.onBack) this.onBack();
    });

    this.container.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.filterKind = btn.dataset.kind;
        this.render();
      });
    });

    const fileInput = this.container.querySelector('#media-upload-input');
    const uploadBtn = this.container.querySelector('#media-upload-btn');
    const emptyUploadBtn = this.container.querySelector('#media-empty-upload-btn');

    const triggerUpload = () => fileInput?.click();
    if (uploadBtn) uploadBtn.addEventListener('click', triggerUpload);
    if (emptyUploadBtn) emptyUploadBtn.addEventListener('click', triggerUpload);

    if (fileInput) {
      fileInput.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files || []);
        for (const file of files) {
          const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
          const ref = createMediaReference({
            kind,
            name: file.name,
            mimeType: file.type,
            size: file.size
          });
          await saveMedia(ref, file);
        }
        await this.refreshMediaList();
        this.render();
      });
    }

    this.container.querySelectorAll('[data-action="delete-media"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const ok = await showConfirmDialog({
          title: 'Delete Media Asset',
          message: 'Are you sure you want to delete this media asset? Any components referencing it will lose their media source.',
          confirmText: 'Delete Asset',
          isDanger: true
        });
        if (ok) {
          await deleteMedia(id);
          await this.refreshMediaList();
          this.render();
        }
      });
    });
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
