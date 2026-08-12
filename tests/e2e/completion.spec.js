import { expect, test } from '@playwright/test';
import { compileExportFixture } from '../fixtures/export-fixture-definitions.mjs';

// Behavioral coverage for the completion adapter (js/completion.js, docs/COMPLETION-INTEGRATION.md).
// Real cross-window postMessage behavior needs a real browser (jsdom's support is too
// limited — see tests/unit/completion.test.js for the compiled-output-level checks this
// file doesn't duplicate). A minimal host page embeds the compiled accordion export via
// a plain <iframe> (no builder app involved), exactly modeling "an exported component
// pasted into some host page" without assuming that host is Rise or Moodle.
//
// The outbound message is exactly Rise's own documented "Vibe Coding" completion contract:
// window.parent.postMessage({ type: 'complete' }, '*') — no envelope, no reset protocol.

const HOST_HTML = `<!doctype html>
<html>
<body>
  <script>window.__messages = [];</script>
  <iframe id="frame" title="exported component"></iframe>
  <script>
    window.addEventListener('message', function(event) { window.__messages.push(event.data); });
  </script>
</body>
</html>`;

async function embedInHost(page, componentHtml, { stripPostMessage = false } = {}) {
  await page.setContent(HOST_HTML);
  if (stripPostMessage) {
    await page.evaluate(() => {
      Object.defineProperty(window, 'postMessage', { value: undefined, configurable: true });
    });
  }
  await page.evaluate(html => { document.getElementById('frame').srcdoc = html; }, componentHtml);
  const frame = page.frameLocator('#frame');
  await frame.locator('.block-headline').waitFor();
  return frame;
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test.describe('viewing all required accordion items', () => {
  test('viewing every item fires exactly one completion message matching Rise\'s documented contract', async ({ page }) => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    const frame = await embedInHost(page, html);
    const triggers = frame.locator('.accordion-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i += 1) await triggers.nth(i).click();

    await expect.poll(() => page.evaluate(() => window.__messages.length)).toBe(1);
    const message = await page.evaluate(() => window.__messages[0]);
    expect(message).toEqual({ type: 'complete' });
  });
});

test.describe('completion success message', () => {
  test('the configured completion message becomes visible on screen once every item is viewed', async ({ page }) => {
    const html = compileExportFixture('accordion', {
      configOverrides: { trackCompletion: true, completionMsg: 'Nice work, all done!' }
    });
    const frame = await embedInHost(page, html);
    const messageLocator = frame.locator('[id$="-completion-message"]');
    await expect(messageLocator).toBeHidden();

    const triggers = frame.locator('.accordion-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i += 1) await triggers.nth(i).click();

    await expect(messageLocator).toBeVisible();
    await expect(messageLocator).toHaveText('Nice work, all done!');
  });
});

test.describe('revisiting an item', () => {
  test('opening the same item repeatedly does not fire completion early', async ({ page }) => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    const frame = await embedInHost(page, html);
    const first = frame.locator('.accordion-trigger').first();
    for (let i = 0; i < 5; i += 1) { await first.click(); await first.click(); }

    await expect(page.evaluate(() => window.__messages.length)).resolves.toBe(0);
    const bar = frame.locator('[role="progressbar"]');
    const value = Number(await bar.getAttribute('aria-valuenow'));
    expect(value).toBeLessThan(100); // only 1 of 3 distinct items viewed, however many times
  });
});

test.describe('multiple-open behaviour', () => {
  test('completion still requires every item viewed when multi-open is disabled (single-open accordion)', async ({ page }) => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true, accordionMulti: false } });
    const frame = await embedInHost(page, html);
    const triggers = frame.locator('.accordion-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count - 1; i += 1) await triggers.nth(i).click();
    await expect(page.evaluate(() => window.__messages.length)).resolves.toBe(0);

    await triggers.nth(count - 1).click();
    await expect.poll(() => page.evaluate(() => window.__messages.length)).toBe(1);
  });
});

test.describe('completion firing once', () => {
  test('further interaction after completion does not send a second completion message', async ({ page }) => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    const frame = await embedInHost(page, html);
    const triggers = frame.locator('.accordion-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i += 1) await triggers.nth(i).click();
    await expect.poll(() => page.evaluate(() => window.__messages.length)).toBe(1);

    for (let i = 0; i < count; i += 1) { await triggers.nth(i).click(); await triggers.nth(i).click(); }
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__messages.length)).toBe(1);
  });
});

test.describe('required versus optional completion', () => {
  test('optional (trackCompletion off) ships no progress bar and never sends anything', async ({ page }) => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: false } });
    const errors = collectErrors(page);
    const frame = await embedInHost(page, html);
    await expect(frame.locator('[role="progressbar"]')).toHaveCount(0);

    const triggers = frame.locator('.accordion-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i += 1) await triggers.nth(i).click();
    await page.waitForTimeout(200);

    expect(await page.evaluate(() => window.__messages.length)).toBe(0);
    expect(errors).toEqual([]);
  });
});

test.describe('standalone mode', () => {
  test('opened directly (not embedded), internal completion still works and nothing throws', async ({ page }) => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    const errors = collectErrors(page);
    await page.setContent(html);
    const triggers = page.locator('.accordion-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i += 1) await triggers.nth(i).click();

    await expect(page.locator('[id$="-completion-text"]')).toHaveText('100%');
    expect(errors).toEqual([]);
  });
});

test.describe('unsupported parent integration', () => {
  test('embedded with postMessage unavailable: internal completion still reaches 100%, nothing throws, nothing is sent', async ({ page }) => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    const errors = collectErrors(page);
    const frame = await embedInHost(page, html, { stripPostMessage: true });
    const triggers = frame.locator('.accordion-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i += 1) await triggers.nth(i).click();

    await expect(frame.locator('[id$="-completion-text"]')).toHaveText('100%');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__messages.length)).toBe(0);
    expect(errors).toEqual([]);
  });
});

test.describe('configured target origin', () => {
  test('a configured completionParentOrigin that does not match the real host origin means the message never arrives', async ({ page }) => {
    const html = compileExportFixture('accordion', {
      configOverrides: { trackCompletion: true },
      settings: { completionParentOrigin: 'https://example.com' }
    });
    const frame = await embedInHost(page, html);
    const triggers = frame.locator('.accordion-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i += 1) await triggers.nth(i).click();

    // Internal completion still happens (it's a local computation, not gated by origin)...
    await expect(frame.locator('[id$="-completion-text"]')).toHaveText('100%');
    // ...but the outbound message never reaches the host, because the real test origin
    // does not match the configured https://example.com target origin — the browser's
    // own postMessage delivery rules silently drop mismatched targetOrigin messages.
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__messages.length)).toBe(0);
  });
});
