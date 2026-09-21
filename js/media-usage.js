/**
 * @file media-usage.js
 * Central Media Reference & Usage Tracking Service
 * Accurately analyzes real-time usage of Media Library assets across all saved projects,
 * active workspaces, components, and repeatable items.
 */

import { loadProjects, getProject, saveProject } from './storage.js';
import { isMediaReference } from './media.js';

/**
 * @typedef {Object} MediaComponentReference
 * @property {string} projectId
 * @property {string} projectName
 * @property {string} componentId
 * @property {string} componentName
 * @property {string} componentType
 * @property {string} fieldPath
 * @property {string} fieldLabel
 */

/**
 * @typedef {Object} MediaUsageReport
 * @property {string} mediaId
 * @property {number} totalUses
 * @property {boolean} isInUse
 * @property {MediaComponentReference[]} references
 */

/**
 * Recursively inspects a config object to locate all occurrences of a mediaId.
 * @param {any} value
 * @param {string} targetMediaId
 * @param {string} currentPath
 * @param {MediaComponentReference[]} found
 * @param {{ projectId: string, projectName: string, componentId: string, componentName: string, componentType: string }} context
 */
function scanConfigForMedia(value, targetMediaId, currentPath, found, context) {
  if (!value) return;

  if (typeof value === 'string' && value === targetMediaId) {
    found.push({
      projectId: context.projectId,
      projectName: context.projectName,
      componentId: context.componentId,
      componentName: context.componentName,
      componentType: context.componentType,
      fieldPath: currentPath,
      fieldLabel: currentPath.split('.').pop() || 'media'
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      scanConfigForMedia(item, targetMediaId, `${currentPath}[${idx}]`, found, context);
    });
    return;
  }

  if (typeof value === 'object') {
    if (value.mediaId === targetMediaId || value.assetId === targetMediaId) {
      found.push({
        projectId: context.projectId,
        projectName: context.projectName,
        componentId: context.componentId,
        componentName: context.componentName,
        componentType: context.componentType,
        fieldPath: currentPath,
        fieldLabel: currentPath.split('.').pop() || 'media'
      });
    }
    if (value.posterMediaId === targetMediaId) {
      found.push({
        projectId: context.projectId,
        projectName: context.projectName,
        componentId: context.componentId,
        componentName: context.componentName,
        componentType: context.componentType,
        fieldPath: `${currentPath}.posterMediaId`,
        fieldLabel: 'poster'
      });
    }
    Object.entries(value).forEach(([key, subVal]) => {
      if (key !== 'mediaId' && key !== 'assetId' && key !== 'posterMediaId') {
        scanConfigForMedia(subVal, targetMediaId, currentPath ? `${currentPath}.${key}` : key, found, context);
      }
    });
  }
}

/**
 * Inspects all saved projects to find every reference to a specific media asset.
 * @param {string} mediaId
 * @param {Object} [options]
 * @param {Object} [options.activeProject] - Optionally include an in-memory active project state
 * @returns {MediaUsageReport}
 */
export function getMediaAssetUsage(mediaId, options = {}) {
  if (!mediaId) {
    return { mediaId: '', totalUses: 0, isInUse: false, references: [] };
  }

  const allProjects = typeof loadProjects === 'function' ? loadProjects() : [];
  const foundReferences = [];
  const processedProjectIds = new Set();

  const scanProject = (proj) => {
    if (!proj) return;
    if (proj.components && typeof proj.components === 'object') {
      const comps = Object.values(proj.components);
      comps.forEach(comp => {
        if (!comp) return;
        scanConfigForMedia(comp.config || {}, mediaId, 'config', foundReferences, {
          projectId: proj.id,
          projectName: proj.name || 'Untitled Course',
          componentId: comp.instanceId || comp.id || 'comp',
          componentName: comp.name || comp.type || 'Component',
          componentType: comp.type || 'unknown'
        });
      });
    } else if (proj.config) {
      scanConfigForMedia(proj.config, mediaId, 'config', foundReferences, {
        projectId: proj.id,
        projectName: proj.name || 'Untitled Project',
        componentId: proj.id,
        componentName: proj.name || 'Component',
        componentType: proj.componentId || 'unknown'
      });
    }
  };

  // If an active project is supplied, process it first
  if (options.activeProject?.id) {
    processedProjectIds.add(options.activeProject.id);
    scanProject(options.activeProject);
  }

  // Scan all saved projects
  for (const proj of allProjects) {
    if (processedProjectIds.has(proj.id)) continue;
    scanProject(proj);
  }

  return {
    mediaId,
    totalUses: foundReferences.length,
    isInUse: foundReferences.length > 0,
    references: foundReferences
  };
}

/**
 * Returns a usage count map for all known media IDs across all saved projects.
 * @param {Object} [options]
 * @returns {Map<string, MediaUsageReport>}
 */
export function getAllMediaUsageMap(options = {}) {
  const allProjects = typeof loadProjects === 'function' ? loadProjects() : [];
  const usageMap = new Map();

  const scanComp = (proj, comp) => {
    const configStr = JSON.stringify(comp?.config || {});
    const idMatches = configStr.match(/"(?:mediaId|assetId)"\s*:\s*"([^"]+)"/g) || [];
    for (const match of idMatches) {
      const parts = match.match(/"(?:mediaId|assetId)"\s*:\s*"([^"]+)"/);
      const mediaId = parts?.[1];
      if (mediaId) {
        if (!usageMap.has(mediaId)) {
          usageMap.set(mediaId, getMediaAssetUsage(mediaId, options));
        }
      }
    }
  };

  if (options.activeProject) {
    if (options.activeProject.components) {
      Object.values(options.activeProject.components).forEach(comp => scanComp(options.activeProject, comp));
    } else if (options.activeProject.config) {
      scanComp(options.activeProject, { config: options.activeProject.config });
    }
  }

  for (const proj of allProjects) {
    if (options.activeProject?.id === proj.id) continue;
    if (proj.components) {
      Object.values(proj.components).forEach(comp => scanComp(proj, comp));
    } else if (proj.config) {
      scanComp(proj, { config: proj.config });
    }
  }

  return usageMap;
}

/**
 * Replaces all references to an old media ID with a new media reference across a project or all projects.
 * @param {string} oldMediaId
 * @param {Object} newReference
 * @param {string} [targetProjectId] - If supplied, only updates this project; otherwise updates all projects
 * @returns {number} Count of replaced references
 */
export function replaceMediaAssetReferences(oldMediaId, newReference, targetProjectId = null) {
  if (!oldMediaId || !newReference) return 0;

  const projectsToUpdate = targetProjectId
    ? [getProject(targetProjectId)].filter(Boolean)
    : (typeof loadProjects === 'function' ? loadProjects() : []);

  let replacementCount = 0;

  function replaceInObject(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (isMediaReference(obj) || (obj.mediaId && obj.mediaId === oldMediaId) || (obj.assetId && obj.assetId === oldMediaId)) {
      if (obj.mediaId === oldMediaId || obj.assetId === oldMediaId) {
        obj.mediaId = newReference.mediaId || newReference.assetId;
        obj.assetId = newReference.mediaId || newReference.assetId;
        obj.name = newReference.name || obj.name;
        obj.fileName = newReference.name || obj.name;
        obj.mimeType = newReference.mimeType || obj.mimeType;
        obj.size = newReference.size ?? obj.size;
        obj.kind = newReference.kind || obj.kind;
        obj.mediaType = newReference.kind || obj.kind;
        if (typeof obj.src === 'object') {
          obj.src = { ...newReference };
        }
        replacementCount++;
      }
      return;
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (obj[i] === oldMediaId) {
          obj[i] = newReference.mediaId;
          replacementCount++;
        } else if (typeof obj[i] === 'object') {
          replaceInObject(obj[i]);
        }
      }
    } else {
      for (const key of Object.keys(obj)) {
        if (obj[key] === oldMediaId) {
          obj[key] = newReference.mediaId;
          replacementCount++;
        } else if (typeof obj[key] === 'object') {
          replaceInObject(obj[key]);
        }
      }
    }
  }

  for (const proj of projectsToUpdate) {
    let changed = false;
    if (proj.components && typeof proj.components === 'object') {
      for (const comp of Object.values(proj.components)) {
        if (!comp) continue;
        const before = JSON.stringify(comp.config);
        replaceInObject(comp.config);
        if (JSON.stringify(comp.config) !== before) {
          changed = true;
        }
      }
    } else if (proj.config) {
      const before = JSON.stringify(proj.config);
      replaceInObject(proj.config);
      if (JSON.stringify(proj.config) !== before) {
        changed = true;
      }
    }
    if (changed) {
      saveProject(proj);
    }
  }

  return replacementCount;
}
