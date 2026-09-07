import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// The 14 / 7 classification split is asserted structurally in
// tests/unit/component-registry.test.js; here we only check the catalog UI surfaces it —
// badge, "Why use it?", and a classification filter that composes with the category
// sidebar and the search box, in light and dark mode.

const CARD = '.component-select-card';
const FILTER = '.classification-filter-btn';
const CATEGORIES = ['interactive', 'navigation', 'knowledge', 'timelines', 'process', 'cards', 'media', 'advanced'];

async function catalog(page) {
  await page.goto('/');
  await expect(page.locator(CARD).first()).toBeVisible();
}

const cat = (page, dataCategory) => page.locator(`.nav-item[data-category="${dataCategory}"]`);

test('every template card shows a classification badge and a visible "Why use it?" section', async ({ page }) => {
  await catalog(page);
  let seen = 0;
  for (const category of CATEGORIES) {
    await cat(page, category).click();
    const cards = page.locator(`#components-grid ${CARD}`);
    const count = await cards.count();
    for (let i = 0; i < count; i += 1) {
      const card = cards.nth(i);
      const badge = card.locator('.card-classification-badge');
      await expect(badge).toHaveText(/Enhanced Rise Alternative|Advanced Custom Interaction/);
      await expect(card.locator('.card-why-label')).toHaveText('Why use it?');
      const why = card.locator('.card-why-text');
      await expect(why).toBeVisible();
      await expect(why).not.toBeEmpty();
      const describedby = await card.getAttribute('aria-describedby');
      expect(describedby).toContain(await badge.getAttribute('id'));
      expect(describedby).toContain(await why.getAttribute('id'));
      seen += 1;
    }
  }
  expect(seen).toBe(21);
});

test('classification filter narrows the grid, updates aria-pressed, and composes with category + search', async ({ page }) => {
  await catalog(page);
  const all = page.locator(FILTER).filter({ hasText: 'All Components' });
  const enhanced = page.locator(FILTER).filter({ hasText: 'Enhanced Rise Alternatives' });
  const custom = page.locator(FILTER).filter({ hasText: 'Advanced Custom Interactions' });

  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(enhanced).toHaveAttribute('aria-pressed', 'false');

  // Cards & Layouts: 1 enhanced (Multi-Column Info Grid) + 2 custom.
  await cat(page, 'cards').click();
  await expect(page.locator(`#components-grid ${CARD}`)).toHaveCount(3);

  await enhanced.click();
  await expect(enhanced).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await expect(custom).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator(`#components-grid ${CARD}`)).toHaveCount(1);
  await expect(page.locator('#components-grid .card-classification-badge')).toHaveText('Enhanced Rise Alternative');

  await custom.click();
  await expect(custom).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`#components-grid ${CARD}`)).toHaveCount(2);

  // Search composes with the active classification facet.
  await page.locator('#search-components').fill('matrix');
  await expect(page.locator(`#components-grid ${CARD}`)).toHaveCount(1);
  await expect(page.locator(`#components-grid ${CARD} h3`)).toHaveText(/Matrix/i);

  // "All Components" restores the full (still category-scoped) grid.
  await page.locator('#search-components').fill('');
  await all.click();
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`#components-grid ${CARD}`)).toHaveCount(3);
});

test('classification filter works within every category and the union is the full 14 / 7 split', async ({ page }) => {
  await catalog(page);
  const enhanced = page.locator(FILTER).filter({ hasText: 'Enhanced Rise Alternatives' });
  const custom = page.locator(FILTER).filter({ hasText: 'Advanced Custom Interactions' });
  const titlesIn = () => page.locator(`#components-grid ${CARD} h3`).allTextContents();

  const enhancedTitles = new Set();
  const customTitles = new Set();
  for (const category of CATEGORIES) {
    await cat(page, category).click();
    await enhanced.click();
    for (const t of await titlesIn()) enhancedTitles.add(t);
    for (const badge of await page.locator('#components-grid .card-classification-badge').allTextContents()) {
      expect(badge).toBe('Enhanced Rise Alternative');
    }
    await custom.click();
    for (const t of await titlesIn()) customTitles.add(t);
    for (const badge of await page.locator('#components-grid .card-classification-badge').allTextContents()) {
      expect(badge).toBe('Advanced Custom Interaction');
    }
    await page.locator(FILTER).filter({ hasText: 'All Components' }).click();
  }
  expect(enhancedTitles.size).toBe(14);
  expect(customTitles.size).toBe(7);
});

test('text search matches the full classification label across categories (Favorites + Recent keep the metadata)', async ({ page }) => {
  // Seed favorites: one enhanced (accordion) + one custom (menu-list) from different categories.
  await page.addInitScript(() => {
    localStorage.setItem('rise-builder-favorites-v1', JSON.stringify(['accordion', 'menu-list']));
  });
  await catalog(page);

  await cat(page, 'favorites').click();
  await expect(page.locator(`#components-grid ${CARD}`)).toHaveCount(2);
  // Metadata is present on favorited cards.
  await expect(page.locator(`#components-grid ${CARD}`).first().locator('.card-classification-badge')).toBeVisible();
  await expect(page.locator(`#components-grid ${CARD}`).first().locator('.card-why-text')).not.toBeEmpty();

  await page.locator('#search-components').fill('Advanced Custom Interaction');
  await expect(page.locator(`#components-grid ${CARD}`)).toHaveCount(1);
  await expect(page.locator('#components-grid .card-classification-badge')).toHaveText('Advanced Custom Interaction');

  await page.locator('#search-components').fill('behaviour'); // only in accordion's differentiator
  await expect(page.locator(`#components-grid ${CARD}`)).toHaveCount(1);
  await expect(page.locator(`#components-grid ${CARD} h3`)).toHaveText(/Accordion/i);
});

test('catalog classification controls adopt the correct tokens and contrast in light and dark mode', async ({ page }) => {
  await catalog(page);
  // Freeze CSS transitions so axe / getComputedStyle never sample a mid-theme-fade frame
  // (transition: all on .config-panel / .component-select-card / .classification-filter-btn).
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });

  const scan = () => new AxeBuilder({ page })
    .include('#catalog-state').exclude('#live-preview-iframe')
    .withRules(['color-contrast']).analyze();
  const idleBtnBg = () => page.locator(`${FILTER}:not(.active)`).first()
    .evaluate(el => getComputedStyle(el).backgroundColor);
  const badgeStyle = sel => page.locator(sel).first()
    .evaluate(el => { const c = getComputedStyle(el); return `${c.color} on ${c.backgroundColor}`; });

  expect((await scan()).violations).toEqual([]);
  expect(await idleBtnBg()).toBe('rgb(243, 244, 246)');        // --bg-app light (#F3F4F6)

  await page.locator('#btn-theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect((await scan()).violations).toEqual([]);
  // The idle filter buttons and the enhanced badge must move to the dark surface token,
  // not stay stranded on the light one.
  expect(await idleBtnBg()).toBe('rgb(15, 23, 42)');           // --bg-app dark (#0F172A)
  expect(await badgeStyle('.card-classification-enhanced')).toBe('rgb(0, 159, 219) on rgb(15, 23, 42)');
});

for (const width of [768, 430, 375]) {
  test(`classification filter row does not overflow horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await catalog(page);
    const overflow = await page.evaluate(() => {
      const el = document.querySelector('.classification-filter');
      return el ? el.scrollWidth > el.clientWidth + 1 : true;
    });
    expect(overflow).toBe(false);
  });
}
