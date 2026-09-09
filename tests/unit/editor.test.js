// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { createSchemaItemEditor } from '../../js/editor.js';

function schema(overrides = {}) {
  return {
    itemLabel: 'Item',
    minItems: 0,
    itemFields: [{ id: 'title', label: 'Title', type: 'text' }],
    ...overrides
  };
}

function setup(items, schemaOverrides = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const fallback = document.createElement('button');
  fallback.id = 'fallback';
  document.body.appendChild(fallback);
  const editor = createSchemaItemEditor({ container, onChange: () => {}, focusFallback: fallback });
  editor.render({ schema: schema(schemaOverrides), items, config: {}, limits: {} });
  return { container, editor, fallback };
}

describe('createSchemaItemEditor collapse defaults (P11 Requirement 1)', () => {
  test('resetToDefaultCollapse leaves only the first item expanded', () => {
    const items = [{ title: 'A' }, { title: 'B' }, { title: 'C' }];
    const { container, editor } = setup(items);
    editor.resetToDefaultCollapse(items);
    editor.render({ schema: schema(), items, config: {}, limits: {} });
    const cards = container.querySelectorAll('.dynamic-item-card');
    expect(cards[0].classList.contains('collapsed')).toBe(false);
    expect(cards[1].classList.contains('collapsed')).toBe(true);
    expect(cards[2].classList.contains('collapsed')).toBe(true);
  });

  test('a plain render (no reset) leaves every item expanded — mid-session re-renders must not force-collapse', () => {
    const items = [{ title: 'A' }, { title: 'B' }];
    const { container } = setup(items);
    const cards = container.querySelectorAll('.dynamic-item-card');
    expect([...cards].every(card => !card.classList.contains('collapsed'))).toBe(true);
  });
});

describe('createSchemaItemEditor expandAll/collapseAll (P11 Requirement 2)', () => {
  test('expandAll and collapseAll toggle every item at once', () => {
    const items = [{ title: 'A' }, { title: 'B' }];
    const { container, editor } = setup(items);
    editor.resetToDefaultCollapse(items);
    editor.expandAll();
    let cards = container.querySelectorAll('.dynamic-item-card');
    expect([...cards].every(card => !card.classList.contains('collapsed'))).toBe(true);

    editor.collapseAll();
    cards = container.querySelectorAll('.dynamic-item-card');
    expect([...cards].every(card => card.classList.contains('collapsed'))).toBe(true);
  });
});

describe('createSchemaItemEditor length guidance (P11 Requirement 7)', () => {
  test('a text field with no maxLength shows non-blocking length guidance, linked via aria-describedby', () => {
    const items = [{ title: 'A' }];
    const { container } = setup(items);
    const control = container.querySelector('[data-field-id="title"]');
    const guidance = container.querySelector('.field-length-guidance');
    expect(guidance).not.toBeNull();
    expect(guidance.textContent).toMatch(/200/);
    expect(control.getAttribute('aria-describedby')).toContain(guidance.id);
    // Guidance only — no maxLength attribute was added, so it can never block typing.
    expect(control.maxLength).toBe(-1);
  });

  test('a field with an explicit maxLength shows no guidance — it already has a hard cap', () => {
    const items = [{ title: 'A' }];
    const { container } = setup(items, { itemFields: [{ id: 'title', label: 'Title', type: 'text', maxLength: 40 }] });
    expect(container.querySelector('.field-length-guidance')).toBeNull();
  });
});

describe('createSchemaItemEditor focus preservation (P11 Requirement 8)', () => {
  test('deleting an item focuses whichever item slid into its place', () => {
    const items = [{ title: 'A' }, { title: 'B' }, { title: 'C' }];
    const { container } = setup(items);
    container.querySelectorAll('.item-action-btn[title="Delete item"]')[0].click();
    const cards = container.querySelectorAll('.dynamic-item-card');
    expect(cards.length).toBe(2);
    expect(document.activeElement).toBe(cards[0].querySelector('.item-collapse-btn'));
  });

  test('deleting the last remaining item falls back to the provided focus target', () => {
    const items = [{ title: 'Only' }];
    const { container, fallback } = setup(items);
    container.querySelector('.item-action-btn[title="Delete item"]').click();
    expect(document.activeElement).toBe(fallback);
  });

  test('duplicating an item focuses the new copy', () => {
    const items = [{ title: 'A' }];
    const { container } = setup(items);
    container.querySelector('.item-action-btn[title="Duplicate item"]').click();
    const cards = container.querySelectorAll('.dynamic-item-card');
    expect(cards.length).toBe(2);
    expect(document.activeElement).toBe(cards[1].querySelector('.item-collapse-btn'));
  });

  test('moving an item down keeps focus on its own Move item down button at the new position', () => {
    const items = [{ title: 'A' }, { title: 'B' }, { title: 'C' }];
    const { container } = setup(items);
    container.querySelectorAll('.item-action-btn[title="Move item down"]')[0].click();
    const cards = container.querySelectorAll('.dynamic-item-card');
    expect(document.activeElement).toBe(cards[1].querySelector('.item-action-btn[title="Move item down"]'));
  });

  test('moving an item to the top falls back to its heading, since Move item up is now disabled', () => {
    const items = [{ title: 'A' }, { title: 'B' }, { title: 'C' }];
    const { container } = setup(items);
    container.querySelectorAll('.item-action-btn[title="Move item up"]')[1].click();
    const cards = container.querySelectorAll('.dynamic-item-card');
    expect(document.activeElement).toBe(cards[0].querySelector('.item-collapse-btn'));
  });

  test('toggling collapse keeps focus on the same item heading', () => {
    const items = [{ title: 'A' }, { title: 'B' }];
    const { container } = setup(items);
    container.querySelectorAll('.item-collapse-btn')[1].click();
    const cards = container.querySelectorAll('.dynamic-item-card');
    expect(document.activeElement).toBe(cards[1].querySelector('.item-collapse-btn'));
  });
});

describe('createSchemaItemEditor keyboard shortcuts (Prompt Section 4.3)', () => {
  test('Alt+ArrowDown moves item down and maintains focus', () => {
    const items = [{ title: 'Item 1' }, { title: 'Item 2' }, { title: 'Item 3' }];
    const { container } = setup(items);
    const card0 = container.querySelectorAll('.dynamic-item-card')[0];
    card0.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
    const newCards = container.querySelectorAll('.dynamic-item-card');
    expect(items[0].title).toBe('Item 2');
    expect(items[1].title).toBe('Item 1');
    expect(document.activeElement).toBe(newCards[1].querySelector('.item-action-btn[title="Move item down"]'));
  });

  test('Alt+ArrowUp moves item up and maintains focus', () => {
    const items = [{ title: 'Item 1' }, { title: 'Item 2' }, { title: 'Item 3' }];
    const { container } = setup(items);
    const card1 = container.querySelectorAll('.dynamic-item-card')[1];
    card1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
    expect(items[0].title).toBe('Item 2');
    expect(items[1].title).toBe('Item 1');
  });

  test('Alt+d duplicates the focused item', () => {
    const items = [{ title: 'Original Item' }];
    const { container } = setup(items);
    const card0 = container.querySelectorAll('.dynamic-item-card')[0];
    card0.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', altKey: true, bubbles: true }));
    expect(items.length).toBe(2);
    expect(items[1].title).toBe('Original Item');
  });

  test('Alt+Delete deletes the focused item', () => {
    const items = [{ title: 'Keep' }, { title: 'Delete Me' }];
    const { container } = setup(items);
    const card1 = container.querySelectorAll('.dynamic-item-card')[1];
    card1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', altKey: true, bubbles: true }));
    expect(items.length).toBe(1);
    expect(items[0].title).toBe('Keep');
  });
});

describe('switchEditorTab standard 4-tab model & legacy aliases (Prompt Section 4.1)', () => {
  test('switches active state and aria-selected across 4 standard tabs', async () => {
    const { switchEditorTab } = await import('../../js/editor.js');
    document.body.innerHTML = `
      <div class="editor-tabs">
        <button type="button" class="editor-tab active" data-tab="content" aria-selected="true">Content</button>
        <button type="button" class="editor-tab" data-tab="interaction" aria-selected="false">Interaction</button>
        <button type="button" class="editor-tab" data-tab="appearance" aria-selected="false">Appearance</button>
        <button type="button" class="editor-tab" data-tab="completion" aria-selected="false">Completion</button>
      </div>
      <div class="tab-pane active" id="tab-content"></div>
      <div class="tab-pane" id="tab-interaction"></div>
      <div class="tab-pane" id="tab-appearance"></div>
      <div class="tab-pane" id="tab-completion"></div>
    `;

    switchEditorTab('appearance');
    expect(document.querySelector('.editor-tab[data-tab="appearance"]').classList.contains('active')).toBe(true);
    expect(document.querySelector('.editor-tab[data-tab="appearance"]').getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('tab-appearance').classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-content').classList.contains('active')).toBe(false);

    switchEditorTab('completion');
    expect(document.querySelector('.editor-tab[data-tab="completion"]').classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-completion').classList.contains('active')).toBe(true);

    // Legacy 'settings' or 'behavior' alias routes cleanly to 'interaction'
    switchEditorTab('settings');
    expect(document.querySelector('.editor-tab[data-tab="interaction"]').classList.contains('active')).toBe(true);
    expect(document.getElementById('tab-interaction').classList.contains('active')).toBe(true);
  });
});
