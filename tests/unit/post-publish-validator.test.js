import { describe, expect, test } from 'vitest';
import { validatePostPublishConfig } from '../../js/post-publish/validator.js';
import { createDefaultPostPublishConfig } from '../../js/post-publish/schema.js';
import { parseGlossaryCSV } from '../../js/post-publish/editors/glossary-editor.js';

describe('Post-Publish Validator', () => {
  // A config an author has actually filled in: none of the shipped sample values remain.
  function realConfig() {
    const config = createDefaultPostPublishConfig();
    config.glossary.entries = [{ id: 'g1', term: 'Handover', definition: '<p>Passing an active call between cells.</p>', abbreviation: '', aliases: '', category: '', resourceUrl: '', resourceLabel: '' }];
    config.resources.items = [{ id: 'r1', title: 'Field checklist', description: '', type: 'document', sourceType: 'url', url: 'https://learn.acme-telecom.net/checklist.pdf', fileRef: null, category: '', featured: false, actionLabel: 'Open', openBehavior: 'new-tab' }];
    Object.assign(config.help, {
      supportEmail: 'learning@acme-telecom.net', supportPhone: '+1 555 010 4477', supportPortalUrl: 'https://help.acme-telecom.net',
      supportHours: 'Weekdays 9-5', responseTime: 'One business day', department: 'Learning Operations',
      faqItems: [{ id: 'f1', question: 'Where do I find my certificate?', answer: '<p>In the LMS transcript.</p>' }]
    });
    return config;
  }

  test('the shipped starter config is NOT exportable: it carries sample content and placeholder destinations', () => {
    const result = validatePostPublishConfig(createDefaultPostPublishConfig());
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /placeholder address \(https:\/\/example\.com\/field-guide\.pdf\)/.test(e))).toBe(true);
    expect(result.errors.some(e => /helpdesk\.example\.com/.test(e))).toBe(true);
    expect(result.errors.some(e => /example\.com/.test(e) && /Support email/.test(e))).toBe(true);
    expect(result.errors.some(e => /Sample content is still present/.test(e))).toBe(true);
    expect(result.samples.length).toBeGreaterThan(0);
  });

  test('a config with real content and real destinations validates, and says what was not checked', () => {
    const result = validatePostPublishConfig(realConfig());
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.samples).toEqual([]);
    expect(result.notes.join(' ')).toMatch(/not rendered or tested/i);
    expect(result.passed.join(' ')).toMatch(/reachability is not checked/i);
  });

  test('placeholder destinations block export even when sample content is acknowledged', () => {
    const config = realConfig();
    config.settings.sampleContentAcknowledged = true;
    config.resources.items[0].url = 'https://example.com/anything';
    config.help.supportPortalUrl = 'https://helpdesk.example.com';
    config.help.supportEmail = 'me@example.org';
    const result = validatePostPublishConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.filter(e => /placeholder/i.test(e))).toHaveLength(3);
  });

  test('sample content blocks export until it is replaced, or knowingly acknowledged (then only warns)', () => {
    const config = realConfig();
    config.help.department = createDefaultPostPublishConfig().help.department; // one sample value left behind
    const blocked = validatePostPublishConfig(config);
    expect(blocked.valid).toBe(false);
    expect(blocked.errors.some(e => /Sample content is still present/.test(e))).toBe(true);

    config.settings.sampleContentAcknowledged = true;
    const acknowledged = validatePostPublishConfig(config);
    expect(acknowledged.valid).toBe(true);
    expect(acknowledged.warnings.some(w => /Sample content remains and was acknowledged/.test(w))).toBe(true);

    config.settings.sampleContentAcknowledged = false;
    config.help.department = 'Learning Operations';
    expect(validatePostPublishConfig(config).valid).toBe(true); // editing the value clears it
  });

  test('malformed web addresses are errors; relative paths and https links are accepted', () => {
    const config = realConfig();
    config.resources.items[0].url = 'not a url';
    expect(validatePostPublishConfig(config).errors.some(e => /not a valid web address/.test(e))).toBe(true);
    config.resources.items[0].url = '/files/guide.pdf';
    expect(validatePostPublishConfig(config).valid).toBe(true);
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
