import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const fixturesDir = join(rootDir, 'tests', 'fixtures', 'exports');
const outDir = join(rootDir, 'screenshots', 'prompt-5');

mkdirSync(outDir, { recursive: true });

const components = [
  { id: 'accordion', file: 'accordion.html' },
  { id: 'tabs', file: 'tabs.html' },
  { id: 'flip-cards', file: 'flip-cards.html' },
  { id: 'vertical-timeline', file: 'timeline.html' }
];

const viewports = [
  { name: '360px', width: 360, height: 640 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1200px', width: 1200, height: 900 }
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  for (const comp of components) {
    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const fixturePath = 'file://' + join(fixturesDir, comp.file).replace(/\\/g, '/');
      await page.goto(fixturePath, { waitUntil: 'load' });
      await page.waitForTimeout(300);
      const outPath = join(outDir, `${comp.id}-${vp.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Saved screenshot: ${outPath}`);
      await page.close();
    }
  }
  await browser.close();
  console.log('All screenshots captured successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
