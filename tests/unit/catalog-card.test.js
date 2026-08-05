// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import { createCatalogCard } from '../../js/catalog.js';

function component(overrides = {}) {
  return {
    id: 'accordion', title: 'Responsive Accordion', desc: 'Expand and collapse content sections.',
    category: 'Interactive', icon: '<svg></svg>', status: 'production',
    ...overrides
  };
}

describe('createCatalogCard', () => {
  test('renders title, description, category tag, and an accessible label', () => {
    const card = createCatalogCard(component(), () => {});
    expect(card.tagName).toBe('BUTTON');
    expect(card.querySelector('h3').textContent).toBe('Responsive Accordion');
    expect(card.querySelector('p').textContent).toBe('Expand and collapse content sections.');
    expect(card.querySelector('.card-tag').textContent).toBe('Interactive');
    expect(card.getAttribute('aria-label')).toBe('Responsive Accordion: Expand and collapse content sections.');
  });

  test('shows an Experimental badge only for experimental-status components', () => {
    const experimental = createCatalogCard(component({ status: 'experimental' }), () => {});
    expect(experimental.querySelector('.card-status-badge').textContent).toBe('Experimental');

    const production = createCatalogCard(component({ status: 'production' }), () => {});
    expect(production.querySelector('.card-status-badge')).toBeNull();
  });

  test('clicking the card invokes onSelect with the component', () => {
    const onSelect = vi.fn();
    const item = component();
    const card = createCatalogCard(item, onSelect);
    card.click();
    expect(onSelect).toHaveBeenCalledWith(item);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
