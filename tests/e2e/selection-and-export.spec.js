import { expect, test } from '@playwright/test';

// P12: explicit initial-selection state and export readiness. appState.selectedComponent is
// the single source of truth for whether Save/Export are meaningful actions right now — see
// docs/ARCHITECTURE.md "Initial selection state and export readiness (P12)".

async function selectAccordion(page) {
  await page.locator('.component-select-card').filter({ hasText: 'Responsive Accordion' }).click();
  await expect(page.locator('#editor-state')).toBeVisible();
}

test('fresh launch: catalog shown, preview empty, Save/Export disabled and explained', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#catalog-state')).toBeVisible();
  await expect(page.locator('#editor-state')).toBeHidden();
  await expect(page.locator('#preview-empty-state')).toBeVisible();
  await expect(page.locator('#live-preview-iframe')).toBeHidden();

  const btnSave = page.locator('#btn-save');
  const btnExport = page.locator('#btn-export');
  await expect(btnSave).toBeDisabled();
  await expect(btnExport).toBeDisabled();
  await expect(btnExport).toHaveAttribute('title', /select a component/i);
  await expect(btnExport).toHaveAttribute('aria-label', /select a component/i);
});

test('selecting a component enables Save/Export and shows the live preview', async ({ page }) => {
  await page.goto('/');
  await selectAccordion(page);
  await expect(page.locator('#preview-empty-state')).toBeHidden();
  await expect(page.locator('#live-preview-iframe')).toBeVisible();
  await expect(page.locator('#btn-save')).toBeEnabled();
  await expect(page.locator('#btn-export')).toBeEnabled();
});

test('deselection: Back to Templates disables Save/Export again and clears the preview', async ({ page }) => {
  await page.goto('/');
  await selectAccordion(page);
  await page.locator('#btn-back-to-catalog').click();
  await expect(page.locator('#catalog-state')).toBeVisible();
  await expect(page.locator('#preview-empty-state')).toBeVisible();
  await expect(page.locator('#live-preview-iframe')).toBeHidden();
  await expect(page.locator('#btn-save')).toBeDisabled();
  await expect(page.locator('#btn-export')).toBeDisabled();
});

test('opening a saved project restores selection with Save/Export enabled', async ({ page }) => {
  await page.goto('/');
  await selectAccordion(page);
  await page.locator('#btn-save').click();
  await page.locator('#save-component-name').fill('Reopen Me');
  await page.locator('#btn-confirm-save').click();
  await expect(page.locator('.toast')).toContainText('Saved');

  await page.locator('#btn-back-to-catalog').click();
  await expect(page.locator('#btn-export')).toBeDisabled();

  await page.locator('#btn-open').click();
  await page.locator('.saved-component-card').filter({ hasText: 'Reopen Me' }).getByRole('button', { name: 'Load' }).click();
  await expect(page.locator('#editor-state')).toBeVisible();
  await expect(page.locator('#btn-save')).toBeEnabled();
  await expect(page.locator('#btn-export')).toBeEnabled();
});

test('a restored draft on reload also lands with Save/Export enabled', async ({ page }) => {
  await page.goto('/');
  await selectAccordion(page);
  await page.waitForTimeout(800); // clears the 700ms draft-save debounce
  await page.reload();
  await expect(page.locator('#editor-state')).toBeVisible();
  await expect(page.locator('#btn-save')).toBeEnabled();
  await expect(page.locator('#btn-export')).toBeEnabled();
});

test('a Blocking issue disables the export actions inside the modal', async ({ page }) => {
  await page.goto('/');
  await selectAccordion(page);
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('');

  await page.locator('#btn-export').click();
  await expect(page.locator('#export-preflight-results')).toContainText(/blocking/i);
  await expect(page.locator('#btn-copy-html')).toBeDisabled();
  await expect(page.locator('#btn-download-html')).toBeDisabled();
});

test('a Warning-only issue does not disable the export actions', async ({ page }) => {
  await page.goto('/');
  await selectAccordion(page);
  // Completion tracking on with no export format chosen yet fires
  // general-completion-iframe-format — a Warning, not Blocking (js/validation.js).
  await page.locator('.editor-tab[data-tab="settings"]').click();
  await page.locator('#input-track-completion').check();

  await page.locator('#btn-export').click();
  await expect(page.locator('#export-preflight-results')).not.toContainText(/blocking errors/i);
  await expect(page.locator('#btn-copy-html')).toBeEnabled();
});

test('a clean selection can export successfully', async ({ page }) => {
  await page.goto('/');
  await selectAccordion(page);
  await page.locator('#btn-export').click();
  await expect(page.locator('#btn-copy-html')).toBeEnabled();

  await page.locator('#export-advanced-options > summary').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-download-html').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.html$/);
});
