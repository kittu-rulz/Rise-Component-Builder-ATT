import { expect, test } from '@playwright/test';

// Keyboard operation and focus management of the injected Post-Publish learner runtime
// (launcher, drawer, search, tabs, close). Loaded via the same generated HTML the wizard's demo
// simulator uses, with a config that has real (non-sample) content so nothing here depends on
// the shipped examples.

const config = {
  glossary: { title: 'Glossary', description: 'Terms', entries: [
    { id: 'g1', term: 'Handover', definition: '<p>Passing a call between cells.</p>', abbreviation: '', aliases: '', category: 'Radio', resourceUrl: '', resourceLabel: '' },
    { id: 'g2', term: 'Latency', definition: '<p>Delay in transit.</p>', abbreviation: '', aliases: '', category: 'Core', resourceUrl: '', resourceLabel: '' }
  ] },
  resources: { title: 'Resources', description: 'Files', items: [
    { id: 'r1', title: 'Field checklist', description: '', type: 'document', sourceType: 'url', url: 'https://learn.acme-telecom.net/checklist.pdf', fileRef: null, category: 'Guides', featured: false, actionLabel: 'Open', openBehavior: 'new-tab' }
  ] },
  help: { title: 'Help & Support', intro: '<p>Contact us.</p>', supportEmail: 'learning@acme-telecom.net', supportPhone: '', supportPortalUrl: '', supportPortalLabel: '', supportHours: '', responseTime: '', department: '', faqItems: [
    { id: 'f1', question: 'Where is my certificate?', answer: '<p>In the LMS.</p>' }
  ] }
};

async function openRuntimePage(page) {
  await page.goto('/?catalog');
  const html = await page.evaluate(async cfg => {
    const { createDefaultPostPublishConfig, normalizePostPublishConfig } = await import('/js/post-publish/schema.js');
    const { generateSimulatorPreviewHTML } = await import('/js/post-publish/preview.js');
    const base = createDefaultPostPublishConfig();
    const merged = normalizePostPublishConfig({ ...base, glossary: cfg.glossary, resources: cfg.resources, help: cfg.help });
    return generateSimulatorPreviewHTML(merged);
  }, config);
  await page.setContent(html);
  await expect(page.locator('#rcb-ppt-launcher')).toBeVisible();
}

const active = page => page.evaluate(() => {
  const el = document.activeElement;
  return { id: el?.id || '', cls: el?.className || '', inDrawer: Boolean(el?.closest?.('#rcb-ppt-drawer')), tag: el?.tagName || '' };
});

// On open the runtime moves focus to its first control after ~100ms; wait for that to settle
// before interacting, or the late focus call races the test's own focus/keys.
async function openDrawer(page) {
  await page.locator('#rcb-ppt-launcher').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#rcb-ppt-launcher')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.rcb-ppt-close-btn')).toBeFocused();
}

async function tabTo(page, predicate, max = 12) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (predicate(await active(page))) return true;
  }
  return false;
}

test.describe('Post-Publish learner runtime: keyboard and focus', () => {
  test('the launcher is reachable by keyboard and a closed drawer is never in the tab order', async ({ page }) => {
    await openRuntimePage(page);
    expect(await tabTo(page, a => a.id === 'rcb-ppt-launcher')).toBe(true);
    // Keep tabbing past the launcher: focus must never land inside the closed drawer.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect((await active(page)).inDrawer, `Tab #${i + 1} after the launcher landed inside the closed drawer`).toBe(false);
    }
  });

  test('Enter opens the drawer, moves focus inside, and exposes state to assistive tech', async ({ page }) => {
    await openRuntimePage(page);
    await openDrawer(page);
    await expect.poll(async () => (await active(page)).inDrawer).toBe(true);
    const drawer = page.locator('#rcb-ppt-drawer');
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(await drawer.getAttribute('aria-label')).toBeTruthy();
  });

  test('focus is trapped inside the open drawer in both directions', async ({ page }) => {
    await openRuntimePage(page);
    await openDrawer(page);
    await expect.poll(async () => (await active(page)).inDrawer).toBe(true);
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      expect((await active(page)).inDrawer, `forward Tab #${i + 1} escaped the drawer`).toBe(true);
    }
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Shift+Tab');
      expect((await active(page)).inDrawer, `Shift+Tab #${i + 1} escaped the drawer`).toBe(true);
    }
  });

  test('tabs follow the tab pattern: arrow keys and Home/End move selection, one tab stop, panel is labelled', async ({ page }) => {
    await openRuntimePage(page);
    await openDrawer(page);
    const tabs = page.locator('#rcb-ppt-drawer [role="tab"]');
    await expect(tabs).toHaveCount(3);

    await tabs.first().focus();
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight'); // wraps
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft'); // wraps back
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');

    // Roving tabindex: only the selected tab is a tab stop.
    const stops = await tabs.evaluateAll(els => els.map(el => el.tabIndex));
    expect(stops.filter(i => i >= 0)).toHaveLength(1);

    // The panel is a tabpanel labelled by the selected tab.
    const panel = page.locator('#rcb-ppt-body');
    await expect(panel).toHaveAttribute('role', 'tabpanel');
    const labelledBy = await panel.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    await expect(page.locator(`#${labelledBy}`)).toHaveAttribute('aria-selected', 'true');
  });

  test('search filters results and announces the count through a live region', async ({ page }) => {
    await openRuntimePage(page);
    await openDrawer(page);
    const search = page.locator('#rcb-ppt-gloss-search');
    await expect(search).toBeVisible();
    await search.focus();
    await page.keyboard.type('Late');
    const status = page.locator('#rcb-ppt-drawer [role="status"]').first();
    await expect(page.locator('#rcb-ppt-drawer').getByText('Latency', { exact: false }).first()).toBeVisible();
    await expect(page.locator('#rcb-ppt-drawer').getByText('Handover')).toHaveCount(0);
    await expect(status).toContainText(/1/);
    // Typing kept focus in the search box (a re-render must not steal it).
    expect((await active(page)).id).toBe('rcb-ppt-gloss-search');
  });

  test('Escape closes the drawer and returns focus to the launcher', async ({ page }) => {
    await openRuntimePage(page);
    await openDrawer(page);
    await expect.poll(async () => (await active(page)).inDrawer).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#rcb-ppt-launcher')).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(async () => (await active(page)).id).toBe('rcb-ppt-launcher');
  });

  test('the close button closes the drawer with the keyboard and returns focus to the launcher', async ({ page }) => {
    await openRuntimePage(page);
    await openDrawer(page);
    await expect.poll(async () => (await active(page)).inDrawer).toBe(true);
    await page.locator('.rcb-ppt-close-btn').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#rcb-ppt-launcher')).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(async () => (await active(page)).id).toBe('rcb-ppt-launcher');
    // And the closed drawer is out of the tab order again.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect((await active(page)).inDrawer).toBe(false);
    }
  });

  test('FAQ items expose their expanded state and toggle from the keyboard', async ({ page }) => {
    await openRuntimePage(page);
    await openDrawer(page);
    await page.locator('#rcb-ppt-drawer [data-tab="help"]').click();
    const trigger = page.locator('.rcb-ppt-faq-trigger').first();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
