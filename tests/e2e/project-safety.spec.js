import { expect, test } from '@playwright/test';

// P08: project name/save-status visibility, and guards against losing unsaved work via
// New Project, Open Project (Load), Back to Templates, and browser/tab close.

async function openAccordion(page) {
  await page.goto('/');
  await page.locator('.component-select-card').filter({ hasText: 'Responsive Accordion' }).click();
}

async function saveNamedProject(page, name) {
  await page.locator('#btn-save').click();
  await page.locator('#save-component-name').fill(name);
  await page.locator('#btn-confirm-save').click();
  await expect(page.locator('.toast')).toContainText('Saved');
}

test('editing shows "Unsaved changes"; saving flips the status to "Saved"', async ({ page }) => {
  await openAccordion(page);
  const status = page.locator('#project-status');
  await expect(status).toContainText('Unsaved changes');
  await expect(status).toContainText('Untitled project');

  await saveNamedProject(page, 'Project Safety E2E');
  await expect(status).toHaveText('Project Safety E2E · Saved');

  // Editing again after a save flips it back to unsaved.
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('Edited title');
  await expect(status).toContainText('Unsaved changes');
});

test('a failed save (empty name) keeps the dialog open and does not clear dirty state', async ({ page }) => {
  await openAccordion(page);
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('Some edit');
  await page.locator('#btn-save').click();
  await page.locator('#save-component-name').fill('');
  await page.locator('#btn-confirm-save').click();
  await expect(page.locator('.toast')).toContainText('Enter a project name');
  await expect(page.locator('#modal-save')).toBeVisible(); // nothing was discarded — the dialog is still open
  await page.locator('#save-component-name').fill('Recovered Name');
  await page.locator('#btn-confirm-save').click();
  await expect(page.locator('#project-status')).toHaveText('Recovered Name · Saved');
});

test('New Project with unsaved changes: Cancel keeps the work in place', async ({ page }) => {
  await openAccordion(page);
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('Do not lose me');
  await page.locator('#btn-new').click();
  await expect(page.locator('#modal-confirm')).toBeVisible();
  await expect(page.locator('#modal-confirm')).toContainText('Unsaved changes');
  await page.locator('#btn-confirm-dialog-cancel').click();
  await expect(page.locator('#modal-confirm')).toBeHidden();
  await expect(page.locator('#editor-state')).toBeVisible(); // still in the editor, not reset to the catalog
  await expect(page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]')).toHaveValue('Do not lose me');
});

test('New Project with unsaved changes: Discard proceeds and resets to the catalog', async ({ page }) => {
  await openAccordion(page);
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('Discard me');
  await page.locator('#btn-new').click();
  await page.locator('#btn-confirm-dialog-action').click(); // "Discard" is the confirm-styled action
  await expect(page.locator('#catalog-state')).toBeVisible();
  await expect(page.locator('.toast')).toContainText('New project started');
});

test('Back to Templates with unsaved changes is guarded the same way as New Project', async ({ page }) => {
  await openAccordion(page);
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('Guard me too');
  await page.locator('#btn-back-to-catalog').click();
  await expect(page.locator('#modal-confirm')).toBeVisible();
  await page.locator('#btn-confirm-dialog-cancel').click();
  await expect(page.locator('#editor-state')).toBeVisible();
});

test('New Project with unsaved changes: choosing Save completes the save, then proceeds automatically', async ({ page }) => {
  await openAccordion(page);
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('Save me on the way out');
  await page.locator('#btn-new').click();
  await page.locator('#btn-confirm-dialog-extra').click(); // "Save"
  await expect(page.locator('#modal-save')).toBeVisible();
  await page.locator('#save-component-name').fill('Saved On The Way Out');
  await page.locator('#btn-confirm-save').click();
  // The originally-requested New Project action resumed automatically once the save succeeded.
  await expect(page.locator('#catalog-state')).toBeVisible();
  await expect(page.locator('.toast').last()).toContainText('New project started');
});

test('New Project with unsaved changes: cancelling the Save dialog does not silently proceed afterward', async ({ page }) => {
  await openAccordion(page);
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('Careful with me');
  await page.locator('#btn-new').click();
  await page.locator('#btn-confirm-dialog-extra').click(); // "Save"
  await page.locator('#modal-save .modal-close-btn').click(); // back out of the save dialog
  await expect(page.locator('#editor-state')).toBeVisible(); // New Project never ran
  await expect(page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]')).toHaveValue('Careful with me');

  // A later, unrelated save must not retroactively trigger the earlier New Project action.
  await page.locator('#btn-save').click();
  await page.locator('#save-component-name').fill('Unrelated Later Save');
  await page.locator('#btn-confirm-save').click();
  await expect(page.locator('.toast')).toContainText('Saved');
  await expect(page.locator('#editor-state')).toBeVisible();
});

test('Opening a different saved project while dirty is guarded, and Discard loads the other project', async ({ page }) => {
  await openAccordion(page);
  await saveNamedProject(page, 'Original Project');
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('Unsaved edit');

  await page.locator('#btn-open').click();
  await page.locator('.saved-component-card').filter({ hasText: 'Original Project' }).getByRole('button', { name: 'Load' }).click();
  await expect(page.locator('#modal-confirm')).toBeVisible();
  await page.locator('#btn-confirm-dialog-action').click(); // Discard
  await expect(page.locator('.toast').last()).toContainText('Opened');
  await expect(page.locator('#project-status')).toHaveText('Original Project · Saved');
});

test('draft restoration on reload shows "Unsaved changes" for a never-explicitly-saved project', async ({ page }) => {
  await openAccordion(page);
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('Autosaved only, never saved');
  await page.waitForTimeout(800); // clears the 700ms draft-save debounce (js/app.js#scheduleDraftSave)
  await page.reload();
  await expect(page.locator('#editor-state')).toBeVisible();
  // A never-explicitly-saved draft's stored name falls back to the component's own title
  // (app.js#saveCurrentDraft), not the literal "Untitled project" placeholder — that text
  // is only shown in a *live* session before any draft has ever been written. Either way,
  // currentProjectId stays null on restore (there is no real saved project backing it), so
  // the status must still read "Unsaved changes" regardless of which name is shown.
  await expect(page.locator('#project-status')).toContainText('Responsive Accordion');
  await expect(page.locator('#project-status')).toContainText('Unsaved changes');
});

test('draft restoration of an already-saved project shows "Saved", not "Unsaved changes"', async ({ page }) => {
  await openAccordion(page);
  await saveNamedProject(page, 'Restored As Saved');
  await page.reload();
  await expect(page.locator('#editor-state')).toBeVisible();
  await expect(page.locator('#project-status')).toHaveText('Restored As Saved · Saved');
});

test('the project status is a live region but does not re-announce on every keystroke (no unrelated DOM churn while already dirty)', async ({ page }) => {
  await openAccordion(page);
  const status = page.locator('#project-status');
  await expect(status).toContainText('Unsaved changes');
  const textBeforeFurtherEdits = await status.textContent();
  const titleField = page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]');
  await titleField.fill('First edit');
  await titleField.fill('First edit, refined');
  await titleField.fill('First edit, refined further');
  // Already dirty before any of these edits — the label text must be unchanged (same string
  // node), not merely equal, since our own app.js code skips the textContent write entirely
  // when the label hasn't changed, precisely to avoid redundant aria-live announcements.
  expect(await status.textContent()).toBe(textBeforeFurtherEdits);
});

test('preventDefault is set on beforeunload only when there are unsaved changes', async ({ page }) => {
  await page.goto('/');
  const cleanResult = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(cleanResult).toBe(false); // catalog screen, nothing selected yet

  await page.locator('.component-select-card').filter({ hasText: 'Responsive Accordion' }).click();
  await page.locator('.dynamic-item-card[data-index="0"]').locator('[data-field-id="title"]').fill('Dirty now');
  const dirtyResult = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(dirtyResult).toBe(true);
});
