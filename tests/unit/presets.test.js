import { describe, expect, test } from 'vitest';
import { WORKPLACE_PRESETS, getPresetsForComponent, getPresetById } from '../../js/presets.js';
import { COMPONENT_REGISTRY, getComponentById } from '../../js/component-registry.js';

describe('Workplace Starter Presets', () => {
  test('presets collection contains rich authentic scenarios', () => {
    expect(WORKPLACE_PRESETS.length).toBeGreaterThan(5);
    WORKPLACE_PRESETS.forEach(preset => {
      expect(preset.id).toBeDefined();
      expect(preset.componentId).toBeDefined();
      expect(preset.title).toBeDefined();
      expect(preset.domain).toBeDefined();
      expect(preset.description).toBeDefined();
      expect(preset.config).toBeDefined();
      if (preset.config.items) {
        expect(Array.isArray(preset.config.items)).toBe(true);
        expect(preset.config.items.length).toBeGreaterThan(0);
      }
    });
  });

  test('getPresetsForComponent returns matching presets', () => {
    const accordionPresets = getPresetsForComponent('accordion');
    expect(accordionPresets.length).toBeGreaterThan(0);
    expect(accordionPresets.every(p => p.componentId === 'accordion')).toBe(true);

    const dialPresets = getPresetsForComponent('dial-gauge');
    expect(dialPresets.length).toBeGreaterThan(0);
    expect(dialPresets.every(p => p.componentId === 'dial-gauge')).toBe(true);

    const unknownPresets = getPresetsForComponent('nonexistent-component');
    expect(unknownPresets).toEqual([]);
  });

  test('getPresetById finds specific preset or null', () => {
    const preset = getPresetById('cybersecurity-incident-response');
    expect(preset).toBeDefined();
    expect(preset.componentId).toBe('accordion');
    expect(preset.domain).toBe('Cybersecurity');

    expect(getPresetById('invalid-preset-id')).toBeNull();
  });

  test('every preset references a valid component in COMPONENT_REGISTRY', () => {
    WORKPLACE_PRESETS.forEach(preset => {
      const comp = getComponentById(COMPONENT_REGISTRY, preset.componentId);
      expect(comp).toBeDefined();
    });
  });

  test('all 26 registered components have at least one workplace starter preset', () => {
    expect(COMPONENT_REGISTRY.length).toBe(26);
    COMPONENT_REGISTRY.forEach(comp => {
      const presets = getPresetsForComponent(comp.id);
      expect(presets.length, `Expected component "${comp.id}" (${comp.name}) to have at least one workplace preset`).toBeGreaterThan(0);
      presets.forEach(p => {
        expect(p.id).toBeTruthy();
        expect(p.title).toBeTruthy();
        expect(p.domain).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.config).toBeTypeOf('object');
      });
    });
  });
});
