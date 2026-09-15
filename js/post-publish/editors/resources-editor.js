// @ts-nocheck
import { escapeAttribute, escapeHTML, formatStorageBytes } from '../../utilities.js';
import { saveMediaRecord } from '../../media-storage.js';

/**
 * Creates the interactive Resources authoring UI.
 * @param {any} config
 * @param {() => void} onUpdate
 * @returns {HTMLElement}
 */
export function createResourcesEditor(config, onUpdate) {
  const container = document.createElement('div');
  container.className = 'ppt-tool-editor ppt-resources-editor';

  const header = document.createElement('div');
  header.className = 'ppt-editor-header-bar';
  header.innerHTML = `
    <div class="ppt-editor-title-group">
      <h3>Persistent Course Resources</h3>
      <p class="field-hint">Provide downloadable documents, job aids, external links, and multimedia guides accessible to learners anywhere in the course.</p>
    </div>
    <div class="ppt-editor-actions-group">
      <button type="button" class="btn btn-primary btn-sm" id="btn-add-resource">
        <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M17 9h-2v6H9v2h6v6h2v-6h6v-2h-6z"/></svg>
        <span>Add Resource</span>
      </button>
    </div>
  `;
  container.appendChild(header);

  // Filter toolbar
  const filterBar = document.createElement('div');
  filterBar.className = 'ppt-list-filter-bar';
  filterBar.innerHTML = `
    <input type="search" class="ppt-search-input" placeholder="Search resources, categories, types..." aria-label="Filter resources">
    <span class="ppt-item-count" id="resource-item-count">${config.resources.items.length} items</span>
  `;
  container.appendChild(filterBar);

  const resourceListContainer = document.createElement('div');
  resourceListContainer.className = 'ppt-resources-list';
  container.appendChild(resourceListContainer);

  function renderResourceCards(filterQuery = '') {
    resourceListContainer.innerHTML = '';
    const query = filterQuery.toLowerCase().trim();
    const items = config.resources.items;

    const filtered = query
      ? items.filter(r => (r.title + ' ' + r.description + ' ' + r.category + ' ' + r.type).toLowerCase().includes(query))
      : items;

    const countEl = filterBar.querySelector('#resource-item-count');
    if (countEl) countEl.textContent = `${items.length} resource${items.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'ppt-empty-state';
      emptyState.innerHTML = `
        <p>No resources configured. Click <strong>Add Resource</strong> to add documents, links, or guides.</p>
      `;
      resourceListContainer.appendChild(emptyState);
      return;
    }

    filtered.forEach((resource) => {
      const actualIndex = items.indexOf(resource);
      const isUpload = resource.sourceType === 'upload';

      const card = document.createElement('div');
      card.className = `ppt-entry-card ${resource.featured ? 'ppt-card-featured' : ''}`;
      card.innerHTML = `
        <div class="ppt-card-header">
          <div class="ppt-card-title-row">
            <span class="ppt-card-index">#${actualIndex + 1}</span>
            <span class="ppt-card-term-title">${escapeHTML(resource.title || 'Untitled Resource')}</span>
            <span class="ppt-badge ppt-type-badge">${escapeHTML(resource.type.toUpperCase())}</span>
            ${resource.category ? `<span class="ppt-category-tag">${escapeHTML(resource.category)}</span>` : ''}
            ${resource.featured ? `<span class="ppt-featured-badge">Featured</span>` : ''}
          </div>
          <div class="ppt-card-header-actions">
            <button type="button" class="btn-icon-sm btn-dup-resource" title="Duplicate resource" aria-label="Duplicate resource">
              <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M28 10V28H10V10H28ZM28 8H10C8.9 8 8 8.9 8 10V28C8 29.1 8.9 30 10 30H28C29.1 30 30 29.1 30 28V10C30 8.9 29.1 8 28 8ZM22 4H4C2.9 4 2 4.9 2 6V24H4V6H22V4Z"/></svg>
            </button>
            <button type="button" class="btn-icon-sm btn-delete-resource" title="Delete resource" aria-label="Delete resource">
              <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M12 12h2v12h-2zm6 0h2v12h-2z"/><path d="M4 6v2h2v20a2 2 0 002 2h16a2 2 0 002-2V8h2V6h-6V4a2 2 0 00-2-2h-8a2 2 0 00-2 2v2H4zm4 22V8h16v20H8zm4-24h8v2h-8V4z"/></svg>
            </button>
          </div>
        </div>

        <div class="ppt-card-body">
          <div class="ppt-form-grid">
            <div class="input-wrapper">
              <label>Resource Title <span class="required">*</span></label>
              <input type="text" class="input-res-title" value="${escapeAttribute(resource.title)}" placeholder="e.g. Field Safety Manual">
            </div>
            <div class="input-wrapper">
              <label>Resource Type</label>
              <select class="select-res-type">
                <option value="document" ${resource.type === 'document' ? 'selected' : ''}>Document (PDF, DOCX, etc.)</option>
                <option value="link" ${resource.type === 'link' ? 'selected' : ''}>External Web Link</option>
                <option value="video" ${resource.type === 'video' ? 'selected' : ''}>Video</option>
                <option value="audio" ${resource.type === 'audio' ? 'selected' : ''}>Audio</option>
                <option value="tool" ${resource.type === 'tool' ? 'selected' : ''}>Interactive Tool / App</option>
                <option value="other" ${resource.type === 'other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="input-wrapper">
              <label>Category / Topic</label>
              <input type="text" class="input-res-category" value="${escapeAttribute(resource.category || '')}" placeholder="e.g. Quick Reference">
            </div>
            <div class="input-wrapper">
              <label>Source Type</label>
              <select class="select-res-source">
                <option value="url" ${!isUpload ? 'selected' : ''}>External Web URL</option>
                <option value="upload" ${isUpload ? 'selected' : ''}>Upload File (Packaged in Course ZIP)</option>
              </select>
            </div>
          </div>

          <div class="input-wrapper">
            <label>Short Description (Optional)</label>
            <input type="text" class="input-res-desc" value="${escapeAttribute(resource.description || '')}" placeholder="Summary of what this resource covers">
          </div>

          <div class="ppt-source-section">
            ${isUpload ? `
              <div class="ppt-file-upload-box">
                <div class="ppt-upload-status-row">
                  <span class="ppt-file-label">
                    ${resource.fileRef ? `📄 <strong>${escapeHTML(resource.fileRef.name)}</strong> (${formatStorageBytes(resource.fileRef.size || 0)})` : 'No file uploaded yet'}
                  </span>
                  <button type="button" class="btn btn-secondary btn-sm btn-choose-file">Choose File...</button>
                  <input type="file" class="hidden-file-input" style="display:none;">
                </div>
              </div>
            ` : `
              <div class="input-wrapper">
                <label>Resource URL <span class="required">*</span></label>
                <input type="url" class="input-res-url" value="${escapeAttribute(resource.url || '')}" placeholder="https://example.com/document.pdf">
              </div>
            `}
          </div>

          <div class="ppt-form-grid">
            <div class="input-wrapper">
              <label>Action Button Label</label>
              <input type="text" class="input-res-action" value="${escapeAttribute(resource.actionLabel || '')}" placeholder="e.g. Open PDF, Download, Watch">
            </div>
            <div class="input-wrapper">
              <label>Open Behavior</label>
              <select class="select-res-behavior">
                <option value="new-tab" ${resource.openBehavior === 'new-tab' ? 'selected' : ''}>Open in New Tab</option>
                <option value="download" ${resource.openBehavior === 'download' ? 'selected' : ''}>Download File</option>
              </select>
            </div>
            <div class="input-wrapper ppt-checkbox-wrapper">
              <label class="checkbox-label">
                <input type="checkbox" class="input-res-featured" ${resource.featured ? 'checked' : ''}>
                <span>Pin as Featured Resource (highlighted at top)</span>
              </label>
            </div>
          </div>
        </div>
      `;

      // Event listeners
      const titleInput = card.querySelector('.input-res-title');
      titleInput.addEventListener('input', () => {
        resource.title = titleInput.value;
        card.querySelector('.ppt-card-term-title').textContent = resource.title || 'Untitled Resource';
        onUpdate();
      });

      const typeSelect = card.querySelector('.select-res-type');
      typeSelect.addEventListener('change', () => {
        resource.type = typeSelect.value;
        if (!resource.actionLabel || ['Open PDF', 'Watch Video', 'Listen', 'Open Link', 'Launch Tool', 'Open'].includes(resource.actionLabel)) {
          const actionDefaults = {
            document: 'Open Document',
            link: 'Open Link',
            video: 'Watch Video',
            audio: 'Listen',
            tool: 'Launch Tool',
            other: 'Open'
          };
          resource.actionLabel = actionDefaults[resource.type] || 'Open';
          card.querySelector('.input-res-action').value = resource.actionLabel;
        }
        renderResourceCards(filterBar.querySelector('.ppt-search-input').value);
        onUpdate();
      });

      const sourceSelect = card.querySelector('.select-res-source');
      sourceSelect.addEventListener('change', () => {
        resource.sourceType = sourceSelect.value;
        renderResourceCards(filterBar.querySelector('.ppt-search-input').value);
        onUpdate();
      });

      const descInput = card.querySelector('.input-res-desc');
      descInput.addEventListener('input', () => {
        resource.description = descInput.value;
        onUpdate();
      });

      const catInput = card.querySelector('.input-res-category');
      catInput.addEventListener('input', () => {
        resource.category = catInput.value;
        onUpdate();
      });

      const urlInput = card.querySelector('.input-res-url');
      if (urlInput) {
        urlInput.addEventListener('input', () => {
          resource.url = urlInput.value;
          onUpdate();
        });
      }

      const fileBtn = card.querySelector('.btn-choose-file');
      const fileInput = card.querySelector('.hidden-file-input');
      if (fileBtn && fileInput) {
        fileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const arrayBuffer = await file.arrayBuffer();
            const record = {
              id: `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name,
              mimeType: file.type || 'application/octet-stream',
              size: file.size,
              blob: file,
              createdAt: new Date().toISOString()
            };
            const savedRef = await saveMediaRecord(record);
            resource.fileRef = {
              mediaId: savedRef.mediaId,
              name: savedRef.name || file.name,
              mimeType: savedRef.mimeType || file.type || 'application/octet-stream',
              size: savedRef.size || file.size,
              data: new Uint8Array(arrayBuffer)
            };
            if (!resource.title || resource.title === 'Untitled Resource') {
              resource.title = file.name.replace(/\.[^/.]+$/, '');
            }
            renderResourceCards(filterBar.querySelector('.ppt-search-input').value);
            onUpdate();
          } catch (err) {
            alert(`File upload failed: ${err.message}`);
          }
        });
      }

      const actionInput = card.querySelector('.input-res-action');
      actionInput.addEventListener('input', () => {
        resource.actionLabel = actionInput.value;
        onUpdate();
      });

      const behaviorSelect = card.querySelector('.select-res-behavior');
      behaviorSelect.addEventListener('change', () => {
        resource.openBehavior = behaviorSelect.value;
        onUpdate();
      });

      const featuredInput = card.querySelector('.input-res-featured');
      featuredInput.addEventListener('change', () => {
        resource.featured = featuredInput.checked;
        renderResourceCards(filterBar.querySelector('.ppt-search-input').value);
        onUpdate();
      });

      card.querySelector('.btn-delete-resource').addEventListener('click', () => {
        config.resources.items.splice(actualIndex, 1);
        renderResourceCards(filterBar.querySelector('.ppt-search-input').value);
        onUpdate();
      });

      card.querySelector('.btn-dup-resource').addEventListener('click', () => {
        const copy = JSON.parse(JSON.stringify(resource));
        copy.id = `res-${Date.now().toString(36)}`;
        copy.title = `${resource.title} (Copy)`;
        config.resources.items.splice(actualIndex + 1, 0, copy);
        renderResourceCards(filterBar.querySelector('.ppt-search-input').value);
        onUpdate();
      });

      resourceListContainer.appendChild(card);
    });
  }

  // Initial render
  renderResourceCards();

  // Search input event
  const searchInput = filterBar.querySelector('.ppt-search-input');
  searchInput.addEventListener('input', () => {
    renderResourceCards(searchInput.value);
  });

  // Add Resource button
  header.querySelector('#btn-add-resource').addEventListener('click', () => {
    config.resources.items.push({
      id: `res-${Date.now().toString(36)}`,
      title: 'New Resource Item',
      description: '',
      type: 'document',
      sourceType: 'url',
      url: 'https://example.com/document.pdf',
      fileRef: null,
      category: 'General',
      featured: false,
      actionLabel: 'Open Document',
      openBehavior: 'new-tab'
    });
    renderResourceCards(searchInput.value);
    onUpdate();
  });

  return container;
}
