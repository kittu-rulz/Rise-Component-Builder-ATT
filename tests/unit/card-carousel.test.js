import { describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import * as cardCarousel from '../../components/card-carousel.js';

const INSTANCE_ID = 'test-carousel-inst';

describe('card stack / carousel component', () => {
  test('exports standard component properties and functions', () => {
    expect(cardCarousel.id).toBe('card-carousel');
    expect(cardCarousel.name).toBe('Card Stack / Carousel');
    expect(cardCarousel.category).toBe('cards');
    expect(typeof cardCarousel.generateHTML).toBe('function');
    expect(typeof cardCarousel.generateCSS).toBe('function');
    expect(typeof cardCarousel.generateJS).toBe('function');
    expect(typeof cardCarousel.validate).toBe('function');
    expect(cardCarousel.defaultConfig).toBeDefined();
  });

  test('generates carousel with correct ARIA roles and slides', () => {
    const html = cardCarousel.generateHTML(cardCarousel.defaultConfig, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const stage = document.querySelector('.carousel-stage-container');
    expect(stage).toBeTruthy();
    expect(stage.getAttribute('role')).toBe('region');
    expect(stage.getAttribute('aria-roledescription')).toBe('carousel');

    const slides = document.querySelectorAll('.carousel-slide-item');
    expect(slides.length).toBe(3);

    slides.forEach((slide, idx) => {
      expect(slide.getAttribute('role')).toBe('group');
      expect(slide.getAttribute('aria-roledescription')).toBe('slide');
      expect(slide.getAttribute('aria-label')).toBe(`${idx + 1} of 3`);
      if (idx === 0) {
        expect(slide.classList.contains('is-active')).toBe(true);
      }
    });
  });

  test('generates navigation buttons and pagination dots', () => {
    const html = cardCarousel.generateHTML(cardCarousel.defaultConfig, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const prevBtn = document.querySelector('.carousel-btn-prev');
    const nextBtn = document.querySelector('.carousel-btn-next');
    expect(prevBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();
    expect(prevBtn.getAttribute('aria-label')).toBe('Previous card');
    expect(nextBtn.getAttribute('aria-label')).toBe('Next card');

    const dots = document.querySelectorAll('.carousel-dot-btn');
    expect(dots.length).toBe(3);
    expect(dots[0].getAttribute('aria-selected')).toBe('true');
  });

  test('omits pagination dots when showPaginationDots is false', () => {
    const html = cardCarousel.generateHTML({ showPaginationDots: false }, INSTANCE_ID);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const pagination = document.querySelector('.carousel-dots-row');
    expect(pagination).toBeNull();
  });

  test('generates valid CSS and JS without syntax errors', () => {
    const css = cardCarousel.generateCSS(cardCarousel.defaultConfig);
    expect(typeof css).toBe('string');
    expect(css).toContain('.carousel-card-block');
    expect(css).toContain('.carousel-track-wrapper');

    const js = cardCarousel.generateJS(cardCarousel.defaultConfig, INSTANCE_ID);
    expect(typeof js).toBe('string');
    expect(js).toContain('updateSlide');
    expect(js).toContain('viewedItems.add');
    expect(() => new Function(js)).not.toThrow();
  });

  test('validation accurately validates configs', () => {
    expect(cardCarousel.validate(cardCarousel.defaultConfig).valid).toBe(true);

    const emptyItems = cardCarousel.validate({ items: [] });
    expect(emptyItems.valid).toBe(false);

    const missingTitle = cardCarousel.validate({ items: [{ content: 'Missing title' }] });
    expect(missingTitle.valid).toBe(false);
  });
});
