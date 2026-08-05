#!/usr/bin/env node
/**
 * Regenerates the representative standalone export fixtures under
 * tests/fixtures/exports/ — the same compiled output a real user would get from the
 * Export modal's "Download .HTML File" button, produced by calling the exact same
 * pipeline (generateIframeContent, per docs/EXPORT-CONTRACT.md's single-compiler
 * guarantee) rather than hand-written approximations of it.
 *
 * These fixtures back:
 *   - tests/unit/export-fixtures.test.js (drift detector: fails if a component's
 *     generator changes without regenerating the committed fixture)
 *   - tests/e2e/exported-fixtures.spec.js (loads each file standalone in a real
 *     browser to check console errors, keyboard operability, and font fallback)
 *   - tests/fixtures/exports/index.html (a human tester's entry point for manual
 *     Rise/Moodle checklist work — see docs/RISE-TEST-CHECKLIST.md)
 *
 * The fixture list and compile configuration live in
 * tests/fixtures/export-fixture-definitions.mjs, shared with the drift test so the
 * two can never silently disagree.
 *
 * Run: node scripts/generate-export-fixtures.mjs
 * Re-run whenever a listed component's generateHTML/generateCSS/generateJS changes,
 * then commit the updated fixture files alongside that change.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileExportFixture, EXPORT_FIXTURES } from '../tests/fixtures/export-fixture-definitions.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '..', 'tests', 'fixtures', 'exports');

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const { componentId, filename } of EXPORT_FIXTURES) {
    const html = compileExportFixture(componentId);
    await writeFile(join(outDir, filename), html, 'utf8');
    console.log(`wrote tests/fixtures/exports/${filename} (${componentId})`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
