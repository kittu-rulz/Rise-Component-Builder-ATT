import { describe, expect, test } from 'vitest';
import {
  combineValidationResults, validateFillBlankAnswers, validateHotspotCoordinates, validateNonEmptyArray,
  validatePositiveNumber, validateQuizAnswers, validateRequiredString, validateScenarioBranching,
  validateSortingOrder, validateTimelineEvents, validateURL
} from '../../js/validation-utils.js';

describe('validateRequiredString', () => {
  test('rejects empty, whitespace-only, and non-string values', () => {
    expect(validateRequiredString('', 'Title').valid).toBe(false);
    expect(validateRequiredString('   ', 'Title').valid).toBe(false);
    expect(validateRequiredString(undefined, 'Title').valid).toBe(false);
    expect(validateRequiredString(42, 'Title').valid).toBe(false);
  });

  test('accepts a non-empty string', () => {
    const result = validateRequiredString('Hello', 'Title');
    expect(result).toEqual({ valid: true, error: null });
  });
});

describe('validatePositiveNumber', () => {
  test('rejects non-finite values and values outside the given range', () => {
    expect(validatePositiveNumber('abc', 'Count').valid).toBe(false);
    expect(validatePositiveNumber(-1, 'Count', 0, 10).valid).toBe(false);
    expect(validatePositiveNumber(11, 'Count', 0, 10).valid).toBe(false);
  });

  test('accepts a value within bounds and defaults to >= 0 with no max', () => {
    expect(validatePositiveNumber(5, 'Count', 0, 10).valid).toBe(true);
    expect(validatePositiveNumber(1000, 'Count').valid).toBe(true);
  });
});

describe('validateURL', () => {
  test('an empty value is valid unless required', () => {
    expect(validateURL('', 'Link').valid).toBe(true);
    expect(validateURL('', 'Link', { required: true }).valid).toBe(false);
  });

  test('rejects javascript: and vbscript: protocols regardless of options', () => {
    expect(validateURL('javascript:alert(1)', 'Link').valid).toBe(false);
    expect(validateURL('vbscript:msgbox(1)', 'Link').valid).toBe(false);
  });

  test('rejects data: and blob: URLs unless explicitly allowed', () => {
    expect(validateURL('data:image/png;base64,abc', 'Link').valid).toBe(false);
    expect(validateURL('data:image/png;base64,abc', 'Link', { allowDataImage: true }).valid).toBe(true);
    expect(validateURL('blob:https://example.com/id', 'Link').valid).toBe(false);
    expect(validateURL('blob:https://example.com/id', 'Link', { allowBlob: true }).valid).toBe(true);
  });

  test('accepts a relative assets/ path only when allowRelative is set', () => {
    expect(validateURL('assets/photo.png', 'Link').valid).toBe(false);
    expect(validateURL('assets/photo.png', 'Link', { allowRelative: true }).valid).toBe(true);
  });

  test('accepts a well-formed absolute URL and rejects a malformed one', () => {
    expect(validateURL('https://example.com/page', 'Link').valid).toBe(true);
    expect(validateURL('not a url', 'Link').valid).toBe(false);
  });
});

describe('validateNonEmptyArray', () => {
  test('rejects a non-array or an array shorter than minLength', () => {
    expect(validateNonEmptyArray(null, 'Items').valid).toBe(false);
    expect(validateNonEmptyArray([], 'Items').valid).toBe(false);
    expect(validateNonEmptyArray([1], 'Items', 2).valid).toBe(false);
  });

  test('accepts an array meeting minLength and uses correct wording for singular vs plural', () => {
    expect(validateNonEmptyArray([1], 'Items').valid).toBe(true);
    expect(validateNonEmptyArray([], 'Items').error).toMatch(/at least one item/i);
    expect(validateNonEmptyArray([1], 'Items', 3).error).toMatch(/at least 3 items/i);
  });
});

describe('validateQuizAnswers', () => {
  test('requires at least one option and at least one correct answer', () => {
    expect(validateQuizAnswers([], 'multiple-choice').valid).toBe(false);
    expect(validateQuizAnswers([{ correct: false }], 'multiple-choice').valid).toBe(false);
  });

  test('multiple-choice rejects more than one correct answer; multiple-select allows it', () => {
    const items = [{ correct: true }, { correct: true }];
    expect(validateQuizAnswers(items, 'multiple-choice').valid).toBe(false);
    expect(validateQuizAnswers(items, 'multiple-select').valid).toBe(true);
  });
});

describe('validateHotspotCoordinates', () => {
  test('requires at least one hotspot', () => {
    expect(validateHotspotCoordinates([]).valid).toBe(false);
  });

  test('rejects out-of-range x/y coordinates', () => {
    expect(validateHotspotCoordinates([{ x: -1, y: 50 }]).valid).toBe(false);
    expect(validateHotspotCoordinates([{ x: 50, y: 101 }]).valid).toBe(false);
    expect(validateHotspotCoordinates([{ x: 'nope', y: 50 }]).valid).toBe(false);
  });

  test('accepts coordinates within 0-100', () => {
    expect(validateHotspotCoordinates([{ x: 0, y: 100 }, { x: 50.5, y: 25 }]).valid).toBe(true);
  });
});

describe('validateScenarioBranching', () => {
  test('requires at least one step', () => {
    expect(validateScenarioBranching([]).valid).toBe(false);
  });

  test('rejects a nextSlide reference that matches no step and is not "end"', () => {
    expect(validateScenarioBranching([{ nextSlide: 'slide-9' }]).valid).toBe(false);
  });

  test('accepts a valid slide-N reference and the special "end" reference', () => {
    expect(validateScenarioBranching([{ nextSlide: 'slide-1' }, {}]).valid).toBe(true);
    expect(validateScenarioBranching([{ nextSlide: 'end' }]).valid).toBe(true);
  });
});

describe('validateSortingOrder', () => {
  test('requires at least one item', () => {
    expect(validateSortingOrder([]).valid).toBe(false);
  });

  test('rejects duplicate or out-of-range order values', () => {
    expect(validateSortingOrder([{ order: 0 }, { order: 0 }]).valid).toBe(false);
    expect(validateSortingOrder([{ order: 0 }, { order: 5 }]).valid).toBe(false);
  });

  test('accepts a unique, in-range order for every item', () => {
    expect(validateSortingOrder([{ order: 0 }, { order: 1 }, { order: 2 }]).valid).toBe(true);
  });
});

describe('validateFillBlankAnswers', () => {
  test('requires at least one question and a non-empty answer for each', () => {
    expect(validateFillBlankAnswers([]).valid).toBe(false);
    expect(validateFillBlankAnswers([{ content: '' }]).valid).toBe(false);
    expect(validateFillBlankAnswers([{ content: '  ' }]).valid).toBe(false);
  });

  test('accepts a non-empty answer', () => {
    expect(validateFillBlankAnswers([{ content: 'Paris' }]).valid).toBe(true);
  });
});

describe('validateTimelineEvents', () => {
  test('requires at least one event with a date or year', () => {
    expect(validateTimelineEvents([]).valid).toBe(false);
    expect(validateTimelineEvents([{}]).valid).toBe(false);
  });

  test('rejects events that are out of chronological order', () => {
    expect(validateTimelineEvents([{ year: '2020' }, { year: '2019' }]).valid).toBe(false);
  });

  test('accepts events in chronological order using either date or year', () => {
    expect(validateTimelineEvents([{ year: '2019' }, { date: '2020' }]).valid).toBe(true);
  });
});

describe('combineValidationResults', () => {
  test('collects only the error messages from failing results', () => {
    const combined = combineValidationResults([
      { valid: true, error: null },
      { valid: false, error: 'First problem.' },
      { valid: false, error: 'Second problem.' }
    ]);
    expect(combined).toEqual({ valid: false, errors: ['First problem.', 'Second problem.'] });
  });

  test('is valid with no errors when every result passes', () => {
    expect(combineValidationResults([{ valid: true, error: null }])).toEqual({ valid: true, errors: [] });
  });
});
