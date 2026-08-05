import { describe, expect, test } from 'vitest';
import {
  CATEGORIES, COMPONENT_REGISTRY, getCategoriesWithCounts, getComponentById,
  getDefaultConfig, searchComponents, validateRegistry
} from '../../js/component-registry.js';
import { componentCatalog, filterCatalog } from '../../js/catalog.js';
import { createDefaultItem, getEditorSchema } from '../../js/editor-schemas.js';

function baseEntry(overrides = {}) {
  return {
    id: 'sample',
    name: 'Sample Component',
    categoryId: 'interactive',
    description: 'A sample component used for validation tests.',
    keywords: ['sample'],
    version: '1.0.0',
    icon: '<svg></svg>',
    editorSchema: { itemLabel: 'Item', minItems: 1, itemFields: [] },
    defaultContent: { items: [] },
    defaultDesign: {},
    defaultBehaviour: {},
    renderer: { type: 'module', generateHTML: () => '', generateCSS: () => '', generateJS: () => '' },
    exporter: { type: 'shared', module: 'js/export.js#buildExportPayload' },
    validate: null,
    accessibilitySupport: true,
    media: { required: false, kinds: [] },
    completionSupport: true,
    status: 'production',
    ...overrides
  };
}

describe('component registry integrity', () => {
  test('every component id is unique', () => {
    const ids = COMPONENT_REGISTRY.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every component belongs to a valid category', () => {
    const categoryIds = new Set(CATEGORIES.map(category => category.id));
    COMPONENT_REGISTRY.forEach(entry => {
      expect(categoryIds.has(entry.categoryId)).toBe(true);
    });
  });

  test('category counts are correct', () => {
    const counts = getCategoriesWithCounts(COMPONENT_REGISTRY);
    CATEGORIES.forEach(category => {
      const expected = COMPONENT_REGISTRY.filter(entry => entry.categoryId === category.id).length;
      expect(counts.find(entry => entry.id === category.id).count).toBe(expected);
    });
    expect(counts.find(entry => entry.id === 'knowledge').count).toBe(4);
  });

  test('every production component has an editor, renderer, and exporter', () => {
    COMPONENT_REGISTRY.filter(entry => entry.status === 'production').forEach(entry => {
      expect(entry.editorSchema).toBeTruthy();
      expect(entry.renderer?.type).toBeTruthy();
      expect(entry.exporter?.type).toBeTruthy();
    });
  });

  test('default data passes its own editor schema', () => {
    COMPONENT_REGISTRY.forEach(entry => {
      const defaults = getDefaultConfig(entry);
      expect(Array.isArray(defaults.items)).toBe(true);
      expect(defaults.items.length).toBeGreaterThanOrEqual(entry.editorSchema.minItems || 0);
      const requiredFields = (entry.editorSchema.itemFields || []).filter(field => field.required);
      defaults.items.forEach(item => {
        requiredFields.forEach(field => {
          expect(item[field.id]).not.toBe(undefined);
          expect(item[field.id]).not.toBe('');
        });
      });
      if (typeof entry.validate === 'function') {
        expect(entry.validate(defaults).valid).toBe(true);
      }
    });
  });

  test('createDefaultItem still produces a blank item matching each schema', () => {
    COMPONENT_REGISTRY.forEach(entry => {
      const blank = createDefaultItem(entry.editorSchema);
      (entry.editorSchema.itemFields || []).forEach(field => {
        expect(blank).toHaveProperty(field.id);
      });
    });
  });

  test('Knowledge Checks displays the correct number of components', () => {
    expect(componentCatalog.filter(item => item.category === 'knowledge').length).toBe(4);
    const filtered = filterCatalog(componentCatalog, { activeCategory: 'knowledge', searchQuery: '', favorites: new Set() });
    expect(filtered.length).toBe(4);
  });

  test('experimental AI components are isolated from production ones', () => {
    const experimental = COMPONENT_REGISTRY.filter(entry => entry.status === 'experimental');
    expect(experimental.length).toBeGreaterThan(0);
    experimental.forEach(entry => {
      expect(entry.categoryId).toBe('ai');
    });
  });
});

describe('component registry validation', () => {
  test('rejects a duplicate id', () => {
    const registry = [baseEntry({ id: 'dup' }), baseEntry({ id: 'dup' })];
    expect(() => validateRegistry(registry)).toThrow(/duplicate id.*"dup"/i);
  });

  test('rejects an entry with a missing required field', () => {
    const registry = [baseEntry({ description: '' })];
    expect(() => validateRegistry(registry)).toThrow(/description/i);
  });

  test('rejects an entry with an unknown category', () => {
    const registry = [baseEntry({ categoryId: 'not-a-real-category' })];
    expect(() => validateRegistry(registry)).toThrow(/unknown categoryId/i);
  });

  test('accepts a well-formed registry', () => {
    expect(() => validateRegistry([baseEntry()])).not.toThrow();
  });

  test('rejects a non-array or empty registry', () => {
    expect(() => validateRegistry(null)).toThrow(/non-empty array/i);
    expect(() => validateRegistry([])).toThrow(/non-empty array/i);
  });

  test.each([
    ['id', { id: '' }, /missing a valid id/i],
    ['id', { id: '   ' }, /missing a valid id/i],
    ['name', { name: '' }, /missing a display name/i],
    ['description', { description: '' }, /missing a description/i],
    ['keywords', { keywords: [] }, /at least one search keyword/i],
    ['version', { version: '' }, /missing a version/i],
    ['icon', { icon: '' }, /missing a thumbnail\/icon/i],
    ['editorSchema', { editorSchema: null }, /missing an editor schema/i],
    ['defaultContent', { defaultContent: {} }, /missing default content/i],
    ['defaultDesign', { defaultDesign: null }, /missing default design values/i],
    ['defaultBehaviour', { defaultBehaviour: null }, /missing default behaviour values/i],
    ['renderer', { renderer: null }, /missing a renderer reference/i],
    ['renderer methods', { renderer: { type: 'module', generateHTML: () => '' } }, /incomplete renderer/i],
    ['exporter', { exporter: null }, /missing an exporter reference/i],
    ['media', { media: { required: false } }, /invalid media requirements/i],
    ['accessibilitySupport', { accessibilitySupport: undefined }, /missing accessibility support status/i],
    ['completionSupport', { completionSupport: undefined }, /missing completion support status/i],
    ['status', { status: 'unreleased' }, /invalid status/i]
  ])('rejects an entry with an invalid %s', (_label, overrides, expectedMessage) => {
    expect(() => validateRegistry([baseEntry(overrides)])).toThrow(expectedMessage);
  });
});

describe('editor schema resolution', () => {
  test('getEditorSchema returns the registered schema for a known component id', () => {
    expect(getEditorSchema('accordion')).toBe(COMPONENT_REGISTRY.find(entry => entry.id === 'accordion').editorSchema);
  });

  test('getEditorSchema falls back to a generic single-item-field schema for an unknown id', () => {
    const fallback = getEditorSchema('not-a-real-component');
    expect(fallback.itemLabel).toBe('Item');
    expect(fallback.minItems).toBe(1);
    expect(Array.isArray(fallback.itemFields)).toBe(true);
    expect(fallback.itemFields.length).toBeGreaterThan(0);
  });
});

describe('search', () => {
  test('finds a component by name substring', () => {
    const results = searchComponents(COMPONENT_REGISTRY, 'accordion');
    expect(results.some(entry => entry.id === 'accordion')).toBe(true);
  });

  test('finds a component by description substring', () => {
    const results = searchComponents(COMPONENT_REGISTRY, 'branching');
    expect(results.some(entry => entry.id === 'scenario' || entry.id === 'ai-generator')).toBe(true);
  });

  test('finds a component by keyword substring', () => {
    const results = searchComponents(COMPONENT_REGISTRY, 'faq');
    expect(results.some(entry => entry.id === 'accordion')).toBe(true);
  });

  test('returns no results for a nonsense query', () => {
    expect(searchComponents(COMPONENT_REGISTRY, 'zzznotarealquery')).toEqual([]);
  });

  test('catalog search matches names, descriptions, and keywords', () => {
    const byKeyword = filterCatalog(componentCatalog, { activeCategory: 'interactive', searchQuery: 'faq', favorites: new Set() });
    expect(byKeyword.some(item => item.id === 'accordion')).toBe(true);
  });
});

describe('favorites reference stable component ids', () => {
  test('getComponentById resolves every catalog id', () => {
    componentCatalog.forEach(item => {
      expect(getComponentById(COMPONENT_REGISTRY, item.id)).not.toBeNull();
    });
  });

  test('an unknown favorite id resolves to null instead of throwing', () => {
    expect(getComponentById(COMPONENT_REGISTRY, 'removed-component')).toBeNull();
  });

  test('filterCatalog silently drops unknown favorite ids instead of corrupting results', () => {
    const favorites = new Set(['accordion', 'removed-component']);
    const filtered = filterCatalog(componentCatalog, { activeCategory: 'favorites', searchQuery: '', favorites });
    expect(filtered.map(item => item.id)).toEqual(['accordion']);
  });
});
