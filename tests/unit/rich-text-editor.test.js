// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
  ATT_BRAND_COLORS,
  FONT_SIZES,
  HIGHLIGHT_COLORS,
  createRichTextEditor
} from '../../js/rich-text-editor.js';
import { sanitizeInlineStyle, sanitizeRichText } from '../../js/utilities.js';

describe('sanitizeInlineStyle', () => {
  test('allows safe color and background-color styles', () => {
    expect(sanitizeInlineStyle('color: #0057B8; background-color: #FFF3CD')).toBe(
      'color: #0057B8; background-color: #FFF3CD'
    );
  });

  test('allows font-size, font-weight, and text-decoration', () => {
    expect(sanitizeInlineStyle('font-size: 18px; font-weight: bold; text-decoration: underline')).toBe(
      'font-size: 18px; font-weight: bold; text-decoration: underline'
    );
  });

  test('strips dangerous CSS properties and values', () => {
    expect(sanitizeInlineStyle('color: red; position: fixed; z-index: 9999; behavior: url(x.htc)')).toBe(
      'color: red'
    );
    expect(sanitizeInlineStyle('background: url(javascript:alert(1)); color: #111827')).toBe(
      'color: #111827'
    );
    expect(sanitizeInlineStyle('color: expression(alert(1))')).toBe('');
  });
});

describe('sanitizeRichText with inline formatting', () => {
  test('preserves styled span elements with allowed properties', () => {
    const input = '<span style="color: #0057B8; font-size: 18px;">Formatted Text</span>';
    const output = sanitizeRichText(input);
    expect(output).toContain('<span style="color: #0057B8; font-size: 18px">Formatted Text</span>');
  });

  test('preserves underline and mark elements', () => {
    const input = '<u>Underlined</u> <mark style="background-color: #FFF3CD;">Highlighted</mark>';
    const output = sanitizeRichText(input);
    expect(output).toContain('<u>Underlined</u>');
    expect(output).toContain('<mark style="background-color: #FFF3CD">Highlighted</mark>');
  });

  test('preserves list tags ul, ol, li', () => {
    const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const output = sanitizeRichText(input);
    expect(output).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>');
  });

  test('preserves div and paragraph line containers from contenteditable', () => {
    const input = '<div>ORCA (time management and approvals)</div><div></div><div>Compass (documentation and compliance)</div>';
    const output = sanitizeRichText(input);
    expect(output).toBe('<div>ORCA (time management and approvals)</div><div></div><div>Compass (documentation and compliance)</div>');
    expect(output).not.toContain('&lt;div&gt;');
  });

  test('preserves styled div and p elements', () => {
    const input = '<div style="text-align: center; color: #0057B8;">Centered Text</div><p style="font-size: 18px;">Large</p>';
    const output = sanitizeRichText(input);
    expect(output).toContain('<div style="text-align: center; color: #0057B8">Centered Text</div>');
    expect(output).toContain('<p style="font-size: 18px">Large</p>');
  });

  test('preserves valid hyperlinks with target and rel attributes', () => {
    const input = '<a href="https://www.att.com/portal" target="_blank" rel="noopener noreferrer">AT&amp;T Portal</a>';
    const output = sanitizeRichText(input);
    expect(output).toContain('<a href="https://www.att.com/portal" target="_blank" rel="noopener noreferrer">AT&amp;T Portal</a>');
  });

  test('preserves mailto and tel hyperlinks safely', () => {
    const input = '<a href="mailto:support@att.com">Email Us</a> <a href="tel:+18001234567">Call Us</a>';
    const output = sanitizeRichText(input);
    expect(output).toContain('<a href="mailto:support@att.com">Email Us</a>');
    expect(output).toContain('<a href="tel:+18001234567">Call Us</a>');
  });

  test('neutralizes unsafe javascript URLs in hyperlinks', () => {
    const input = '<a href="javascript:alert(1)">Click Me</a>';
    const output = sanitizeRichText(input);
    expect(output).not.toContain('javascript:alert');
    expect(output).toContain('&lt;a&gt;');
  });

  test('neutralizes scripts, event handlers and disallowed styles', () => {
    const input = '<span style="color: blue;" onclick="alert(1)">Click</span><script>bad()</script>';
    const output = sanitizeRichText(input);
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('onclick');
    expect(output).toContain('<span style="color: blue">Click</span>');
  });
});

describe('createRichTextEditor UI component', () => {
  let container;
  let onChange;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onChange = vi.fn();
  });

  test('creates a container with toolbar and contenteditable area', () => {
    const editor = createRichTextEditor({
      controlId: 'test-field',
      fieldId: 'content',
      value: '<p>Initial content</p>',
      onChange
    });

    expect(editor.element).toBeDefined();
    expect(editor.element.classList.contains('rich-text-editor-container')).toBe(true);
    expect(editor.validationControl).toBeDefined();
    expect(editor.validationControl.id).toBe('test-field');
    expect(editor.validationControl.getAttribute('contenteditable')).toBe('true');
    expect(editor.validationControl.innerHTML).toContain('Initial content');
  });

  test('includes formatting toolbar buttons (Bold, Italic, Underline, Strike, Link, Size, Color, Highlight, Lists, Clear)', () => {
    const editor = createRichTextEditor({
      controlId: 'test-field-2',
      fieldId: 'content',
      value: 'Hello World',
      onChange
    });

    const toolbar = editor.element.querySelector('.rich-text-toolbar');
    expect(toolbar).not.toBeNull();
    const buttons = toolbar.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(7);

    const linkBtn = toolbar.querySelector('button[title*="Link"]');
    expect(linkBtn).not.toBeNull();
  });

  test('opens link popover on Link button click', () => {
    const editor = createRichTextEditor({
      controlId: 'test-link-field',
      fieldId: 'content',
      value: 'Check our site',
      onChange
    });

    const linkBtn = editor.element.querySelector('button[title*="Link"]');
    linkBtn.click();

    const popover = editor.element.querySelector('.rt-link-popover');
    expect(popover).not.toBeNull();
    const urlInput = popover.querySelector('.rt-link-input');
    expect(urlInput).not.toBeNull();
  });

  test('supports single line mode without list buttons', () => {
    const editor = createRichTextEditor({
      controlId: 'single-line-field',
      fieldId: 'title',
      value: 'Title Text',
      isSingleLine: true,
      onChange
    });

    expect(editor.validationControl.getAttribute('aria-multiline')).toBe('false');
    const bulletBtn = editor.element.querySelector('button[title="Bullet List"]');
    expect(bulletBtn).toBeNull();
  });

  test('calls onChange when input event fires on editor', () => {
    const editor = createRichTextEditor({
      controlId: 'test-field-3',
      fieldId: 'content',
      value: '',
      onChange
    });

    editor.validationControl.innerHTML = '<p>New text</p>';
    editor.validationControl.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('<p>New text</p>');
  });

  test('getValue and setValue operate cleanly', () => {
    const editor = createRichTextEditor({
      controlId: 'test-field-4',
      fieldId: 'content',
      value: 'Start',
      onChange
    });

    expect(editor.getValue()).toBe('Start');
    editor.setValue('<strong>Updated</strong>');
    expect(editor.getValue()).toBe('<strong>Updated</strong>');
  });

  test('contains AT&T brand color palette and font sizes', () => {
    expect(ATT_BRAND_COLORS.length).toBeGreaterThanOrEqual(8);
    expect(ATT_BRAND_COLORS.some(c => c.hex === '#0057B8')).toBe(true);
    expect(FONT_SIZES.length).toBeGreaterThanOrEqual(4);
    expect(HIGHLIGHT_COLORS.length).toBeGreaterThanOrEqual(3);
  });
});
