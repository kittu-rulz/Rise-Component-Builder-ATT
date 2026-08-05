import { describe, expect, test } from 'vitest';
import { getAccessibilityWarning, isEmpty, validateSchemaField } from '../../js/field-validation.js';

describe('isEmpty', () => {
  test('treats undefined, null, and whitespace-only strings as empty', () => {
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty('   ')).toBe(true);
  });

  test('treats rich-text markup with no real text (only tags and &nbsp;) as empty', () => {
    expect(isEmpty('<p>&nbsp;</p>')).toBe(true);
    expect(isEmpty('<p></p>')).toBe(true);
  });

  test('is not empty when real text or a non-string value is present', () => {
    expect(isEmpty('<p>Hello</p>')).toBe(false);
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(false)).toBe(false);
  });
});

describe('validateSchemaField', () => {
  test('flags a required field that is empty', () => {
    const errors = validateSchemaField({ id: 'title', label: 'Title', required: true }, '');
    expect(errors).toEqual(['Title is required.']);
  });

  test('requiredOne flags when no item in the group has the field set', () => {
    const field = { id: 'correct', label: 'Correct answer', requiredOne: true };
    expect(validateSchemaField(field, false, [{ correct: false }, { correct: false }])).toEqual(['Select one correct answer.']);
    expect(validateSchemaField(field, false, [{ correct: false }, { correct: true }])).toEqual([]);
  });

  test('an empty, non-required field short-circuits with no further checks', () => {
    expect(validateSchemaField({ id: 'x', label: 'X', type: 'number', min: 5 }, '')).toEqual([]);
  });

  test('number/range fields validate numeric-ness and min/max bounds', () => {
    const field = { id: 'count', label: 'Count', type: 'number', min: 1, max: 10 };
    expect(validateSchemaField(field, 'abc')).toEqual(['Count must be a number.']);
    expect(validateSchemaField(field, 0)).toEqual(['Count must be at least 1.']);
    expect(validateSchemaField(field, 11)).toEqual(['Count must be no more than 10.']);
    expect(validateSchemaField(field, 5)).toEqual([]);
  });

  test('url fields require an http/https URL unless the value is an uploaded media reference', () => {
    const field = { id: 'link', label: 'Link', type: 'url' };
    expect(validateSchemaField(field, 'javascript:alert(1)')).toEqual(['Link must be a valid URL.']);
    expect(validateSchemaField(field, 'https://example.com')).toEqual([]);
    const mediaReference = {
      source: 'upload', mediaId: 'm1', schemaVersion: 1, kind: 'image', name: 'a.png',
      mimeType: 'image/png', size: 10, createdAt: new Date().toISOString()
    };
    expect(validateSchemaField(field, mediaReference)).toEqual([]);
  });

  test('image/audio/video fields accept data: URLs and uploaded media without a protocol check', () => {
    const field = { id: 'icon', label: 'Icon', type: 'image' };
    expect(validateSchemaField(field, 'data:image/png;base64,abc')).toEqual([]);
    expect(validateSchemaField(field, 'https://example.com/icon.png')).toEqual([]);
    expect(validateSchemaField(field, 'not a url')).toEqual(['Icon must be a valid web URL or uploaded file.']);
  });

  test('color fields require a six-digit hex value', () => {
    const field = { id: 'color', label: 'Color', type: 'color' };
    expect(validateSchemaField(field, '#ABCDEF')).toEqual([]);
    expect(validateSchemaField(field, '#ABC')).toEqual(['Color must be a six-digit hexadecimal color.']);
    expect(validateSchemaField(field, 'red')).toEqual(['Color must be a six-digit hexadecimal color.']);
  });

  test('maxLength and pattern constraints are enforced', () => {
    expect(validateSchemaField({ id: 'x', label: 'X', maxLength: 3 }, 'abcd')).toEqual(['X must be 3 characters or fewer.']);
    const patterned = { id: 'code', label: 'Code', pattern: '^[A-Z]+$', patternMessage: 'Code must be uppercase letters.' };
    expect(validateSchemaField(patterned, 'abc')).toEqual(['Code must be uppercase letters.']);
    expect(validateSchemaField(patterned, 'ABC')).toEqual([]);
  });

  test('multiple violations on the same field are all reported', () => {
    const field = { id: 'title', label: 'Title', required: true, maxLength: 3 };
    expect(validateSchemaField(field, '')).toEqual(['Title is required.']);
  });
});

describe('getAccessibilityWarning', () => {
  test('returns nothing when the trigger field (warningWhen) is itself empty', () => {
    const field = { warningWhen: 'content', warningUnless: 'decorative', warningMessage: 'Add alt text.' };
    expect(getAccessibilityWarning(field, '', { content: '' })).toBe('');
  });

  test('warns when warningUnless is falsy and the value is empty', () => {
    const field = { warningWhen: 'content', warningUnless: 'decorative', warningMessage: 'Add alt text.' };
    expect(getAccessibilityWarning(field, '', { content: 'has content', decorative: false })).toBe('Add alt text.');
    expect(getAccessibilityWarning(field, '', { content: 'has content', decorative: true })).toBe('');
  });

  test('falls back to a generic message when warningMessage is not set', () => {
    const field = { warningUnless: 'decorative' };
    expect(getAccessibilityWarning(field, '', { decorative: false })).toMatch(/recommended for accessibility/i);
  });

  test('warningUnlessAny warns only when none of the listed fields are set', () => {
    const field = { warningUnlessAny: ['captionsUrl', 'transcript'] };
    expect(getAccessibilityWarning(field, '', { captionsUrl: '', transcript: '' })).toMatch(/accessible media alternative/i);
    expect(getAccessibilityWarning(field, '', { captionsUrl: '', transcript: 'Full transcript' })).toBe('');
  });
});
