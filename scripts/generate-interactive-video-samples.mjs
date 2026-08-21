#!/usr/bin/env node
/**
 * Regenerates the three documented Interactive Video sample projects under
 * docs/examples/interactive-video/ — referenced from docs/INTERACTIVE-VIDEO.md's "Sample
 * configurations" section (Phase 7 — "documented sample configurations, not a new UI":
 * this app has no preset-picker feature to plug into, so a sample is a plain, importable
 * project JSON file, opened the same way any exported/shared project file already is, via
 * the existing "Import Project File" button, js/storage.js#importProjectJson).
 *
 * The sample definitions live in tests/fixtures/interactive-video-sample-definitions.mjs,
 * shared with tests/unit/interactive-video-samples.test.js's drift detector so the two can
 * never silently disagree — same reasoning scripts/generate-export-fixtures.mjs already
 * established for export fixtures.
 *
 * Run: node scripts/generate-interactive-video-samples.mjs
 * Re-run and commit the output whenever the interactive-video schema/defaultConfig
 * changes in a way that would make the committed samples stale or invalid.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSampleProject, INTERACTIVE_VIDEO_SAMPLES } from '../tests/fixtures/interactive-video-sample-definitions.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '..', 'docs', 'examples', 'interactive-video');

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const sample of INTERACTIVE_VIDEO_SAMPLES) {
    const project = buildSampleProject(sample);
    await writeFile(join(outDir, sample.filename), JSON.stringify(project, null, 2) + '\n', 'utf8');
    console.log(`wrote docs/examples/interactive-video/${sample.filename}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
