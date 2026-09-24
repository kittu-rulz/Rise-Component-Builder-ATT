import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?catalog');
  await page.locator('.component-select-card[data-component-id="accordion"] [data-action="use"]').click();
  await expect(page.locator('#editor-state')).toBeVisible();
});

// The item editors are not all the same any more. js/editor.js upgrades each schema field
// with isSingleLine: field.type === 'text', so an item's *title* gets a reduced toolbar —
// no Underline, no lists, no Advanced row (js/rich-text-editor.js gates all three on
// !isSingleLine) — while its *content* textarea gets the full one. These tests used
// `.rich-text-editor-container.first()`, which is the title, yet asserted the full toolbar
// and then checked the result in `.acc-panel`, the content panel: they only ever passed
// while every field shared one toolbar. `:not(.is-single-line)` pins them to the body field
// they were always about.
//
// Font size, text colour and highlight also moved off the primary toolbar into the
// collapsed `.rt-advanced-toolbar`, reached through its "Advanced" disclosure button.
const bodyEditor = card => card.locator('.rich-text-editor-container:not(.is-single-line)').first();
const ADVANCED = 'button[title^="More formatting options"]';

async function expandFirstItem(page) {
  const firstCard = page.locator('#dynamic-items-container > .dynamic-item-card:not(.component-fields-card)').first();
  const isCollapsed = await firstCard.evaluate(el => el.classList.contains('collapsed'));
  if (isCollapsed) await firstCard.locator('.item-collapse-btn').click();
  return firstCard;
}

test('rich text toolbar displays formatting controls and formats content into live preview', async ({ page }) => {
  const firstCard = await expandFirstItem(page);

  const richTextContainer = bodyEditor(firstCard);
  await expect(richTextContainer).toBeVisible();

  // Primary toolbar: the always-on formatting controls.
  const toolbar = richTextContainer.locator('.rich-text-toolbar');
  await expect(toolbar.locator('button[title^="Bold"]')).toBeVisible();
  await expect(toolbar.locator('button[title^="Italic"]')).toBeVisible();
  await expect(toolbar.locator('button[title^="Underline"]')).toBeVisible();
  await expect(toolbar.locator('button[title="Bullet List"]')).toBeVisible();

  // Font size and colour live behind the Advanced disclosure.
  await toolbar.locator(ADVANCED).click();
  const advanced = richTextContainer.locator('.rt-advanced-toolbar');
  await expect(advanced.locator('button[title="Font Size"]')).toBeVisible();
  await expect(advanced.locator('button[title="Text Color"]')).toBeVisible();
  await expect(advanced.locator('button[title="Text Highlight Color"]')).toBeVisible();

  // Focus and type into contenteditable editor
  const editor = richTextContainer.locator('.rich-text-contenteditable');
  await editor.click();
  await editor.fill('');
  await editor.pressSequentially('Custom formatted accordion body content.');

  // Select all text using keyboard and apply bold
  await editor.press('ControlOrMeta+A');
  await toolbar.locator('button[title^="Bold"]').click();

  // Verify preview reflects bold text in iframe. The panel markup is
  // .accordion-content > .accordion-body (there is no .acc-panel, which is what this
  // looked for), and panels render collapsed, so the first one is opened before asserting.
  const frame = page.frameLocator('#live-preview-iframe');
  await frame.locator('.accordion-trigger').first().click();
  await expect(frame.locator('.accordion-body b, .accordion-body strong').first()).toBeVisible();
});

test('font size and color dropdown popovers open and allow selections', async ({ page }) => {
  const firstCard = await expandFirstItem(page);

  const richTextContainer = bodyEditor(firstCard);
  await richTextContainer.locator('.rich-text-toolbar').locator(ADVANCED).click();
  const advanced = richTextContainer.locator('.rt-advanced-toolbar');

  // Click Font Size dropdown
  await advanced.locator('button[title="Font Size"]').click();
  const sizePopover = richTextContainer.locator('.rt-size-popover');
  await expect(sizePopover).toBeVisible();
  await expect(sizePopover.locator('.rt-menu-item').filter({ hasText: 'Large (22px)' })).toBeVisible();

  // Click Text Color dropdown
  await advanced.locator('button[title="Text Color"]').click();
  // Size popover should close and color popover should open
  await expect(sizePopover).not.toBeVisible();
  const colorPopover = richTextContainer.locator('.rt-color-popover');
  await expect(colorPopover).toBeVisible();
  await expect(colorPopover.locator('.rt-color-swatch')).toHaveCount(9);
});
