import { describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import * as confidenceMatrix from '../../components/confidence-matrix.js';

const INSTANCE_ID = 'test-confidence-inst';

describe('confidence & skills self-assessment component', () => {
  test('exports standard component properties and functions', () => {
    expect(confidenceMatrix.id).toBe('confidence-matrix');
    expect(confidenceMatrix.name).toBe('Confidence & Skills Self-Assessment');
    expect(confidenceMatrix.category).toBe('knowledge');
    expect(typeof confidenceMatrix.generateHTML).toBe('function');
    expect(typeof confidenceMatrix.generateCSS).toBe('function');
    expect(typeof confidenceMatrix.generateJS).toBe('function');
    expect(typeof confidenceMatrix.validate).toBe('function');
    expect(confidenceMatrix.defaultConfig).toBeDefined();
  });

  test('generates matrix items with accessible radiogroups and options', () => {
    const html = confidenceMatrix.generateHTML(confidenceMatrix.defaultConfig, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const rows = document.querySelectorAll('.confidence-item-row');
    expect(rows.length).toBe(4);

    const radiogroups = document.querySelectorAll('.confidence-rating-group');
    expect(radiogroups.length).toBe(4);

    radiogroups.forEach(rg => {
      expect(rg.getAttribute('role')).toBe('radiogroup');
      const buttons = rg.querySelectorAll('.confidence-rating-btn');
      expect(buttons.length).toBe(4);
      buttons.forEach(btn => {
        expect(btn.getAttribute('role')).toBe('radio');
        expect(btn.getAttribute('aria-checked')).toBe('false');
      });
    });
  });

  test('generates diagnostic panel when showBreakdown is true', () => {
    const html = confidenceMatrix.generateHTML({ showBreakdown: true }, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const panel = document.querySelector('.confidence-diagnostic-panel');
    expect(panel).toBeTruthy();
    expect(panel.querySelector('.strengths-col')).toBeTruthy();
    expect(panel.querySelector('.growth-col')).toBeTruthy();
  });

  test('omits diagnostic panel when showBreakdown is false', () => {
    const html = confidenceMatrix.generateHTML({ showBreakdown: false }, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const panel = document.querySelector('.confidence-diagnostic-panel');
    expect(panel).toBeNull();
  });

  test('generates valid CSS and JS without syntax errors', () => {
    const css = confidenceMatrix.generateCSS(confidenceMatrix.defaultConfig);
    expect(typeof css).toBe('string');
    expect(css).toContain('.confidence-matrix-card');
    expect(css).toContain('.confidence-rating-btn');

    const js = confidenceMatrix.generateJS(confidenceMatrix.defaultConfig, INSTANCE_ID);
    expect(typeof js).toBe('string');
    expect(js).toContain('updateMatrixState');
    expect(js).toContain('handleRatingSelect');
    expect(js).toContain('viewedItems.add');
    expect(() => new Function(js)).not.toThrow();
  });

  test('validation accurately validates configs', () => {
    expect(confidenceMatrix.validate(confidenceMatrix.defaultConfig).valid).toBe(true);

    const emptyItems = confidenceMatrix.validate({ items: [] });
    expect(emptyItems.valid).toBe(false);

    const missingTitle = confidenceMatrix.validate({ items: [{ content: 'Missing title' }] });
    expect(missingTitle.valid).toBe(false);
  });
});
