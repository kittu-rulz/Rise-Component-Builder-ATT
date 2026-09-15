/**
 * @file att-modal.js
 * Accessible, AT&T Brand styled Promise-based modal dialogs for prompts and confirmations.
 */

/**
 * Escapes HTML entities for safe template injection.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Shows an accessible AT&T styled text input prompt modal dialog.
 * @param {Object} options
 * @param {string} [options.title] - Dialog title
 * @param {string} [options.label] - Input field label
 * @param {string} [options.placeholder] - Placeholder text
 * @param {string} [options.defaultValue] - Initial input value
 * @param {string} [options.confirmText] - Label for the confirm button
 * @param {string} [options.cancelText] - Label for the cancel button
 * @param {boolean} [options.required] - If true, cannot be submitted empty
 * @returns {Promise<string|null>} Resolves with trimmed input value, or null if cancelled
 */
export function showPromptDialog({
  title = 'Enter Value',
  label = '',
  placeholder = '',
  defaultValue = '',
  confirmText = 'Save',
  cancelText = 'Cancel',
  required = false
}) {
  return new Promise((resolve) => {
    const existing = document.getElementById('att-dynamic-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'att-dynamic-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'att-modal-prompt-title');

    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h2 id="att-modal-prompt-title" class="modal-title">${escapeHtml(title)}</h2>
          <button id="att-modal-close-btn" class="project-menu-btn" aria-label="Close dialog" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form id="att-modal-prompt-form">
          <div class="modal-body">
            <div class="form-group">
              ${label ? `<label for="att-modal-prompt-input" class="form-label">${escapeHtml(label)}</label>` : ''}
              <input
                id="att-modal-prompt-input"
                class="form-input"
                type="text"
                value="${escapeHtml(defaultValue)}"
                placeholder="${escapeHtml(placeholder)}"
                ${required ? 'required' : ''}
                autocomplete="off"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button id="att-modal-cancel-btn" class="btn-att-secondary" type="button">${escapeHtml(cancelText)}</button>
            <button id="att-modal-submit-btn" class="btn-att-primary" type="submit">${escapeHtml(confirmText)}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = /** @type {HTMLInputElement|null} */ (overlay.querySelector('#att-modal-prompt-input'));
    const form = overlay.querySelector('#att-modal-prompt-form');
    const closeBtn = overlay.querySelector('#att-modal-close-btn');
    const cancelBtn = overlay.querySelector('#att-modal-cancel-btn');

    const cleanup = () => {
      document.removeEventListener('keydown', handleKeydown);
      overlay.remove();
    };

    /** @param {KeyboardEvent} e */
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
        resolve(null);
      }
    };

    document.addEventListener('keydown', handleKeydown);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(null);
      }
    });

    closeBtn?.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    cancelBtn?.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input ? input.value.trim() : '';
      if (required && !val) return;
      cleanup();
      resolve(val);
    });

    setTimeout(() => {
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  });
}

/**
 * Shows an accessible AT&T styled confirmation modal dialog.
 * @param {Object} options
 * @param {string} [options.title] - Dialog title
 * @param {string} [options.message] - Confirmation message description
 * @param {string} [options.confirmText] - Label for confirm button
 * @param {string} [options.cancelText] - Label for cancel button
 * @param {boolean} [options.isDanger] - If true, confirm button has destructive styling
 * @returns {Promise<boolean>} Resolves true on confirm, false on cancel
 */
export function showConfirmDialog({
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false
}) {
  return new Promise((resolve) => {
    const existing = document.getElementById('att-dynamic-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'att-dynamic-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'att-modal-confirm-title');

    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h2 id="att-modal-confirm-title" class="modal-title">${escapeHtml(title)}</h2>
          <button id="att-modal-close-btn" class="project-menu-btn" aria-label="Close dialog" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="margin: 0; font-size: var(--att-fs-body, 1rem); color: var(--att-text, #000000); line-height: 1.5;">
            ${escapeHtml(message)}
          </p>
        </div>
        <div class="modal-footer">
          <button id="att-modal-cancel-btn" class="btn-att-secondary" type="button">${escapeHtml(cancelText)}</button>
          <button id="att-modal-confirm-btn" class="${isDanger ? 'btn-att-danger' : 'btn-att-primary'}" type="button">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('#att-modal-close-btn');
    const cancelBtn = overlay.querySelector('#att-modal-cancel-btn');
    const confirmBtn = /** @type {HTMLButtonElement|null} */ (overlay.querySelector('#att-modal-confirm-btn'));

    const cleanup = () => {
      document.removeEventListener('keydown', handleKeydown);
      overlay.remove();
    };

    /** @param {KeyboardEvent} e */
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
        resolve(false);
      }
    };

    document.addEventListener('keydown', handleKeydown);

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

    confirmBtn?.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    setTimeout(() => {
      if (confirmBtn) confirmBtn.focus();
    }, 50);
  });
}
