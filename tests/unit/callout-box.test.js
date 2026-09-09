import { describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import * as calloutBox from '../../components/callout-box.js';

const INSTANCE_ID = 'test-callout-inst';

describe('callout & alert matrix component', () => {
  test('exports standard component properties and functions', () => {
    expect(calloutBox.id).toBe('callout-box');
    expect(calloutBox.name).toBe('Callout & Alert Matrix');
    expect(calloutBox.category).toBe('cards');
    expect(typeof calloutBox.generateHTML).toBe('function');
    expect(typeof calloutBox.generateCSS).toBe('function');
    expect(typeof calloutBox.generateJS).toBe('function');
    expect(typeof calloutBox.validate).toBe('function');
    expect(calloutBox.defaultConfig).toBeDefined();
  });

  test('generates callout matrix cards with appropriate tones and semantic roles', () => {
    const html = calloutBox.generateHTML(calloutBox.defaultConfig, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const cards = document.querySelectorAll('.callout-item-card');
    expect(cards.length).toBe(4);

    expect(cards[0].classList.contains('tone-security')).toBe(true);
    expect(cards[1].classList.contains('tone-warning')).toBe(true);
    expect(cards[2].classList.contains('tone-info')).toBe(true);
    expect(cards[3].classList.contains('tone-tip')).toBe(true);

    cards.forEach(card => {
      expect(card.getAttribute('role')).toBe('region');
      expect(card.getAttribute('aria-label')).toBeTruthy();
    });
  });

  test('supports grid and stacked layout configurations', () => {
    const htmlGrid = calloutBox.generateHTML({ layout: 'grid-3' }, INSTANCE_ID);
    expect(htmlGrid).toContain('layout-grid-3');

    const htmlStacked = calloutBox.generateHTML({ layout: 'stacked' }, INSTANCE_ID);
    expect(htmlStacked).toContain('layout-stacked');
  });

  test('generates interactive acknowledgment buttons when requireAcknowledgment is true', () => {
    const html = calloutBox.generateHTML({ requireAcknowledgment: true }, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const ackButtons = document.querySelectorAll('.callout-ack-btn');
    expect(ackButtons.length).toBeGreaterThan(0);
    expect(ackButtons[0].getAttribute('aria-pressed')).toBe('false');
    expect(ackButtons[0].textContent).toContain('Mark as Acknowledged');
  });

  test('omits acknowledgment buttons when requireAcknowledgment is false', () => {
    const html = calloutBox.generateHTML({ requireAcknowledgment: false }, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const ackButtons = document.querySelectorAll('.callout-ack-btn');
    expect(ackButtons.length).toBe(0);
  });

  test('generates valid CSS and JS without errors', () => {
    const css = calloutBox.generateCSS(calloutBox.defaultConfig);
    expect(typeof css).toBe('string');
    expect(css).toContain('.callout-matrix-card');
    expect(css).toContain('.callout-item-card');

    const js = calloutBox.generateJS(calloutBox.defaultConfig, INSTANCE_ID);
    expect(typeof js).toBe('string');
    expect(js).toContain('onAckClick');
    expect(() => new Function(js)).not.toThrow();
  });

  test('validation correctly handles valid and invalid configurations', () => {
    expect(calloutBox.validate(calloutBox.defaultConfig).valid).toBe(true);

    const emptyItemsResult = calloutBox.validate({ items: [] });
    expect(emptyItemsResult.valid).toBe(false);

    const invalidLayoutResult = calloutBox.validate({
      layout: 'circular',
      items: [{ title: 'Notice', content: 'Details' }]
    });
    expect(invalidLayoutResult.valid).toBe(false);
  });
});
