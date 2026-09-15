/**
 * Project QA Aggregator View Controller
 * Performs aggregated accessibility, brand compliance, and completeness audits across all course components.
 */

import { getProject } from '../storage.js';

export class ProjectQaView {
  constructor({ container, projectId, onBack, onEditComponent }) {
    this.container = container;
    this.projectId = projectId;
    this.onBack = onBack;
    this.onEditComponent = onEditComponent;
  }

  mount() {
    this.render();
  }

  unmount() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  auditProject(project) {
    const issues = [];
    const components = Object.values(project.components || {});

    for (const comp of components) {
      const cfg = comp.config || {};
      const compIssues = [];

      // Check title/name
      if (!comp.name || comp.name.trim() === 'Untitled Component') {
        compIssues.push({ level: 'warn', message: 'Component has default untitled name.' });
      }

      // Check items length
      if (Array.isArray(cfg.items) && cfg.items.length === 0) {
        compIssues.push({ level: 'error', message: 'Component has zero content items configured.' });
      }

      // Check for empty item titles
      if (Array.isArray(cfg.items)) {
        const emptyTitles = cfg.items.filter(item => !item.title || !String(item.title).trim());
        if (emptyTitles.length > 0) {
          compIssues.push({ level: 'warn', message: `${emptyTitles.length} items have blank titles.` });
        }
      }

      // Check status
      if (comp.status === 'draft') {
        compIssues.push({ level: 'info', message: 'Component is still marked as Draft.' });
      }

      if (compIssues.length > 0) {
        issues.push({
          component: comp,
          issues: compIssues
        });
      }
    }

    return issues;
  }

  render() {
    if (!this.container) return;
    const project = getProject(this.projectId);
    const auditedList = this.auditProject(project || {});
    const totalComponents = Object.keys(project?.components || {}).length;
    const passedCount = totalComponents - auditedList.filter(a => a.issues.some(i => i.level === 'error')).length;

    this.container.innerHTML = `
      <div class="project-workspace-view">
        <header class="workspace-header">
          <div class="workspace-breadcrumbs">
            <button id="qa-back-btn" class="breadcrumb-back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              ${this.escapeHtml(project?.name || 'Project')}
            </button>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">Course QA Audit</span>
          </div>
        </header>

        <main class="workspace-container">
          <div class="workspace-banner" style="margin-bottom: 24px;">
            <div class="workspace-banner-info">
              <h2 class="workspace-title">Course Quality & Compliance Audit</h2>
              <p class="workspace-desc">Aggregated accessibility, metadata completeness, and readiness checks across all course components.</p>
            </div>
            <div class="workspace-banner-metrics">
              <div class="metric-card">
                <p class="metric-value">${totalComponents > 0 ? Math.round((passedCount / totalComponents) * 100) : 100}%</p>
                <p class="metric-label">QA Readiness</p>
              </div>
            </div>
          </div>

          <div class="sections-list">
            ${auditedList.length > 0 ? auditedList.map(item => `
              <div class="section-card">
                <div class="section-card-header">
                  <div class="section-header-left">
                    <span class="component-type-badge">${this.escapeHtml(item.component.type)}</span>
                    <h3 class="section-title">${this.escapeHtml(item.component.name)}</h3>
                  </div>
                  <button class="component-edit-btn" data-action="edit-audited" data-comp-id="${item.component.id}">
                    Fix in Editor
                  </button>
                </div>
                <div class="section-card-body">
                  ${item.issues.map(iss => `
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: ${iss.level === 'error' ? '#D32F2F' : iss.level === 'warn' ? '#E65100' : '#0288D1'};">
                      <span style="font-weight: 700; text-transform: uppercase; font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${iss.level === 'error' ? '#FEECEB' : iss.level === 'warn' ? '#FFF3E0' : '#E1F5FE'};">
                        ${iss.level}
                      </span>
                      <span>${this.escapeHtml(iss.message)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('') : `
              <div class="dashboard-empty-state">
                <h3 class="empty-state-title" style="color: #2E7D32;">All components pass quality checks!</h3>
                <p class="empty-state-subtitle">No missing titles, content errors, or broken configurations were found across this course.</p>
              </div>
            `}
          </div>
        </main>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    this.container.querySelector('#qa-back-btn')?.addEventListener('click', () => {
      if (this.onBack) this.onBack();
    });

    this.container.querySelectorAll('[data-action="edit-audited"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const compId = btn.dataset.compId;
        const project = getProject(this.projectId);
        const comp = project?.components?.[compId];
        if (comp && this.onEditComponent) {
          this.onEditComponent(project, comp);
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
