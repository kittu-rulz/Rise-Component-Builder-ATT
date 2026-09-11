import { test } from '@playwright/test';
import path from 'path';

test.describe('Responsive Viewport Visual Verification', () => {
  const artifactDir = 'C:/Users/karthikeyan/.gemini/antigravity-ide/brain/e3cf32e2-e7f1-4768-a89f-347fb740c555';

  test('Capture 1920x1080 Browsing and Authoring', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForSelector('.component-select-card');
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_1920x1080_browsing.png') });

    const useBtn = page.locator('.component-select-card .btn-card-use').first();
    await useBtn.click();
    await page.waitForSelector('#editor-state:not([style*="display: none"])');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_1920x1080_authoring.png') });
  });

  test('Capture 1440x900 Browsing and Authoring', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForSelector('.component-select-card');
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_1440x900_browsing.png') });

    const useBtn = page.locator('.component-select-card .btn-card-use').first();
    await useBtn.click();
    await page.waitForSelector('#editor-state:not([style*="display: none"])');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_1440x900_authoring.png') });
  });

  test('Capture 1366x768 Browsing', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.waitForSelector('.component-select-card');
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_1366x768_browsing.png') });
  });

  test('Capture 1024px Browsing and Authoring', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.waitForSelector('.component-select-card');
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_1024px_browsing.png') });

    const useBtn = page.locator('.component-select-card .btn-card-use').first();
    await useBtn.click();
    await page.waitForSelector('#editor-state:not([style*="display: none"])');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_1024px_authoring.png') });
  });

  test('Capture Compact List View & Dark Mode at 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForSelector('#btn-density-compact');
    await page.click('#btn-density-compact');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_1920x1080_compact_list.png') });

    await page.click('#btn-theme');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(artifactDir, 'screenshot_1920x1080_dark_mode.png') });
  });
});
