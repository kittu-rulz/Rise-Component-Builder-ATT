import { describe, expect, it } from 'vitest';
import { createDefaultPostPublishConfig, normalizePostPublishConfig } from '../../js/post-publish/schema.js';

describe('Post-Publish Schema & Normalization', () => {
  it('creates clean default configuration with all 3 tools enabled', () => {
    const config = createDefaultPostPublishConfig();
    expect(config.settings.enabledTools.glossary).toBe(true);
    expect(config.settings.enabledTools.resources).toBe(true);
    expect(config.settings.enabledTools.help).toBe(true);
    expect(config.settings.launcherPosition).toBe('bottom-right');
    expect(config.glossary.entries.length).toBeGreaterThan(0);
    expect(config.resources.items.length).toBeGreaterThan(0);
    expect(config.help.faqItems.length).toBeGreaterThan(0);
  });

  it('normalizes invalid values back to safe defaults', () => {
    const invalid = {
      settings: {
        launcherPosition: 'top-middle',
        launcherTheme: 'neon-green',
        launcherStyle: 'huge-banner',
        desktopOffsetBottom: 9999
      },
      glossary: {
        entries: [
          {
            term: 'Test Term',
            definition: '<script>alert("xss")</script><p>Safe content</p>',
            resourceUrl: 'javascript:alert(1)'
          }
        ]
      }
    };

    const normalized = normalizePostPublishConfig(invalid);
    expect(normalized.settings.launcherPosition).toBe('bottom-right');
    expect(normalized.settings.launcherTheme).toBe('default');
    expect(normalized.settings.launcherStyle).toBe('icon-label');
    expect(normalized.settings.desktopOffsetBottom).toBe(120); // clamped max
    expect(normalized.glossary.entries[0].definition).not.toContain('<script>');
    expect(normalized.glossary.entries[0].definition).toContain('<p>Safe content</p>');
    expect(normalized.glossary.entries[0].resourceUrl).toBe(''); // unsafe protocol rejected
  });
});
