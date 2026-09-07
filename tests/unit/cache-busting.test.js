import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import { APP_VERSION } from '../../js/version.js';
import { computeStampedIndex, deriveToken } from '../../scripts/stamp-cache-busting.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function moduleFiles(dir) {
  const entries = await readdir(join(repoRoot, dir), { withFileTypes: true });
  return entries.filter(e => e.isFile() && e.name.endsWith('.js')).map(e => `./${dir}/${e.name}`);
}

describe('cache-busting stamper', () => {
  test('token is APP_VERSION\'s build-metadata suffix', async () => {
    const token = await deriveToken();
    expect(APP_VERSION).toContain(`+${token}`);
    // URL-safe: no characters that would need escaping in a ?v= query value.
    expect(token).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  test('the committed index.html is already stamped for the current APP_VERSION', async () => {
    const { original, stamped } = await computeStampedIndex();
    // Same guard as `npm run stamp:check` / CI — a version bump that forgot to
    // re-stamp fails here rather than shipping a half-cached page.
    expect(original).toBe(stamped);
  });

  test('every root asset reference carries ?v=<token>', async () => {
    const { token, stamped } = await computeStampedIndex();
    for (const asset of ['fonts.css', 'styles.css', 'app.js']) {
      expect(stamped).toContain(`"${asset}?v=${token}"`);
      // No un-stamped reference left behind.
      expect(stamped).not.toMatch(new RegExp(`(?:href|src)="${asset.replace('.', '\\.')}"`));
    }
  });

  test('the import map covers every js/ and components/ module, each with the token', async () => {
    const { token, stamped } = await computeStampedIndex();
    const mapMatch = /<script type="importmap">\s*([\s\S]*?)<\/script>/.exec(stamped);
    expect(mapMatch).not.toBeNull();
    const { imports } = JSON.parse(mapMatch[1]);

    const expected = [...(await moduleFiles('js')), ...(await moduleFiles('components'))].sort();
    expect(Object.keys(imports).sort()).toEqual(expected);
    for (const [specifier, target] of Object.entries(imports)) {
      expect(target).toBe(`${specifier}?v=${token}`);
    }
  });

  test('the import map is parsed before the entry module script', async () => {
    const { stamped } = await computeStampedIndex();
    expect(stamped.indexOf('type="importmap"')).toBeLessThan(stamped.indexOf('src="app.js?v='));
    expect(stamped.indexOf('type="importmap"')).toBeLessThan(stamped.indexOf('</head>'));
  });

  test('re-stamping an already-stamped document is a no-op (idempotent)', async () => {
    const { stamped } = await computeStampedIndex();
    // computeStampedIndex reads the on-disk index.html; since it is already
    // stamped, a second pass over the same content must not change it. Simulate
    // by re-running against the produced output through the same public entry.
    const { original, stamped: again } = await computeStampedIndex();
    expect(original).toBe(stamped);
    expect(again).toBe(stamped);
  });
});
