import { describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import * as dialGauge from '../../components/dial-gauge.js';

const INSTANCE_ID = 'test-gauge-inst';

describe('interactive metric dial / gauge component', () => {
  test('exports standard component properties and functions', () => {
    expect(dialGauge.id).toBe('dial-gauge');
    expect(dialGauge.name).toBe('Interactive Metric Dial / Gauge');
    expect(dialGauge.category).toBe('interactive');
    expect(typeof dialGauge.generateHTML).toBe('function');
    expect(typeof dialGauge.generateCSS).toBe('function');
    expect(typeof dialGauge.generateJS).toBe('function');
    expect(typeof dialGauge.validate).toBe('function');
    expect(dialGauge.defaultConfig).toBeDefined();
  });

  test('generates accessible markup with slider role and ARIA attributes', () => {
    const html = dialGauge.generateHTML(dialGauge.defaultConfig, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const slider = document.querySelector('.dial-slider-input');
    expect(slider).not.toBeNull();
    expect(slider.getAttribute('role')).toBe('slider');
    expect(slider.getAttribute('aria-orientation')).toBe('horizontal');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('1000');
    expect(slider.getAttribute('aria-valuenow')).toBe('450');
    expect(slider.getAttribute('aria-valuetext')).toContain('450 Mbps');

    const numberInput = document.querySelector('.dial-number-input');
    expect(numberInput).not.toBeNull();
    expect(numberInput.getAttribute('min')).toBe('0');
    expect(numberInput.getAttribute('max')).toBe('1000');
    expect(numberInput.getAttribute('value')).toBe('450');

    const resetBtn = document.querySelector('.dial-reset-btn');
    expect(resetBtn).not.toBeNull();

    const svg = document.querySelector('.dial-gauge-svg');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('aria-hidden')).toBe('true');

    const needle = document.querySelector(`#${INSTANCE_ID}-needle`);
    expect(needle).not.toBeNull();

    const readout = document.querySelector(`#${INSTANCE_ID}-val-display`);
    expect(readout).not.toBeNull();
    expect(readout.textContent).toBe('450');
  });

  test('renders preset scenario buttons corresponding to configuration items', () => {
    const html = dialGauge.generateHTML(dialGauge.defaultConfig, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const presetButtons = document.querySelectorAll('.dial-preset-btn');
    expect(presetButtons.length).toBe(3);

    expect(presetButtons[0].textContent).toContain('Legacy Wireless Tier');
    expect(presetButtons[1].textContent).toContain('Enhanced 5G Mid-Band');
    expect(presetButtons[2].textContent).toContain('5G+ Ultra-Wideband');

    // Middle tier (450) should be active by default
    expect(presetButtons[1].classList.contains('is-active')).toBe(true);
    expect(presetButtons[1].getAttribute('aria-pressed')).toBe('true');
  });

  test('displays contextual insight panel with active tier details', () => {
    const html = dialGauge.generateHTML(dialGauge.defaultConfig, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const insightTitle = document.querySelector('.dial-insight-title');
    expect(insightTitle).not.toBeNull();
    expect(insightTitle.textContent.trim()).toBe('Enhanced 5G Mid-Band');

    const insightBadge = document.querySelector('.dial-insight-badge');
    expect(insightBadge).not.toBeNull();
    expect(insightBadge.textContent.trim()).toBe('Optimized Broadband');
  });

  test('generates valid CSS and JS without errors', () => {
    const css = dialGauge.generateCSS(dialGauge.defaultConfig);
    expect(typeof css).toBe('string');
    expect(css).toContain('.dial-gauge-card');
    expect(css).toContain('.dial-needle-group');

    const js = dialGauge.generateJS(dialGauge.defaultConfig, INSTANCE_ID);
    expect(typeof js).toBe('string');
    expect(js).toContain('updateDial');
    expect(() => new Function(js)).not.toThrow();
  });

  test('validation correctly handles valid and invalid configurations', () => {
    expect(dialGauge.validate(dialGauge.defaultConfig).valid).toBe(true);

    const emptyItemsResult = dialGauge.validate({ items: [] });
    expect(emptyItemsResult.valid).toBe(false);

    const minGteMaxResult = dialGauge.validate({
      minValue: 500,
      maxValue: 100,
      items: [{ title: 'Tier', content: 'Info', rangeMin: 0, rangeMax: 100 }]
    });
    expect(minGteMaxResult.valid).toBe(false);

    const invalidMinResult = dialGauge.validate({
      minValue: NaN,
      items: [{ title: 'Tier', content: 'Info', rangeMin: 0, rangeMax: 100 }]
    });
    expect(invalidMinResult.valid).toBe(false);
  });
});
