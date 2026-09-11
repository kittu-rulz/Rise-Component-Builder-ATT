import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('.component-select-card[data-component-id="accordion"] [data-action="use"]').click();
  await expect(page.locator('#editor-state')).toBeVisible();
});

test('rich text toolbar displays formatting controls and formats content into live preview', async ({ page }) => {
  const firstCard = page.locator('#dynamic-items-container > .dynamic-item-card:not(.component-fields-card)').first();
  
  // Ensure the card is expanded
  const isCollapsed = await firstCard.evaluate(el => el.classList.contains('collapsed'));
  if (isCollapsed) {
    await firstCard.locator('.item-collapse-btn').click();
  }

  // Find rich text editor within the first item
  const richTextContainer = firstCard.locator('.rich-text-editor-container').first();
  await expect(richTextContainer).toBeVisible();

  // Toolbar should have bold, italic, underline, size, color, highlight, list, and clear buttons
  const toolbar = richTextContainer.locator('.rich-text-toolbar');
  await expect(toolbar.locator('button[title^="Bold"]')).toBeVisible();
  await expect(toolbar.locator('button[title^="Italic"]')).toBeVisible();
  await expect(toolbar.locator('button[title^="Underline"]')).toBeVisible();
  await expect(toolbar.locator('button[title="Font Size"]')).toBeVisible();
  await expect(toolbar.locator('button[title="Text Color"]')).toBeVisible();
  await expect(toolbar.locator('button[title="Text Highlight Color"]')).toBeVisible();
  await expect(toolbar.locator('button[title="Bullet List"]')).toBeVisible();

  // Focus and type into contenteditable editor
  const editor = richTextContainer.locator('.rich-text-contenteditable');
  await editor.click();
  await editor.fill('');
  await editor.pressSequentially('Custom formatted accordion body content.');

  // Select all text using keyboard and apply bold
  await editor.press('ControlOrMeta+A');
  await toolbar.locator('button[title^="Bold"]').click();

  // Verify preview reflects bold text in iframe
  const frame = page.frameLocator('#live-preview-iframe');
  await expect(frame.locator('.acc-panel b, .acc-panel strong').first()).toBeVisible();
});

test('font size and color dropdown popovers open and allow selections', async ({ page }) => {
  const firstCard = page.locator('#dynamic-items-container > .dynamic-item-card:not(.component-fields-card)').first();
  const isCollapsed = await firstCard.evaluate(el => el.classList.contains('collapsed'));
  if (isCollapsed) {
    await firstCard.locator('.item-collapse-btn').click();
  }

  const richTextContainer = firstCard.locator('.rich-text-editor-container').first();
  const toolbar = richTextContainer.locator('.rich-text-toolbar');

  // Click Font Size dropdown
  await toolbar.locator('button[title="Font Size"]').click();
  const sizePopover = richTextContainer.locator('.rt-size-popover');
  await expect(sizePopover).toBeVisible();
  await expect(sizePopover.locator('.rt-menu-item').filter({ hasText: 'Large (22px)' })).toBeVisible();

  // Click Text Color dropdown
  await toolbar.locator('button[title="Text Color"]').click();
  // Size popover should close and color popover should open
  await expect(sizePopover).not.toBeVisible();
  const colorPopover = richTextContainer.locator('.rt-color-popover');
  await expect(colorPopover).toBeVisible();
  await expect(colorPopover.locator('.rt-color-swatch')).toHaveCount(9);
});
