import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { COMPONENT_REGISTRY, getDefaultConfig } from '../js/component-registry.js';
import { BUILT_IN_THEMES, DEFAULT_THEME_ID, applyThemeToConfig } from '../js/themes.js';
import { generateIframeContent } from '../js/preview.js';
import { toRgba } from '../js/utilities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const outDir = join(rootDir, 'screenshots', 'brand-compliance');
const tempDir = join(rootDir, 'screenshots', '.temp');

mkdirSync(outDir, { recursive: true });
mkdirSync(tempDir, { recursive: true });

const viewports = [
  { name: '360px', width: 360, height: 640 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1200px', width: 1200, height: 900 }
];

const theme = BUILT_IN_THEMES.find(entry => entry.id === DEFAULT_THEME_ID);
const componentRegistry = Object.fromEntries(
  COMPONENT_REGISTRY.map(entry => [entry.id, { ...entry.renderer, version: entry.version }])
);

async function captureAllComponentSnapshots() {
  console.log(`Starting AT&T Brand Visual Regression Capture across ${COMPONENT_REGISTRY.length} components...`);
  const browser = await chromium.launch({ headless: true });

  for (const component of COMPONENT_REGISTRY) {
    const config = applyThemeToConfig(getDefaultConfig(component), theme);
    const appState = {
      selectedComponent: { id: component.id },
      activeTheme: theme,
      componentOverrides: {},
      config,
      currentProjectId: `snap-${component.id}`
    };

    const html = generateIframeContent(appState, componentRegistry, toRgba);
    const tempHtmlPath = join(tempDir, `${component.id}.html`);
    writeFileSync(tempHtmlPath, html, 'utf8');

    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const fileUrl = 'file://' + tempHtmlPath.replace(/\\/g, '/');
      await page.goto(fileUrl, { waitUntil: 'load' });
      await page.waitForTimeout(200);
      const outPath = join(outDir, `${component.id}-${vp.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`  [Snapshot] ${component.id} @ ${vp.name} -> ${outPath}`);
      await page.close();
    }
  }

  await browser.close();
  console.log(`\n✔ Captured ${COMPONENT_REGISTRY.length * viewports.length} visual regression snapshots in ${outDir}`);
}

captureAllComponentSnapshots().catch(err => {
  console.error('Snapshot capture failed:', err);
  process.exit(1);
});
