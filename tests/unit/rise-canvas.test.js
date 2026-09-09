import { describe, expect, test } from 'vitest';
import { getDeviceWidthLabel } from '../../js/device-preview.js';
import { COMPONENT_MAX_WIDTH } from '../../js/preview.js';
import { COMPONENT_REGISTRY, getComponentById } from '../../js/component-registry.js';

describe('Rise Canvas & Completion Compatibility (Phase 5)', () => {
  test('device preview width labels accurately format simulated viewports', () => {
    expect(getDeviceWidthLabel('desktop', COMPONENT_MAX_WIDTH)).toBe(`Up to ${COMPONENT_MAX_WIDTH}px`);
    expect(getDeviceWidthLabel('tablet')).toBe('768px');
    expect(getDeviceWidthLabel('mobile-lg')).toBe('430px');
    expect(getDeviceWidthLabel('mobile')).toBe('375px');
  });

  test('every component has defined completion tracking metadata or sensible fallback', () => {
    COMPONENT_REGISTRY.forEach(comp => {
      expect(comp.tier).toBeDefined();
      if (comp.completionTracking) {
        expect(typeof comp.completionTracking).toBe('string');
        expect(comp.completionTracking.length).toBeGreaterThan(0);
      }
    });
  });

  test('interactive video has specialized completion options', () => {
    const iv = getComponentById(COMPONENT_REGISTRY, 'interactive-video');
    expect(iv).toBeDefined();
    expect(iv.completionTracking).toContain('marker');
  });

  test('confidence matrix and dial gauge have authentic completion criteria', () => {
    const cm = getComponentById(COMPONENT_REGISTRY, 'confidence-matrix');
    expect(cm.completionTracking).toContain('Matrix completion');

    const dg = getComponentById(COMPONENT_REGISTRY, 'dial-gauge');
    expect(dg.completionTracking).toContain('Exploration and target zone');
  });
});
