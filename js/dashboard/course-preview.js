/**
 * Full-Course Sequential Preview Controller
 * Renders all components in a project in their sequential order across sections.
 */

import { getProject } from '../storage.js';

export class CoursePreviewView {
  constructor({ container, projectId, onBack }) {
    this.container = container;
    this.projectId = projectId;
    this.onBack = onBack;

    this.state = {
      deviceMode: 'desktop' // 'desktop' | 'tablet' | 'mobile'
    };
  }

  mount() {
    this.render();
  }

  unmount() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  getOrderedComponents(project) {
    const items = [];
    // Sections in order
    for (const secId of project.sectionOrder || []) {
      const sec = project.sections?.[secId];
      if (!sec) continue;
      items.push({ type: 'section-header', title: sec.name, description: sec.description });
      for (const compId of sec.componentOrder || []) {
        const comp = project.components?.[compId];
        if (comp) {
          items.push({ type: 'component', component: comp, sectionTitle: sec.name });
        }
      }
    }

    // Unsectioned components
    if (project.unsectionedComponentOrder && project.unsectionedComponentOrder.length > 0) {
      items.push({ type: 'section-header', title: 'Additional Components', description: '' });
      for (const compId of project.unsectionedComponentOrder) {
        const comp = project.components?.[compId];
        if (comp) {
          items.push({ type: 'component', component: comp, sectionTitle: 'Additional' });
        }
      }
    }

    return items;
  }

  render() {
    if (!this.container) return;
    const project = getProject(this.projectId);
    const orderedItems = this.getOrderedComponents(project || {});

    const widthStyle = this.state.deviceMode === 'mobile'
      ? 'max-width: 375px;'
      : this.state.deviceMode === 'tablet'
      ? 'max-width: 768px;'
      : 'max-width: 1080px;';

    this.container.innerHTML = `
      <div class="project-workspace-view">
        <header class="workspace-header">
          <div class="workspace-breadcrumbs">
            <button id="preview-back-btn" class="breadcrumb-back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              ${this.escapeHtml(project?.name || 'Project')}
            </button>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">Course Preview</span>
          </div>

          <div class="workspace-header-actions">
            <!-- Device switcher -->
            <button class="filter-chip ${this.state.deviceMode === 'desktop' ? 'active' : ''}" data-device="desktop">Desktop</button>
            <button class="filter-chip ${this.state.deviceMode === 'tablet' ? 'active' : ''}" data-device="tablet">Tablet</button>
            <button class="filter-chip ${this.state.deviceMode === 'mobile' ? 'active' : ''}" data-device="mobile">Mobile</button>
          </div>
        </header>

        <main class="workspace-container" style="display: flex; flex-direction: column; align-items: center;">
          <div class="course-preview-canvas" style="width: 100%; ${widthStyle} transition: max-width 0.2s ease; display: flex; flex-direction: column; gap: 32px; padding: 24px 0;">
            ${orderedItems.map((item) => {
              if (item.type === 'section-header') {
                return `
                  <div style="border-bottom: 2px solid var(--att-cobalt, #00388F); padding-bottom: 8px; margin-top: 16px;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--att-cobalt, #00388F); margin: 0 0 4px 0;">${this.escapeHtml(item.title)}</h2>
                    ${item.description ? `<p style="font-size: 0.875rem; color: #666; margin: 0;">${this.escapeHtml(item.description)}</p>` : ''}
                  </div>
                `;
              }

              const comp = item.component;
              return `
                <div class="course-preview-block" style="background: #fff; border: 1px solid #DCDFE3; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #F3F4F5; padding-bottom: 8px;">
                    <h3 style="font-size: 1.125rem; font-weight: 700; margin: 0;">${this.escapeHtml(comp.name)}</h3>
                    <span class="component-type-badge">${this.escapeHtml(comp.type)}</span>
                  </div>
                  <div class="component-rendered-container" id="preview-comp-${comp.id}" style="min-height: 120px;">
                    <p style="color: #666; font-size: 0.875rem;">Interactive preview for <strong>${this.escapeHtml(comp.name)}</strong></p>
                  </div>
                </div>
              `;
            }).join('')}

            ${orderedItems.length === 0 ? `
              <div class="dashboard-empty-state" style="width: 100%;">
                <h3 class="empty-state-title">No components to preview</h3>
                <p class="empty-state-subtitle">Add components to your sections to preview the entire course flow here.</p>
              </div>
            ` : ''}
          </div>
        </main>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    this.container.querySelector('#preview-back-btn')?.addEventListener('click', () => {
      if (this.onBack) this.onBack();
    });

    this.container.querySelectorAll('[data-device]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.deviceMode = btn.dataset.device;
        this.render();
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
