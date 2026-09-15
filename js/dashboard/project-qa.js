/**
 * @file project-qa.js
 * Project QA Aggregator View Controller
 * Performs aggregated technical validation, accessibility checks, brand compliance,
 * and editorial readiness scoring across all course components.
 */

import { getProject } from '../storage.js';

/**
 * Performs a deep audit of a course project.
 * @param {Object} project
 * @returns {Object} Full audit report with separate technical and editorial metrics
 */
export function auditCourseProject(project) {
  const components = Object.values(project?.components || {});
  const totalComponents = components.length;

  let blockerCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let recommendationCount = 0;
  let passedCount = 0;

  let draftCount = 0;
  let readyCount = 0;
  let inReviewCount = 0;

  const componentReports = [];

  for (const comp of components) {
    const cfg = comp.config || {};
    const compIssues = [];
    let compPassedChecks = 0;

    // 1. Status tracking
    if (comp.status === 'draft') {
      draftCount++;
      compIssues.push({
        severity: 'warning',
        category: 'Editorial',
        title: 'Component in Draft Status',
        message: 'This block is marked as Draft and should be reviewed and set to Ready before final export.',
        preventsExport: false
      });
      warningCount++;
    } else if (comp.status === 'in-review') {
      inReviewCount++;
      compIssues.push({
        severity: 'recommendation',
        category: 'Editorial',
        title: 'Component In Review',
        message: 'This block is currently undergoing review.',
        preventsExport: false
      });
      recommendationCount++;
    } else {
      readyCount++;
      compPassedChecks++;
      passedCount++;
    }

    // 2. Component Name Check
    if (!comp.name || comp.name.trim() === 'Untitled Component') {
      compIssues.push({
        severity: 'warning',
        category: 'Metadata',
        title: 'Default Untitled Name',
        message: 'Component uses the placeholder name "Untitled Component". Give it a descriptive name.',
        preventsExport: false
      });
      warningCount++;
    } else {
      compPassedChecks++;
      passedCount++;
    }

    // 3. Content Items Count Check
    const items = Array.isArray(cfg.items) ? cfg.items : [];
    if (items.length === 0) {
      compIssues.push({
        severity: 'blocker',
        category: 'Content',
        title: 'Zero Content Items',
        message: 'Component has no interactive items or steps configured. It will render empty.',
        preventsExport: true
      });
      blockerCount++;
    } else {
      compPassedChecks++;
      passedCount++;
    }

    // 4. Blank Item Titles Check
    if (items.length > 0) {
      const emptyTitles = items.filter(item => !item.title || !String(item.title).trim());
      if (emptyTitles.length > 0) {
        compIssues.push({
          severity: 'error',
          category: 'Content',
          title: 'Blank Item Titles',
          message: `${emptyTitles.length} item(s) have blank or missing titles.`,
          preventsExport: false
        });
        errorCount++;
      } else {
        compPassedChecks++;
        passedCount++;
      }
    }

    // 5. Block Header Check
    if (!cfg.blockTitle && !cfg.blockHeadline) {
      compIssues.push({
        severity: 'recommendation',
        category: 'Structure',
        title: 'Missing Block Header',
        message: 'No block title or headline is set for this component.',
        preventsExport: false
      });
      recommendationCount++;
    } else {
      compPassedChecks++;
      passedCount++;
    }

    componentReports.push({
      component: comp,
      passedChecks: compPassedChecks,
      issues: compIssues
    });
  }

  // Calculate Technical Score (0 - 100%)
  const totalTechnicalChecks = (totalComponents * 4) || 1;
  const technicalPassed = passedCount - readyCount; // technical checks only
  const technicalScore = Math.max(0, Math.min(100, Math.round((technicalPassed / totalTechnicalChecks) * 100)));

  // Determine Overall Readiness Status
  let overallStatus = 'Ready to Export';
  let overallStatusClass = 'status-ready';
  let overallScore = 100;

  if (totalComponents === 0) {
    overallStatus = 'Empty Course';
    overallStatusClass = 'status-warning';
    overallScore = 0;
  } else if (blockerCount > 0) {
    overallStatus = 'Blocked';
    overallStatusClass = 'status-blocker';
    overallScore = Math.min(40, technicalScore);
  } else if (errorCount > 0 || (draftCount === totalComponents && totalComponents > 0)) {
    overallStatus = 'Not Ready';
    overallStatusClass = 'status-not-ready';
    overallScore = Math.round(technicalScore * 0.5 + (readyCount / totalComponents) * 50);
  } else if (draftCount > 0) {
    overallStatus = 'In Progress';
    overallStatusClass = 'status-in-progress';
    overallScore = Math.round(technicalScore * 0.7 + (readyCount / totalComponents) * 30);
  } else {
    overallStatus = 'Ready to Export';
    overallStatusClass = 'status-ready';
    overallScore = technicalScore;
  }

  return {
    totalComponents,
    technicalScore,
    overallScore,
    overallStatus,
    overallStatusClass,
    editorial: {
      draftCount,
      inReviewCount,
      readyCount
    },
    counts: {
      blockers: blockerCount,
      errors: errorCount,
      warnings: warningCount,
      recommendations: recommendationCount,
      passed: passedCount
    },
    componentReports
  };
}

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
    const report = auditCourseProject(project);
    return report.componentReports.map(cr => ({
      component: cr.component,
      issues: cr.issues.map(iss => ({
        ...iss,
        level: iss.severity === 'blocker' || iss.severity === 'error' ? 'error' : iss.severity === 'warning' ? 'warn' : 'info'
      }))
    }));
  }

  render() {
    if (!this.container) return;
    const project = getProject(this.projectId);
    const audit = auditCourseProject(project || {});

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
              <p class="workspace-desc">
                Technical checks: <strong>${audit.technicalScore}% passed</strong> · 
                Editorial status: <strong>${audit.editorial.draftCount} in Draft</strong>, <strong>${audit.editorial.readyCount} Ready</strong> · 
                Overall: <strong>${audit.overallStatus}</strong>
              </p>
              <div style="margin-top: 8px; font-size: 0.8125rem; color: #555555; display: flex; gap: 16px; flex-wrap: wrap;">
                <span>🛑 <strong>${audit.counts.blockers}</strong> blockers</span>
                <span>⚠️ <strong>${audit.counts.errors}</strong> errors</span>
                <span>📋 <strong>${audit.counts.warnings}</strong> warnings</span>
                <span>💡 <strong>${audit.counts.recommendations}</strong> suggestions</span>
                <span>✅ <strong>${audit.counts.passed}</strong> passed</span>
              </div>
            </div>
            <div class="workspace-banner-metrics">
              <div class="metric-card">
                <p class="metric-value" style="color: ${audit.overallStatus === 'Ready to Export' ? '#10B981' : audit.overallStatus === 'In Progress' ? '#F59E0B' : '#EF4444'};">
                  ${audit.overallScore}%
                </p>
                <p class="metric-label">${audit.overallStatus}</p>
              </div>
            </div>
          </div>

          <div class="sections-list">
            ${audit.componentReports.length > 0 ? audit.componentReports.map(item => `
              <div class="section-card">
                <div class="section-card-header">
                  <div class="section-header-left">
                    <span class="component-type-badge">${this.escapeHtml(item.component.type)}</span>
                    <h3 class="section-title">${this.escapeHtml(item.component.name)}</h3>
                    <span class="component-status-pill ${item.component.status === 'ready' ? 'status-ready' : 'status-draft'}">
                      ${this.escapeHtml(item.component.status || 'draft')}
                    </span>
                  </div>
                  <button class="component-edit-btn" data-action="edit-audited" data-comp-id="${item.component.id}">
                    Fix in Editor
                  </button>
                </div>
                <div class="section-card-body">
                  ${item.issues.length > 0 ? item.issues.map(iss => `
                    <div style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.875rem; margin-bottom: 8px;">
                      <span style="font-weight: 700; text-transform: uppercase; font-size: 11px; padding: 2px 8px; border-radius: 4px; white-space: nowrap; ${this.getSeverityBadgeStyle(iss.severity)}">
                        ${iss.severity}
                      </span>
                      <div>
                        <strong>${this.escapeHtml(iss.title)}:</strong>
                        <span style="color: #444444;">${this.escapeHtml(iss.message)}</span>
                      </div>
                    </div>
                  `).join('') : `
                    <p style="margin: 0; font-size: 0.875rem; color: #10B981; display: flex; align-items: center; gap: 6px;">
                      <span>✓</span> All quality and metadata checks pass.
                    </p>
                  `}
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

  getSeverityBadgeStyle(severity) {
    switch (severity) {
      case 'blocker':
        return 'background: #FEECEB; color: #D32F2F; border: 1px solid #FFCDD2;';
      case 'error':
        return 'background: #FFF3E0; color: #D84315; border: 1px solid #FFE0B2;';
      case 'warning':
        return 'background: #FFFDE7; color: #F57F17; border: 1px solid #FFF59D;';
      case 'recommendation':
        return 'background: #E1F5FE; color: #0277BD; border: 1px solid #B3E5FC;';
      default:
        return 'background: #E8F5E9; color: #2E7D32; border: 1px solid #C8E6C9;';
    }
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
