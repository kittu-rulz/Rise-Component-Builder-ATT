/**
 * Golden 26-Component Audit Course Fixture
 * Contains every registered component configured with valid AT&T sample content,
 * block labels, headlines, instructions, valid item titles, feedback, and completion settings.
 */

import { COMPONENT_REGISTRY } from '../../js/component-registry.js';

export function createGoldenAuditCourse() {
  const components = {};
  const sections = [
    { id: 'sec-core', name: 'Core Interactions', componentIds: [] },
    { id: 'sec-knowledge', name: 'Knowledge Checks', componentIds: [] },
    { id: 'sec-media', name: 'Media & Layouts', componentIds: [] },
    { id: 'sec-advanced', name: 'Advanced Flows', componentIds: [] }
  ];

  COMPONENT_REGISTRY.forEach(compDef => {
    const compId = `golden-comp-${compDef.id}`;
    const baseConfig = structuredClone(compDef.defaultContent || {});
    
    // Ensure standard block header fields
    baseConfig.blockTitle = `AT&T ${compDef.name.toUpperCase()}`;
    baseConfig.title = baseConfig.title || baseConfig.blockTitle;
    baseConfig.blockHeadline = `${compDef.name} Demonstration`;
    baseConfig.blockDesc = `Interactive learning module demonstrating the ${compDef.name} component.`;
    baseConfig.trackCompletion = true;
    baseConfig.completionMsg = `${compDef.name} completed successfully.`;

    // Ensure valid items if items array exists
    if (Array.isArray(baseConfig.items)) {
      baseConfig.items = baseConfig.items.map((item, itemIdx) => {
        const itemCopy = { ...item };
        if (!itemCopy.title && !itemCopy.label && !itemCopy.text && !itemCopy.question) {
          itemCopy.title = `Section ${itemIdx + 1}: Key Concept`;
        }
        if (!itemCopy.description && !itemCopy.content && !itemCopy.answer) {
          itemCopy.content = `Detailed instructional content for item ${itemIdx + 1}.`;
        }
        return itemCopy;
      });
      if (baseConfig.items.length === 0) {
        baseConfig.items = [
          { title: 'Item 1: Overview', content: 'Comprehensive overview content.' },
          { title: 'Item 2: Details', content: 'Detailed instructional explanation.' }
        ];
      }
    }

    // Assign to section
    let sectionIdx = 0;
    if (compDef.categoryId === 'knowledge') sectionIdx = 1;
    else if (['media', 'cards'].includes(compDef.categoryId)) sectionIdx = 2;
    else if (['process', 'advanced', 'timelines'].includes(compDef.categoryId)) sectionIdx = 3;

    sections[sectionIdx].componentIds.push(compId);

    components[compId] = {
      id: compId,
      name: `Golden ${compDef.name}`,
      type: compDef.id,
      status: 'Ready',
      config: baseConfig,
      styleOverrides: {}
    };
  });

  return {
    id: 'golden-26-audit-course',
    schemaVersion: 3,
    name: 'AT&T Golden 26-Component Audit Course',
    description: 'Comprehensive 26-component verification suite for AT&T Rise Component Builder.',
    structure: {
      sections
    },
    components,
    settings: {
      defaultFont: 'Aleck Sans',
      exportFormat: 'web'
    },
    uiTheme: 'light',
    createdAt: '2026-09-15T12:00:00.000Z',
    updatedAt: '2026-09-15T12:00:00.000Z'
  };
}
