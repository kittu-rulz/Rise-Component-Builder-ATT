let container;

function getContainer() {
  if (container) return container;
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
  toast.textContent = message;
  getContainer().appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  window.setTimeout(() => {
    toast.classList.remove('visible');
    window.setTimeout(() => toast.remove(), 180);
  }, duration);
}

