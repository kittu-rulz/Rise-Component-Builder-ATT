/* Rise Component Builder — Accessible Toast Notification System */

let container;

function getContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.className = 'toast-container';
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'true');
  document.body.appendChild(container);
  return container;
}

export function showToast(message, type = 'success', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const iconEl = document.createElement('span');
  iconEl.className = 'toast-icon';
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.textContent = iconMap[type] || '✓';

  const msgEl = document.createElement('span');
  msgEl.className = 'toast-message';
  msgEl.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close-btn';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');
  closeBtn.textContent = '×';

  const progressBar = document.createElement('div');
  progressBar.className = 'toast-progress-bar';
  progressBar.style.animationDuration = `${duration}ms`;

  toast.appendChild(iconEl);
  toast.appendChild(msgEl);
  toast.appendChild(closeBtn);
  toast.appendChild(progressBar);

  getContainer().appendChild(toast);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.classList.remove('visible');
    window.setTimeout(() => toast.remove(), 220);
  };

  closeBtn.addEventListener('click', dismiss);

  requestAnimationFrame(() => toast.classList.add('visible'));

  if (duration > 0) {
    window.setTimeout(dismiss, duration);
  }
}
