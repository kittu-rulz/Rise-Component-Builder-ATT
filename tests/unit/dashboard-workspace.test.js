// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardView } from '../../js/dashboard/dashboard-view.js';
import { ProjectOverviewView } from '../../js/dashboard/project-overview.js';
import { ProjectQaView } from '../../js/dashboard/project-qa.js';
import { buildCourseProjectZip } from '../../js/dashboard/project-export.js';
import {
  buildProjectSchemaV3, createComponentInstance, createSection
} from '../../js/project-schema.js';
import { saveProject } from '../../js/storage.js';
import { memoryLocalStorage } from '../fixtures/index.js';
import { readZip } from '../../js/zip.js';

describe('Project Dashboard & Workspace Controller Tests', () => {
  beforeEach(() => {
    globalThis.localStorage = memoryLocalStorage();
    document.body.innerHTML = '<div id="container"></div>';
  });

  test('DashboardView renders project cards, search, and template creation', () => {
    const p1 = buildProjectSchemaV3({ name: 'Alpha Course', favorite: true });
    const p2 = buildProjectSchemaV3({ name: 'Beta Course', favorite: false });
    saveProject(p1);
    saveProject(p2);

    const container = document.getElementById('container');
    let openedId = null;
    const view = new DashboardView({
      container,
      onOpenProject: (id) => { openedId = id; }
    });

    view.mount();

    expect(container.querySelectorAll('.project-card').length).toBe(2);
    expect(container.innerHTML).toContain('Alpha Course');
    expect(container.innerHTML).toContain('Beta Course');

    // Filter favorites
    view.state.filter = 'favorites';
    view.render();
    expect(container.querySelectorAll('.project-card').length).toBe(1);
    expect(container.innerHTML).toContain('Alpha Course');

    container.querySelector('.project-card').click();
    expect(openedId).toBe(p1.id);

    // Template project creation
    const newProject = view.createNewProjectFromTemplate({
      name: '5G Architecture',
      client: 'AT&T',
      desc: 'Intro to 5G',
      template: 'standard'
    });
    expect(newProject.sectionOrder.length).toBe(3);
    expect(Object.keys(newProject.components).length).toBe(3);

    view.unmount();
  });

  test('ProjectOverviewView manages sections, components, and reordering', () => {
    const sec1 = createSection({ id: 's1', name: 'Module 1', componentOrder: ['c1'] });
    const comp1 = createComponentInstance({ id: 'c1', name: 'Intro', type: 'accordion' });
    const project = buildProjectSchemaV3({
      name: 'Cybersecurity',
      sectionOrder: ['s1'],
      sections: { s1: sec1 },
      components: { c1: comp1 }
    });
    saveProject(project);

    const container = document.getElementById('container');
    let editedComp = null;
    const overview = new ProjectOverviewView({
      container,
      projectId: project.id,
      onEditComponent: (proj, comp) => { editedComp = comp; }
    });

    overview.mount();
    expect(container.innerHTML).toContain('Module 1');
    expect(container.innerHTML).toContain('Intro');

    // Trigger edit
    const editBtn = container.querySelector('[data-action="edit-comp"]');
    expect(editBtn).not.toBeNull();
    editBtn.click();
    expect(editedComp).not.toBeNull();
    expect(editedComp.id).toBe('c1');

    overview.unmount();
  });

  test('ProjectQaView audits components and catches empty or draft items', () => {
    const comp1 = createComponentInstance({
      id: 'c1',
      name: 'Untitled Component',
      type: 'accordion',
      config: { items: [] },
      status: 'draft'
    });
    const project = buildProjectSchemaV3({
      name: 'Audit Test',
      unsectionedComponentOrder: ['c1'],
      components: { c1: comp1 }
    });
    saveProject(project);

    const container = document.getElementById('container');
    const qaView = new ProjectQaView({
      container,
      projectId: project.id
    });

    const issues = qaView.auditProject(project);
    expect(issues.length).toBe(1);
    expect(issues[0].issues.some(i => i.level === 'error')).toBe(true); // zero items
    expect(issues[0].issues.some(i => i.level === 'warn')).toBe(true); // untitled name
  });

  test('buildCourseProjectZip generates structured folders, index.html for all components, manifest, and README', async () => {
    const sec1 = createSection({ id: 's1', name: 'Module 1 Intro', componentOrder: ['c1'] });
    const comp1 = createComponentInstance({
      id: 'c1',
      name: 'Lesson Accordion',
      type: 'accordion',
      config: {
        blockTitle: 'Welcome',
        blockHeadline: 'Overview',
        items: [{ title: 'Item 1', content: 'Content 1' }],
        colorPrimary: '#0057B8',
        colorAccent: '#00A8E0',
        colorBg: '#FFFFFF',
        colorText: '#000000',
        borderRadius: '8',
        shadowDepth: 'none',
        iconStyle: 'chevron'
      }
    });
    const project = buildProjectSchemaV3({
      name: 'Data Networks',
      clientLabel: 'AT&T',
      sectionOrder: ['s1'],
      sections: { s1: sec1 },
      components: { c1: comp1 }
    });
    saveProject(project);

    const zipBlob = await buildCourseProjectZip(project.id);
    expect(zipBlob).toBeDefined();

    const zipEntries = await readZip(zipBlob);
    const paths = zipEntries.map(e => e.path);

    expect(paths).toContain('manifest.json');
    expect(paths).toContain('README.md');
    expect(paths).toContain('project-backup.json');

    // Section 1 component index.html
    const compPath = paths.find(p => p.includes('01-module-1-intro') && p.endsWith('index.html'));
    expect(compPath).toBeDefined();

    const compEntry = zipEntries.find(e => e.path === compPath);
    const htmlText = new TextDecoder().decode(compEntry.data);
    expect(htmlText).toContain('<!DOCTYPE html>');
    expect(htmlText).toContain('Welcome');
  });
});
