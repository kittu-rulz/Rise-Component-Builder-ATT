import { beforeEach, describe, expect, test } from 'vitest';
import {
  buildProjectSchemaV3, createComponentInstance, createSection,
  SCHEMA_VERSION_V3, validateProjectV3
} from '../../js/project-schema.js';
import { migrateProjectToV3 } from '../../js/project-migration.js';
import {
  deleteProject, duplicateProject, getProject,
  saveProject, toggleFavoriteProject
} from '../../js/storage.js';
import { componentConfig, memoryLocalStorage, validProject } from '../fixtures/index.js';

describe('Project Schema v3 & Migration Unit Tests', () => {
  beforeEach(() => {
    globalThis.localStorage = memoryLocalStorage();
  });

  test('buildProjectSchemaV3 produces valid Schema v3 structure', () => {
    const section1 = createSection({ id: 'sec-1', name: 'Module 1: Intro', componentOrder: ['comp-1'] });
    const comp1 = createComponentInstance({ id: 'comp-1', name: 'Intro Accordion', type: 'accordion' });
    const comp2 = createComponentInstance({ id: 'comp-2', name: 'Knowledge Check', type: 'multiple-choice' });

    const project = buildProjectSchemaV3({
      name: 'Cybersecurity 101',
      clientLabel: 'AT&T',
      sectionOrder: ['sec-1'],
      sections: { 'sec-1': section1 },
      unsectionedComponentOrder: ['comp-2'],
      components: { 'comp-1': comp1, 'comp-2': comp2 }
    });

    expect(project.schemaVersion).toBe(SCHEMA_VERSION_V3);
    expect(project.name).toBe('Cybersecurity 101');
    expect(project.clientLabel).toBe('AT&T');
    expect(project.sectionOrder).toEqual(['sec-1']);
    expect(project.sections['sec-1'].name).toBe('Module 1: Intro');
    expect(project.components['comp-1'].name).toBe('Intro Accordion');
    expect(project.components['comp-2'].name).toBe('Knowledge Check');

    const validation = validateProjectV3(project);
    expect(validation.valid).toBe(true);
    expect(validation.project.id).toBe(project.id);
  });

  test('validateProjectV3 catches missing section or component references', () => {
    const badSectionRef = buildProjectSchemaV3({
      sectionOrder: ['sec-missing'],
      sections: {}
    });
    expect(validateProjectV3(badSectionRef).valid).toBe(false);

    const badCompRef = buildProjectSchemaV3({
      unsectionedComponentOrder: ['comp-missing'],
      components: {}
    });
    expect(validateProjectV3(badCompRef).valid).toBe(false);
  });

  test('migrateProjectToV3 cleanly converts legacy v1 and v2 projects into Schema v3', () => {
    const legacyV2 = validProject({
      name: 'Legacy Telecom Basics',
      componentId: 'accordion',
      config: componentConfig([{ title: 'Topic 1', content: 'Details' }])
    });

    const v3Migrated = migrateProjectToV3(legacyV2);
    expect(v3Migrated.schemaVersion).toBe(3);
    expect(v3Migrated.name).toBe('Legacy Telecom Basics');
    expect(v3Migrated.clientLabel).toBe('AT&T');
    expect(v3Migrated.unsectionedComponentOrder.length).toBe(1);

    const mainCompId = v3Migrated.unsectionedComponentOrder[0];
    const compInstance = v3Migrated.components[mainCompId];
    expect(compInstance).toBeDefined();
    expect(compInstance.name).toBe('Legacy Telecom Basics');
    expect(compInstance.type).toBe('accordion');
    expect(compInstance.config.items[0].title).toBe('Topic 1');

    // Re-running migration on an already v3 project is idempotent
    const reMigrated = migrateProjectToV3(v3Migrated);
    expect(reMigrated).toEqual(v3Migrated);
  });

  test('Schema v3 projects persist, favorite toggle, duplicate, and export/import properly', () => {
    const project = buildProjectSchemaV3({
      name: 'Network Architecture',
      unsectionedComponentOrder: ['c1'],
      components: {
        c1: createComponentInstance({ id: 'c1', name: 'Diagram Tab', type: 'tabs' })
      }
    });

    saveProject(project);
    const loaded = getProject(project.id);
    expect(loaded).toBeDefined();
    expect(loaded.schemaVersion).toBe(3);
    expect(loaded.components.c1.name).toBe('Diagram Tab');

    // Favorite toggle
    toggleFavoriteProject(project.id);
    expect(getProject(project.id).favorite).toBe(true);

    // Duplicate
    const dup = duplicateProject(project.id);
    expect(dup.id).not.toBe(project.id);
    expect(dup.name).toContain('Copy');
    expect(dup.components.c1).toBeDefined();

    // Delete
    expect(deleteProject(project.id)).toBe(true);
    expect(getProject(project.id)).toBeNull();
    expect(getProject(dup.id)).not.toBeNull();
  });
});
