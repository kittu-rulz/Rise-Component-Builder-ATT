import { expect, test } from '@playwright/test';

// End-to-end coverage of the complete authoring journey described in prompt 13's test
// pyramid: start a project, select a component, edit content, change design, change
// behavior, switch preview sizes, save, reopen, run export preflight, export, open the
// standalone export, interact by keyboard, and verify completion. Each step reuses the
// same selectors already exercised individually in editor-preview.spec.js,
// preview-device-modes.spec.js, persistence-export.spec.js, and completion.spec.js — this
// spec's value is proving the full chain works end-to-end in one continuous session,
// across a component other than Accordion (Tabs), rather than re-testing any single step
// in isolation.

test('a full authoring session: create, edit, save, reopen, preflight, export, and interact with a keyboard-driven completion flow', async ({ page, context }) => {
  // 1. Start a project — a fresh session opens on the component catalog.
  await page.goto('/');
  await expect(page.locator('#catalog-state')).toBeVisible();

  // 2. Select a component.
  await page.locator('.component-select-card').filter({ hasText: 'Horizontal Tabs' }).click();
  await expect(page.locator('#editor-state')).toBeVisible();

  // 3. Edit content — updates the live preview immediately.
  await page.locator('#input-block-headline').fill('Full Journey Tabs');
  const previewFrame = page.frameLocator('#live-preview-iframe');
  await expect(previewFrame.locator('[id$="-block-headline"]')).toHaveText('Full Journey Tabs');

  // 4. Change design — a theme token updates in the live preview.
  await page.getByRole('button', { name: 'Design & Style' }).click();
  await page.locator('#input-color-primary-text').fill('#0F766E');
  await expect.poll(() => previewFrame.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--primary').trim())).toBe('#0F766E');

  // 5. Change behavior — enable completion tracking for this block.
  await page.getByRole('button', { name: 'Behavior' }).click();
  await page.locator('#input-track-completion').check();

  // 6. Switch preview sizes.
  await page.locator('[data-device="mobile"]').click();
  await expect(page.locator('#preview-viewport')).toHaveClass(/mobile/);
  await page.locator('[data-device="desktop"]').click();
  await expect(page.locator('#preview-viewport')).toHaveClass(/desktop/);

  // 7. Save the project.
  await page.locator('#btn-save').click();
  await page.locator('#save-component-name').fill('Full Journey Project');
  await page.locator('#btn-confirm-save').click();
  await expect(page.locator('.toast')).toContainText('Saved');

  // 8. Reopen the project (simulating a new session) and confirm edits persisted.
  await page.reload();
  await page.locator('#btn-open').click();
  await page.locator('.saved-component-card').filter({ hasText: 'Full Journey Project' }).getByRole('button', { name: 'Load' }).click();
  await expect(page.locator('#input-block-headline')).toHaveValue('Full Journey Tabs');
  await expect(page.locator('#input-track-completion')).toBeChecked();

  // 9. Run export preflight — a fully-filled-out Tabs component has no blocking errors
  // (enabling completion tracking without a parent origin surfaces a non-blocking
  // recommendation, which must not gate export).
  await page.locator('#btn-preflight').click();
  await expect(page.locator('#modal-preflight')).toBeVisible();
  await expect(page.locator('#preflight-results')).not.toContainText(/blocking error/i);
  await expect(page.locator('#preflight-badge')).not.toHaveAttribute('data-state', 'blocking');
  await page.locator('#modal-preflight .modal-close-btn').click();

  // 10. Export the component.
  await page.locator('#btn-export').click();
  await expect(page.locator('#export-html-code')).toContainText('Full Journey Tabs');
  await page.getByRole('button', { name: 'Option B: HTML Block Fragment' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-download-html').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const html = Buffer.concat(chunks).toString('utf8');
  expect(html).toContain('Full Journey Tabs');

  // 11. Open the standalone export — it must work without the Builder app.
  const errors = [];
  const exportedPage = await context.newPage();
  exportedPage.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  exportedPage.on('pageerror', error => errors.push(error.message));
  await exportedPage.setContent(html);
  const tabs = exportedPage.locator('.tab-btn');
  await expect(tabs.first()).toBeVisible();

  // 12. Interact using the keyboard, visiting every tab to satisfy completion. The tab
  // that is active by default on load was never explicitly selected, so a full wrap
  // around (tabCount presses, landing back on the first tab) is what actually visits
  // every tab through a real selectTab() call.
  await tabs.first().focus();
  const tabCount = await tabs.count();
  for (let i = 0; i < tabCount; i += 1) {
    await exportedPage.keyboard.press('ArrowRight');
  }
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');

  // 13. Verify completion behavior — internal completion reaches 100% once every tab
  // has been viewed (docs/COMPLETION-INTEGRATION.md).
  await expect(exportedPage.locator('[id$="-completion-text"]')).toHaveText('100%');
  expect(errors).toEqual([]);

  await exportedPage.close();
});
