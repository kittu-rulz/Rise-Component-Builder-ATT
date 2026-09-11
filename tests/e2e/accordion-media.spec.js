import { expect, test } from '@playwright/test';

async function openAccordion(page) {
  await page.goto('/');
  await page.locator('.component-select-card').filter({ hasText: 'Accordion' }).click();
  await expect(page.locator('#editor-state')).toBeVisible();
}

test.beforeEach(async ({ page }) => openAccordion(page));

test('Accordion item media control allows adding image with responsive placement and preview', async ({ page }) => {
  const cards = page.locator('#dynamic-items-container > .dynamic-item-card:not(.component-fields-card)');
  const firstCard = cards.first();

  // Find the Media — Optional details section
  const mediaDetails = firstCard.locator('.item-media-details-shell');
  await expect(mediaDetails).toBeVisible();

  // Open details if not open
  const summary = mediaDetails.locator('summary');
  await summary.click();

  // Select Image from Media Type select
  const typeSelect = mediaDetails.locator('.item-media-type-select');
  await typeSelect.selectOption('image');

  // Verify type badge updates
  await expect(mediaDetails.locator('.item-media-type-badge')).toHaveText('IMAGE');

  // Enter URL directly into the URL input
  const urlInput = mediaDetails.locator('input[type="url"]').first();
  await urlInput.fill('https://images.unsplash.com/photo-1579546929518-9e396f3cc809');

  // Fill Alt text
  const altInput = mediaDetails.locator('textarea[placeholder*="Describe the image"]');
  await altInput.fill('Vibrant gradient abstract illustration');

  // Fill Caption
  const captionInput = mediaDetails.locator('input[placeholder*="caption"]');
  await captionInput.fill('Figure 1: Spectrum Demonstration');

  // Check preview iframe
  const frame = page.frameLocator('#live-preview-iframe');
  const imgSlot = frame.locator('.item-media-slot.item-media-type-image').first();
  await expect(imgSlot).toBeVisible();
  await expect(imgSlot.locator('img')).toHaveAttribute('alt', 'Vibrant gradient abstract illustration');
  await expect(imgSlot.locator('.item-media-caption')).toHaveText('Figure 1: Spectrum Demonstration');
});

test('Accordion item media supports audio with transcript drawer in preview', async ({ page }) => {
  const firstCard = page.locator('#dynamic-items-container > .dynamic-item-card:not(.component-fields-card)').first();
  const mediaDetails = firstCard.locator('.item-media-details-shell');
  await mediaDetails.locator('summary').click();

  const typeSelect = mediaDetails.locator('.item-media-type-select');
  await typeSelect.selectOption('audio');

  const urlInput = mediaDetails.locator('input[type="url"]').first();
  await urlInput.fill('https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg');

  // Fill transcript
  const transcriptInput = mediaDetails.locator('textarea[placeholder*="transcript"]');
  await transcriptInput.fill('Transcript: Sound of heavy rain falling on a tin roof.');

  // Check preview iframe
  const frame = page.frameLocator('#live-preview-iframe');
  const audioSlot = frame.locator('.item-media-slot.item-media-type-audio').first();
  await expect(audioSlot).toBeVisible();
  await expect(audioSlot.locator('audio')).toBeVisible();
  await expect(audioSlot.locator('.item-media-transcript-drawer')).toBeVisible();
  await expect(audioSlot.locator('.item-media-transcript-body')).toContainText('Sound of heavy rain');
});

test('Accordion item media supports video with 16:9 aspect ratio and placement', async ({ page }) => {
  const firstCard = page.locator('#dynamic-items-container > .dynamic-item-card:not(.component-fields-card)').first();
  const mediaDetails = firstCard.locator('.item-media-details-shell');
  await mediaDetails.locator('summary').click();

  const typeSelect = mediaDetails.locator('.item-media-type-select');
  await typeSelect.selectOption('video');

  const urlInput = mediaDetails.locator('input[type="url"]').first();
  await urlInput.fill('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');

  const frame = page.frameLocator('#live-preview-iframe');
  const videoSlot = frame.locator('.item-media-slot.item-media-type-video').first();
  await expect(videoSlot).toBeVisible();
  await expect(videoSlot.locator('video')).toBeVisible();
});
