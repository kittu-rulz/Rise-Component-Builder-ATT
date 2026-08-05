import { expect, test } from '@playwright/test';

// Image-dimension limits and the auto-downscale/compression step (js/media.js#readImageDimensions,
// #computeResizeTarget, #resizeImageBlob) both require a real browser image decoder/canvas —
// unavailable in this project's Node-based vitest environment (see tests/media.test.mjs, which
// covers the pure sizing decision and everything else at the unit level instead). These two
// tests generate the oversized images with the browser's own <canvas>, entirely in-page, rather
// than shipping a multi-megabyte fixture file.
async function uploadCanvasImage(fileInputLocator, { width, height, name = 'canvas-image.png' }) {
  await fileInputLocator.evaluate(async (input, { width: canvasWidth, height: canvasHeight, fileName }) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');
    context.fillStyle = '#3366ff';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], fileName, { type: 'image/png' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { width, height, fileName: name });
}

test('an oversized image is automatically downscaled to fit within the resize threshold', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit-on-Windows cannot store Blobs in IndexedDB in this test environment (see editor-preview.spec.js).');
  await page.goto('/');
  await page.locator('.component-select-card').filter({ hasText: '3D Flip Cards' }).click();
  const iconField = page.locator('#schema-0-iconImage').locator('xpath=ancestor::div[contains(@class,"schema-field")]');

  await uploadCanvasImage(iconField.locator('input[type="file"]'), { width: 4000, height: 3000, name: 'oversized.png' });
  await expect(iconField.locator('.media-file-metadata')).toContainText('oversized.png');
  await expect(iconField.locator('.media-source-badge')).toHaveText('Local upload (stored in this browser)');

  const preview = iconField.locator('img.media-upload-preview');
  await expect(preview).toBeVisible();
  const dimensions = await preview.evaluate(image => new Promise(resolve => {
    if (image.complete && image.naturalWidth) resolve({ width: image.naturalWidth, height: image.naturalHeight });
    else image.addEventListener('load', () => resolve({ width: image.naturalWidth, height: image.naturalHeight }), { once: true });
  }));
  expect(Math.max(dimensions.width, dimensions.height)).toBeLessThanOrEqual(2000);
  expect(dimensions.width / dimensions.height).toBeCloseTo(4000 / 3000, 1);
});

test('an image far beyond the maximum dimension is rejected with a clear error, not silently accepted', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit-on-Windows cannot store Blobs in IndexedDB in this test environment (see editor-preview.spec.js).');
  await page.goto('/');
  await page.locator('.component-select-card').filter({ hasText: '3D Flip Cards' }).click();
  const iconField = page.locator('#schema-0-iconImage').locator('xpath=ancestor::div[contains(@class,"schema-field")]');

  await uploadCanvasImage(iconField.locator('input[type="file"]'), { width: 9000, height: 300, name: 'decompression-bomb-shaped.png' });
  await expect(iconField.locator('.media-upload-error')).toContainText(/exceeds the 8000px maximum image dimension/i);
  await expect(iconField.locator('.media-source-badge')).toHaveText('No file selected');
});

test('the media source badge reflects local vs. external vs. empty state', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-item[data-category="media"]').click();
  await page.locator('.component-select-card').filter({ hasText: 'Grid Photo Gallery' }).click();
  const sourceField = page.locator('#schema-0-content').locator('xpath=ancestor::div[contains(@class,"schema-field")]');
  await expect(sourceField.locator('.media-source-badge')).toHaveText('External URL');

  await sourceField.locator('input[type="url"]').fill('');
  await expect(sourceField.locator('.media-source-badge')).toHaveText('No file selected');
});
