import { test, expect } from '@playwright/test';

test.describe('Preview Pane Hide and Show Restore Behavior', () => {
  test('Hide preview pane and restore via docked Show Preview button and header button', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('.component-select-card');

    // 1. In browsing mode, hide preview panel
    const hideBtn = page.locator('#btn-toggle-preview');
    await expect(hideBtn).toBeVisible();
    await hideBtn.click();

    // Verify preview is hidden and docked show preview button is visible
    const dockedBtn = page.locator('#btn-docked-show-preview');
    await expect(dockedBtn).toBeVisible();
    await expect(page.locator('#preview-panel')).toBeHidden();

    // 2. Click docked button to restore
    await dockedBtn.click();
    await expect(page.locator('#preview-panel')).toBeVisible();
    await expect(dockedBtn).toBeHidden();

    // 3. Open authoring mode
    const useBtn = page.locator('.component-select-card .btn-card-use').first();
    await useBtn.click();
    await page.waitForSelector('#editor-state:not([style*="display: none"])');

    // Hide preview in authoring mode
    await page.locator('#btn-toggle-preview').click();
    await expect(page.locator('#preview-panel')).toBeHidden();

    // Verify header "Show Preview" button is visible in authoring mode
    const headerShowBtn = page.locator('#btn-show-preview-header');
    await expect(headerShowBtn).toBeVisible();

    // Click header "Show Preview" button to restore
    await headerShowBtn.click();
    await expect(page.locator('#preview-panel')).toBeVisible();
    await expect(headerShowBtn).toBeHidden();

    // 4. Test Alt+P shortcut toggle
    await page.keyboard.press('Alt+p');
    await expect(page.locator('#preview-panel')).toBeHidden();
    await page.keyboard.press('Alt+p');
    await expect(page.locator('#preview-panel')).toBeVisible();
  });
});
