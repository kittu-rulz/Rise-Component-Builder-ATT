/**
 * Project Migration Utilities (v0/v1/v2 -> v3)
 * Non-destructive, idempotent transformation of legacy single-component projects into Schema v3 Course Projects.
 */

import {
  buildProjectSchemaV3, createComponentInstance, SCHEMA_VERSION_V3, validateProjectV3
} from './project-schema.js';
import { migrateProject as migrateLegacyToV2 } from './storage.js';

export const BACKUP_STORAGE_KEY_V2 = 'rise-builder-projects-backup-v2';

/**
 * Migrates any legacy project (v0, v1, v2) or validates an existing v3 project.
 * @param {Object} rawProject
 * @returns {Object} A valid Schema v3 Project object
 */
export function migrateProjectToV3(rawProject) {
  if (!rawProject || typeof rawProject !== 'object') {
    throw new Error('Project data must be an object.');
  }

  // If already Schema v3, validate and return
  if (rawProject.schemaVersion === SCHEMA_VERSION_V3) {
    const v3Result = validateProjectV3(rawProject);
    if (v3Result.valid) {
      return v3Result.project;
    }
    throw new Error(`Invalid Schema v3 project: ${v3Result.error}`);
  }

  // First run through legacy v1 -> v2 migration to normalize theme/config overrides
  const v2Project = migrateLegacyToV2(rawProject);

  // Extract component metadata and config from legacy single-component structure
  const compId = `comp-${v2Project.id || Date.now().toString(36)}`;
  const compType = v2Project.componentId || 'accordion';
  const compName = v2Project.name || 'Main Component';

  const componentInstance = createComponentInstance({
    id: compId,
    name: compName,
    type: compType,
    config: v2Project.config || {},
    styleOverrides: v2Project.componentOverrides || {},
    mediaRefs: [],
    status: 'draft',
    createdAt: v2Project.createdAt,
    updatedAt: v2Project.updatedAt
  });

  // Construct multi-component Schema v3 project with this single unsectioned component
  const v3Project = buildProjectSchemaV3({
    id: v2Project.id,
    name: v2Project.name || 'Untitled Course Project',
    clientLabel: 'AT&T',
    description: '',
    favorite: false,
    settings: v2Project.settings,
    theme: v2Project.theme,
    componentOverrides: v2Project.componentOverrides,
    uiTheme: v2Project.uiTheme,
    sectionOrder: [],
    sections: {},
    unsectionedComponentOrder: [compId],
    components: {
      [compId]: componentInstance
    },
    mediaRefs: [],
    createdAt: v2Project.createdAt,
    updatedAt: v2Project.updatedAt
  });

  return v3Project;
}

/**
 * Creates a safety backup of legacy projects in localStorage if not already backed up.
 * @param {Array<Object>} projectsList
 */
export function backupLegacyProjects(projectsList) {
  try {
    if (!Array.isArray(projectsList) || projectsList.length === 0) return;
    if (localStorage.getItem(BACKUP_STORAGE_KEY_V2)) return; // Already backed up once
    localStorage.setItem(BACKUP_STORAGE_KEY_V2, JSON.stringify(projectsList));
  } catch (error) {
    console.warn('[Storage Migration] Could not create legacy backup:', error);
  }
}
