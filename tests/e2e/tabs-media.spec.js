import { expect, test } from '@playwright/test';

test('Tabs: a tab can carry an image, shown in the live preview when that tab is open', async ({ page }) => {
  await page.goto('/?catalog');
  await page.locator('.component-select-card').filter({ hasText: 'Tabs' }).first().click();
  await expect(page.locator('#editor-state')).toBeVisible();

  const firstCard = page.locator('#dynamic-items-container > .dynamic-item-card:not(.component-fields-card)').first();
  const mediaDetails = firstCard.locator('.item-media-details-shell');
  await expect(mediaDetails).toBeVisible();
  await mediaDetails.locator('.item-media-type-select').selectOption('image');
  await mediaDetails.locator('input[type="url"]').first().fill('https://example.com/diagram.png');
  await mediaDetails.locator('textarea[placeholder*="Describe the image"]').fill('A diagram of the project lifecycle');

  const frame = page.frameLocator('#live-preview-iframe');
  await expect(frame.locator('.tab-panel.active .item-media-slot.item-media-type-image')).toHaveCount(1);
});
