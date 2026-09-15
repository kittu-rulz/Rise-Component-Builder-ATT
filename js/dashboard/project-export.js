/**
 * Course Project Multi-Component Structured ZIP Exporter
 * Bundles all course sections, component HTML packages, manifest, and assets into an organized ZIP.
 */

import { getProject } from '../storage.js';
import { createZip } from '../zip.js';
import { COMPONENT_REGISTRY } from '../component-registry.js';
import { generateIframeContent as compilePreview } from '../preview.js';
import { toRgba as colorToRgba } from '../utilities.js';

const componentRegistry = Object.fromEntries(
  COMPONENT_REGISTRY.map(entry => [entry.id, { ...entry.renderer, validate: entry.validate, version: entry.version }])
);

function sanitizeSlug(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function padZero(num) {
  return String(num).padStart(2, '0');
}

/**
 * Builds structured ZIP archive entries for an entire Schema v3 course project.
 * @param {string} projectId
 * @returns {Promise<Blob>}
 */
export async function buildCourseProjectZip(projectId) {
  const project = getProject(projectId);
  if (!project) throw new Error('Project not found.');

  const entries = [];

  const manifest = {
    courseName: project.name,
    client: project.clientLabel || 'AT&T',
    exportedAt: new Date().toISOString(),
    schemaVersion: project.schemaVersion,
    totalSections: (project.sectionOrder || []).length,
    totalComponents: Object.keys(project.components || {}).length,
    sections: []
  };

  let sectionIdx = 1;

  // Process sections in order
  for (const secId of project.sectionOrder || []) {
    const sec = project.sections?.[secId];
    if (!sec) continue;

    const secFolder = `${padZero(sectionIdx)}-${sanitizeSlug(sec.name)}`;
    const secManifest = {
      sectionId: sec.id,
      sectionName: sec.name,
      folder: secFolder,
      components: []
    };

    let compIdx = 1;
    for (const compId of sec.componentOrder || []) {
      const comp = project.components?.[compId];
      if (!comp) continue;

      const compFolder = `${secFolder}/${padZero(compIdx)}-${sanitizeSlug(comp.name)}`;
      const compDef = COMPONENT_REGISTRY.find(r => r.id === comp.type);
      const renderState = {
        selectedComponent: compDef,
        config: comp.config,
        activeTheme: project.theme,
        componentOverrides: comp.styleOverrides || project.componentOverrides,
        settings: project.settings,
        uiTheme: project.uiTheme
      };
      const compHtml = compilePreview(renderState, componentRegistry, colorToRgba);

      entries.push({
        path: `${compFolder}/index.html`,
        data: compHtml
      });

      secManifest.components.push({
        componentId: comp.id,
        name: comp.name,
        type: comp.type,
        path: `${compFolder}/index.html`
      });

      compIdx++;
    }

    manifest.sections.push(secManifest);
    sectionIdx++;
  }

  // Process unsectioned components
  if (project.unsectionedComponentOrder && project.unsectionedComponentOrder.length > 0) {
    const unsectionedFolder = 'unsectioned-components';
    const unsecManifest = {
      sectionId: 'unsectioned',
      sectionName: 'Unsectioned Components',
      folder: unsectionedFolder,
      components: []
    };

    let compIdx = 1;
    for (const compId of project.unsectionedComponentOrder) {
      const comp = project.components?.[compId];
      if (!comp) continue;

      const compFolder = `${unsectionedFolder}/${padZero(compIdx)}-${sanitizeSlug(comp.name)}`;
      const compDef = COMPONENT_REGISTRY.find(r => r.id === comp.type);
      const renderState = {
        selectedComponent: compDef,
        config: comp.config,
        activeTheme: project.theme,
        componentOverrides: comp.styleOverrides || project.componentOverrides,
        settings: project.settings,
        uiTheme: project.uiTheme
      };
      const compHtml = compilePreview(renderState, componentRegistry, colorToRgba);

      entries.push({
        path: `${compFolder}/index.html`,
        data: compHtml
      });

      unsecManifest.components.push({
        componentId: comp.id,
        name: comp.name,
        type: comp.type,
        path: `${compFolder}/index.html`
      });

      compIdx++;
    }

    manifest.sections.push(unsecManifest);
  }

  // Add manifest.json
  entries.push({
    path: 'manifest.json',
    data: JSON.stringify(manifest, null, 2)
  });

  // Add project backup json
  entries.push({
    path: 'project-backup.json',
    data: JSON.stringify(project, null, 2)
  });

  // Add course README.md with Rise 360 embedding instructions
  const readmeContent = `# ${project.name}
Course Component Package — Prepared for ${project.clientLabel || 'AT&T'}

## Package Structure
This ZIP contains all interactive learning components for this course, organized by section and lesson sequence.

${manifest.sections.map(s => `### ${s.sectionName}
${s.components.map(c => `- **${c.name}** (\`${c.type}\`): \`${c.path}\``).join('\n')}
`).join('\n')}

## How to Embed in Articulate Rise 360:
1. In Rise 360, add a **Multimedia > Embed** block (or **Multimedia > Web** block).
2. Host the \`index.html\` file on your web server / cloud storage, or embed via iframe:
   \`<iframe src="path/to/index.html" width="100%" height="600" frameborder="0"></iframe>\`
3. Each component includes built-in responsive sizing and WCAG 2.2 AA accessibility support.
`;

  entries.push({
    path: 'README.md',
    data: readmeContent
  });

  return createZip(entries);
}

/**
 * Triggers browser download of the complete course project ZIP.
 * @param {string} projectId
 */
export async function downloadCourseProjectZip(projectId) {
  const project = getProject(projectId);
  const zipBlob = await buildCourseProjectZip(projectId);
  const filename = `${sanitizeSlug(project?.name || 'course')}-full-package.zip`;

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
