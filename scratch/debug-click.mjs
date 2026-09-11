import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    pageErrors.push(err.stack || err.message);
  });

  await page.goto('http://127.0.0.1:4173');
  await page.waitForTimeout(1000);

  console.log('--- Clicking on first Use Component button ---');
  const useBtn = page.locator('.component-select-card .btn-card-use').first();
  await useBtn.click();
  await page.waitForTimeout(1000);

  console.log('Console messages:');
  consoleMessages.forEach(m => console.log(m));

  console.log('Page errors:');
  pageErrors.forEach(e => console.error(e));

  await browser.close();
}

main().catch(console.error);
