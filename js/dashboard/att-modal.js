/**
 * @file att-modal.js
 * Accessible, AT&T Brand styled Promise-based modal dialogs and modal isolation utilities.
 * Handles role="dialog", aria-modal="true", background inert isolation, Tab focus trapping,
 * Escape key dismissal, and trigger focus restoration.
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

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

const activeModalStack = [];

/**
 * Isolates a modal dialog by:
 * 1. Setting `inert` on background application containers (#app-shell)
 * 2. Trapping keyboard Tab / Shift+Tab focus inside the modal
 * 3. Listening for Escape key to trigger dismissCallback
 * 4. Restoring focus to the triggerElement or fallback selector when unmounted
 *
 * @param {HTMLElement} modalElement - The modal container/overlay
 * @param {Object} [options]
 * @param {Element|null} [options.triggerElement] - Element that opened the modal (for focus restoration)
 * @param {string|null} [options.fallbackSelector] - Fallback CSS selector if opener is re-rendered
 * @param {Function} [options.onDismiss] - Callback when user presses Escape or clicks outside
 * @returns {Function} cleanup - Function to call when modal is closed
 */
export function isolateModal(modalElement, { triggerElement = null, fallbackSelector = null, onDismiss = null } = {}) {
  if (!modalElement) return () => {};

  const opener = triggerElement || (typeof document !== 'undefined' ? document.activeElement : null);
  const fallback = fallbackSelector || (opener?.id ? `#${opener.id}` : null);

  // If previous modal was active, make it inert
  if (activeModalStack.length > 0) {
    const parentModal = activeModalStack[activeModalStack.length - 1];
    if (parentModal.element !== modalElement) {
      try {
        parentModal.element.setAttribute('inert', '');
        parentModal.element.setAttribute('aria-hidden', 'true');
      } catch {
        // ignore
      }
    }
  }

  // App shell background inertness
  const appShell = typeof document !== 'undefined'
    ? (document.getElementById('app-shell') || document.querySelector('.app-container'))
    : null;

  if (appShell && !modalElement.contains(appShell) && !appShell.contains(modalElement)) {
    try {
      appShell.setAttribute('inert', '');
      appShell.setAttribute('aria-hidden', 'true');
    } catch {
      // ignore
    }
  }

  // Also catch any other siblings outside modal root if not in app shell
  const otherRoots = typeof document !== 'undefined'
    ? Array.from(document.querySelectorAll('.app-workspace, #app-root, .dashboard-container, .workspace-container'))
        .filter(el => !el.contains(modalElement) && el !== modalElement && el !== appShell)
    : [];

  otherRoots.forEach(el => {
    try {
      el.setAttribute('inert', '');
      el.setAttribute('aria-hidden', 'true');
    } catch {
      // ignore
    }
  });

  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.add('has-open-modal');
  }

  // Record this modal in stack
  const entry = { element: modalElement, opener, fallback, onDismiss };
  activeModalStack.push(entry);

  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof onDismiss === 'function') onDismiss();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = Array.from(modalElement.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
        const htmlEl = /** @type {HTMLElement} */ (el);
        return htmlEl.offsetParent !== null || htmlEl.offsetWidth > 0 || htmlEl.offsetHeight > 0;
      });
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = /** @type {HTMLElement} */ (focusable[0]);
      const last = /** @type {HTMLElement} */ (focusable[focusable.length - 1]);

      if (e.shiftKey) {
        if (document.activeElement === first || !modalElement.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !modalElement.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', handleKeydown, true);
  }

  return function cleanupModalIsolation() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', handleKeydown, true);
    }

    // Remove this modal from stack
    const idx = activeModalStack.findIndex(item => item.element === modalElement);
    if (idx !== -1) {
      activeModalStack.splice(idx, 1);
    }

    // If there is still a parent modal in stack, restore its active state
    if (activeModalStack.length > 0) {
      const currentTop = activeModalStack[activeModalStack.length - 1];
      try {
        currentTop.element.removeAttribute('inert');
        currentTop.element.removeAttribute('aria-hidden');
      } catch {
        // ignore
      }
    } else {
      // Remove inert from appShell and body class
      if (appShell) {
        try {
          appShell.removeAttribute('inert');
          appShell.removeAttribute('aria-hidden');
        } catch {
          // ignore
        }
      }
      otherRoots.forEach(el => {
        try {
          el.removeAttribute('inert');
          el.removeAttribute('aria-hidden');
        } catch {
          // ignore
        }
      });
      if (typeof document !== 'undefined' && document.body) {
        document.body.classList.remove('has-open-modal');
      }
    }

    // Focus restoration: opener -> fallback -> nearest control
    if (opener && typeof /** @type {HTMLElement} */ (opener).focus === 'function' && document.contains(opener) && !/** @type {HTMLElement} */ (opener).hasAttribute('disabled')) {
      try {
        /** @type {HTMLElement} */ (opener).focus();
      } catch {
        // ignore
      }
    } else if (fallback && typeof document !== 'undefined') {
      try {
        const fallbackEl = /** @type {HTMLElement|null} */ (document.querySelector(fallback));
        if (fallbackEl && typeof fallbackEl.focus === 'function' && !fallbackEl.hasAttribute('disabled')) {
          fallbackEl.focus();
        }
      } catch {
        // ignore
      }
    }
  };
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
 * @param {Element|null} [options.triggerElement] - Element to restore focus to
 * @returns {Promise<string|null>} Resolves with trimmed input value, or null if cancelled
 */
export function showPromptDialog({
  title = 'Enter Value',
  label = '',
  placeholder = '',
  defaultValue = '',
  confirmText = 'Save',
  cancelText = 'Cancel',
  required = false,
  triggerElement = (typeof document !== 'undefined' ? document.activeElement : null)
}) {
  return new Promise((resolve) => {
    const existing = document.getElementById('att-dynamic-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'att-dynamic-modal-overlay';
    overlay.className = 'modal-overlay is-active';
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

    const modalRoot = document.getElementById('modal-root') || document.body;
    modalRoot.appendChild(overlay);

    let cleanupIsolation = null;
    const cleanup = () => {
      if (cleanupIsolation) cleanupIsolation();
      overlay.remove();
    };

    cleanupIsolation = isolateModal(overlay, {
      triggerElement,
      onDismiss: () => {
        cleanup();
        resolve(null);
      }
    });

    const input = /** @type {HTMLInputElement|null} */ (overlay.querySelector('#att-modal-prompt-input'));
    const form = overlay.querySelector('#att-modal-prompt-form');
    const closeBtn = overlay.querySelector('#att-modal-close-btn');
    const cancelBtn = overlay.querySelector('#att-modal-cancel-btn');

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
 * @param {Element|null} [options.triggerElement] - Element to restore focus to
 * @returns {Promise<boolean>} Resolves true on confirm, false on cancel
 */
export function showConfirmDialog({
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  triggerElement = (typeof document !== 'undefined' ? document.activeElement : null)
}) {
  return new Promise((resolve) => {
    const existing = document.getElementById('att-dynamic-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'att-dynamic-modal-overlay';
    overlay.className = 'modal-overlay is-active';
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

    const modalRoot = document.getElementById('modal-root') || document.body;
    modalRoot.appendChild(overlay);

    let cleanupIsolation = null;
    const cleanup = () => {
      if (cleanupIsolation) cleanupIsolation();
      overlay.remove();
    };

    cleanupIsolation = isolateModal(overlay, {
      triggerElement,
      onDismiss: () => {
        cleanup();
        resolve(false);
      }
    });

    const closeBtn = overlay.querySelector('#att-modal-close-btn');
    const cancelBtn = overlay.querySelector('#att-modal-cancel-btn');
    const confirmBtn = /** @type {HTMLButtonElement|null} */ (overlay.querySelector('#att-modal-confirm-btn'));

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
