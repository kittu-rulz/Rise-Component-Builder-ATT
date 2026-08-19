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
