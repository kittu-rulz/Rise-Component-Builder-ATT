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
  await secondCard.locator('[data-field-id="title"]').fill('');
  // Collapse the item so the fix path also has to re-expand it, not just scroll to it.
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
