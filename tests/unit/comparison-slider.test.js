import { describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import * as comparisonSlider from '../../components/comparison-slider.js';

const INSTANCE_ID = 'test-slider-inst';

describe('comparison slider component', () => {
  test('exports standard component properties and functions', () => {
    expect(comparisonSlider.id).toBe('comparison-slider');
    expect(comparisonSlider.name).toBe('Before & After Comparison Slider');
    expect(comparisonSlider.category).toBe('interactive');
    expect(typeof comparisonSlider.generateHTML).toBe('function');
    expect(typeof comparisonSlider.generateCSS).toBe('function');
    expect(typeof comparisonSlider.generateJS).toBe('function');
    expect(typeof comparisonSlider.validate).toBe('function');
    expect(comparisonSlider.defaultConfig).toBeDefined();
  });

  test('generates accessible markup with slider role and ARIA attributes', () => {
    const html = comparisonSlider.generateHTML(comparisonSlider.defaultConfig, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const handle = document.querySelector('.comparison-handle');
    expect(handle).not.toBeNull();
    expect(handle.getAttribute('role')).toBe('slider');
    expect(handle.getAttribute('aria-valuenow')).toBe('50');
    expect(handle.getAttribute('aria-valuemin')).toBe('0');
    expect(handle.getAttribute('aria-valuemax')).toBe('100');
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    expect(handle.getAttribute('tabindex')).toBe('0');
    expect(handle.getAttribute('aria-label')).toContain('Comparison slider');

    const stage = document.querySelector('.comparison-stage');
    expect(stage).not.toBeNull();
    expect(stage.getAttribute('role')).toBe('region');
  });

  test('renders schematic SVG fallbacks when no custom images are provided', () => {
    const html = comparisonSlider.generateHTML({
      items: [{ beforeImage: '', afterImage: '', beforeLabel: 'Old', afterLabel: 'New' }]
    }, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    expect(document.querySelector('.comparison-fallback-svg.before-svg')).not.toBeNull();
    expect(document.querySelector('.comparison-fallback-svg.after-svg')).not.toBeNull();
    expect(document.querySelector('img.comparison-img')).toBeNull();
  });

  test('renders image elements with correct alt attributes when provided', () => {
    const html = comparisonSlider.generateHTML({
      items: [{
        beforeImage: 'https://example.com/before.jpg',
        afterImage: 'https://example.com/after.jpg',
        beforeAltText: 'Before renovation',
        afterAltText: 'After renovation',
        beforeLabel: 'Before',
        afterLabel: 'After'
      }]
    }, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const images = document.querySelectorAll('img.comparison-img');
    expect(images.length).toBe(2);
    expect(images[0].getAttribute('src')).toBe('https://example.com/after.jpg');
    expect(images[0].getAttribute('alt')).toBe('After renovation');
    expect(images[1].getAttribute('src')).toBe('https://example.com/before.jpg');
    expect(images[1].getAttribute('alt')).toBe('Before renovation');
  });

  test('hides floating badges when showLabels is false', () => {
    const html = comparisonSlider.generateHTML({
      showLabels: false,
      items: [{ beforeLabel: 'B', afterLabel: 'A' }]
    }, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    expect(document.querySelectorAll('.comparison-badge').length).toBe(0);
  });

  test('clamps initialPosition to 0-100 range', () => {
    const htmlLow = comparisonSlider.generateHTML({ initialPosition: -20 }, INSTANCE_ID);
    expect(htmlLow).toContain('--slider-pos: 0%');

    const htmlHigh = comparisonSlider.generateHTML({ initialPosition: 150 }, INSTANCE_ID);
    expect(htmlHigh).toContain('--slider-pos: 100%');
  });

  test('generates valid CSS and JS without errors', () => {
    const css = comparisonSlider.generateCSS(comparisonSlider.defaultConfig);
    expect(typeof css).toBe('string');
    expect(css).toContain('--slider-pos');
    expect(css).toContain('.comparison-handle');

    const js = comparisonSlider.generateJS(comparisonSlider.defaultConfig, INSTANCE_ID);
    expect(typeof js).toBe('string');
    expect(js).toContain('setPosition');
    expect(() => new Function(js)).not.toThrow();
  });

  test('validation correctly identifies valid and invalid configurations', () => {
    expect(comparisonSlider.validate(comparisonSlider.defaultConfig).valid).toBe(true);

    const emptyItemsResult = comparisonSlider.validate({ items: [] });
    expect(emptyItemsResult.valid).toBe(false);
    expect(emptyItemsResult.errors.length).toBeGreaterThan(0);

    const invalidPositionResult = comparisonSlider.validate({
      initialPosition: 120,
      items: [{ beforeLabel: 'B', afterLabel: 'A' }]
    });
    expect(invalidPositionResult.valid).toBe(false);
  });

  test('applies custom aspectRatio and imageFit CSS variables', () => {
    const html = comparisonSlider.generateHTML({
      aspectRatio: '4/3',
      imageFit: 'contain',
      items: [{
        beforeImage: 'https://example.com/b.jpg',
        afterImage: 'https://example.com/a.jpg'
      }]
    }, INSTANCE_ID);

    expect(html).toContain('--comparison-aspect-ratio: 4 / 3');
    expect(html).toContain('--comparison-img-fit: contain');
  });

  test('allows item-level imageFit override', () => {
    const html = comparisonSlider.generateHTML({
      aspectRatio: '1/1',
      imageFit: 'cover',
      items: [{
        beforeImage: 'https://example.com/b.jpg',
        afterImage: 'https://example.com/a.jpg',
        imageFit: 'contain'
      }]
    }, INSTANCE_ID);

    expect(html).toContain('--comparison-aspect-ratio: 1 / 1');
    expect(html).toContain('--comparison-img-fit: contain');
  });

  test('renders relative asset paths safely', () => {
    const html = comparisonSlider.generateHTML({
      items: [{
        beforeImage: 'assets/router-before.jpg',
        afterImage: 'assets/router-after.jpg'
      }]
    }, INSTANCE_ID);

    expect(html).toContain('src="assets/router-before.jpg"');
    expect(html).toContain('src="assets/router-after.jpg"');
  });

  test('applies custom stageBgColor variable to the stage', () => {
    const html = comparisonSlider.generateHTML({
      stageBgColor: '#00388F',
      items: [{
        beforeImage: 'https://example.com/b.jpg',
        afterImage: 'https://example.com/a.jpg'
      }]
    }, INSTANCE_ID);

    expect(html).toContain('--comparison-stage-bg: #00388F');
  });
});
