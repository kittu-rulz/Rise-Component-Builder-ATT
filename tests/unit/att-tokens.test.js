import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import { ATT_TOKENS_CSS } from '../../js/att-tokens.js';
import { compileExportFixture } from '../fixtures/export-fixture-definitions.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Pull `--name: value;` pairs out of a CSS custom-property block, ignoring comments
// and whitespace. Returns a Map so order and formatting don't matter.
function customProps(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const map = new Map();
  for (const match of withoutComments.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(match[1], match[2].trim().replace(/\s+/g, ' '));
  }
  return map;
}

describe('AT&T token layer', () => {
  test('js/att-tokens.js is a verbatim copy of design/att-tokens.css :root declarations', async () => {
    const canonical = await readFile(join(repoRoot, 'design', 'att-tokens.css'), 'utf8');
    const rootBody = /:root\s*{([\s\S]*)}/.exec(canonical);
    expect(rootBody, 'design/att-tokens.css must have a :root { ... } block').not.toBeNull();

    const fromCss = customProps(rootBody[1]);
    const fromJs = customProps(ATT_TOKENS_CSS);

    expect(fromJs.size).toBeGreaterThan(40);
    // Same names, same values, in either direction.
    expect([...fromJs.entries()].sort()).toEqual([...fromCss.entries()].sort());
  });

  test('the canonical file defines the tokens the standards call out by name', async () => {
    const css = await readFile(join(repoRoot, 'design', 'att-tokens.css'), 'utf8');
    const props = customProps(css);
    for (const [name, value] of [
      ['--att-blue', '#009FDB'],
      ['--att-cobalt', '#00388F'],
      ['--att-lime', '#91DC00'],
      ['--att-fs-body', '1rem'],
      ['--att-radius-lg', '20px'],
      ['--att-radius-xl', '32px']
    ]) {
      expect(props.get(name)).toBe(value);
    }
  });
});

describe('every compiled export carries the token layer and its fonts inline', () => {
  const samples = ['accordion', 'multiple-choice', 'audio-player', 'video-frame'];

  for (const id of samples) {
    test(`${id}: :root has the --att-* block`, () => {
      const html = compileExportFixture(id);
      const attProps = customProps(html);
      expect(attProps.get('--att-blue')).toBe('#009FDB');
      expect(attProps.get('--att-cobalt')).toBe('#00388F');
      expect(attProps.get('--att-radius-xl')).toBe('32px');
      // The theme layer is still present and still the active one.
      expect(html).toContain('--primary:');
      expect(html).toContain('--accent:');
    });

    test(`${id}: the brand font is embedded as a data: @font-face and nothing references a font file by path`, () => {
      const html = compileExportFixture(id);

      const faces = [...html.matchAll(/@font-face\s*{([\s\S]*?)}/g)].map(m => m[1]);
      expect(faces.length, `${id}: no @font-face rules in the export`).toBeGreaterThan(0);

      const embeddedFamilies = new Set();
      for (const face of faces) {
        const fam = /font-family\s*:\s*["']?([^"';]+)["']?/.exec(face);
        if (fam) embeddedFamilies.add(fam[1].trim());
        const src = /src\s*:\s*([^;]+);/.exec(face);
        expect(src, `${id}: an @font-face has no src`).not.toBeNull();
        // Inlined, per docs/EXPORT-CONTRACT.md — a data: URI, never a bare/relative path.
        expect(src[1]).toMatch(/url\(\s*["']?data:/);
      }
      expect([...embeddedFamilies]).toContain('ATT Aleck Sans');

      // No font file referenced by a non-data URL anywhere in the document.
      expect(html).not.toMatch(/url\(\s*["']?(?!data:)[^)]*\.(woff2?|ttf|otf|eot)/i);
    });
  }
});
