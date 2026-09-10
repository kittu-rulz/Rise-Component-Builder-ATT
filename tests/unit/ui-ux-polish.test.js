// @vitest-environment jsdom
// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showToast } from '../../js/toast.js';
import { getFieldTabLocation } from '../../js/editor.js';

describe('UI & UX Polish Enhancements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('Toast Notifications', () => {
    it('creates accessible rich toast with icon, message, close button, and progress bar', () => {
      showToast('Project saved successfully!', 'success', 3000);
      const container = document.querySelector('.toast-container');
      expect(container).not.toBeNull();
      expect(container.getAttribute('aria-live')).toBe('polite');

      const toast = container.querySelector('.toast.toast-success');
      expect(toast).not.toBeNull();
      expect(toast.getAttribute('role')).toBe('status');

      const icon = toast.querySelector('.toast-icon');
      expect(icon.textContent).toBe('✓');

      const msg = toast.querySelector('.toast-message');
      expect(msg.textContent).toBe('Project saved successfully!');

      const closeBtn = toast.querySelector('.toast-close-btn');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn.getAttribute('aria-label')).toBe('Dismiss notification');

      const progressBar = toast.querySelector('.toast-progress-bar');
      expect(progressBar).not.toBeNull();
    });

    it('sets role="alert" for error toasts', () => {
      showToast('Validation failed', 'error', 3000);
      const toast = document.querySelector('.toast.toast-error');
      expect(toast.getAttribute('role')).toBe('alert');
      expect(toast.querySelector('.toast-icon').textContent).toBe('✕');
    });

    it('allows manual dismissal via close button', () => {
      vi.useFakeTimers();
      showToast('Dismissible notification', 'info', 5000);
      const toast = document.querySelector('.toast.toast-info');
      expect(toast).not.toBeNull();

      const closeBtn = toast.querySelector('.toast-close-btn');
      closeBtn.click();

      // Fast-forward removal delay
      vi.advanceTimersByTime(300);
      expect(document.querySelector('.toast.toast-info')).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('Field Tab Routing for Error Badges', () => {
    it('maps fields to correct editor tabs', () => {
      expect(getFieldTabLocation('blockTitle')).toBe('content');
      expect(getFieldTabLocation('items')).toBe('content');
      expect(getFieldTabLocation('accordionSequential')).toBe('interaction');
      expect(getFieldTabLocation('flipCardsMode')).toBe('interaction');
      expect(getFieldTabLocation('headerStyle')).toBe('appearance');
      expect(getFieldTabLocation('spacingDensity')).toBe('appearance');
      expect(getFieldTabLocation('trackCompletion')).toBe('completion');
      expect(getFieldTabLocation('completionMode')).toBe('completion');
    });
  });
});
