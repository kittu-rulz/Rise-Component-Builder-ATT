import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function openAccordion(page) {
  await page.goto('/');
  await page.locator('.component-select-card').filter({ hasText: 'Responsive Accordion' }).click();
  return page.frameLocator('#live-preview-iframe');
}

test('application controls have accessible names and form labels', async ({ page }) => {
  await openAccordion(page);
  const results = await new AxeBuilder({ page }).include('#editor-state').withRules([
    'button-name', 'form-field-multiple-labels', 'label', 'aria-valid-attr', 'aria-valid-attr-value'
  ]).analyze();
  expect(results.violations).toEqual([]);
});

// Scoped to the builder's own chrome (not the live-preview iframe, which renders the
// exported component's own author-chosen theme colors — that's covered separately by
// the theme contrast-report system, js/themes.js#contrastRatio). Catches real contrast
// or landmark regressions in the app shell itself rather than relying on manual review.
test('builder chrome has sufficient color contrast and one main landmark', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).exclude('#live-preview-iframe').withRules([
    'color-contrast', 'landmark-one-main', 'region'
  ]).analyze();
  expect(results.violations).toEqual([]);
});

test('editor screen chrome has sufficient color contrast in both light and dark mode', async ({ page }) => {
  await openAccordion(page);
  const lightResults = await new AxeBuilder({ page }).include('#editor-state').exclude('#live-preview-iframe')
    .withRules(['color-contrast']).analyze();
  expect(lightResults.violations).toEqual([]);

  await page.locator('#btn-theme').click();
  const darkResults = await new AxeBuilder({ page }).include('#editor-state').exclude('#live-preview-iframe')
    .withRules(['color-contrast']).analyze();
  expect(darkResults.violations).toEqual([]);
});

test('narrow viewport (320px) does not force horizontal scrolling on the app shell', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openAccordion(page);
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(hasHorizontalOverflow).toBe(false);
});

test('interactive controls meet the WCAG 2.2 24x24px minimum target size', async ({ page }) => {
  await openAccordion(page);
  const results = await new AxeBuilder({ page }).exclude('#live-preview-iframe').withRules(['target-size']).analyze();
  expect(results.violations).toEqual([]);
});

test('generated accordion has valid ARIA references and state changes', async ({ page }) => {
  const frame = await openAccordion(page);
  const brokenReferences = await frame.locator('body').evaluate(body => [...body.querySelectorAll('[aria-controls], [aria-labelledby]')]
    .flatMap(element => ['aria-controls', 'aria-labelledby'].flatMap(attribute =>
      (element.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)
        .filter(id => !body.ownerDocument.getElementById(id)).map(id => `${attribute}:${id}`))));
  expect(brokenReferences).toEqual([]);
  const trigger = frame.locator('.accordion-trigger').first();
  await trigger.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

test('tabs expose correct roles, selected state, and keyboard focus', async ({ page }) => {
  await page.goto('/');
  await page.locator('.component-select-card').filter({ hasText: 'Horizontal Tabs' }).click();
  const frame = page.frameLocator('#live-preview-iframe');
  await expect(frame.locator('[role="tablist"]')).toHaveCount(1);
  await expect(frame.locator('[role="tab"]')).toHaveCount(3);
  const first = frame.locator('[role="tab"]').first();
  await first.press('ArrowRight');
  await expect(frame.locator('[role="tab"]').nth(1)).toBeFocused();
  await expect(frame.locator('[role="tab"]').nth(1)).toHaveAttribute('aria-selected', 'true');
});

test('keyboard traversal does not become trapped in the main editor', async ({ page }) => {
  await openAccordion(page);
  const visited = new Set();
  for (let index = 0; index < 35; index += 1) {
    await page.keyboard.press('Tab');
    visited.add(await page.evaluate(() => document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName));
  }
  expect(visited.size).toBeGreaterThan(8);
});

test('keyboard focus has a visible indicator and reduced motion is honored', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frame = await openAccordion(page);
  const trigger = frame.locator('.accordion-trigger').first();
  await trigger.focus();
  const focusStyle = await trigger.evaluate(element => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
  await expect.poll(() => trigger.evaluate(element => Number.parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.00001);
});

test('image authoring surfaces missing-alt warnings', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-item[data-category="media"]').click();
  await page.locator('.component-select-card').filter({ hasText: 'Grid Photo Gallery' }).click();
  await expect(page.locator('.field-warning').filter({ hasText: /alternative text/i }).first()).toBeVisible();
});

test('automatically detectable component color contrast is reported', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-theme-manager').click();
  await page.locator('.theme-card').filter({ hasText: 'Accessibility High Contrast' }).getByRole('button', { name: 'Apply' }).click();
  const report = page.locator('#theme-contrast-report');
  await expect(report.locator('.contrast-result')).toHaveCount(7);
  await expect(report.locator('.contrast-result.fail')).toHaveCount(0);
});

test('builder modal traps focus while open', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-settings').click();
  const modal = page.locator('#modal-settings');
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute('aria-hidden', 'false');
  const focusableCount = await modal
    .locator('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])')
    .count();
  for (let index = 0; index < focusableCount + 3; index += 1) {
    await page.keyboard.press('Tab');
    const withinModal = await page.evaluate(() => document.getElementById('modal-settings').contains(document.activeElement));
    expect(withinModal).toBe(true);
  }
});

test('closing a builder modal restores focus to its trigger', async ({ page }) => {
  await page.goto('/');
  // Focus the trigger via keyboard rather than a mouse click: WebKit does not
  // give a button keyboard focus on click (matching real Safari behavior),
  // so a mouse click alone can't meaningfully exercise focus restoration
  // there. Tab+Enter reflects how an actual keyboard/AT user would trigger
  // this and behaves consistently across all three engines.
  await page.locator('#btn-settings').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#modal-settings')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-settings')).toBeHidden();
  await expect(page.locator('#btn-settings')).toBeFocused();
});
