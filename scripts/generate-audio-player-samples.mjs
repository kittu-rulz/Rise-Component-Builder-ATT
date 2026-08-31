#!/usr/bin/env node
/**
 * Regenerates the documented Interactive Learning Audio sample project under
 * docs/examples/audio-player/ — referenced from docs/AUDIO-PLAYER.md's "Sample
 * configuration" section (this app has no preset-picker UI to plug a demo into, so a
 * sample is a plain, importable project JSON file, opened the same way any
 * exported/shared project file already is, via the existing "Import Project File" button,
 * js/storage.js#importProjectJson — same reasoning already established for Interactive
 * Video's samples).
 *
 * The sample definition lives in tests/fixtures/audio-player-sample-definitions.mjs,
 * shared with tests/unit/audio-player-samples.test.js's drift detector so the two can
 * never silently disagree.
 *
 * Run: node scripts/generate-audio-player-samples.mjs
 * Re-run and commit the output whenever the audio-player schema/defaultConfig changes in a
 * way that would make the committed sample stale or invalid.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AUDIO_PLAYER_SAMPLES, buildSampleProject } from '../tests/fixtures/audio-player-sample-definitions.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '..', 'docs', 'examples', 'audio-player');

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const sample of AUDIO_PLAYER_SAMPLES) {
    const project = buildSampleProject(sample);
    await writeFile(join(outDir, sample.filename), JSON.stringify(project, null, 2) + '\n', 'utf8');
    console.log(`wrote docs/examples/audio-player/${sample.filename}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
