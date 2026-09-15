/**
 * @file migration.js
 * Rise Component Builder AT&T — Backward-Compatible Project Migration
 * Non-destructively migrates legacy v1/v2 single-component records, early v3 structures,
 * and aliased component types to current Schema v3 standard.
 */

import { normalizeComponentType } from './component-registry.js';
import {
  buildProjectSchemaV3,
  createComponentInstance,
  createSection,
  validateProjectV3
} from './project-schema.js';
import { getBuiltInTheme, DEFAULT_THEME_ID } from './themes.js';

/**
 * Result of a project migration attempt.
 * @typedef {Object} MigrationResult
 * @property {boolean} success - Whether migration succeeded
 * @property {Object} [project] - Normalized Schema v3 project (if success)
 * @property {string} [error] - Error message (if failure)
 * @property {Object} [original] - The unmutated raw input data
 * @property {string} [details] - Technical diagnostic information
 */

/**
 * Migrates any project record (v1, v2, early v3, aliased types) to valid Schema v3.
 * Non-destructive: Does not mutate the input argument and provides detailed error info on failure.
 *
 * @param {any} rawProject
 * @returns {MigrationResult}
 */
export function migrateProject(rawProject) {
  if (rawProject && rawProject.success && rawProject.project) {
    rawProject = rawProject.project;
  }

  if (!rawProject || typeof rawProject !== 'object') {
    return {
      success: false,
      error: 'Invalid project data: Expected a JSON object.',
      original: rawProject,
      details: `Received type: ${typeof rawProject}`
    };
  }

  try {
    const raw = JSON.parse(JSON.stringify(rawProject));

    // Case A: Already Schema Version 3
    if (raw.schemaVersion === 3 && raw.components && typeof raw.components === 'object') {
      const normalizedComponents = {};

      for (const [compId, comp] of Object.entries(raw.components)) {
        if (!comp || typeof comp !== 'object') continue;
        const canonicalType = normalizeComponentType(comp.type || 'accordion');
        normalizedComponents[compId] = {
          ...comp,
          id: comp.id || compId,
          type: canonicalType,
          name: String(comp.name || 'Component').trim() || 'Component',
          status: ['draft', 'in-review', 'ready'].includes(comp.status) ? comp.status : 'draft',
          config: comp.config && typeof comp.config === 'object' ? comp.config : {}
        };
      }

      const migratedV3 = buildProjectSchemaV3({
        id: raw.id,
        name: raw.name || 'Untitled Course',
        clientLabel: raw.clientLabel || 'AT&T',
        description: raw.description || '',
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        favorite: Boolean(raw.favorite),
        theme: raw.theme,
        uiTheme: raw.uiTheme,
        settings: raw.settings,
        componentOverrides: raw.componentOverrides,
        sectionOrder: Array.isArray(raw.sectionOrder) ? raw.sectionOrder : [],
        sections: raw.sections && typeof raw.sections === 'object' ? raw.sections : {},
        unsectionedComponentOrder: Array.isArray(raw.unsectionedComponentOrder) ? raw.unsectionedComponentOrder : [],
        components: normalizedComponents
      });

      const validation = validateProjectV3(migratedV3);
      if (!validation.valid) {
        return {
          success: false,
          error: `Schema v3 validation failed: ${validation.error}`,
          original: rawProject,
          details: `Validation error during normalization: ${validation.error}`
        };
      }

      return {
        success: true,
        project: migratedV3
      };
    }

    // Case B: Legacy Schema v1 / v2 Single Component Project
    const compType = normalizeComponentType(raw.componentId || raw.type || 'accordion');
    const compName = String(raw.name || 'Lesson Component').trim();
    const sec1 = createSection({ name: 'Module 1: Main Content', description: 'Migrated from standalone component' });

    const compInstance = createComponentInstance({
      name: compName,
      type: compType,
      status: 'draft',
      config: raw.config && typeof raw.config === 'object' ? raw.config : {}
    });

    sec1.componentOrder = [compInstance.id];

    const migrated = buildProjectSchemaV3({
      id: raw.id,
      name: raw.name || 'Migrated Course',
      clientLabel: raw.clientLabel || 'AT&T',
      description: raw.description || 'Migrated from standalone component project.',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt || new Date().toISOString(),
      favorite: Boolean(raw.favorite),
      theme: raw.theme || getBuiltInTheme(DEFAULT_THEME_ID),
      uiTheme: raw.uiTheme || 'light',
      settings: raw.settings,
      componentOverrides: raw.componentOverrides,
      sectionOrder: [sec1.id],
      sections: { [sec1.id]: sec1 },
      unsectionedComponentOrder: [],
      components: { [compInstance.id]: compInstance }
    });

    return {
      success: true,
      project: migrated
    };
  } catch (err) {
    return {
      success: false,
      error: `Project migration error: ${err.message}`,
      original: rawProject,
      details: err.stack || String(err)
    };
  }
}

export function migrateProjectSafely(rawProject) {
  const res = migrateProject(rawProject);
  return res.success ? res.project : rawProject;
}

