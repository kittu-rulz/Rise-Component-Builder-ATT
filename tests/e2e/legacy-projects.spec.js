import { expect, test } from '@playwright/test';

// A project saved before Schema v3 (single component, no `components` map) must open from
// the dashboard with its content, not as an empty course. js/storage.js#loadProjects
// upgrades it on read (js/project-migration.js) and keeps a one-time backup of the original.

const legacy = {
  id: 'p-legacy', schemaVersion: 1, name: 'My Old Project', componentId: 'accordion',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
  config: {
    blockTitle: 'T', blockHeadline: 'H', blockDesc: 'D', colorPrimary: '#00388F', colorAccent: '#009FDB',
    colorBg: '#FFFFFF', colorText: '#000000', borderRadius: '12', shadowDepth: 'soft', iconStyle: 'chevron',
    completionMsg: 'Done', borderOutline: true, accordionMulti: true, accordionAnimation: true, trackCompletion: false,
    items: [{ title: 'Legacy item', content: 'Legacy body' }]
  }
};

test('a pre-v3 project opens from the dashboard with its component, and the original is backed up', async ({ page }) => {
  await page.addInitScript(project => {
    if (!localStorage.getItem('rise-builder-projects-v1')) {
      localStorage.setItem('rise-builder-projects-v1', JSON.stringify([project]));
    }
  }, legacy);
  await page.goto('/?dashboard');

  const card = page.locator('.project-card').filter({ hasText: 'My Old Project' });
  await expect(card).toHaveCount(1);
  await expect(card.locator('.project-version-badge')).toHaveCount(1);
  await card.locator('[data-action="open"]').first().click();

  const overview = page.locator('#project-overview-workspace');
  await expect(overview).toBeVisible();
  await expect(overview).not.toContainText('Course is empty');
  await expect(overview).toContainText(/\b1\s+component/);

  const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('rise-builder-projects-backup-v2')));
  expect(backup).toHaveLength(1);
  expect(backup[0].config.items[0].title).toBe('Legacy item');
});
