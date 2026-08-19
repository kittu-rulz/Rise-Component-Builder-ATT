import { describe, expect, test, vi } from 'vitest';
import {
  copyTextToClipboard, describeStorageUsage, escapeAttribute, escapeHTML, escapeJavaScriptString, formatItemLabel, formatStorageBytes, sanitizeRichText, sanitizeURL, slugify, toRgba
} from '../../js/utilities.js';
import { sanitizeAssetFilename } from '../../js/media.js';
import { createProjectId, validateProject } from '../../js/storage.js';
import { contrastRatio, validateTheme } from '../../js/themes.js';
import { invalidProject, invalidTheme, multilingualText, unsafeText, validProject } from '../fixtures/index.js';

describe('formatItemLabel', () => {
  test('numbers flatly for a schema with no pairLabels', () => {
    const schema = { itemLabel: 'Tab' };
    expect(formatItemLabel(schema, 0)).toBe('Tab 1');
    expect(formatItemLabel(schema, 3)).toBe('Tab 4');
  });

  test('numbers by pair for a schema with pairLabels, cycling through the labels', () => {
    const schema = { itemLabel: 'Card Face', pairLabels: ['Front', 'Back'] };
    expect(formatItemLabel(schema, 0)).toBe('Card Face 1 (Front)');
    expect(formatItemLabel(schema, 1)).toBe('Card Face 1 (Back)');
    expect(formatItemLabel(schema, 2)).toBe('Card Face 2 (Front)');
    expect(formatItemLabel(schema, 3)).toBe('Card Face 2 (Back)');
  });

  test('marks item 0 with the first role label and numbers every later item under the second, for a schema with roleLabels', () => {
    const schema = { itemLabel: 'Scenario Entry', roleLabels: ['Prompt', 'Choice'] };
    expect(formatItemLabel(schema, 0)).toBe('Scenario Entry 1 (Prompt)');
    expect(formatItemLabel(schema, 1)).toBe('Scenario Entry 2 (Choice 1)');
    expect(formatItemLabel(schema, 2)).toBe('Scenario Entry 3 (Choice 2)');
    expect(formatItemLabel(schema, 3)).toBe('Scenario Entry 4 (Choice 3)');
  });
});

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

describe('formatStorageBytes', () => {
  test.each([
    [0, '0 B'], [1023, '1023 B'],
    [1536, '1.5 KB'], [1024 * 1024 * 2.5, '2.5 MB'],
    [1024 * 1024 * 1024 * 12, '12 GB'],
    [1024 * 1024 * 1024 * 1024 * 3.2, '3.2 TB']
  ])('formats %i bytes as %s', (bytes, expected) => expect(formatStorageBytes(bytes)).toBe(expected));

  test('non-finite input is reported as Unknown rather than NaN text', () => {
    expect(formatStorageBytes(NaN)).toBe('Unknown');
    expect(formatStorageBytes(undefined)).toBe('Unknown');
    expect(formatStorageBytes(Infinity)).toBe('Unknown');
  });
});

describe('describeStorageUsage', () => {
  test('unsupported API falls back to an unavailable state, not false-precision text', () => {
    const result = describeStorageUsage({ supported: false });
    expect(result).toEqual({ percent: 0, label: 'Usage unavailable', tooltip: expect.any(String) });
  });

  test('a failed/denied estimate call falls back the same as unsupported', () => {
    const result = describeStorageUsage({ supported: true, failed: true });
    expect(result.label).toBe('Usage unavailable');
  });

  test('a zero or missing quota is treated as unavailable rather than dividing by zero', () => {
    expect(describeStorageUsage({ supported: true, usage: 0, quota: 0 }).label).toBe('Usage unavailable');
    expect(describeStorageUsage({ supported: true, usage: 0, quota: undefined }).label).toBe('Usage unavailable');
  });

  test('zero usage against a real quota reports 0%, not an unavailable state', () => {
    const result = describeStorageUsage({ supported: true, usage: 0, quota: 1024 * 1024 * 1024 });
    expect(result.percent).toBe(0);
    expect(result.label).toBe('~0% used');
  });

  test('a normal estimate reports a rounded percentage marked as approximate', () => {
    const result = describeStorageUsage({ supported: true, usage: 512, quota: 1024 });
    expect(result.percent).toBe(50);
    expect(result.label).toBe('~50% used');
    expect(result.tooltip).toContain('approximate');
  });

  test('usage is clamped at 100% even if the browser reports usage over quota', () => {
    const result = describeStorageUsage({ supported: true, usage: 2048, quota: 1024 });
    expect(result.percent).toBe(100);
  });

  test('a very large quota still produces a readable tooltip rather than raw bytes', () => {
    const result = describeStorageUsage({ supported: true, usage: 1024 * 1024 * 1024 * 40, quota: 1024 * 1024 * 1024 * 1024 * 2 });
    expect(result.tooltip).toContain('TB');
  });
});
