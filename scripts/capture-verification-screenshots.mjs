/* global document */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const outDir = join(rootDir, 'screenshots', 'verification');

mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
  { name: '360x800', width: 360, height: 800 }
];

async function captureVerificationSnapshots() {
  console.log('Capturing UI Verification Snapshots across viewports and key views...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const fileUrl = 'file://' + join(rootDir, 'index.html').replace(/\\/g, '/');

  // 1. Dashboard View (Light & Dark)
  for (const vp of viewports) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    // Switch to Dashboard
    await page.evaluate(() => {
      const btn = document.getElementById('btn-projects-dashboard');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);

    await page.screenshot({ path: join(outDir, `dashboard-${vp.name}-light.png`), fullPage: false });

    // Toggle Dark Mode
    await page.evaluate(() => {
      const btn = document.getElementById('btn-theme');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, `dashboard-${vp.name}-dark.png`), fullPage: false });

    // Toggle back to Light Mode
    await page.evaluate(() => {
      const btn = document.getElementById('btn-theme');
      if (btn) btn.click();
    });

    // 2. New Project Modal
    await page.evaluate(() => {
      const createBtn = document.getElementById('dash-create-btn') || document.querySelector('.btn-att-primary');
      if (createBtn) createBtn.click();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, `new-project-modal-${vp.name}.png`), fullPage: false });

    // Close Modal
    await page.evaluate(() => {
      const cancelBtn = document.getElementById('modal-cancel-btn');
      if (cancelBtn) cancelBtn.click();
    });
    await page.waitForTimeout(200);

    // 3. Create a starter course to enter Course Workspace / Overview
    await page.evaluate(() => {
      const starterCard = document.getElementById('onboarding-starter-card') || document.querySelector('.onboarding-option-card');
      if (starterCard) starterCard.click();
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(outDir, `course-workspace-${vp.name}.png`), fullPage: false });

    // 4. Component Catalog / Library
    await page.evaluate(() => {
      const btn = document.getElementById('nav-catalog') || document.querySelector('.sidebar-nav-item');
      if (btn) btn.click();
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(outDir, `component-library-${vp.name}.png`), fullPage: false });

    // 5. Component Inspector / Editor (select first component)
    await page.evaluate(() => {
      const card = document.querySelector('.catalog-card');
      if (card) card.click();
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(outDir, `component-inspector-${vp.name}.png`), fullPage: false });

    // 6. Settings Modal
    await page.evaluate(() => {
      const btn = document.getElementById('btn-settings');
      if (btn) btn.click();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(outDir, `settings-modal-${vp.name}.png`), fullPage: false });

    await page.close();
    console.log(`✔ Captured views @ ${vp.name}`);
  }

  await browser.close();
  console.log(`\nAll verification screenshots saved to ${outDir}`);
}

captureVerificationSnapshots().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
