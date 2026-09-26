import { expect, test } from '@playwright/test';

// The three-dots menus in the course outline must open under their own button (not in a page
// corner) and every item in them must still do its job.

async function openCourse(page) {
  await page.goto('/?dashboard');
  await page.evaluate(async () => {
    const { buildProjectSchemaV3, createComponentInstance, createSection } = await import('/js/project-schema.js');
    const { saveProject } = await import('/js/storage.js');
    const cfg = { blockTitle: 'M', blockHeadline: 'Overview', items: [{ title: 'One', content: 'Body' }], colorPrimary: '#00388F', colorAccent: '#009FDB', colorBg: '#FFFFFF', colorText: '#200F3B', borderRadius: '8', shadowDepth: 'none', iconStyle: 'chevron' };
    saveProject(buildProjectSchemaV3({
      name: 'Menu Course', sectionOrder: ['s1', 's2'],
      sections: {
        s1: createSection({ id: 's1', name: 'Module One', componentOrder: ['c1'] }),
        s2: createSection({ id: 's2', name: 'Module Two', componentOrder: ['c2'] })
      },
      components: {
        c1: createComponentInstance({ id: 'c1', name: 'Lesson One', type: 'accordion', config: cfg }),
        c2: createComponentInstance({ id: 'c2', name: 'Lesson Two', type: 'accordion', config: cfg })
      }
    }));
  });
  await page.reload();
  await page.locator('.project-card').filter({ hasText: 'Menu Course' }).locator('[data-action="open"]').first().click();
  await expect(page.locator('#project-overview-workspace')).toBeVisible();
}

const project = page => page.evaluate(async () => {
  const { loadProjects } = await import('/js/storage.js');
  return loadProjects().find(p => p.name === 'Menu Course');
});

async function expectMenuUnderButton(page, button, menu) {
  const b = await button.boundingBox();
  const m = await menu.boundingBox();
  expect(Math.abs((m.x + m.width) - (b.x + b.width))).toBeLessThan(3);
  expect(m.y).toBeGreaterThanOrEqual(b.y + b.height);
  expect(m.y - (b.y + b.height)).toBeLessThan(12);
}

test('a component menu opens under its own button and its items work', async ({ page }) => {
  await openCourse(page);
  const row = page.locator('.component-row').filter({ hasText: 'Lesson One' });
  const button = row.locator('[data-action="comp-menu"]');
  await button.click();
  const menu = row.locator('.project-action-menu');
  await expect(menu).toBeVisible();
  await expectMenuUnderButton(page, button, menu);

  await menu.getByText('Rename', { exact: true }).click();
  await page.locator('#att-modal-prompt-input').fill('Renamed Lesson');
  await page.locator('#att-modal-submit-btn').click();
  await expect(page.locator('.component-row').filter({ hasText: 'Renamed Lesson' })).toBeVisible();

  const renamed = page.locator('.component-row[data-comp-id="c1"]');
  await renamed.locator('[data-action="comp-menu"]').click();
  await renamed.locator('.project-action-menu').getByText('Duplicate', { exact: true }).click();
  await expect.poll(async () => Object.keys((await project(page)).components).length).toBe(3);

  await renamed.locator('[data-action="comp-menu"]').click();
  await renamed.locator('.project-action-menu').getByText('Delete', { exact: true }).click();
  await page.locator('#att-modal-confirm-btn').click();
  await expect.poll(async () => Object.values((await project(page)).components).some(c => c.name === 'Renamed Lesson')).toBe(false);
});

test('a section menu opens under its own button and its items work', async ({ page }) => {
  await openCourse(page);
  const card = page.locator('.section-card').filter({ hasText: 'Module One' });
  const button = card.locator('[data-action="section-menu"]');
  await button.click();
  const menu = card.locator('.project-action-menu');
  await expect(menu).toBeVisible();
  await expectMenuUnderButton(page, button, menu);

  await menu.getByText('Move Down', { exact: true }).click();
  await expect.poll(async () => (await project(page)).sectionOrder).toEqual(['s2', 's1']);

  await card.locator('[data-action="section-menu"]').click();
  await card.locator('.project-action-menu').getByText('Rename Section', { exact: true }).click();
  await page.locator('#att-modal-prompt-input').fill('Module Uno');
  await page.locator('#att-modal-submit-btn').click();
  await expect.poll(async () => (await project(page)).sections.s1.name).toBe('Module Uno');

  const uno = page.locator('.section-card').filter({ has: page.locator('[data-action="section-menu"][data-sec-id="s1"]') });
  await uno.locator('[data-action="section-menu"]').click();
  await uno.locator('.project-action-menu').getByText('Duplicate Section', { exact: true }).click();
  await expect.poll(async () => (await project(page)).sectionOrder.length).toBe(3);

  await uno.locator('[data-action="section-menu"]').click();
  await uno.locator('.project-action-menu').getByText('Delete Section', { exact: true }).click();
  await page.locator('#att-modal-confirm-btn').click();
  await expect.poll(async () => (await project(page)).sectionOrder.includes('s1')).toBe(false);
});

test('typing in the outline search keeps focus and the caret in the field', async ({ page }) => {
  await openCourse(page);
  const search = page.locator('#cs-search-input');
  await search.click();
  await page.keyboard.type('Lesson');
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('Lesson');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('X');
  await expect(search).toHaveValue('LessXon');
  await expect(search).toBeFocused();
});

test('typing in the dashboard project search keeps focus in the field', async ({ page }) => {
  await openCourse(page);
  await page.goto('/?dashboard');
  const search = page.locator('#dash-search-input');
  await search.click();
  await page.keyboard.type('Menu');
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('Menu');
});
