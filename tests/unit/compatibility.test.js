import { describe, expect, test } from 'vitest';
import { COMPATIBILITY_TIERS, EXPORT_FORMAT_COMPATIBILITY, getExportFormatCompatibility } from '../../js/compatibility.js';

describe('compatibility tier classification', () => {
  test('every tier has a stable id, label, and badge class', () => {
    Object.entries(COMPATIBILITY_TIERS).forEach(([key, tier]) => {
      expect(tier.id).toBe(key);
      expect(typeof tier.label).toBe('string');
      expect(tier.badgeClass).toMatch(/^compat-badge-/);
    });
  });

  test('every export format entry declares a known tier, a summary, and details', () => {
    const validTiers = new Set(Object.keys(COMPATIBILITY_TIERS));
    Object.entries(EXPORT_FORMAT_COMPATIBILITY).forEach(([key, entry]) => {
      expect(validTiers.has(entry.tier), `${key} has an unknown tier "${entry.tier}"`).toBe(true);
      expect(typeof entry.summary).toBe('string');
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(Array.isArray(entry.details)).toBe(true);
      expect(entry.details.length).toBeGreaterThan(0);
    });
  });

  test('getExportFormatCompatibility resolves each known format key', () => {
    ['iframe', 'code', 'rise-zip', 'standaloneDownload'].forEach(key => {
      expect(getExportFormatCompatibility(key)).toBe(EXPORT_FORMAT_COMPATIBILITY[key]);
    });
  });

  test('getExportFormatCompatibility returns null for an unknown format key', () => {
    expect(getExportFormatCompatibility('not-a-real-format')).toBeNull();
    expect(getExportFormatCompatibility(undefined)).toBeNull();
  });

  test('only the standalone download path is currently classified as confirmed', () => {
    const confirmed = Object.entries(EXPORT_FORMAT_COMPATIBILITY).filter(([, entry]) => entry.tier === 'confirmed');
    expect(confirmed.map(([key]) => key)).toEqual(['standaloneDownload']);
  });
});
