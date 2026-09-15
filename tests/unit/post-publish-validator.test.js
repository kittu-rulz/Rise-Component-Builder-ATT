import { describe, expect, test } from 'vitest';
import { validatePostPublishConfig } from '../../js/post-publish/validator.js';
import { createDefaultPostPublishConfig } from '../../js/post-publish/schema.js';
import { parseGlossaryCSV } from '../../js/post-publish/editors/glossary-editor.js';

describe('Post-Publish Validator', () => {
  test('passes validation with default valid configuration', () => {
    const config = createDefaultPostPublishConfig();
    const result = validatePostPublishConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('fails validation when all tools are disabled', () => {
    const config = createDefaultPostPublishConfig();
    config.settings.enabledTools.glossary = false;
    config.settings.enabledTools.resources = false;
    config.settings.enabledTools.help = false;

    const result = validatePostPublishConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('At least one tool'))).toBe(true);
  });

  test('flags missing term names in glossary', () => {
    const config = createDefaultPostPublishConfig();
    config.glossary.entries.push({
      id: 'bad-term-1',
      term: '   ',
      definition: 'Has definition but no term name'
    });

    const result = validatePostPublishConfig(config);
    expect(result.errors.some(e => e.includes('missing term names or definitions'))).toBe(true);
  });

  test('flags invalid resource URLs and missing titles', () => {
    const config = createDefaultPostPublishConfig();
    config.resources.items.push({
      id: 'res-bad',
      title: '',
      type: 'link',
      sourceType: 'url',
      url: ''
    });

    const result = validatePostPublishConfig(config);
    expect(result.errors.some(e => e.includes('missing a title'))).toBe(true);
    expect(result.errors.some(e => e.includes('without a valid URL'))).toBe(true);
  });

  test('validates help contacts and FAQ items', () => {
    const config = createDefaultPostPublishConfig();
    config.help.supportEmail = '';
    config.help.supportPhone = '';
    config.help.supportPortalUrl = '';
    config.help.intro = '';
    config.help.faqItems = [];

    const result = validatePostPublishConfig(config);
    expect(result.errors.some(e => e.includes('contains no contact channels, FAQs, or intro'))).toBe(true);
  });
});

describe('Glossary CSV Parser & Safety', () => {
  test('parses RFC 4180 CSV with quotes and commas', () => {
    const csv = `Term,Definition,Acronym,Category
"API","Application Programming Interface, standard","API","Engineering"
"SCORM","Sharable Content Object Reference Model","SCORM","eLearning"`;

    const result = parseGlossaryCSV(csv);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].term).toBe('API');
    expect(result.rows[0].definition).toContain('Application Programming Interface, standard');
    expect(result.rows[0].abbreviation).toBe('API');
    expect(result.rows[0].category).toBe('Engineering');
  });

  test('neutralizes formula injection characters (=, +, -, @)', () => {
    const csv = `Term,Definition
"=cmd|' /C calc'!A0","Dangerous formula"
"+12345","Plus prefix"
"@SUM(A1:B2)","At prefix"`;

    const result = parseGlossaryCSV(csv);
    expect(result.rows.length).toBe(3);
    // Formula characters must be escaped/disarmed with leading single-quote
    expect(result.rows[0].term.startsWith("'=")).toBe(true);
    expect(result.rows[1].term.startsWith("'+")).toBe(true);
    expect(result.rows[2].term.startsWith("'@")).toBe(true);
  });
});
