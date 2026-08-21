import { describe, expect, test } from 'vitest';
import { JSDOM } from 'jsdom';
import * as interactiveVideo from '../../components/interactive-video.js';
import { longText, multilingualText, rtlText, unsafeText } from '../fixtures/index.js';
import { registerLocalBlobURL, sanitizePreviewConfig } from '../../js/utilities.js';
import { collectSyncIssues, SEVERITY } from '../../js/validation.js';

// Kept as its own file rather than added to tests/unit/generators.test.js's shared
// describe.each loop: that loop's itemsFor() helper assumes every component's items
// share one uniform {title, content, ...} shape, and asserts empty items are always
// invalid. Interactive Video's items are type-discriminated interaction markers (an
// empty marker list is a legitimate, valid "plain video" configuration — see
// components/interactive-video.js's defaultConfig comment) — forcing it through the
// shared loop would need special-casing on both counts. A dedicated file matches how
// this project's own test-organization docs describe adding a genuinely different shape.

const INSTANCE_ID = 'rcb-test-instance';

function baseConfig(overrides = {}) {
  return { ...interactiveVideo.defaultConfig, ...overrides };
}

function informationMarker(overrides = {}) {
  return {
    type: 'information', timestamp: 10, title: 'Marker', required: false, pauseVideo: true,
    continueButtonLabel: 'Continue', body: 'Body text', question: '', answer1Label: '', answer2Label: '',
    answer3Label: '', answer4Label: '', correctAnswerIndex: '1', answer1Feedback: '', answer2Feedback: '',
    answer3Feedback: '', answer4Feedback: '', generalCorrectFeedback: '', generalIncorrectFeedback: '',
    hint: '', maxAttempts: 1, showCorrectAfterFinal: false, ...overrides
  };
}

function mcMarker(overrides = {}) {
  return informationMarker({
    type: 'multipleChoice', body: '', question: 'What is 2+2?', answer1Label: '4', answer2Label: '5',
    correctAnswerIndex: '1', ...overrides
  });
}

function assertSafeOutput(config, instanceId = INSTANCE_ID) {
  const sanitized = sanitizePreviewConfig(config, interactiveVideo.id);
  const html = interactiveVideo.generateHTML(sanitized, instanceId);
  const css = interactiveVideo.generateCSS(sanitized);
  const js = interactiveVideo.generateJS(sanitized, instanceId);
  expect(typeof html).toBe('string');
  expect(html).not.toMatch(/undefined|\[object Object\]/);
  expect(css).not.toMatch(/undefined|\[object Object\]/);
  expect(js).not.toMatch(/undefined|\[object Object\]/);
  expect(() => new Function(js)).not.toThrow();
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
  const ids = [...dom.window.document.querySelectorAll('[id]')].map(el => el.id);
  expect(new Set(ids).size).toBe(ids.length);
  const style = dom.window.document.createElement('style');
  style.textContent = css;
  dom.window.document.head.append(style);
  expect(style.sheet).not.toBeNull();
  return html;
}

describe('interactive-video generator contract', () => {
  test('exports the complete generator contract', () => {
    expect(interactiveVideo).toMatchObject({
      id: 'interactive-video', name: expect.any(String), category: expect.any(String),
      defaultConfig: expect.any(Object), editorSchema: expect.any(Object),
      generateHTML: expect.any(Function), generateCSS: expect.any(Function), generateJS: expect.any(Function), validate: expect.any(Function)
    });
  });

  test('a zero-marker video (the default config) compiles safely — an empty marker list is valid, not an authoring error', () => {
    expect(() => assertSafeOutput(baseConfig({ videoUrl: 'https://example.com/video.mp4', videoSourceType: 'url' }))).not.toThrow();
  });

  test('compiles safely with a mix of information and multiple-choice markers', () => {
    const html = assertSafeOutput(baseConfig({
      videoUrl: 'https://example.com/video.mp4', videoSourceType: 'url',
      items: [informationMarker({ timestamp: 5, title: 'Intro' }), mcMarker({ timestamp: 20, title: 'Check' })]
    }));
    expect(html).toContain('Interactions (2)');
  });

  test('ids are namespaced by instanceId so multiple instances never collide', () => {
    const config = sanitizePreviewConfig(baseConfig({
      videoUrl: 'https://example.com/video.mp4', videoSourceType: 'url', items: [informationMarker()]
    }), interactiveVideo.id);
    const htmlA = interactiveVideo.generateHTML(config, 'rcb-instance-a');
    const htmlB = interactiveVideo.generateHTML(config, 'rcb-instance-b');
    const idsA = [...new JSDOM(htmlA).window.document.querySelectorAll('[id]')].map(el => el.id);
    const idsB = [...new JSDOM(htmlB).window.document.querySelectorAll('[id]')].map(el => el.id);
    expect(idsA.length).toBeGreaterThan(0);
    expect(idsA.every(id => id.startsWith('rcb-instance-a'))).toBe(true);
    expect(idsB.every(id => id.startsWith('rcb-instance-b'))).toBe(true);
    expect(idsA.some(id => idsB.includes(id))).toBe(false);
  });

  test.each([
    ['very long text', longText], ['emoji and multilingual text', multilingualText], ['right-to-left text', rtlText],
    ['closing scripts and unsafe markup', unsafeText]
  ])('handles %s safely in title/introduction/transcript/marker title', (_label, content) => {
    const html = assertSafeOutput(baseConfig({
      videoUrl: 'https://example.com/video.mp4', videoSourceType: 'url',
      title: content, introduction: content, transcript: content,
      items: [informationMarker({ title: content })]
    }));
    expect(html.toLowerCase()).not.toContain('<script>');
    const document = new JSDOM(`<!doctype html><body>${html}</body>`).window.document;
    expect(document.querySelector('script, [onerror]')).toBeNull();
  });

  test('rejects an unsafe javascript: video URL rather than emitting it', () => {
    const html = assertSafeOutput(baseConfig({ videoUrl: 'javascript:alert(1)', videoSourceType: 'url' }));
    expect(html.toLowerCase()).not.toContain('javascript:');
  });
});

describe('interactive-video: video source resolution', () => {
  test('uses videoUrl when videoSourceType is "url"', () => {
    const config = sanitizePreviewConfig(baseConfig({ videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4', videoMediaId: 'blob:should-not-be-used' }), interactiveVideo.id);
    const html = interactiveVideo.generateHTML(config, INSTANCE_ID);
    const source = new JSDOM(html).window.document.querySelector('video source');
    expect(source?.getAttribute('src')).toBe('https://example.com/a.mp4');
  });

  test('uses the resolved upload URL when videoSourceType is "upload"', () => {
    // sanitizeURL only trusts a blob: URL the app itself created this session (see
    // js/utilities.js's localBlobURLs registry) — matching how js/media-storage.js's
    // ensureMediaObjectURL() actually produces one, rather than an arbitrary string.
    registerLocalBlobURL('blob:http://localhost/abc-123');
    const config = sanitizePreviewConfig(baseConfig({ videoSourceType: 'upload', videoMediaId: 'blob:http://localhost/abc-123', videoUrl: 'https://example.com/should-not-be-used.mp4' }), interactiveVideo.id);
    const html = interactiveVideo.generateHTML(config, INSTANCE_ID);
    const source = new JSDOM(html).window.document.querySelector('video source');
    expect(source?.getAttribute('src')).toBe('blob:http://localhost/abc-123');
  });

  test('shows a clear missing-media notice, not a broken player, when no source is configured', () => {
    const config = sanitizePreviewConfig(baseConfig({ videoUrl: '', videoMediaId: '' }), interactiveVideo.id);
    const html = interactiveVideo.generateHTML(config, INSTANCE_ID);
    const document = new JSDOM(html).window.document;
    expect(document.querySelector('video')).toBeNull();
    expect(document.querySelector('.iv-missing-video-notice')).not.toBeNull();
  });

  test('renders a captions track when captionsUrl is set, and omits it when absent', () => {
    const withCaptions = new JSDOM(interactiveVideo.generateHTML(
      sanitizePreviewConfig(baseConfig({ videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4', captionsUrl: 'https://example.com/a.vtt', captionsLabel: 'English' }), interactiveVideo.id),
      INSTANCE_ID
    )).window.document;
    const track = withCaptions.querySelector('video track');
    expect(track?.getAttribute('src')).toBe('https://example.com/a.vtt');
    expect(track?.getAttribute('label')).toBe('English');
    expect(track?.hasAttribute('default')).toBe(false); // never forced on

    const without = new JSDOM(interactiveVideo.generateHTML(
      sanitizePreviewConfig(baseConfig({ videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4' }), interactiveVideo.id),
      INSTANCE_ID
    )).window.document;
    expect(without.querySelector('video track')).toBeNull();
  });

  test('never autoplays and never forces the video muted-off with sound', () => {
    const html = interactiveVideo.generateHTML(
      sanitizePreviewConfig(baseConfig({ videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4' }), interactiveVideo.id),
      INSTANCE_ID
    );
    expect(html).not.toContain('autoplay');
  });
});

describe('interactive-video: transcript', () => {
  test('renders an expandable transcript when provided', () => {
    const html = interactiveVideo.generateHTML(
      sanitizePreviewConfig(baseConfig({ videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4', transcript: 'Full transcript text.' }), interactiveVideo.id),
      INSTANCE_ID
    );
    const document = new JSDOM(html).window.document;
    const details = document.querySelector('details.iv-transcript');
    expect(details).not.toBeNull();
    expect(details.querySelector('summary')).not.toBeNull();
    expect(details.textContent).toContain('Full transcript text.');
  });

  test('the transcript toggle exists in the document without any JavaScript running (native <details>)', () => {
    // No script execution here at all — proves the transcript's presence/absence in the
    // DOM does not depend on initComponent() having run, per the MVP requirement that
    // the transcript "must not be dependent on JavaScript to exist in the document."
    const html = interactiveVideo.generateHTML(
      sanitizePreviewConfig(baseConfig({ videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4', transcript: 'Text.' }), interactiveVideo.id),
      INSTANCE_ID
    );
    expect(html).toContain('<details class="iv-transcript">');
    expect(html).toContain('<summary>Transcript</summary>');
  });

  test('shows a screen-reader-only note when no transcript is supplied, rather than nothing at all', () => {
    const html = interactiveVideo.generateHTML(
      sanitizePreviewConfig(baseConfig({ videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4' }), interactiveVideo.id),
      INSTANCE_ID
    );
    expect(html).toContain('iv-no-transcript-note');
  });
});

describe('interactive-video: marker list ordering', () => {
  test('displays markers in chronological order regardless of authoring order, without changing their stable index', () => {
    const config = sanitizePreviewConfig(baseConfig({
      videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4',
      items: [
        informationMarker({ timestamp: 30, title: 'Third' }),
        informationMarker({ timestamp: 5, title: 'First' }),
        informationMarker({ timestamp: 15, title: 'Second' })
      ]
    }), interactiveVideo.id);
    const html = interactiveVideo.generateHTML(config, INSTANCE_ID);
    const items = [...new JSDOM(html).window.document.querySelectorAll('.iv-marker-item')];
    expect(items.map(el => el.querySelector('.iv-marker-title').textContent)).toEqual(['First', 'Second', 'Third']);
    // "Third" was authored at array index 0 — display order changed, but its own
    // data-idx (stable identity) must still point back at its real authoring position.
    expect(items[2].getAttribute('data-idx')).toBe('0');
  });
});

describe('interactive-video: validate()', () => {
  test('requires a video source', () => {
    expect(interactiveVideo.validate(baseConfig({ videoUrl: '', videoMediaId: '' })).valid).toBe(false);
  });

  test('a video source with zero markers is valid', () => {
    const result = interactiveVideo.validate(baseConfig({ videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4' }));
    expect(result.valid).toBe(true);
  });

  test('an information marker without body content is invalid', () => {
    const result = interactiveVideo.validate(baseConfig({
      videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4',
      items: [informationMarker({ body: '' })]
    }));
    expect(result.valid).toBe(false);
  });

  test('a multiple-choice marker without a question or with fewer than two answers is invalid', () => {
    const noQuestion = interactiveVideo.validate(baseConfig({
      videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4',
      items: [mcMarker({ question: '' })]
    }));
    expect(noQuestion.valid).toBe(false);

    const oneAnswer = interactiveVideo.validate(baseConfig({
      videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4',
      items: [mcMarker({ answer2Label: '' })]
    }));
    expect(oneAnswer.valid).toBe(false);
  });

  test('a fully valid multiple-choice marker passes', () => {
    const result = interactiveVideo.validate(baseConfig({
      videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4',
      items: [mcMarker()]
    }));
    expect(result.valid).toBe(true);
  });

  test('a negative or non-numeric timestamp is invalid', () => {
    const negative = interactiveVideo.validate(baseConfig({
      videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4',
      items: [informationMarker({ timestamp: -5 })]
    }));
    expect(negative.valid).toBe(false);
  });
});

describe('interactive-video: timeline QA rules (Phase 2)', () => {
  // videoDurationSeconds is a runtime fact the builder's own authoring-timeline widget
  // (app.js) captures once the author's preview video loads metadata — never authored
  // directly, so these tests set it the same way that widget would.
  function issuesFor(items, videoDurationSeconds) {
    const config = baseConfig({ videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4', items, videoDurationSeconds });
    return collectSyncIssues({
      componentId: interactiveVideo.id, schema: interactiveVideo.editorSchema, config,
      theme: {}, componentOverrides: {}, settings: {}
    });
  }

  test('duration-dependent rules stay silent when duration has never been measured', () => {
    const issues = issuesFor([informationMarker({ timestamp: 99999 })], undefined);
    expect(issues.some(i => i.ruleId === 'interactive-video-marker-outside-duration')).toBe(false);
  });

  test('two markers within 1 second of each other are flagged as a Warning', () => {
    const issues = issuesFor([informationMarker({ timestamp: 10 }), informationMarker({ timestamp: 10.5 })], 120);
    const found = issues.find(i => i.ruleId === 'interactive-video-near-duplicate-timestamps');
    expect(found?.severity).toBe(SEVERITY.WARNING);
  });

  test('markers a full second apart are not flagged as near-duplicates', () => {
    const issues = issuesFor([informationMarker({ timestamp: 10 }), informationMarker({ timestamp: 12 })], 120);
    expect(issues.some(i => i.ruleId === 'interactive-video-near-duplicate-timestamps')).toBe(false);
  });

  test('a marker very close to the start or end of the video is flagged as a Warning', () => {
    const nearStart = issuesFor([informationMarker({ timestamp: 0.5 })], 120);
    expect(nearStart.some(i => i.ruleId === 'interactive-video-marker-near-edge')).toBe(true);

    const nearEnd = issuesFor([informationMarker({ timestamp: 119 })], 120);
    expect(nearEnd.some(i => i.ruleId === 'interactive-video-marker-near-edge')).toBe(true);

    const middle = issuesFor([informationMarker({ timestamp: 60 })], 120);
    expect(middle.some(i => i.ruleId === 'interactive-video-marker-near-edge')).toBe(false);
  });

  test('a marker past the known video duration is a Warning normally, but Blocking when Required', () => {
    const optional = issuesFor([informationMarker({ timestamp: 200, required: false })], 120);
    const optionalIssue = optional.find(i => i.ruleId === 'interactive-video-marker-outside-duration');
    expect(optionalIssue?.severity).toBe(SEVERITY.WARNING);

    const required = issuesFor([informationMarker({ timestamp: 200, required: true })], 120);
    const requiredIssue = required.find(i => i.ruleId === 'interactive-video-marker-outside-duration');
    expect(requiredIssue?.severity).toBe(SEVERITY.BLOCKING);
  });

  test('a marker within the known duration is never flagged as outside it', () => {
    const issues = issuesFor([informationMarker({ timestamp: 60 })], 120);
    expect(issues.some(i => i.ruleId === 'interactive-video-marker-outside-duration')).toBe(false);
  });
});

describe('interactive-video: non-direct-video-URL QA rule (Phase 7)', () => {
  function issuesForUrl(overrides) {
    const config = baseConfig({ videoSourceType: 'url', videoUrl: '', items: [], ...overrides });
    return collectSyncIssues({
      componentId: interactiveVideo.id, schema: interactiveVideo.editorSchema, config,
      theme: {}, componentOverrides: {}, settings: {}
    });
  }
  const RULE_ID = 'interactive-video-non-direct-video-url';

  test.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://vimeo.com/76979871',
    'https://player.vimeo.com/video/76979871'
  ])('%s is Blocking', videoUrl => {
    const issues = issuesForUrl({ videoUrl });
    const found = issues.find(i => i.ruleId === RULE_ID);
    expect(found?.severity).toBe(SEVERITY.BLOCKING);
  });

  test('a direct .mp4 file URL is never flagged', () => {
    const issues = issuesForUrl({ videoUrl: 'https://example.com/videos/intro.mp4' });
    expect(issues.some(i => i.ruleId === RULE_ID)).toBe(false);
  });

  test('a hostname that merely contains "youtube" as a substring, not as its own domain, is not flagged', () => {
    const issues = issuesForUrl({ videoUrl: 'https://not-youtube.example.com/video.mp4' });
    expect(issues.some(i => i.ruleId === RULE_ID)).toBe(false);
  });

  test('does not run for an uploaded video (videoSourceType "upload"), regardless of videoUrl', () => {
    const issues = issuesForUrl({ videoSourceType: 'upload', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(issues.some(i => i.ruleId === RULE_ID)).toBe(false);
  });

  test('a blank or malformed URL is silently skipped by this rule (covered separately by general-invalid-url)', () => {
    expect(issuesForUrl({ videoUrl: '' }).some(i => i.ruleId === RULE_ID)).toBe(false);
    expect(issuesForUrl({ videoUrl: 'not a url' }).some(i => i.ruleId === RULE_ID)).toBe(false);
  });
});

describe('interactive-video: uploaded-media export-format QA rule (Phase 7)', () => {
  function mediaReference(overrides = {}) {
    return {
      source: 'upload', mediaId: 'm1', schemaVersion: 1, kind: 'video', name: 'clip.mp4',
      mimeType: 'video/mp4', size: 1000, createdAt: '2026-01-01T00:00:00.000Z', ...overrides
    };
  }
  const RULE_ID = 'interactive-video-uploaded-media-export-format';

  function issuesForMedia(overrides) {
    const config = baseConfig({ videoSourceType: 'url', videoUrl: 'https://example.com/a.mp4', videoMediaId: '', captionsUrl: '', items: [], ...overrides });
    return collectSyncIssues({
      componentId: interactiveVideo.id, schema: interactiveVideo.editorSchema, config,
      theme: {}, componentOverrides: {}, settings: {}
    });
  }

  test('an uploaded video (videoSourceType "upload") is flagged as a Warning', () => {
    const issues = issuesForMedia({ videoSourceType: 'upload', videoMediaId: mediaReference() });
    const found = issues.find(i => i.ruleId === RULE_ID);
    expect(found?.severity).toBe(SEVERITY.WARNING);
  });

  test('an uploaded captions file is flagged even when the video itself is an external URL', () => {
    const issues = issuesForMedia({ captionsUrl: mediaReference({ kind: 'captions', name: 'captions.vtt', mimeType: 'text/vtt' }) });
    const found = issues.find(i => i.ruleId === RULE_ID);
    expect(found?.severity).toBe(SEVERITY.WARNING);
  });

  test('an external video URL and no captions upload are never flagged', () => {
    const issues = issuesForMedia({});
    expect(issues.some(i => i.ruleId === RULE_ID)).toBe(false);
  });

  test('videoMediaId holding a value is not flagged when videoSourceType is "url" (the field is simply unused in that mode)', () => {
    const issues = issuesForMedia({ videoSourceType: 'url', videoMediaId: mediaReference() });
    expect(issues.some(i => i.ruleId === RULE_ID)).toBe(false);
  });
});

describe('interactive-video: completion rule wiring (Phase 3)', () => {
  test('all three completion rules are embedded and gate updateTrackerComplete() through ivEvaluateCompletion()', () => {
    ['videoEnded', 'allRequiredInteractionsCompleted', 'videoEndedAndRequiredInteractionsCompleted'].forEach(rule => {
      const js = interactiveVideo.generateJS(baseConfig({ completionRule: rule }), INSTANCE_ID);
      expect(js).toContain(`var ivCompletionRule = ${JSON.stringify(rule)};`);
      expect(js).toContain('function ivEvaluateCompletion()');
      expect(js).toContain('updateTrackerComplete();');
    });
  });

  test('the compiled script is syntactically valid regardless of resume behaviour or marker mix', () => {
    ['manual', 'automaticAfterInformation', 'automaticAfterCorrectAnswer'].forEach(resumeBehaviour => {
      const js = interactiveVideo.generateJS(baseConfig({
        resumeBehaviour, items: [informationMarker({ timestamp: 1 }), mcMarker({ timestamp: 5 })]
      }), INSTANCE_ID);
      expect(() => new Function(js)).not.toThrow();
    });
  });
});

// Real timeupdate/seeked crossing-detection, focus movement, and actual pause/resume
// behavior need a genuine <video> element and real event timing that jsdom's media-element
// stubs don't provide (docs/ARCHITECTURE.md's own testing strategy: "jsdom is used only
// where DOM parsing is required") — that behavioral coverage lives in
// tests/e2e/interactive-video.spec.js (Playwright, a real browser) instead of here.
