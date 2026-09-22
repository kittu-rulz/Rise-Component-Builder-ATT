import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readZip } from '../../js/zip.js';

describe('Production Server Zip Archive', () => {
  it('validates the production zip package structure and contents', async () => {
    const zipPath = resolve(process.cwd(), 'rise-component-builder-production.zip');
    const zipBuffer = await readFile(zipPath);
    const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });

    const entries = await readZip(zipBlob);
    expect(entries.length).toBeGreaterThanOrEqual(90);

    const paths = entries.map(e => e.path);

    // 1. Must contain core entry files
    expect(paths).toContain('index.html');
    expect(paths).toContain('app.js');
    expect(paths).toContain('styles.css');
    expect(paths).toContain('fonts.css');

    // 2. Must contain all 26 component modules
    const componentFiles = paths.filter(p => p.startsWith('components/'));
    expect(componentFiles.length).toBe(26);
    expect(componentFiles).toContain('components/accordion.js');
    expect(componentFiles).toContain('components/tabs.js');
    expect(componentFiles).toContain('components/interactive-video.js');
    expect(componentFiles).toContain('components/hotspots.js');

    // 3. Must contain required design stylesheets
    expect(paths).toContain('design/att-tokens.css');
    expect(paths).toContain('design/landing.css');
    expect(paths).toContain('design/dashboard.css');
    expect(paths).toContain('design/post-publish.css');
    expect(paths).toContain('design/project-overview.css');

    // 4. Must contain core JS modules
    expect(paths).toContain('js/state.js');
    expect(paths).toContain('js/storage.js');
    expect(paths).toContain('js/editor.js');
    expect(paths).toContain('js/preview.js');
    expect(paths).toContain('js/export.js');
    expect(paths).toContain('js/component-registry.js');

    // 5. Must NOT contain dev-only, test, doc, or repo meta files
    const devArtifacts = paths.filter(p =>
      p.startsWith('tests/') ||
      p.startsWith('node_modules/') ||
      p.startsWith('.git') ||
      p.startsWith('.claude') ||
      p.startsWith('.agents') ||
      p.startsWith('docs/') ||
      p.startsWith('scripts/') ||
      p.endsWith('.md') ||
      p.endsWith('.test.js') ||
      p.endsWith('.test.mjs') ||
      p === 'package.json' ||
      p === 'package-lock.json' ||
      p === 'tsconfig.json' ||
      p === 'vitest.config.js' ||
      p === 'playwright.config.js' ||
      p === 'eslint.config.js'
    );
    expect(devArtifacts).toEqual([]);

    // 6. Verify index.html references map to files present in the zip
    const indexEntry = entries.find(e => e.path === 'index.html');
    expect(indexEntry).toBeDefined();
    const indexHtml = new TextDecoder().decode(indexEntry.data);

    const localRefs = [...indexHtml.matchAll(/(?:src|href)="(?!https?:|\/\/|data:|mailto:|#)([^"]+)"/g)].map(m => m[1]);
    for (const ref of localRefs) {
      const cleanPath = ref.replace(/[?#].*$/, '');
      expect(paths).toContain(cleanPath);
    }
  });
});
