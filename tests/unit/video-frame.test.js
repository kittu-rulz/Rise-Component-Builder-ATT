// Focused coverage for the parts of components/video-frame.js that
// tests/unit/generators.test.js's shared describe.each loop doesn't reach: the delimited
// chapters/transcript-segments/takeaways parsers (pure functions, no DOM) and HTML output.
// Real playback timing (chapter/segment sync, resume, completion, multi-instance
// independence) is Playwright-only — see tests/e2e/video-frame.spec.js. Mirrors
// tests/unit/audio-player.test.js closely — the two components share the same delimited
// chapters/transcript/takeaways/resume design (js/editor-schemas.js's video-frame comment
// explains the shared reasoning), scoped for video: navigation-only chapters (never a
// pause-and-quiz gate — that belongs to Interactive Video), and no presentation-mode
// gating (this component has one shared layout, unlike audio-player's three modes).

import { describe, expect, test } from 'vitest';
import * as videoFrame from '../../components/video-frame.js';

describe('parseTimestampToSeconds', () => {
  test.each([
    ['0:00', 0], ['0:05', 5], ['3:24', 204], ['59:59', 3599],
    ['1:00:00', 3600], ['1:03:24', 3804], ['01:03:24', 3804]
  ])('%s -> %i seconds', (input, expected) => {
    expect(videoFrame.parseTimestampToSeconds(input)).toBe(expected);
  });

  test.each([
    [''], [null], [undefined], ['abc'], ['1:2:3:4'], ['1'], [':30'], ['-1:00'], ['1:-30'], ['1:ab']
  ])('rejects %j rather than returning a garbage number', input => {
    expect(videoFrame.parseTimestampToSeconds(input)).toBeNull();
  });

  test('tolerates surrounding whitespace', () => {
    expect(videoFrame.parseTimestampToSeconds('  3:24  ')).toBe(204);
  });
});

describe('formatSecondsLabel', () => {
  test.each([
    [0, '0:00'], [5, '0:05'], [65, '1:05'], [3600, '1:00:00'], [3661, '1:01:01']
  ])('%i seconds -> %s', (input, expected) => {
    expect(videoFrame.formatSecondsLabel(input)).toBe(expected);
  });

  test('non-finite/negative input is reported as 0:00 rather than NaN text', () => {
    expect(videoFrame.formatSecondsLabel(NaN)).toBe('0:00');
    expect(videoFrame.formatSecondsLabel(-5)).toBe('0:00');
    expect(videoFrame.formatSecondsLabel(undefined)).toBe('0:00');
  });
});

describe('parseChapters', () => {
  test('parses well-formed rows and sorts them chronologically regardless of authoring order', () => {
    const chapters = videoFrame.parseChapters('0:45 | Getting started | The first step\n0:00 | Intro | Welcome');
    expect(chapters).toEqual([
      { timestamp: 0, title: 'Intro', description: 'Welcome' },
      { timestamp: 45, title: 'Getting started', description: 'The first step' }
    ]);
  });

  test('description is optional', () => {
    expect(videoFrame.parseChapters('0:00 | Intro')).toEqual([{ timestamp: 0, title: 'Intro', description: '' }]);
    expect(videoFrame.parseChapters('0:00 | Intro | ')).toEqual([{ timestamp: 0, title: 'Intro', description: '' }]);
  });

  test('a row with an invalid or missing timestamp is skipped, not thrown', () => {
    expect(videoFrame.parseChapters('not-a-time | Intro')).toEqual([]);
    expect(videoFrame.parseChapters('| Intro')).toEqual([]);
  });

  test('a row with no title is skipped, not thrown', () => {
    expect(videoFrame.parseChapters('0:30 | ')).toEqual([]);
    expect(videoFrame.parseChapters('0:30')).toEqual([]);
  });

  test('blank lines are ignored', () => {
    expect(videoFrame.parseChapters('0:00 | Intro\n\n   \n0:30 | Middle')).toHaveLength(2);
  });

  test('a duplicate timestamp keeps both chapters (Preflight warns; parsing never silently drops valid data)', () => {
    expect(videoFrame.parseChapters('0:00 | First\n0:00 | Second')).toEqual([
      { timestamp: 0, title: 'First', description: '' },
      { timestamp: 0, title: 'Second', description: '' }
    ]);
  });

  test('empty/undefined input returns an empty array', () => {
    expect(videoFrame.parseChapters('')).toEqual([]);
    expect(videoFrame.parseChapters(undefined)).toEqual([]);
  });

  test('cleans HTML div/p/br tags when authored with enter/paragraphs', () => {
    const raw = '0:01 | Chapter 01<div>00:25 | Chapter 02</div><div>01:00 | Chapter 03</div>';
    expect(videoFrame.parseChapters(raw)).toEqual([
      { timestamp: 1, title: 'Chapter 01', description: '' },
      { timestamp: 25, title: 'Chapter 02', description: '' },
      { timestamp: 60, title: 'Chapter 03', description: '' }
    ]);
  });
});

describe('parseTranscriptSegments', () => {
  test('parses "timestamp | speaker | text" rows', () => {
    expect(videoFrame.parseTranscriptSegments('0:00 | Alex | Welcome to the show.')).toEqual([
      { timestamp: 0, speaker: 'Alex', text: 'Welcome to the show.' }
    ]);
  });

  test('accepts a 2-part "timestamp | text" row with no speaker column', () => {
    expect(videoFrame.parseTranscriptSegments('0:00 | Welcome to the show.')).toEqual([
      { timestamp: 0, speaker: '', text: 'Welcome to the show.' }
    ]);
  });

  test('an explicitly blank speaker column is preserved as an empty string, not dropped', () => {
    expect(videoFrame.parseTranscriptSegments('0:00 | | No speaker.')).toEqual([
      { timestamp: 0, speaker: '', text: 'No speaker.' }
    ]);
  });

  test('an invalid timestamp skips the row rather than throwing', () => {
    expect(videoFrame.parseTranscriptSegments('not-a-time | Alex | Hello')).toEqual([]);
  });

  test('a row with no text is skipped', () => {
    expect(videoFrame.parseTranscriptSegments('0:00 | Alex | ')).toEqual([]);
  });

  test('sorted chronologically regardless of authoring order', () => {
    const segments = videoFrame.parseTranscriptSegments('0:10 | Later\n0:00 | First');
    expect(segments.map(s => s.timestamp)).toEqual([0, 10]);
  });
});

describe('parseTakeaways', () => {
  test('one entry per non-blank line, trimmed', () => {
    expect(videoFrame.parseTakeaways('First point\n  Second point  \n\nThird')).toEqual(['First point', 'Second point', 'Third']);
  });

  test('empty/undefined input returns an empty array', () => {
    expect(videoFrame.parseTakeaways('')).toEqual([]);
    expect(videoFrame.parseTakeaways(undefined)).toEqual([]);
  });
});

function baseConfig(overrides = {}) {
  return {
    ...videoFrame.defaultConfig,
    items: [{ title: 'Clip', content: 'https://example.com/a.mp4' }],
    ...overrides
  };
}

describe('generateCSS: chapter list has no stray browser-default bullets', () => {
  test('the <ul>/<li> chapter list resets list-style/margin/padding', () => {
    const css = videoFrame.generateCSS();
    const listRule = css.match(/\.video-chapter-list\s*{[^}]*}/)[0];
    expect(listRule).toContain('list-style: none');
    const liRule = css.match(/\.video-chapter-list li\s*{[^}]*}/)[0];
    expect(liRule).toContain('list-style: none');
  });
});

describe('generateHTML: chapters, transcript, takeaways', () => {
  test('no chapters/transcript/takeaways authored renders the same minimal output as before this feature', () => {
    const html = videoFrame.generateHTML(baseConfig(), 'rcb-test');
    expect(html).not.toContain('video-chapter-nav');
    expect(html).not.toContain('video-takeaways-panel');
    expect(html).toContain('No transcript has been supplied for this video.');
    // Existing, unrelated audio-description disclosure is untouched.
    expect(html).toContain('No visual description has been supplied for this video.');
  });

  test('chapters render as a collapsible toggle, expanded by default, with an aria-controls link to the list', () => {
    const html = videoFrame.generateHTML(baseConfig({ chapters: '0:00 | Intro' }), 'rcb-test');
    expect(html).toMatch(/id="rcb-test-chapter-toggle"[^>]*aria-expanded="true"[^>]*aria-controls="rcb-test-chapter-list"/);
  });

  test('a synchronized transcript takes priority over the plain video transcript when both are set', () => {
    const html = videoFrame.generateHTML(baseConfig({
      transcriptSegments: '0:00 | Synced text',
      items: [{ title: 'Clip', content: 'https://example.com/a.mp4', transcript: '<p>Plain fallback</p>' }]
    }), 'rcb-test');
    expect(html).toContain('Synced text');
    expect(html).not.toContain('Plain fallback');
  });

  test('a visually-empty richtext transcript ("<p></p>", "<br>", whitespace) is treated as no transcript, not a genuine one', () => {
    ['<p></p>', '<br>', '  ', ''].forEach(emptyish => {
      const html = videoFrame.generateHTML(baseConfig({
        items: [{ title: 'Clip', content: 'https://example.com/a.mp4', transcript: emptyish }]
      }), 'rcb-test');
      expect(html).not.toContain('video-transcript-toggle');
      expect(html).toContain('No transcript has been supplied for this video.');
    });
  });

  test('the audio description field is completely independent of the transcript system (a plain transcript alone does not affect it, and vice versa)', () => {
    const html = videoFrame.generateHTML(baseConfig({
      items: [{ title: 'Clip', content: 'https://example.com/a.mp4', transcript: '<p>Dialogue transcript</p>', audioDescription: '<p>Visual description text</p>' }]
    }), 'rcb-test');
    expect(html).toContain('Visual description text');
    expect(html).toContain('<summary>Visual description</summary>');
  });

  test('takeaways render locked when set to reveal-after-completion', () => {
    const html = videoFrame.generateHTML(baseConfig({ takeaways: 'A point', takeawaysVisibility: 'afterCompletion' }), 'rcb-test');
    expect(html).toContain('video-takeaways-locked-msg');
    expect(html).toMatch(/class="video-takeaways-list"[^>]*hidden/);
  });

  test('takeaways render visible immediately when set to always', () => {
    const html = videoFrame.generateHTML(baseConfig({ takeaways: 'A point', takeawaysVisibility: 'always' }), 'rcb-test');
    expect(html).not.toContain('video-takeaways-locked-msg');
    expect(html).not.toMatch(/class="video-takeaways-list"[^>]*hidden/);
  });
});

describe('generateJS: skip/completion constants, chapters toggle, and progress guards', () => {
  test('skip and completion thresholds are emitted as named constants, not magic numbers scattered inline', () => {
    const js = videoFrame.generateJS(baseConfig(), 'rcb-test');
    expect(js).toContain('VID_SKIP_SECONDS = 10');
    expect(js).toContain('VID_COMPLETION_THRESHOLD = 0.9');
  });

  test('the chapters toggle wires up aria-expanded and hidden, mirroring the transcript toggle\'s own pattern', () => {
    const js = videoFrame.generateJS(baseConfig(), 'rcb-test');
    expect(js).toContain("document.getElementById('rcb-test-chapter-toggle')");
    expect(js).toMatch(/chapterToggle\.setAttribute\('aria-expanded', String\(!expanded\)\)/);
    expect(js).toMatch(/chapterListEl\.hidden = expanded/);
  });

  test('singleton controls are looked up by instanceId-scoped getElementById, not a bare document.querySelector', () => {
    const js = videoFrame.generateJS(baseConfig(), 'rcb-test');
    expect(js).toContain("document.getElementById('rcb-test-mini-play')");
    expect(js).not.toMatch(/document\.querySelector\('\.video-mini-play'\)/);
  });

  test('the compiled script is syntactically valid', () => {
    const js = videoFrame.generateJS(baseConfig({ chapters: '0:00 | Intro', transcriptSegments: '0:00 | Text', takeaways: 'A point' }), 'rcb-test');
    expect(() => new Function(js)).not.toThrow();
  });

  test('saveProgress is guarded against writing before localStorage has been read once, and before the learner has done anything this load (both real bugs found and fixed for components/audio-player.js, ported here)', () => {
    const js = videoFrame.generateJS(baseConfig(), 'rcb-test');
    expect(js).toMatch(/if \(!PROGRESS_PERSISTENCE \|\| !progressHydrated \|\| !hasEngaged\) return;/);
    expect(js).toMatch(/progressHydrated = true;/);
    expect(js).toMatch(/addEventListener\('seeking', function\(\) \{ hasEngaged = true; \}\)/);
  });

  test('starting this video pauses other audio/video elements on the page, without unsafe global coupling', () => {
    const js = videoFrame.generateJS(baseConfig(), 'rcb-test');
    expect(js).toMatch(/document\.querySelectorAll\('audio, video'\)/);
  });
});

describe('validate', () => {
  test('an item with no video source is invalid', () => {
    expect(videoFrame.validate({ items: [] })).toEqual({ valid: false, errors: ['Add a video.'] });
  });

  test('an item with a video source is valid', () => {
    expect(videoFrame.validate({ items: [{ content: 'https://example.com/a.mp4' }] })).toEqual({ valid: true, errors: [] });
  });
});
