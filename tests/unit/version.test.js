import { describe, expect, test } from 'vitest';
import { APP_VERSION, parseVersionBuildDate } from '../../js/version.js';

describe('parseVersionBuildDate', () => {
  test('parses the YYYYMMDD.HHmm build metadata suffix into a real Date', () => {
    const date = parseVersionBuildDate('2.0.0+20260821.1514');
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7); // August, 0-indexed
    expect(date.getDate()).toBe(21);
    expect(date.getHours()).toBe(15);
    expect(date.getMinutes()).toBe(14);
  });

  test('the app\'s own current APP_VERSION parses cleanly', () => {
    expect(parseVersionBuildDate(APP_VERSION)).toBeInstanceOf(Date);
  });

  test('returns null rather than a garbage Date for a version with no build metadata', () => {
    expect(parseVersionBuildDate('2.0.0')).toBeNull();
  });

  test('returns null for a malformed suffix instead of throwing or returning Invalid Date', () => {
    expect(parseVersionBuildDate('2.0.0+not-a-date')).toBeNull();
    expect(parseVersionBuildDate('2.0.0+202608.1514')).toBeNull();
  });
});
