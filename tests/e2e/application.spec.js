import { expect, test } from '@playwright/test';

async function openComponent(page, name, category = 'Interactive') {
  await page.goto('/');
  if (category !== 'Interactive') await page.getByText(category, { exact: true }).click();
  await page.locator('.component-select-card').filter({ hasText: name }).click();
  await expect(page.locator('#editor-state')).toBeVisible();
}

test('application loads without console errors and renders the catalog', async ({ page }) => {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Component Builder' })).toBeVisible();
  await expect(page.locator('.component-select-card')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('every registered component opens in the builder editor and renders its live preview with no console/page errors', async ({ page }) => {
  // Opens and closes all 21 registered components in sequence — comfortably under the
  // default 30s timeout when run alone, but slower under heavy parallel worker
  // contention (especially on WebKit), so this gets its own longer budget rather than
  // being treated as flaky.
  test.slow();
  // image-gallery and video-frame ship illustrative default content that hotlinks a
  // third-party image CDN (docs/MEDIA-ASSET-PIPELINE.md's external-dependency warning).
  // Fulfilling those requests with a real, always-valid local placeholder — rather than
  // letting the real network answer — makes this a deterministic check of the app's own
  // code instead of a check of live network conditions in the test environment.
  const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  await page.route(/images\.unsplash\.com/, route => route.fulfill({ status: 200, contentType: 'image/png', body: onePixelPng }));
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} (console)`); });
  page.on('pageerror', error => errors.push(`${error.message} (pageerror)`));
  await page.goto('/');

  // 'advanced' (Interactive Video's own "Advanced Interactions" category) was missing
  // here until this line — a real gap: that component was never exercised by this
  // comprehensive smoke test at all, silently, since its category key was never added
  // when the category itself shipped.
  const dataCategories = ['interactive', 'navigation', 'knowledge', 'timelines', 'process', 'cards', 'media', 'advanced'];
  for (const dataCategory of dataCategories) {
    await page.locator(`.nav-item[data-category="${dataCategory}"]`).click();
    const cardCount = await page.locator('.component-select-card').count();
    for (let index = 0; index < cardCount; index += 1) {
      const card = page.locator('.component-select-card').nth(index);
      const title = await card.locator('h3').textContent();
      await card.click();
      await expect(page.locator('#live-preview-iframe')).toBeVisible();
      await expect(page.frameLocator('#live-preview-iframe').locator('body')).not.toBeEmpty();
      // WebKit-on-Windows-sandbox known flake (docs/TESTING-STRATEGY.md "E2E browser
      // matrix and known flake"): intermittently throws an internal
      // "Temporal.Duration properties must be finite and of consistent sign" RangeError
      // with no connection to which component is on screen (reproduced against three
      // different, unrelated components across repeated runs) and no occurrence of
      // "Temporal" anywhere in this project's own source — a WebKit engine artifact of
      // this sandboxed environment, not an application error. Only genuine application
      // errors should fail this test.
      const applicationErrors = errors.filter(message => !/failed to load resource|corrupt or truncated|net::err_|networkerror|failed to decode|temporal\.duration/i.test(message));
      expect(applicationErrors, `component "${title}" produced console/page errors`).toEqual([]);
      await page.locator('#btn-back-to-catalog').click();
      await page.locator(`.nav-item[data-category="${dataCategory}"]`).click();
    }
  }
});

// Real bug, reported from production use: the live preview iframe rendered completely
// blank the very first time a component was selected in a fresh session/reload — but
// worked fine every time after, including switching directly between two already-selected
// components. Root cause (app.js#updatePreviewEmptyState): the iframe's `hidden` attribute
// is removed and its srcdoc is written in the same synchronous tick, back to back. For a
// sandboxed (no allow-same-origin) iframe, some Chrome builds haven't finished a layout
// pass for the newly-unhidden subtree by the time the srcdoc navigation starts, so its very
// first paint is silently dropped until an unrelated later reflow happens to repaint it —
// which self-resolves almost instantly for a small/fast component (never noticed), but can
// leave a larger payload with its own external media (Interactive Video) blank
// indefinitely, since nothing else naturally triggers a reflow while the author is just
// looking at it. The test above exercises this component only as a *switch* target (every
// other card in its category loop is clicked first) — deliberately never reproduces the
// true first-selection case, so it's covered separately, here, on a clean page with no
// prior selection at all.
test('the very first component selected in a fresh session renders its live preview immediately, not just after a reload', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-item[data-category="advanced"]').click();
  await page.locator('.component-select-card').filter({ hasText: 'Interactive Video' }).click();
  await expect(page.locator('#editor-state')).toBeVisible();
  await expect(page.frameLocator('#live-preview-iframe').locator('.iv-block')).toBeVisible();
  await expect(page.frameLocator('#live-preview-iframe').locator('.iv-title')).toHaveText('Interactive Video');
});

test('an unanticipated runtime error surfaces a generic toast and logs full detail to the console, not to the user', async ({ page }) => {
  await page.goto('/');
  // Reads each console.error argument's real value from the page (via arg.evaluate, pulling
  // .message off an Error instance) rather than relying on message.text()'s browser-native
  // string formatting of a non-primitive argument — that formatting is not consistent
  // between Chromium and Firefox, and app.js's own handler (reportUnexpectedError, app.js)
  // logs the raw Error object, not a pre-stringified message.
  let loggedDetail = '';
  page.on('console', message => {
    if (message.type() !== 'error') return;
    message.args().forEach(arg => {
      arg.evaluate(value => (value instanceof Error ? value.message : String(value)))
        .then(text => { loggedDetail += text; })
        .catch(() => {});
    });
  });
  await page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { error: new Error('harmless test error: internal detail xyz123'), message: 'harmless test error: internal detail xyz123' })));
  const toast = page.locator('.toast-error');
  await expect(toast).toBeVisible();
  await expect(toast).not.toContainText('xyz123');
  await expect(toast).toContainText(/unexpected/i);
  await expect.poll(() => loggedDetail).toContain('xyz123');
});

test('sidebar storage meter reports measured browser storage usage', async ({ page }) => {
  await page.goto('/');
  const label = page.locator('#storage-usage-label');
  const bar = page.locator('.storage-bar');
  await expect(label).not.toHaveText('Calculating…');
  await expect(label).toHaveText(/^(~\d+% used|Usage unavailable)$/);
  const valueNow = Number(await bar.getAttribute('aria-valuenow'));
  expect(valueNow).toBeGreaterThanOrEqual(0);
  expect(valueNow).toBeLessThanOrEqual(100);
});

test('category switching and search filter the catalog', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Knowledge Checks', { exact: true }).click();
  await expect(page.locator('.component-select-card')).toHaveCount(4);
  await expect(page.locator('.component-select-card').filter({ hasText: 'Multiple Choice' })).toBeVisible();
  await page.locator('.nav-item[data-category="interactive"]').click();
  await page.locator('#search-components').fill('accordion');
  await expect(page.locator('.component-select-card')).toHaveCount(1);
  await expect(page.locator('.component-select-card')).toContainText('Responsive Accordion');
});

test('catalog cards are native buttons reachable and activatable by keyboard', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.component-select-card').filter({ hasText: 'Responsive Accordion' });
  await expect(card).toHaveRole('button');
  await card.focus();
  await expect(card).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#editor-state')).toBeVisible();
  await expect(page.locator('#active-component-title')).toHaveText('Responsive Accordion');
});

test('component selection opens the editor and back returns to the catalog', async ({ page }) => {
  await openComponent(page, 'Responsive Accordion');
  await expect(page.locator('#active-component-title')).toHaveText('Responsive Accordion');
  await page.locator('#btn-back-to-catalog').click();
  await expect(page.locator('#catalog-state')).toBeVisible();
  await expect(page.locator('#editor-state')).toBeHidden();
});

test('builder light and dark interface modes remain independent', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#btn-theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

for (const viewport of [
  { width: 1440, height: 900 }, { width: 1024, height: 768 },
  { width: 768, height: 1024 }, { width: 375, height: 812 }
]) {
  test(`key catalog and editor flow works at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openComponent(page, 'Responsive Accordion');
    await expect(page.locator('#live-preview-iframe')).toBeVisible();
    await expect(page.frameLocator('#live-preview-iframe').locator('.accordion-group')).toBeVisible();
  });
}
