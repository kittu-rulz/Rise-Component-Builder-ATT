// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import { createCatalogCard } from '../../js/catalog.js';

function component(overrides = {}) {
  return {
    id: 'accordion', title: 'Responsive Accordion', desc: 'Expand and collapse content sections.',
    category: 'Interactive', icon: '<svg></svg>', status: 'production',
    classification: 'enhanced', classificationLabel: 'Enhanced Rise Alternative',
    differentiator: 'Adds branded styling, flexible panel behaviour, and richer content presentation.',
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

  test('shows a Preview badge only for experimental-status components', () => {
    const experimental = createCatalogCard(component({ status: 'experimental' }), () => {});
    expect(experimental.querySelector('.card-status-badge').textContent).toBe('Preview');

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

  test('renders the classification badge with the correct label and visual class, distinct from .card-tag', () => {
    const enhanced = createCatalogCard(component({ classification: 'enhanced', classificationLabel: 'Enhanced Rise Alternative' }), () => {});
    const enhancedBadge = enhanced.querySelector('.card-classification-badge');
    expect(enhancedBadge.textContent).toBe('Enhanced Rise Alternative');
    expect(enhancedBadge.classList.contains('card-classification-enhanced')).toBe(true);
    // Distinct element from .card-tag, never the same node wearing two meanings.
    expect(enhancedBadge).not.toBe(enhanced.querySelector('.card-tag'));

    const custom = createCatalogCard(component({ id: 'audio-player', classification: 'custom', classificationLabel: 'Advanced Custom Interaction' }), () => {});
    const customBadge = custom.querySelector('.card-classification-badge');
    expect(customBadge.textContent).toBe('Advanced Custom Interaction');
    expect(customBadge.classList.contains('card-classification-custom')).toBe(true);
  });

  test('renders a "Why use it?" section with the full, untruncated differentiator text, always visible (no hover-only or hidden-by-default disclosure)', () => {
    const card = createCatalogCard(component({ differentiator: 'Adds branded styling, flexible panel behaviour, and richer content presentation.' }), () => {});
    const label = card.querySelector('.card-why-label');
    const text = card.querySelector('.card-why-text');
    expect(label.textContent).toBe('Why use it?');
    expect(text.textContent).toBe('Adds branded styling, flexible panel behaviour, and richer content presentation.');
    // Not hidden, not requiring hover/click to become visible — no [hidden] attribute, no
    // display:none inline style, no aria-expanded control gating it.
    expect(text.hasAttribute('hidden')).toBe(false);
    expect(card.querySelector('[aria-expanded]')).toBeNull();
  });

  test('the classification badge and differentiator are referenced via aria-describedby, not duplicated into aria-label', () => {
    const card = createCatalogCard(component(), () => {});
    const describedBy = card.getAttribute('aria-describedby').split(' ');
    const badge = card.querySelector('.card-classification-badge');
    const whyText = card.querySelector('.card-why-text');
    expect(describedBy).toContain(badge.id);
    expect(describedBy).toContain(whyText.id);
    // aria-label itself stays short — it must not also restate the classification or
    // differentiator (P-series: avoid unnecessarily repeating entire card content in
    // accessible labels).
    expect(card.getAttribute('aria-label')).not.toContain('Enhanced Rise Alternative');
    expect(card.getAttribute('aria-label')).not.toContain('branded styling');
  });
});
