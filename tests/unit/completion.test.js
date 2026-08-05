import { describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';

import { compileExportFixture } from '../fixtures/export-fixture-definitions.mjs';
import { COMPLETION_CHANNEL, COMPLETION_SCHEMA_VERSION } from '../../js/completion.js';

// Unit-level coverage for the completion adapter's *compiled output* — does the right
// code get shipped (or not shipped) for a given config, with the right values embedded.
// Real cross-window messaging behavior (standalone vs. embedded, malformed/mismatched
// origin messages, resetting, firing once) needs a real browser and is covered by
// tests/e2e/completion.spec.js instead — jsdom's postMessage/window.parent support is
// too limited to exercise that safely. See docs/COMPLETION-INTEGRATION.md.

describe('completion adapter: required vs. optional completion (compiled output)', () => {
  test('trackCompletion: true ships the completion adapter, scoped to this component', () => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    expect(html).toContain('var RiseComponentCompletion = (function()');
    expect(html).toContain(`CHANNEL = ${JSON.stringify(COMPLETION_CHANNEL)}`);
    expect(html).toContain(`SCHEMA_VERSION = ${COMPLETION_SCHEMA_VERSION}`);
    expect(html).toContain('componentId = "accordion"');
  });

  test('trackCompletion: false ships no completion adapter and no message listener at all', () => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: false } });
    // A bare "RiseComponentCompletion" substring can still appear as a defensive
    // typeof-guard inside the always-present progress script (js/export-shell.js) — the
    // real signal that the adapter itself was NOT emitted is the absence of its
    // declaration and message-channel machinery entirely.
    expect(html).not.toContain('var RiseComponentCompletion = (function()');
    expect(html).not.toContain("addEventListener('message'");
    // .progress-bar-container is also a (always-present) CSS rule name in the shared
    // stylesheet, so check for the actual progress-bar *element* instead, which
    // renderCompletionTrackerHTML() only emits when trackCompletion is true.
    expect(html).not.toContain('class="completion-tracker"');
  });
});

describe('completion adapter: component identity', () => {
  test('embeds the real registry version, not a hardcoded placeholder', () => {
    const html = compileExportFixture('flip-cards', { configOverrides: { trackCompletion: true } });
    expect(html).toContain('componentId = "flip-cards"');
    expect(html).toContain('componentVersion = "1.0.0"'); // js/component-registry.js#fromModule's current version for every entry
  });
});

describe('completion adapter: parent origin configuration', () => {
  test('defaults to null (accept/send to any origin) when no setting is configured', () => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    expect(html).toContain('allowedOrigin = null');
  });

  test('embeds a configured completionParentOrigin verbatim', () => {
    const html = compileExportFixture('accordion', {
      configOverrides: { trackCompletion: true },
      settings: { completionParentOrigin: 'https://example.com' }
    });
    expect(html).toContain('allowedOrigin = "https://example.com"');
  });
});

describe('completion adapter: no leaked globals across two instances on one page', () => {
  test('RiseComponentCompletion stays scoped inside each export\'s own IIFE', () => {
    const htmlA = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    const htmlB = compileExportFixture('flip-cards', { configOverrides: { trackCompletion: true } });
    const scriptOf = html => html.match(/<script>([\s\S]*?)<\/script>/)[1];

    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously' });
    const scriptA = dom.window.document.createElement('script');
    scriptA.textContent = scriptOf(htmlA);
    dom.window.document.body.appendChild(scriptA);
    const scriptB = dom.window.document.createElement('script');
    scriptB.textContent = scriptOf(htmlB);
    dom.window.document.body.appendChild(scriptB);

    expect(dom.window.RiseComponentCompletion).toBeUndefined();
  });
});
