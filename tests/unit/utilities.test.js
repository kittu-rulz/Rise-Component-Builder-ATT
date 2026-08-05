import { describe, expect, test, vi } from 'vitest';
import {
  copyTextToClipboard, escapeAttribute, escapeHTML, escapeJavaScriptString, sanitizeRichText, sanitizeURL, slugify, toRgba
} from '../../js/utilities.js';
import { sanitizeAssetFilename } from '../../js/media.js';
import { createProjectId, validateProject } from '../../js/storage.js';
import { contrastRatio, validateTheme } from '../../js/themes.js';
import { invalidProject, invalidTheme, multilingualText, unsafeText, validProject } from '../fixtures/index.js';

describe('context-specific utilities', () => {
  test('copyTextToClipboard uses the Clipboard API when it is available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(copyTextToClipboard('iframe code', {
      navigatorObject: { clipboard: { writeText } },
      documentObject: null
    })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('iframe code');
  });

  test('copyTextToClipboard falls back when Clipboard API access is denied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    const execCommand = vi.fn().mockReturnValue(true);
    const textarea = {
      value: '', style: {}, setAttribute: vi.fn(), focus: vi.fn(), select: vi.fn(),
      setSelectionRange: vi.fn(), remove: vi.fn()
    };
    const documentObject = {
      body: { appendChild: vi.fn() },
      activeElement: { focus: vi.fn() },
      createElement: vi.fn().mockReturnValue(textarea),
      execCommand
    };

    await expect(copyTextToClipboard('<iframe></iframe>', {
      navigatorObject: { clipboard: { writeText } },
      documentObject
    })).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(textarea.value).toBe('<iframe></iframe>');
    expect(textarea.remove).toHaveBeenCalledOnce();
  });

  test('escapeHTML escapes markup delimiters and preserves Unicode', () => {
    expect(escapeHTML(`<div title="'">&${multilingualText}</div>`)).toBe(
      `&lt;div title=&quot;&#39;&quot;&gt;&amp;${multilingualText}&lt;/div&gt;`
    );
  });

  test('escapeAttribute escapes quotes, apostrophes, newlines, and backticks', () => {
    const value = escapeAttribute('"\'\n`' + unsafeText);
    expect(value).not.toContain('"');
    expect(value).not.toContain("'");
    expect(value).not.toContain('`');
    expect(value).toContain('&#10;');
  });

  test('escapeJavaScriptString cannot terminate strings or script elements', () => {
    const escaped = escapeJavaScriptString("'`\"${x}</script>");
    expect(escaped.toLowerCase()).not.toContain('</script>');
    expect(() => Function(`return '${escaped}'`)).not.toThrow();
  });

  test.each([
    ['https://example.com/a', 'https://example.com/a'],
    ['http://example.com/a', 'http://example.com/a'],
    ['javascript:alert(1)', ''], ['vbscript:bad()', ''], ['data:text/html,bad', '']
  ])('sanitizeURL maps %s safely', (input, expected) => expect(sanitizeURL(input)).toBe(expected));

  test('sanitizeRichText keeps approved formatting but neutralizes active HTML', () => {
    const result = sanitizeRichText(`<strong>Allowed</strong>${unsafeText}<a href="javascript:bad()">link</a>`);
    expect(result).toContain('<strong>Allowed</strong>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('javascript:');
  });

  test('color conversion accepts hex and safely falls back', () => {
    expect(toRgba('#2563EB', 0.5)).toBe('rgba(37, 99, 235, 0.5)');
    expect(toRgba('bad', 1, 'fallback')).toBe('fallback');
  });

  test('contrast calculation returns known WCAG ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });

  test('project IDs are unique and filename generators are deterministic and safe', () => {
    const ids = new Set(Array.from({ length: 100 }, createProjectId));
    expect(ids.size).toBe(100);
    expect(slugify('  Learning / Activity 😀 ')).toBe('learning-activity');
    expect(sanitizeAssetFilename('../../Unsafe File?.PNG')).toBe('unsafe-file.png');
  });

  test('project and theme validation reject invalid fixtures', () => {
    expect(validateProject(validProject()).valid).toBe(true);
    expect(validateProject(invalidProject).valid).toBe(false);
    expect(validateTheme(invalidTheme).valid).toBe(false);
  });
});
