/**
 * Course Project Multi-Component Structured ZIP Exporter
 * Bundles all course sections, component HTML packages, manifest, and assets into an organized ZIP.
 */

import { getProject } from '../storage.js';
import { createZip } from '../zip.js';
import { COMPONENT_REGISTRY } from '../component-registry.js';
import { generateIframeContent as compilePreview } from '../preview.js';
import { toRgba as colorToRgba } from '../utilities.js';
import { auditCourseProject } from './project-qa.js';
import { isolateModal } from './att-modal.js';

const componentRegistry = Object.fromEntries(
  COMPONENT_REGISTRY.map(entry => [entry.id, { ...entry.renderer, validate: entry.validate, version: entry.version }])
);

function sanitizeSlug(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function padZero(num) {
  return String(num).padStart(2, '0');
}

/**
 * Builds structured ZIP archive entries for an entire Schema v3 course project.
 * @param {string} projectId
 * @returns {Promise<Blob>}
 */
export async function buildCourseProjectZip(projectId) {
  const project = getProject(projectId);
  if (!project) throw new Error('Project not found.');

  const entries = [];

  const manifest = {
    courseName: project.name,
    client: project.clientLabel || 'AT&T',
    exportedAt: new Date().toISOString(),
    schemaVersion: project.schemaVersion,
    totalSections: (project.sectionOrder || []).length,
    totalComponents: Object.keys(project.components || {}).length,
    sections: []
  };

  let sectionIdx = 1;

  // Process sections in order
  for (const secId of project.sectionOrder || []) {
    const sec = project.sections?.[secId];
    if (!sec) continue;

    const secFolder = `${padZero(sectionIdx)}-${sanitizeSlug(sec.name)}`;
    const secManifest = {
      sectionId: sec.id,
      sectionName: sec.name,
      folder: secFolder,
      components: []
    };

    let compIdx = 1;
    for (const compId of sec.componentOrder || []) {
      const comp = project.components?.[compId];
      if (!comp) continue;

      const compFolder = `${secFolder}/${padZero(compIdx)}-${sanitizeSlug(comp.name)}`;
      const compDef = COMPONENT_REGISTRY.find(r => r.id === comp.type);
      const renderState = {
        selectedComponent: compDef,
        config: comp.config,
        activeTheme: project.theme,
        componentOverrides: comp.styleOverrides || project.componentOverrides,
        settings: project.settings,
        uiTheme: project.uiTheme
      };
      const compHtml = compilePreview(renderState, componentRegistry, colorToRgba);

      entries.push({
        path: `${compFolder}/index.html`,
        data: compHtml
      });

      secManifest.components.push({
        componentId: comp.id,
        name: comp.name,
        type: comp.type,
        path: `${compFolder}/index.html`
      });

      compIdx++;
    }

    manifest.sections.push(secManifest);
    sectionIdx++;
  }

  // Process unsectioned components
  if (project.unsectionedComponentOrder && project.unsectionedComponentOrder.length > 0) {
    const unsectionedFolder = 'unsectioned-components';
    const unsecManifest = {
      sectionId: 'unsectioned',
      sectionName: 'Unsectioned Components',
      folder: unsectionedFolder,
      components: []
    };

    let compIdx = 1;
    for (const compId of project.unsectionedComponentOrder) {
      const comp = project.components?.[compId];
      if (!comp) continue;

      const compFolder = `${unsectionedFolder}/${padZero(compIdx)}-${sanitizeSlug(comp.name)}`;
      const compDef = COMPONENT_REGISTRY.find(r => r.id === comp.type);
      const renderState = {
        selectedComponent: compDef,
        config: comp.config,
        activeTheme: project.theme,
        componentOverrides: comp.styleOverrides || project.componentOverrides,
        settings: project.settings,
        uiTheme: project.uiTheme
      };
      const compHtml = compilePreview(renderState, componentRegistry, colorToRgba);

      entries.push({
        path: `${compFolder}/index.html`,
        data: compHtml
      });

      unsecManifest.components.push({
        componentId: comp.id,
        name: comp.name,
        type: comp.type,
        path: `${compFolder}/index.html`
      });

      compIdx++;
    }

    manifest.sections.push(unsecManifest);
  }

  // Add manifest.json
  entries.push({
    path: 'manifest.json',
    data: JSON.stringify(manifest, null, 2)
  });

  // Add project backup json
  entries.push({
    path: 'project-backup.json',
    data: JSON.stringify(project, null, 2)
  });

  // Add course README.md with Rise 360 embedding instructions
  const readmeContent = `# ${project.name}
Course Component Package — Prepared for ${project.clientLabel || 'AT&T'}

## Package Structure
This ZIP contains all interactive learning components for this course, organized by section and lesson sequence.

${manifest.sections.map(s => `### ${s.sectionName}
${s.components.map(c => `- **${c.name}** (\`${c.type}\`): \`${c.path}\``).join('\n')}
`).join('\n')}

## How to Embed in Articulate Rise 360:
1. In Rise 360, add a **Multimedia > Embed** block (or **Multimedia > Web** block).
2. Host the \`index.html\` file on your web server / cloud storage, or embed via iframe:
   \`<iframe src="path/to/index.html" width="100%" height="600" frameborder="0"></iframe>\`
3. Each component includes built-in responsive sizing and WCAG 2.2 AA accessibility support.
`;

  entries.push({
    path: 'README.md',
    data: readmeContent
  });

  return createZip(entries);
}

/**
 * Triggers browser download of the complete course project ZIP.
 * @param {string} projectId
 */
export async function downloadCourseProjectZip(projectId) {
  const project = getProject(projectId);
  const zipBlob = await buildCourseProjectZip(projectId);
  const filename = `${sanitizeSlug(project?.name || 'course')}-full-package.zip`;

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Shows an interactive Pre-Export Review modal dialog before package generation.
 * @param {Object} options
 * @param {string} options.projectId
 * @param {Function} [options.onProceed]
 * @param {Function} [options.onViewQa]
 * @returns {Promise<boolean>}
 */
export function showPreExportReviewDialog({ projectId, onProceed, onViewQa }) {
  return new Promise((resolve) => {
    const project = getProject(projectId);
    if (!project) {
      resolve(false);
      return;
    }

    const previouslyFocused = document.activeElement;
    const qaReport = auditCourseProject(project);
    const totalSecs = (project.sectionOrder || []).length;
    const totalComps = qaReport.totalComponents;
    const hasBlockers = qaReport.counts.blockers > 0;
    const hasErrors = qaReport.counts.errors > 0;
    const hasWarnings = qaReport.counts.warnings > 0;
    const hasDrafts = qaReport.editorial.draftCount > 0;

    const existing = document.getElementById('att-export-review-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'att-export-review-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'att-export-review-title');

    // Make main background inert for accessibility
    const mainWorkspace = document.querySelector('.project-workspace-view, .project-dashboard-view, main');
    if (mainWorkspace) mainWorkspace.setAttribute('inert', '');

    const escapeHtml = (str) => {
      if (typeof str !== 'string') return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };

    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 640px;">
        <div class="modal-header">
          <div>
            <h2 id="att-export-review-title" class="modal-title">Pre-Export Package Review</h2>
            <p style="margin: 4px 0 0 0; font-size: 0.8125rem; color: var(--att-text-muted, #707780);">
              Review package contents, QA findings, and readiness status before generating ZIP
            </p>
          </div>
          <button id="att-export-review-close-btn" class="project-menu-btn" aria-label="Close review dialog" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Course Info Summary Card -->
          <div style="background: var(--att-grey-1, #F3F4F5); border: 1px solid var(--att-border, #DCDFE3); border-radius: 12px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <span class="project-client-badge" style="margin-bottom: 4px; display: inline-block;">${escapeHtml(project.clientLabel || 'AT&T')}</span>
                <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700; color: var(--att-heading-contrast, #000000);">${escapeHtml(project.name)}</h3>
              </div>
              <span class="project-card-status ${qaReport.overallStatusClass}" style="margin: 0; font-size: 0.75rem; font-weight: 700;">${escapeHtml(qaReport.overallStatus)}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.8125rem;">
              <div style="background: var(--att-surface, #FFFFFF); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--att-border, #DCDFE3);">
                <div style="color: var(--att-text-muted, #707780); font-size: 0.75rem;">Structure</div>
                <div style="font-weight: 700; color: var(--att-text, #000);">${totalSecs} Sections · ${totalComps} Comps</div>
              </div>
              <div style="background: var(--att-surface, #FFFFFF); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--att-border, #DCDFE3);">
                <div style="color: var(--att-text-muted, #707780); font-size: 0.75rem;">Editorial Status</div>
                <div style="font-weight: 700; color: var(--att-text, #000);">${qaReport.editorial.readyCount} Ready · ${qaReport.editorial.draftCount} Draft</div>
              </div>
              <div style="background: var(--att-surface, #FFFFFF); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--att-border, #DCDFE3);">
                <div style="color: var(--att-text-muted, #707780); font-size: 0.75rem;">Technical QA</div>
                <div style="font-weight: 700; color: var(--att-text, #000);">${qaReport.technicalScore}% Passed</div>
              </div>
            </div>
          </div>

          <!-- Canonical QA Status Notice Box -->
          ${hasBlockers ? `
            <div style="background: rgba(224, 88, 77, 0.08); border: 1px solid rgba(224, 88, 77, 0.3); border-radius: 12px; padding: 14px; display: flex; gap: 12px; align-items: flex-start;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E0584D" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <div>
                <div style="font-weight: 700; font-size: 0.875rem; color: #E0584D; margin-bottom: 4px;">Export Blocked (${qaReport.counts.blockers} Blocker${qaReport.counts.blockers > 1 ? 's' : ''})</div>
                <p style="margin: 0; font-size: 0.8125rem; color: var(--att-text, #000); line-height: 1.4;">
                  One or more components have critical blockers that prevent generating functional web packages. Please resolve them in Course QA before exporting.
                </p>
              </div>
            </div>
          ` : hasErrors ? `
            <div style="background: rgba(216, 67, 21, 0.08); border: 1px solid rgba(216, 67, 21, 0.3); border-radius: 12px; padding: 14px; display: flex; gap: 12px; align-items: flex-start;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D84315" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <div>
                <div style="font-weight: 700; font-size: 0.875rem; color: #D84315; margin-bottom: 4px;">Technical Errors Detected (${qaReport.counts.errors} Error${qaReport.counts.errors > 1 ? 's' : ''}, ${qaReport.counts.warnings} Warning${qaReport.counts.warnings > 1 ? 's' : ''})</div>
                <p style="margin: 0; font-size: 0.8125rem; color: var(--att-text, #000); line-height: 1.4;">
                  Technical quality errors exist (such as missing item titles). Exporting now is intended only for development drafts.
                </p>
              </div>
            </div>
          ` : (hasWarnings || hasDrafts) ? `
            <div style="background: rgba(255, 153, 0, 0.08); border: 1px solid rgba(255, 153, 0, 0.3); border-radius: 12px; padding: 14px; display: flex; gap: 12px; align-items: flex-start;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              <div>
                <div style="font-weight: 700; font-size: 0.875rem; color: #B45309; margin-bottom: 4px;">Readiness Notice (${qaReport.editorial.draftCount} Draft${qaReport.editorial.draftCount !== 1 ? 's' : ''}, ${qaReport.counts.warnings} Warning${qaReport.counts.warnings !== 1 ? 's' : ''})</div>
                <p style="margin: 0; font-size: 0.8125rem; color: var(--att-text, #000); line-height: 1.4;">
                  Course components are still marked as Draft or have non-blocking warnings. You can export now for drafting, or review in Course QA first.
                </p>
              </div>
            </div>
          ` : `
            <div style="background: rgba(0, 138, 0, 0.08); border: 1px solid rgba(0, 138, 0, 0.3); border-radius: 12px; padding: 14px; display: flex; gap: 12px; align-items: flex-start;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#008A00" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <div>
                <div style="font-weight: 700; font-size: 0.875rem; color: #008A00; margin-bottom: 4px;">Course is 100% Ready for Export</div>
                <p style="margin: 0; font-size: 0.8125rem; color: var(--att-text, #000); line-height: 1.4;">
                  All technical, editorial, and accessibility checks have passed.
                </p>
              </div>
            </div>
          `}

          <!-- Package Details -->
          <div style="border: 1px solid var(--att-border, #DCDFE3); border-radius: 12px; padding: 14px; font-size: 0.8125rem;">
            <div style="font-weight: 700; margin-bottom: 6px; color: var(--att-heading-contrast, #000);">Package Format Details:</div>
            <ul style="margin: 0; padding-left: 18px; color: var(--att-text-muted, #555); line-height: 1.5;">
              <li>Organized folders for each section and component HTML bundle.</li>
              <li>Includes <code>manifest.json</code> course hierarchy and <code>project-backup.json</code>.</li>
              <li>Includes <code>README.md</code> with Articulate Rise 360 iframe embed instructions.</li>
              <li>Compatible with Rise 360 Multimedia &gt; Embed blocks and custom LMS hosting.</li>
            </ul>
          </div>
        </div>

        <div class="modal-footer" style="display: flex; justify-content: space-between;">
          <button id="att-export-review-qa-btn" class="btn-att-secondary" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Review in Course QA
          </button>
          
          <div style="display: flex; gap: 8px;">
            <button id="att-export-review-cancel-btn" class="btn-att-secondary" type="button">Cancel</button>
            ${hasBlockers ? `
              <button id="att-export-review-proceed-btn" class="btn-att-primary" type="button" disabled title="Fix blockers before export" style="opacity: 0.5; cursor: not-allowed;">
                Export Blocked
              </button>
            ` : hasErrors ? `
              <button id="att-export-review-proceed-btn" class="btn-att-primary" type="button" style="background: #D84315;">
                Export Draft Package With Known Errors
              </button>
            ` : (hasWarnings || hasDrafts) ? `
              <button id="att-export-review-proceed-btn" class="btn-att-primary" type="button">
                Export Anyway
              </button>
            ` : `
              <button id="att-export-review-proceed-btn" class="btn-att-primary" type="button">
                Download Package
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    const modalRoot = document.getElementById('modal-root') || document.body;
    modalRoot.appendChild(overlay);

    const closeBtn = overlay.querySelector('#att-export-review-close-btn');
    const cancelBtn = overlay.querySelector('#att-export-review-cancel-btn');
    const qaBtn = overlay.querySelector('#att-export-review-qa-btn');
    const proceedBtn = overlay.querySelector('#att-export-review-proceed-btn');

    let cleanupIsolation = null;
    const cleanup = () => {
      if (cleanupIsolation) cleanupIsolation();
      overlay.remove();
    };

    cleanupIsolation = isolateModal(overlay, {
      triggerElement: previouslyFocused,
      onDismiss: () => {
        cleanup();
        resolve(false);
      }
    });

    /** @type {HTMLElement[]} */
    // @ts-ignore
    const focusableElements = Array.from(overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => el instanceof HTMLElement);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    });

    closeBtn?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    cancelBtn?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    qaBtn?.addEventListener('click', () => {
      cleanup();
      resolve(false);
      if (onViewQa) onViewQa(projectId);
    });

    proceedBtn?.addEventListener('click', async () => {
      if (hasBlockers) return;
      cleanup();
      resolve(true);
      if (onProceed) {
        await onProceed(projectId);
      } else {
        await downloadCourseProjectZip(projectId);
      }
    });
  });
}

