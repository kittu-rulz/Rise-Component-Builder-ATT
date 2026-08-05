import { expect, test } from '@playwright/test';
import { compileExportFixture } from '../fixtures/export-fixture-definitions.mjs';

// Behavioral coverage for the completion adapter (js/completion.js, docs/COMPLETION-INTEGRATION.md).
// Real cross-window postMessage behavior needs a real browser (jsdom's support is too
// limited — see tests/unit/completion.test.js for the compiled-output-level checks this
// file doesn't duplicate). A minimal host page embeds the compiled accordion export via
// a plain <iframe> (no builder app involved), exactly modeling "an exported component
// pasted into some host page" without assuming that host is Rise or Moodle.

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
  test('viewing every item fires exactly one completion message with the documented envelope', async ({ page }) => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    const frame = await embedInHost(page, html);
    const triggers = frame.locator('.accordion-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i += 1) await triggers.nth(i).click();

    await expect.poll(() => page.evaluate(() => window.__messages.length)).toBe(1);
    const message = await page.evaluate(() => window.__messages[0]);
    expect(message).toMatchObject({
      channel: 'rise-component-builder', schemaVersion: 1, type: 'completion',
      componentId: 'accordion', componentVersion: '1.0.0', status: 'completed'
    });
    expect(typeof message.instanceId).toBe('string');
    expect(typeof message.timestamp).toBe('string');
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

test.describe('resetting', () => {
  test('a valid reset message clears progress and re-arms completion for a second cycle', async ({ page }) => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    const frame = await embedInHost(page, html);
    const triggers = frame.locator('.accordion-trigger');
    const count = await triggers.count();
    for (let i = 0; i < count; i += 1) await triggers.nth(i).click();
    await expect.poll(() => page.evaluate(() => window.__messages.length)).toBe(1);

    await page.evaluate(() => {
      document.getElementById('frame').contentWindow.postMessage(
        { channel: 'rise-component-builder', schemaVersion: 1, type: 'reset' }, '*'
      );
    });
    await expect(frame.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '0');

    // reset() clears tracked progress only — it does not close the accordion's own
    // already-open items (a deliberate separation: reset is a completion-tracking
    // concern, not a UI-state concern). All items are still open from the first pass,
    // so re-viewing them means collapse-then-reopen each one to generate a fresh
    // "expand" interaction the accordion actually counts as a view.
    for (let i = 0; i < count; i += 1) { await triggers.nth(i).click(); await triggers.nth(i).click(); }
    await expect.poll(() => page.evaluate(() => window.__messages.length)).toBe(2);
    const second = await page.evaluate(() => window.__messages[1]);
    expect(second.type).toBe('completion');
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

test.describe('malformed parent messages', () => {
  test('unrecognized or malformed inbound messages are ignored, never causing a reset or a crash', async ({ page }) => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    const errors = collectErrors(page);
    const frame = await embedInHost(page, html);
    const triggers = frame.locator('.accordion-trigger');
    await triggers.first().click();
    await triggers.nth(1).click();

    const bogusMessages = [
      null, 'a plain string', 42, { type: 'reset' }, // missing channel/schemaVersion
      { channel: 'some-other-channel', schemaVersion: 1, type: 'reset' },
      { channel: 'rise-component-builder', schemaVersion: 999, type: 'reset' },
      { channel: 'rise-component-builder', schemaVersion: 1, type: 'not-a-real-type' }
    ];
    for (const payload of bogusMessages) {
      await page.evaluate(data => {
        document.getElementById('frame').contentWindow.postMessage(data, '*');
      }, payload);
    }
    await page.waitForTimeout(200);

    // Progress must be unaffected (2 of 3 items still viewed — not reset to 0).
    const bar = frame.locator('[role="progressbar"]');
    expect(await bar.getAttribute('aria-valuenow')).not.toBe('0');
    expect(errors).toEqual([]);
  });

  test('a configured expected origin rejects messages from a different origin', async ({ page }) => {
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

    // And a same-origin (i.e. real, mismatched-vs-configured) reset attempt is also
    // rejected by the adapter's own inbound origin check — progress stays at 100.
    await page.evaluate(() => {
      document.getElementById('frame').contentWindow.postMessage(
        { channel: 'rise-component-builder', schemaVersion: 1, type: 'reset' }, '*'
      );
    });
    await page.waitForTimeout(200);
    await expect(frame.locator('[id$="-completion-text"]')).toHaveText('100%');
  });
});
