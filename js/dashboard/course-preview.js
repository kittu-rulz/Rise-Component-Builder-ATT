/**
 * Rise Component Builder AT&T — Real Full-Course Sequential Preview Controller
 * Compiles and renders real authored components in sequence using the canonical preview compiler.
 */

import { getProject } from '../storage.js';
import { generateIframeContent } from '../preview.js';
import { COMPONENT_MODULES, COMPONENT_REGISTRY } from '../component-registry.js';
import { toRgba as colorToRgba, escapeHTML } from '../utilities.js';

export class CoursePreviewView {
  constructor({ container, projectId, onBack, onEditComponent }) {
    this.container = container;
    this.projectId = projectId;
    this.onBack = onBack;
    this.onEditComponent = onEditComponent;

    this.state = {
      deviceMode: 'desktop', // 'desktop' | 'tablet' | 'mobile-lg' | 'mobile'
      fitToWidth: false,
      showBoundaries: false,
      showSafeArea: false,
      isFullscreen: false,
      previewKey: Date.now()
    };

    this.boundResizeMessageListener = this.handleIframeResizeMessage.bind(this);
  }

  mount() {
    window.addEventListener('message', this.boundResizeMessageListener);
    this.render();
  }

  unmount() {
    window.removeEventListener('message', this.boundResizeMessageListener);
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  handleIframeResizeMessage(event) {
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'rcb-iframe-height' && event.data.frameId && typeof event.data.height === 'number') {
      const iframe = this.container?.querySelector(`#${event.data.frameId}`);
      if (iframe) {
        iframe.style.height = `${Math.max(event.data.height + 20, 100)}px`;
      }
    }
  }

  getOrderedComponents(project) {
    const items = [];
    if (!project) return items;

    // Sections in order
    for (const secId of project.sectionOrder || []) {
      const sec = project.sections?.[secId];
      if (!sec) continue;
      items.push({ type: 'section-header', id: sec.id, title: sec.name, description: sec.description });
      for (const compId of sec.componentOrder || []) {
        const comp = project.components?.[compId];
        if (comp) {
          items.push({ type: 'component', component: comp, sectionTitle: sec.name, sectionId: sec.id });
        }
      }
    }

    // Unsectioned components
    if (project.unsectionedComponentOrder && project.unsectionedComponentOrder.length > 0) {
      items.push({ type: 'section-header', id: 'unsectioned', title: 'Unsectioned Components', description: 'Additional standalone components in this course project' });
      for (const compId of project.unsectionedComponentOrder) {
        const comp = project.components?.[compId];
        if (comp) {
          items.push({ type: 'component', component: comp, sectionTitle: 'Unsectioned', sectionId: null });
        }
      }
    }

    return items;
  }

  compileComponentHtml(project, comp) {
    try {
      const appState = {
        selectedComponent: { id: comp.type },
        config: comp.config || {},
        componentOverrides: comp.styleOverrides || {},
        currentProjectId: comp.id,
        activeTheme: project.theme,
        uiTheme: project.uiTheme || 'light'
      };

      const html = generateIframeContent(appState, COMPONENT_MODULES, colorToRgba);

      // Inject auto-resizing script into the iframe HTML
      const autoResizeScript = `
        <script>
          (function() {
            function reportHeight() {
              try {
                var body = document.body;
                var html = document.documentElement;
                var height = Math.max(
                  body.scrollHeight, body.offsetHeight,
                  html.clientHeight, html.scrollHeight, html.offsetHeight
                );
                window.parent.postMessage({
                  type: 'rcb-iframe-height',
                  frameId: 'iframe-comp-${comp.id}',
                  height: height
                }, '*');
              } catch(e) {}
            }
            window.addEventListener('load', reportHeight);
            window.addEventListener('resize', reportHeight);
            if (window.ResizeObserver) {
              new ResizeObserver(reportHeight).observe(document.body);
            }
            setTimeout(reportHeight, 300);
            setTimeout(reportHeight, 1000);
          })();
        </script>
      `;

      return {
        success: true,
        html: html.replace('</body>', `${autoResizeScript}</body>`)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to compile component preview'
      };
    }
  }

  render() {
    if (!this.container) return;
    const project = getProject(this.projectId);
    const orderedItems = this.getOrderedComponents(project);

    let maxCanvasWidth = '1080px';
    let deviceLabel = 'Desktop View (1080px max)';
    if (this.state.deviceMode === 'tablet') {
      maxCanvasWidth = '768px';
      deviceLabel = 'Tablet View (768px)';
    } else if (this.state.deviceMode === 'mobile-lg') {
      maxCanvasWidth = '430px';
      deviceLabel = 'Large Mobile (430px)';
    } else if (this.state.deviceMode === 'mobile') {
      maxCanvasWidth = '375px';
      deviceLabel = 'Mobile (375px)';
    }

    if (this.state.fitToWidth) {
      maxCanvasWidth = '100%';
    }

    this.container.innerHTML = `
      <div class="project-workspace-view ${this.state.isFullscreen ? 'preview-fullscreen-mode' : ''}">
        <header class="workspace-header">
          <div class="workspace-breadcrumbs">
            <button id="preview-back-btn" class="breadcrumb-back-btn" title="Return to Course Workspace">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              ${escapeHTML(project?.name || 'Course Project')}
            </button>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">Course Preview</span>
          </div>

          <div class="workspace-header-actions">
            <!-- Viewport Switcher -->
            <div class="preview-mode-pill-group" role="group" aria-label="Device viewport">
              <button class="filter-chip ${this.state.deviceMode === 'desktop' ? 'active' : ''}" data-device="desktop" title="Desktop mode">Desktop</button>
              <button class="filter-chip ${this.state.deviceMode === 'tablet' ? 'active' : ''}" data-device="tablet" title="Tablet mode (768px)">Tablet</button>
              <button class="filter-chip ${this.state.deviceMode === 'mobile-lg' ? 'active' : ''}" data-device="mobile-lg" title="Large Mobile (430px)">Mobile (430)</button>
              <button class="filter-chip ${this.state.deviceMode === 'mobile' ? 'active' : ''}" data-device="mobile" title="Mobile (375px)">Mobile (375)</button>
            </div>

            <!-- Display Toggles -->
            <button class="btn btn-secondary btn-sm ${this.state.showBoundaries ? 'active' : ''}" id="btn-toggle-boundaries" title="Toggle block boundaries">
              ${this.state.showBoundaries ? '✓ Boundaries' : 'Boundaries'}
            </button>
            <button class="btn btn-secondary btn-sm ${this.state.showSafeArea ? 'active' : ''}" id="btn-toggle-safe-area" title="Toggle 740px Rise safe area overlay">
              ${this.state.showSafeArea ? '✓ Rise Safe Area' : 'Safe Area'}
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-reset-preview" title="Reset all component interactions">
              ↺ Reset Interactions
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-toggle-fullscreen" title="Toggle Fullscreen">
              ${this.state.isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}
            </button>
          </div>
        </header>

        <main class="workspace-container course-preview-workspace-main" style="display: flex; flex-direction: column; align-items: center; background: var(--bg-canvas, #F4F6F9); min-height: calc(100vh - 120px); padding: 24px 16px;">
          <div class="preview-viewport-info-banner" style="font-size: 0.8125rem; color: #555; margin-bottom: 12px;">
            Showing: <strong>${deviceLabel}</strong> · ${orderedItems.filter(i => i.type === 'component').length} components in sequence
          </div>

          <div class="course-preview-canvas ${this.state.showSafeArea ? 'with-safe-area-overlay' : ''}" 
               style="width: 100%; max-width: ${maxCanvasWidth}; transition: max-width 0.25s ease; display: flex; flex-direction: column; gap: 36px;">
            ${orderedItems.map((item, index) => {
              if (item.type === 'section-header') {
                return `
                  <div class="course-preview-section-header" style="border-bottom: 2px solid var(--att-cobalt, #00388F); padding-bottom: 10px; margin-top: ${index === 0 ? '0' : '20px'};">
                    <h2 style="font-size: 1.375rem; font-weight: 700; color: var(--att-cobalt, #00388F); margin: 0 0 4px 0;">${escapeHTML(item.title)}</h2>
                    ${item.description ? `<p style="font-size: 0.875rem; color: #666; margin: 0;">${escapeHTML(item.description)}</p>` : ''}
                  </div>
                `;
              }

              const comp = item.component;
              const compiled = this.compileComponentHtml(project, comp);
              const registryEntry = COMPONENT_REGISTRY.find(r => r.id === comp.type);
              const typeName = registryEntry?.name || comp.type;

              return `
                <div class="course-preview-block ${this.state.showBoundaries ? 'outline-boundary' : ''}" 
                     id="preview-block-${comp.id}"
                     style="background: #ffffff; border: 1px solid #DCDFE3; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.04); position: relative;">
                  <div class="course-preview-block-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; background: #FAFAFA; border-bottom: 1px solid #EFEFEF;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span class="preview-comp-order-badge" style="font-size: 0.75rem; font-weight: 700; background: #E4E7EC; color: #333; padding: 2px 8px; border-radius: 12px;">${index + 1}</span>
                      <h3 style="font-size: 0.9375rem; font-weight: 600; color: #111; margin: 0;">${escapeHTML(comp.name)}</h3>
                      <span class="component-type-badge" style="font-size: 0.75rem; background: rgba(0, 56, 143, 0.08); color: var(--att-cobalt, #00388F); padding: 2px 8px; border-radius: 4px;">${escapeHTML(typeName)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <button type="button" class="btn btn-secondary btn-sm" data-action="edit-preview-comp" data-comp-id="${comp.id}" style="padding: 4px 10px; font-size: 0.8125rem;">
                        ✎ Edit Component
                      </button>
                    </div>
                  </div>

                  <div class="component-rendered-container" style="padding: 16px; min-height: 180px; position: relative; background: #ffffff;">
                    ${compiled.success ? `
                      <iframe 
                        id="iframe-comp-${comp.id}"
                        class="course-preview-component-frame"
                        srcdoc="${escapeHTML(compiled.html)}"
                        sandbox="allow-scripts allow-same-origin"
                        scrolling="no"
                        title="Preview of ${escapeHTML(comp.name)}"
                        style="width: 100%; border: none; min-height: 200px; display: block; overflow: hidden; transition: height 0.2s ease;">
                      </iframe>
                    ` : `
                      <div class="course-preview-error-card" style="padding: 20px; background: #FFF5F5; border: 1px solid #FEB2B2; border-radius: 8px; color: #C53030;">
                        <h4 style="margin: 0 0 8px 0; font-size: 0.9375rem; font-weight: 700;">⚠️ Could not render ${escapeHTML(comp.name)}</h4>
                        <p style="margin: 0 0 12px 0; font-size: 0.875rem;">${escapeHTML(compiled.error)}</p>
                        <button type="button" class="btn btn-secondary btn-sm" data-action="edit-preview-comp" data-comp-id="${comp.id}">
                          Open in Editor to Fix
                        </button>
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}

            ${orderedItems.length === 0 ? `
              <div class="dashboard-empty-state" style="width: 100%; text-align: center; padding: 48px 24px; background: #ffffff; border-radius: 16px; border: 1px dashed #DCDFE3;">
                <h3 class="empty-state-title" style="margin: 0 0 8px 0; font-size: 1.25rem;">No components in this course project yet</h3>
                <p class="empty-state-subtitle" style="color: #666; margin: 0 0 20px 0;">Add sections and components in the Course Workspace to preview the complete interactive flow here.</p>
                <button type="button" class="btn btn-primary" id="preview-empty-back-btn">Return to Course Workspace</button>
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

    this.container.querySelector('#preview-empty-back-btn')?.addEventListener('click', () => {
      if (this.onBack) this.onBack();
    });

    this.container.querySelectorAll('[data-device]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.deviceMode = btn.dataset.device;
        this.state.fitToWidth = false;
        this.render();
      });
    });

    this.container.querySelector('#btn-toggle-boundaries')?.addEventListener('click', () => {
      this.state.showBoundaries = !this.state.showBoundaries;
      this.render();
    });

    this.container.querySelector('#btn-toggle-safe-area')?.addEventListener('click', () => {
      this.state.showSafeArea = !this.state.showSafeArea;
      this.render();
    });

    this.container.querySelector('#btn-reset-preview')?.addEventListener('click', () => {
      this.state.previewKey = Date.now();
      this.render();
    });

    this.container.querySelector('#btn-toggle-fullscreen')?.addEventListener('click', () => {
      this.state.isFullscreen = !this.state.isFullscreen;
      this.render();
    });

    this.container.querySelectorAll('[data-action="edit-preview-comp"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const compId = btn.dataset.compId;
        const project = getProject(this.projectId);
        const comp = project?.components?.[compId];
        if (comp && this.onEditComponent) {
          this.onEditComponent(project, comp);
        }
      });
    });
  }
}
