import { describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';

import { compileExportFixture } from '../fixtures/export-fixture-definitions.mjs';

// Unit-level coverage for the completion adapter's *compiled output* — does the right
// code get shipped (or not shipped) for a given config, with the right values embedded.
// Real cross-window messaging behavior (standalone vs. embedded, firing once) needs a
// real browser and is covered by tests/e2e/completion.spec.js instead — jsdom's
// postMessage/window.parent support is too limited to exercise that safely. See
// docs/COMPLETION-INTEGRATION.md.

describe('completion adapter: required vs. optional completion (compiled output)', () => {
  test('trackCompletion: true ships the completion adapter, scoped to this component', () => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: true } });
    expect(html).toContain('var RiseComponentCompletion = (function()');
    expect(html).toContain("postMessage({ type: 'complete' }");
  });

  test('trackCompletion: false ships no completion adapter at all', () => {
    const html = compileExportFixture('accordion', { configOverrides: { trackCompletion: false } });
    expect(html).not.toContain('var RiseComponentCompletion = (function()');
    expect(html).not.toContain("postMessage({ type: 'complete' }");
    // .progress-bar-container is also a (always-present) CSS rule name in the shared
    // stylesheet, so check for the actual progress-bar *element* instead, which
    // renderCompletionTrackerHTML() only emits when trackCompletion is true.
    expect(html).not.toContain('class="completion-tracker"');
  });
});

describe('completion adapter: parent origin configuration', () => {
  test('defaults to null (send to any origin, i.e. "*") when no setting is configured', () => {
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
