import { expect, test } from '@playwright/test';

async function openAccordion(page) {
  await page.goto('/');
  await page.locator('.component-select-card').filter({ hasText: 'Responsive Accordion' }).click();
  await expect(page.locator('#editor-state')).toBeVisible();
}

test.beforeEach(async ({ page }) => openAccordion(page));

test('content changes update the live preview', async ({ page }) => {
  await page.locator('#input-block-title').fill('LEARNING\nACTIVITY');
  await page.locator('#input-block-headline').fill('Updated live preview\nheadline');
  const frame = page.frameLocator('#live-preview-iframe');
  await expect(frame.locator('.block-label')).toHaveText('LEARNING\nACTIVITY');
  await expect(frame.locator('[id$="-block-headline"]')).toHaveText('Updated live preview\nheadline');
  await expect(frame.locator('.block-label')).toHaveCSS('white-space', 'pre-line');
  await expect(frame.locator('[id$="-block-headline"]')).toHaveCSS('white-space', 'pre-line');
});

test('items can be added, duplicated, deleted, moved, and collapsed', async ({ page }) => {
  const cards = page.locator('#dynamic-items-container > .dynamic-item-card:not(.component-fields-card)');
  await expect(cards).toHaveCount(3);
  await page.locator('#btn-add-item').click();
  await expect(cards).toHaveCount(4);
  await cards.first().getByRole('button', { name: 'Duplicate item' }).click();
  await expect(cards).toHaveCount(5);
  await cards.nth(1).getByRole('button', { name: 'Delete item' }).click();
  await expect(cards).toHaveCount(4);
  const secondSummary = await cards.nth(1).locator('.item-collapse-btn').textContent();
  await cards.first().getByRole('button', { name: 'Move item down' }).click();
  await expect(cards.first().locator('.item-collapse-btn')).toContainText(secondSummary.split('—').pop().trim());
  await cards.first().locator('.item-collapse-btn').click();
  await expect(cards.first()).toHaveClass(/collapsed/);
});

test('range sliders inside draggable item cards are not hijacked by drag-to-reorder', async ({ page }) => {
  await page.locator('#btn-back-to-catalog').click();
  await page.locator('.component-select-card').filter({ hasText: 'Interactive Hotspots' }).click();

  const input = page.locator('#schema-0-x');
  await expect(input).toHaveValue('25');
  await input.scrollIntoViewIfNeeded();
  const box = await input.boundingBox();
  const thumbY = box.y + box.height / 2;
  await page.mouse.move(box.x + (25 / 100) * box.width, thumbY);
  await page.mouse.down();
  await page.mouse.move(box.x + (80 / 100) * box.width, thumbY, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => input.inputValue()).not.toBe('25');
  expect(Number(await input.inputValue())).toBeGreaterThan(70);

  const cards = page.locator('#dynamic-items-container > .dynamic-item-card:not(.component-fields-card)');
  const firstBefore = await cards.nth(0).locator('.item-collapse-btn').textContent();
  await cards.nth(0).locator('.drag-handle').dragTo(cards.nth(1));
  await expect.poll(() => cards.nth(0).locator('.item-collapse-btn').textContent()).not.toBe(firstBefore);
});

test('design controls update theme variables in preview', async ({ page }) => {
  await page.getByRole('button', { name: 'Design & Style' }).click();
  await page.locator('#input-color-primary-text').fill('#123456');
  await page.locator('#input-border-radius').fill('20');
  const frame = page.frameLocator('#live-preview-iframe');
  await expect.poll(() => frame.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--primary').trim())).toBe('#123456');
  await expect.poll(() => frame.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--border-radius').trim())).toBe('20px');
});

test('behavior settings update accordion single-open behavior', async ({ page }) => {
  await page.getByRole('button', { name: 'Behavior' }).click();
  await page.locator('#input-behavior-accordion-multi').uncheck();
  const triggers = page.frameLocator('#live-preview-iframe').locator('.accordion-trigger');
  await triggers.nth(0).click();
  await triggers.nth(1).click();
  await expect(triggers.nth(0)).toHaveAttribute('aria-expanded', 'false');
  await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'true');
});

test('required schema fields display inline errors', async ({ page }) => {
  await page.locator('#btn-back-to-catalog').click();
  await page.getByText('Knowledge Checks', { exact: true }).click();
  await page.locator('.component-select-card').filter({ hasText: 'Multiple Choice' }).click();
  const label = page.locator('#schema-0-label');
  await label.fill('');
  await expect(page.locator('#schema-0-label-error')).not.toBeEmpty();
  await expect(label).toHaveAttribute('aria-invalid', 'true');
});

test('saving is blocked while a required schema field is invalid', async ({ page }) => {
  await page.locator('#btn-back-to-catalog').click();
  await page.getByText('Knowledge Checks', { exact: true }).click();
  await page.locator('.component-select-card').filter({ hasText: 'Multiple Choice' }).click();

  const label = page.locator('#schema-0-label');
  await label.fill('');
  await page.locator('#btn-save').click();
  await expect(page.locator('.toast')).toContainText(/required/i);
  await expect(page.locator('#modal-save')).toBeHidden();

  await label.fill('Restored answer text');
  await page.locator('#btn-save').click();
  await expect(page.locator('#modal-save')).toBeVisible();
});

test('refresh control repaints the live preview without changing the selected device mode', async ({ page }) => {
  await page.locator('[data-device="mobile"]').click();
  await page.locator('#btn-preview-refresh').click();
  await expect(page.frameLocator('#live-preview-iframe').locator('.accordion-group')).toBeVisible();
  await expect(page.locator('#preview-viewport')).toHaveClass(/mobile/);
  // Full device-mode width/accessibility/reflow coverage lives in preview-device-modes.spec.js.
});

test('pop-out preview opens where browser permissions permit', async ({ page }) => {
  const popupPromise = page.waitForEvent('popup');
  await page.locator('#btn-preview-popout').click();
  const popup = await popupPromise;
  await expect(popup.locator('.accordion-group')).toBeVisible();
  await popup.close();
});

test('flip-card custom artwork uploads per face and removal restores the built-in icon', async ({ page, browserName }) => {
  // Playwright's bundled WebKit build on Windows cannot structured-clone a
  // Blob into IndexedDB at all (reproduced with zero app code: a bare
  // `indexedDB.open(...).put({ blob })` fails with "Error preparing
  // Blob/File data to be stored in object store"). This is a platform/test
  // environment limitation, not an app bug — real Safari is unaffected.
  test.skip(browserName === 'webkit', 'WebKit-on-Windows cannot store Blobs in IndexedDB in this test environment.');
  await page.locator('#btn-back-to-catalog').click();
  await page.locator('.component-select-card').filter({ hasText: '3D Flip Cards' }).click();
  const iconField = page.locator('#schema-0-iconImage').locator('xpath=ancestor::div[contains(@class,"schema-field")]');
  await expect(iconField.locator('.media-upload-guidance')).toHaveText(
    'Supported formats: JPG, JPEG, PNG, WebP, SVG, GIF. Preferred dimensions: 256 × 256 px (square). Maximum file size: 10.0 MB; SVG: 2.0 MB.'
  );
  await expect(page.locator('#schema-0-iconImage')).toHaveAttribute('aria-describedby', /schema-0-iconImage-guidance/);
  await iconField.locator('input[type="file"]').setInputFiles({
    name: 'custom-icon.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  });
  await page.locator('#schema-0-iconAltText').fill('Custom learning icon');
  const front = page.frameLocator('#live-preview-iframe').locator('.flip-card-front').first();
  await expect(front.locator('img.custom-item-icon')).toHaveAttribute('alt', 'Custom learning icon');
  await expect(iconField.locator('.media-file-metadata')).toContainText('custom-icon.png');
  await iconField.getByRole('button', { name: 'Remove file' }).click();
  await expect(front.locator('img.custom-item-icon')).toHaveCount(0);
  await expect(front.locator('.card-icon-badge svg')).toBeVisible();
});

test('media size-limit settings enforce a configurable maximum on image uploads', async ({ page }) => {
  await page.locator('#btn-settings').click();
  await page.locator('#settings-limit-image').fill('1');
  await page.locator('#btn-save-settings').click();
  await expect(page.locator('#modal-settings')).toBeHidden();

  await page.locator('#btn-back-to-catalog').click();
  await page.locator('.component-select-card').filter({ hasText: '3D Flip Cards' }).click();
  const iconField = page.locator('#schema-0-iconImage').locator('xpath=ancestor::div[contains(@class,"schema-field")]');
  await expect(iconField.locator('.media-upload-guidance')).toContainText('Maximum file size: 1.0 MB');

  const oversized = Buffer.concat([
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    Buffer.alloc(2 * 1024 * 1024)
  ]);
  await iconField.locator('input[type="file"]').setInputFiles({ name: 'too-big.png', mimeType: 'image/png', buffer: oversized });
  await expect(iconField.locator('.media-upload-error')).toContainText(/exceeds the 1\.0 MB image limit/i);

  await page.reload();
  await page.locator('#btn-settings').click();
  await expect(page.locator('#settings-limit-image')).toHaveValue('1');
});
