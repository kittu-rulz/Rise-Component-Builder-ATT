// @vitest-environment jsdom
import { describe, expect, test, beforeEach, vi } from 'vitest';
import {
  switchEditorTab,
  getFieldTabLocation,
  setupEditorTabKeyboardNavigation,
  jumpToEditorField
} from '../../js/editor.js';

describe('Editor Information Architecture & 4-Tab Navigation (Option A)', () => {
  let tabButtons;
  let tabPanes;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="editor-tabs" role="tablist">
        <button type="button" class="editor-tab active" data-tab="content" id="tab-btn-content" role="tab" aria-selected="true" tabindex="0">Content</button>
        <button type="button" class="editor-tab" data-tab="interaction" id="tab-btn-interaction" role="tab" aria-selected="false" tabindex="-1">Interaction</button>
        <button type="button" class="editor-tab" data-tab="appearance" id="tab-btn-appearance" role="tab" aria-selected="false" tabindex="-1">Appearance</button>
        <button type="button" class="editor-tab" data-tab="completion" id="tab-btn-completion" role="tab" aria-selected="false" tabindex="-1">Completion</button>
      </div>
      <div class="tab-pane active" id="tab-content" role="tabpanel">
        <input id="input-block-title" data-field-id="blockTitle">
        <div class="dynamic-item-card collapsed" data-index="0">
          <button class="item-collapse-btn">Toggle</button>
          <input id="schema-item-0-title" data-field-id="title" data-item-index="0">
        </div>
      </div>
      <div class="tab-pane" id="tab-interaction" role="tabpanel">
        <input id="input-accordion-multi" data-field-id="accordionMulti" type="checkbox">
      </div>
      <div class="tab-pane" id="tab-appearance" role="tabpanel">
        <select id="select-spacing-density" data-field-id="spacingDensity"></select>
      </div>
      <div class="tab-pane" id="tab-completion" role="tabpanel">
        <input id="input-completion-msg" data-field-id="completionMsg">
        <input id="input-allow-reset" data-field-id="allowReset" type="checkbox">
      </div>
    `;

    tabButtons = document.querySelectorAll('.editor-tab');
    tabPanes = document.querySelectorAll('.tab-pane');
  });

  describe('getFieldTabLocation', () => {
    test('maps content fields to content tab', () => {
      expect(getFieldTabLocation('blockTitle')).toBe('content');
      expect(getFieldTabLocation('blockHeadline')).toBe('content');
      expect(getFieldTabLocation('title')).toBe('content');
      expect(getFieldTabLocation('description')).toBe('content');
    });

    test('maps interaction behavior fields to interaction tab', () => {
      expect(getFieldTabLocation('accordionMulti')).toBe('interaction');
      expect(getFieldTabLocation('accordionSequential')).toBe('interaction');
      expect(getFieldTabLocation('flipCardsMode')).toBe('interaction');
      expect(getFieldTabLocation('mcConfidenceMode')).toBe('interaction');
      expect(getFieldTabLocation('tabsSequential')).toBe('interaction');
      expect(getFieldTabLocation('timelineChronological')).toBe('interaction');
      expect(getFieldTabLocation('ivResumeBehaviour')).toBe('interaction');
    });

    test('maps styling and presentation fields to appearance tab', () => {
      expect(getFieldTabLocation('spacingDensity')).toBe('appearance');
      expect(getFieldTabLocation('headerStyle')).toBe('appearance');
      expect(getFieldTabLocation('iconStyle')).toBe('appearance');
      expect(getFieldTabLocation('contextBandEnabled')).toBe('appearance');
      expect(getFieldTabLocation('tabsOrientation')).toBe('appearance');
    });

    test('maps completion fields to completion tab', () => {
      expect(getFieldTabLocation('trackCompletion')).toBe('completion');
      expect(getFieldTabLocation('completionMode')).toBe('completion');
      expect(getFieldTabLocation('completionMsg')).toBe('completion');
      expect(getFieldTabLocation('ivCompletionRule')).toBe('completion');
      expect(getFieldTabLocation('allowReset')).toBe('completion');
    });
  });

  describe('switchEditorTab', () => {
    test('switches active tab and updates WAI-ARIA attributes', () => {
      switchEditorTab('completion', tabButtons, tabPanes);

      const completionTab = document.getElementById('tab-btn-completion');
      const contentTab = document.getElementById('tab-btn-content');
      const completionPane = document.getElementById('tab-completion');
      const contentPane = document.getElementById('tab-content');

      expect(completionTab.classList.contains('active')).toBe(true);
      expect(completionTab.getAttribute('aria-selected')).toBe('true');
      expect(completionTab.getAttribute('tabindex')).toBe('0');

      expect(contentTab.classList.contains('active')).toBe(false);
      expect(contentTab.getAttribute('aria-selected')).toBe('false');
      expect(contentTab.getAttribute('tabindex')).toBe('-1');

      expect(completionPane.classList.contains('active')).toBe(true);
      expect(contentPane.classList.contains('active')).toBe(false);
    });

    test('handles legacy tab aliases (settings/behavior -> interaction)', () => {
      switchEditorTab('behavior', tabButtons, tabPanes);
      const interactionTab = document.getElementById('tab-btn-interaction');
      const interactionPane = document.getElementById('tab-interaction');

      expect(interactionTab.classList.contains('active')).toBe(true);
      expect(interactionPane.classList.contains('active')).toBe(true);
    });
  });

  describe('setupEditorTabKeyboardNavigation (WAI-ARIA Pattern)', () => {
    test('ArrowRight cycles forward and wraps around', () => {
      const onTabChange = vi.fn();
      setupEditorTabKeyboardNavigation(tabButtons, tabPanes, onTabChange);

      const contentTab = document.getElementById('tab-btn-content');
      contentTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

      const interactionTab = document.getElementById('tab-btn-interaction');
      expect(interactionTab.classList.contains('active')).toBe(true);
      expect(onTabChange).toHaveBeenCalledWith('interaction');

      const completionTab = document.getElementById('tab-btn-completion');
      completionTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      expect(contentTab.classList.contains('active')).toBe(true);
      expect(onTabChange).toHaveBeenCalledWith('content');
    });

    test('ArrowLeft cycles backward and wraps around', () => {
      const onTabChange = vi.fn();
      setupEditorTabKeyboardNavigation(tabButtons, tabPanes, onTabChange);

      const contentTab = document.getElementById('tab-btn-content');
      contentTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));

      const completionTab = document.getElementById('tab-btn-completion');
      expect(completionTab.classList.contains('active')).toBe(true);
      expect(onTabChange).toHaveBeenCalledWith('completion');
    });

    test('Home and End keys jump to first and last tabs', () => {
      const onTabChange = vi.fn();
      setupEditorTabKeyboardNavigation(tabButtons, tabPanes, onTabChange);

      const interactionTab = document.getElementById('tab-btn-interaction');
      interactionTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));

      const completionTab = document.getElementById('tab-btn-completion');
      expect(completionTab.classList.contains('active')).toBe(true);
      expect(onTabChange).toHaveBeenCalledWith('completion');

      completionTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      const contentTab = document.getElementById('tab-btn-content');
      expect(contentTab.classList.contains('active')).toBe(true);
      expect(onTabChange).toHaveBeenCalledWith('content');
    });
  });

  describe('jumpToEditorField Deep-Linking', () => {
    test('switches tab, scrolls, focuses element and adds pulse animation', () => {
      Element.prototype.scrollIntoView = vi.fn();
      const completionMsgInput = document.getElementById('input-completion-msg');
      const focusSpy = vi.spyOn(completionMsgInput, 'focus');

      jumpToEditorField('completionMsg');

      const completionTab = document.getElementById('tab-btn-completion');
      expect(completionTab.classList.contains('active')).toBe(true);
      expect(focusSpy).toHaveBeenCalled();
      expect(completionMsgInput.classList.contains('field-jump-highlight')).toBe(true);
    });

    test('expands collapsed item card when jumping to an item-level field', () => {
      Element.prototype.scrollIntoView = vi.fn();
      const card = document.querySelector('.dynamic-item-card[data-index="0"]');
      const toggleBtn = card.querySelector('.item-collapse-btn');
      let clicked = false;
      toggleBtn.addEventListener('click', () => {
        clicked = true;
        card.classList.remove('collapsed');
      });

      jumpToEditorField('title', 0);

      expect(clicked).toBe(true);
      const itemTitleInput = document.getElementById('schema-item-0-title');
      expect(itemTitleInput.classList.contains('field-jump-highlight')).toBe(true);
    });
  });
});
