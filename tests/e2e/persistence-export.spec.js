import { expect, test } from '@playwright/test';

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

test('project save, reload, open, draft restore, and delete persist locally', async ({ page }) => {
  await openAccordion(page);
  await page.locator('#input-block-headline').fill('Persisted headline');
  await saveNamedProject(page, 'Persistence E2E');
  await page.reload();
  await expect(page.locator('#editor-state')).toBeVisible();
  await expect(page.locator('#input-block-headline')).toHaveValue('Persisted headline');
  await page.locator('#btn-open').click();
  const card = page.locator('.saved-component-card').filter({ hasText: 'Persistence E2E' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Load' }).click();
  await page.locator('#btn-open').click();
  await page.locator('.saved-component-card').filter({ hasText: 'Persistence E2E' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('#modal-confirm')).toBeVisible();
  await page.locator('#btn-confirm-dialog-action').click();
  await expect(page.locator('.saved-component-card').filter({ hasText: 'Persistence E2E' })).toHaveCount(0);
});

test('favorites persist after browser reload', async ({ page }) => {
  await openAccordion(page);
  await page.locator('#btn-favorite-toggle').click();
  await page.reload();
  await page.getByText('Favorites', { exact: true }).click();
  await expect(page.locator('.component-select-card').filter({ hasText: 'Responsive Accordion' })).toBeVisible();
});

test('export contains selected content and theme, excludes unsafe executable markup, and downloads runnable HTML', async ({ page, context }) => {
  const errors = [];
  await openAccordion(page);
  await page.locator('#input-block-headline').fill('Exported <script>globalThis.bad=true</script> content');
  await page.locator('#btn-export').click();
  const code = page.locator('#export-html-code');
  await expect(code).toContainText('Exported');
  // This build is locked to a single AT&T theme (js/themes.js) — no Theme Manager exists
  // to switch themes, so the export always carries the AT&T Cobalt primary color.
  await expect(code).toContainText('--primary: #00388F');
  const exported = await code.textContent();
  expect(exported).not.toContain('<script>globalThis.bad=true</script>');

  // Modular export pipeline: an Accordion export must not ship quiz, gallery, audio,
  // video, or AI code (docs/EXPORT-CONTRACT.md).
  ['quiz-option', 'gallery-item-card', 'audio-player-block', 'video-wrapper', 'ai-generator-preview']
    .forEach(marker => expect(exported).not.toContain(marker));

  // The single-file download lives under Advanced export options.
  await page.locator('#export-advanced-options > summary').click();
  await expect(page.locator('#export-file-size')).toContainText(/\d+(\.\d+)?\s*(B|KB|MB)/);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-download-html').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.html$/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const html = Buffer.concat(chunks).toString('utf8');
  expect(html).toContain('Exported');
  expect(html).toContain('--primary: #00388F');
  const exportedPage = await context.newPage();
  exportedPage.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  exportedPage.on('pageerror', error => errors.push(error.message));
  await exportedPage.setContent(html);
  await expect(exportedPage.locator('.accordion-group')).toBeVisible();
  expect(errors).toEqual([]);

  // Requirement 3/8: the downloaded file works standalone (no builder app), and keyboard
  // interaction + ARIA state still function correctly post-refactor.
  const trigger = exportedPage.locator('.accordion-trigger').first();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.focus();
  await exportedPage.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

test('export copy button copies iframe code and shows visible confirmation', async ({ page, context, browserName }) => {
  // Firefox/WebKit don't support granting the 'clipboard-read'/'clipboard-write'
  // permissions through Playwright (Chromium-only CDP permissions), but the
  // app's own execCommand fallback (js/utilities.js) copies without needing
  // them, so the copy still works there — only the clipboard-content readback
  // below is Chromium-only.
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' });
  }
  await openAccordion(page);
  await page.locator('#btn-export').click();

  const riseInstructions = page.locator('.instructions-alert').filter({ hasText: 'Steps to add this in Articulate Rise' });
  await expect(riseInstructions).toContainText('Code');
  await expect(riseInstructions).toContainText('Add code');

  // The iframe snippet lives under Advanced export options.
  await page.locator('#export-advanced-options > summary').click();
  const expectedCode = await page.locator('#export-iframe-code').textContent();
  const copyButton = page.locator('#btn-copy-iframe');
  await copyButton.click();

  await expect(copyButton).toHaveText('Copied!');
  await expect(copyButton).toHaveClass(/copy-success/);
  await expect(page.locator('.toast')).toContainText('Code copied to the clipboard.');

  if (browserName === 'chromium') {
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expectedCode);
  }
});

test('completion tracking blocks the Iframe Snippet and Web Package ZIP exports, and guides back to Copy for Rise', async ({ page }) => {
  await openAccordion(page);
  await page.locator('.editor-tab[data-tab="settings"]').click();
  await page.locator('#input-track-completion').check();
  await page.locator('#btn-export').click();

  // The primary "Copy for Rise" action is always the completion-compatible format —
  // never blocked by this gate.
  await expect(page.locator('#export-primary-title')).toHaveText('Rise Code Block with completion');
  await expect(page.locator('#btn-copy-html')).toBeEnabled();

  await page.locator('#export-advanced-options > summary').click();

  const iframeButton = page.locator('#btn-copy-iframe');
  await expect(iframeButton).toBeDisabled();
  await expect(page.locator('#pane-export-iframe .completion-export-block')).toContainText('Copy for Rise');

  await page.locator('.export-tab[data-export-type="rise-zip"]').click();
  const zipButton = page.locator('#btn-download-rise-zip');
  await expect(zipButton).toBeDisabled();
  await expect(page.locator('#pane-export-rise-zip .completion-export-block')).toContainText('Copy for Rise');

  // Turning completion off releases both blocks.
  await page.locator('#modal-export .modal-close-btn').click();
  await page.locator('#input-track-completion').uncheck();
  await page.locator('#btn-export').click();
  await page.locator('#export-advanced-options > summary').click();
  await expect(page.locator('#btn-copy-iframe')).toBeEnabled();
  await expect(page.locator('#btn-download-rise-zip')).toBeEnabled();
  await expect(page.locator('#pane-export-iframe .completion-export-block')).toHaveCount(0);
});
