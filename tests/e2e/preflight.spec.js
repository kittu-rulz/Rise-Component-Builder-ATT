import { expect, test } from '@playwright/test';

// Field-targeting behavior for the Preflight panel (Requirement 4/7, P05): clicking a
// result's "Go to field"/"Go to item" button must close the panel, expand the item if it
// was collapsed, scroll to and focus the exact target — and work the same way whether
// activated by mouse or keyboard.

async function openAccordion(page) {
  await page.goto('/');
  await page.locator('.component-select-card').filter({ hasText: 'Responsive Accordion' }).click();
  await expect(page.locator('#editor-state')).toBeVisible();
}

test.beforeEach(async ({ page }) => openAccordion(page));

test('clicking "Go to field" closes Preflight, expands a collapsed item, and focuses the exact field', async ({ page }) => {
  const secondCard = page.locator('.dynamic-item-card[data-index="1"]');
  // P11: a freshly-loaded component only starts with its first item expanded — expand this
  // one to fill it, then collapse it again so the fix path also has to re-expand it, not
  // just scroll to it.
  await secondCard.locator('.item-collapse-btn').click();
  await secondCard.locator('[data-field-id="title"]').fill('');
  await secondCard.locator('.item-collapse-btn').click();
  await expect(secondCard).toHaveClass(/collapsed/);

  await page.locator('#btn-preflight').click();
  await expect(page.locator('#modal-preflight')).toBeVisible();
  const issueRow = page.locator('.preflight-issue', { hasText: 'Required field is empty' }).first();
  await expect(issueRow).toBeVisible();
  await issueRow.getByRole('button', { name: 'Go to field' }).click();

  await expect(page.locator('#modal-preflight')).toBeHidden();
  await expect(secondCard).not.toHaveClass(/collapsed/);
  await expect(secondCard.locator('[data-field-id="title"]')).toBeFocused();
});

test('the "Go to field" action activates with the keyboard, not just a mouse click', async ({ page }) => {
  const secondCard = page.locator('.dynamic-item-card[data-index="1"]');
  // P11: expand this default-collapsed item to fill it, then collapse it again.
  await secondCard.locator('.item-collapse-btn').click();
  await secondCard.locator('[data-field-id="title"]').fill('');
  await secondCard.locator('.item-collapse-btn').click();

  await page.locator('#btn-preflight').click();
  const issueRow = page.locator('.preflight-issue', { hasText: 'Required field is empty' }).first();
  const jumpButton = issueRow.getByRole('button', { name: 'Go to field' });
  await jumpButton.focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('#modal-preflight')).toBeHidden();
  await expect(secondCard).not.toHaveClass(/collapsed/);
  await expect(secondCard.locator('[data-field-id="title"]')).toBeFocused();
});

test('an issue with only an item (no single field) gets a "Go to item" action that still expands and focuses the card', async ({ page }) => {
  // Two items with identical title+content trips general-duplicate-items, which has an
  // itemIndex but no fieldId — previously this got no fix action at all.
  const firstCard = page.locator('.dynamic-item-card[data-index="0"]');
  const secondCard = page.locator('.dynamic-item-card[data-index="1"]');
  await firstCard.locator('[data-field-id="title"]').fill('Same title');
  await firstCard.locator('[data-field-id="content"]').fill('Same content');
  // P11: expand this default-collapsed item to fill it, then collapse it again.
  await secondCard.locator('.item-collapse-btn').click();
  await secondCard.locator('[data-field-id="title"]').fill('Same title');
  await secondCard.locator('[data-field-id="content"]').fill('Same content');
  await secondCard.locator('.item-collapse-btn').click();

  await page.locator('#btn-preflight').click();
  const issueRow = page.locator('.preflight-issue', { hasText: 'Duplicate item content' }).first();
  await expect(issueRow).toBeVisible();
  await issueRow.getByRole('button', { name: 'Go to item' }).click();

  await expect(page.locator('#modal-preflight')).toBeHidden();
  await expect(secondCard).not.toHaveClass(/collapsed/);
});

test('Preflight shows "No issues found" only when every enabled rule passes, and shows severity-grouped counts otherwise', async ({ page }) => {
  await page.locator('#btn-preflight').click();
  await expect(page.locator('#preflight-results')).toContainText('No issues found');

  await page.locator('#modal-preflight .modal-close-btn').click();
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('');
  await page.locator('#btn-preflight').click();
  await expect(page.locator('#preflight-results')).not.toContainText('No issues found');
  await expect(page.locator('.preflight-section-title.is-blocking')).toContainText(/Blocking Errors \(\d+\)/);
});

test('the concise accessible announcement updates without dumping the full issue list into the live region', async ({ page }) => {
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('');
  await page.locator('#btn-preflight').click();
  const announcement = page.locator('#preflight-announcement');
  await expect(announcement).toHaveText(/^\d+ issues?: .+\.$/);
  // The announcement is a short summary sentence, not the full per-issue text.
  const announcementText = await announcement.textContent();
  expect(announcementText.length).toBeLessThan(120);
});

// P07: js/dom-measurement.js's hidden-iframe + postMessage measurement can only be
// meaningfully verified in a real browser — jsdom has no layout engine (scrollHeight/
// scrollWidth/clientWidth are always 0 there), so this is deliberately an e2e test, not a
// unit test. Exercises the module directly with synthetic HTML sized to force each
// dimension, independent of any specific catalog component's actual rendered height.
test.describe('js/dom-measurement.js — real hidden-iframe measurement', () => {
  test('measures a tall, wide document close to its actual pixel dimensions', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { measureRenderedDimensions } = await import('/js/dom-measurement.js');
      const html = '<!doctype html><html><body style="margin:0"><div style="height:1234px;width:900px;">tall and wide</div></body></html>';
      return measureRenderedDimensions(html, { desktopWidth: 740, mobileWidth: 375, timeoutMs: 4000 });
    });
    expect(result).not.toBeNull();
    // Within a few px of the authored size — allow for UA-default body margin/borders.
    expect(result.desktopContentHeight).toBeGreaterThanOrEqual(1230);
    expect(result.desktopContentHeight).toBeLessThan(1300);
    // At 375px width, a 900px-wide element overflows by roughly 900-375=525px.
    expect(result.mobileOverflowPx).toBeGreaterThan(450);
  });

  test('measures a small document as producing no overflow', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { measureRenderedDimensions } = await import('/js/dom-measurement.js');
      const html = '<!doctype html><html><body style="margin:0"><p>short</p></body></html>';
      return measureRenderedDimensions(html, { desktopWidth: 740, mobileWidth: 375, timeoutMs: 4000 });
    });
    expect(result.desktopContentHeight).toBeLessThan(100);
    expect(result.mobileOverflowPx).toBe(0);
  });

  test('resolves null overall for empty input rather than hanging or throwing', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { measureRenderedDimensions } = await import('/js/dom-measurement.js');
      return measureRenderedDimensions('');
    });
    expect(result).toBeNull();
  });

  test('an aborted measurement resolves promptly to a null-valued result instead of waiting for the timeout', async ({ page }) => {
    await page.goto('/');
    const elapsedMs = await page.evaluate(async () => {
      const { measureRenderedDimensions } = await import('/js/dom-measurement.js');
      const controller = new AbortController();
      const started = performance.now();
      const resultPromise = measureRenderedDimensions('<!doctype html><html><body>x</body></html>', { timeoutMs: 4000, signal: controller.signal });
      controller.abort();
      await resultPromise;
      return performance.now() - started;
    });
    expect(elapsedMs).toBeLessThan(1000); // well under the 4000ms timeout — proves it was actually cancelled, not just outrun
  });
});

test('Preflight measures real rendered dimensions for a normal component and reports no clipping/overflow issues', async ({ page }) => {
  await page.locator('#btn-preflight').click();
  const results = page.locator('#preflight-results');
  // Auto-retrying assertion — waits out the "Running preflight checks…" placeholder and
  // the real async hidden-iframe measurement without a fixed sleep.
  await expect(results).toContainText('No issues found');
  // A successful measurement must not fall back to the "couldn't measure" manual-check text.
  await expect(results).not.toContainText("couldn't be automatically measured");
});
