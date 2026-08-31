// Focused coverage for the parts of components/audio-player.js that
// tests/unit/generators.test.js's shared describe.each loop doesn't reach: the delimited
// chapters/transcript-segments/takeaways parsers (pure functions, no DOM), mode-gated
// HTML output, and validate(). Real playback timing (chapter/segment sync, resume,
// completion, multi-instance independence) is Playwright-only —
// see tests/e2e/audio-player.spec.js.

import { describe, expect, test } from 'vitest';
import * as audioPlayer from '../../components/audio-player.js';

describe('parseTimestampToSeconds', () => {
  test.each([
    ['0:00', 0], ['0:05', 5], ['3:24', 204], ['59:59', 3599],
    ['1:00:00', 3600], ['1:03:24', 3804], ['01:03:24', 3804]
  ])('%s -> %i seconds', (input, expected) => {
    expect(audioPlayer.parseTimestampToSeconds(input)).toBe(expected);
  });

  test.each([
    [''], [null], [undefined], ['abc'], ['1:2:3:4'], ['1'], [':30'], ['-1:00'], ['1:-30'], ['1:ab']
  ])('rejects %j rather than returning a garbage number', input => {
    expect(audioPlayer.parseTimestampToSeconds(input)).toBeNull();
  });

  test('tolerates surrounding whitespace', () => {
    expect(audioPlayer.parseTimestampToSeconds('  3:24  ')).toBe(204);
  });
});

describe('formatSecondsLabel', () => {
  test.each([
    [0, '0:00'], [5, '0:05'], [65, '1:05'], [3600, '1:00:00'], [3661, '1:01:01']
  ])('%i seconds -> %s', (input, expected) => {
    expect(audioPlayer.formatSecondsLabel(input)).toBe(expected);
  });

  test('non-finite/negative input is reported as 0:00 rather than NaN text', () => {
    expect(audioPlayer.formatSecondsLabel(NaN)).toBe('0:00');
    expect(audioPlayer.formatSecondsLabel(-5)).toBe('0:00');
    expect(audioPlayer.formatSecondsLabel(undefined)).toBe('0:00');
  });
});

describe('parseChapters', () => {
  test('parses well-formed rows and sorts them chronologically regardless of authoring order', () => {
    const chapters = audioPlayer.parseChapters('0:45 | Getting started | The first step\n0:00 | Intro | Welcome');
    expect(chapters).toEqual([
      { timestamp: 0, title: 'Intro', description: 'Welcome' },
      { timestamp: 45, title: 'Getting started', description: 'The first step' }
    ]);
  });

  test('description is optional', () => {
    expect(audioPlayer.parseChapters('0:00 | Intro')).toEqual([{ timestamp: 0, title: 'Intro', description: '' }]);
    expect(audioPlayer.parseChapters('0:00 | Intro | ')).toEqual([{ timestamp: 0, title: 'Intro', description: '' }]);
  });

  test('a row with an invalid or missing timestamp is skipped, not thrown', () => {
    expect(audioPlayer.parseChapters('not-a-time | Intro')).toEqual([]);
    expect(audioPlayer.parseChapters('| Intro')).toEqual([]);
  });

  test('a row with no title is skipped, not thrown', () => {
    expect(audioPlayer.parseChapters('0:30 | ')).toEqual([]);
    expect(audioPlayer.parseChapters('0:30')).toEqual([]);
  });

  test('blank lines are ignored', () => {
    expect(audioPlayer.parseChapters('0:00 | Intro\n\n   \n0:30 | Middle')).toHaveLength(2);
  });

  test('a duplicate timestamp keeps both chapters (Preflight warns; parsing never silently drops valid data)', () => {
    expect(audioPlayer.parseChapters('0:00 | First\n0:00 | Second')).toEqual([
      { timestamp: 0, title: 'First', description: '' },
      { timestamp: 0, title: 'Second', description: '' }
    ]);
  });

  test('empty/undefined input returns an empty array', () => {
    expect(audioPlayer.parseChapters('')).toEqual([]);
    expect(audioPlayer.parseChapters(undefined)).toEqual([]);
  });

  test('a title containing a literal pipe character is not itself a parsing hazard for the description column', () => {
    // Title text can't contain "|" without being read as a column separator — a known,
    // documented trade-off of the delimited-text format (js/editor-schemas.js's comment).
    // What matters is that it degrades to *something* parseable, never throws.
    expect(() => audioPlayer.parseChapters('0:00 | Title with | pipe | extra')).not.toThrow();
  });
});

describe('parseTranscriptSegments', () => {
  test('parses "timestamp | speaker | text" rows', () => {
    expect(audioPlayer.parseTranscriptSegments('0:00 | Alex | Welcome to the show.')).toEqual([
      { timestamp: 0, speaker: 'Alex', text: 'Welcome to the show.' }
    ]);
  });

  test('accepts a 2-part "timestamp | text" row with no speaker column', () => {
    expect(audioPlayer.parseTranscriptSegments('0:00 | Welcome to the show.')).toEqual([
      { timestamp: 0, speaker: '', text: 'Welcome to the show.' }
    ]);
  });

  test('an explicitly blank speaker column is preserved as an empty string, not dropped', () => {
    expect(audioPlayer.parseTranscriptSegments('0:00 | | No speaker.')).toEqual([
      { timestamp: 0, speaker: '', text: 'No speaker.' }
    ]);
  });

  test('text itself may contain a pipe character (joined back with "|" beyond the speaker column)', () => {
    expect(audioPlayer.parseTranscriptSegments('0:00 | Alex | A sentence with a | in it.')).toEqual([
      { timestamp: 0, speaker: 'Alex', text: 'A sentence with a | in it.' }
    ]);
  });

  test('an invalid timestamp skips the row rather than throwing', () => {
    expect(audioPlayer.parseTranscriptSegments('not-a-time | Alex | Hello')).toEqual([]);
  });

  test('a row with no text is skipped', () => {
    expect(audioPlayer.parseTranscriptSegments('0:00 | Alex | ')).toEqual([]);
  });

  test('sorted chronologically regardless of authoring order', () => {
    const segments = audioPlayer.parseTranscriptSegments('0:10 | Later\n0:00 | First');
    expect(segments.map(s => s.timestamp)).toEqual([0, 10]);
  });
});

describe('parseTakeaways', () => {
  test('one entry per non-blank line, trimmed', () => {
    expect(audioPlayer.parseTakeaways('First point\n  Second point  \n\nThird')).toEqual(['First point', 'Second point', 'Third']);
  });

  test('empty/undefined input returns an empty array', () => {
    expect(audioPlayer.parseTakeaways('')).toEqual([]);
    expect(audioPlayer.parseTakeaways(undefined)).toEqual([]);
  });
});

function baseConfig(overrides = {}) {
  return {
    ...audioPlayer.defaultConfig,
    items: [{ title: 'Clip', content: 'https://example.com/a.mp3' }],
    ...overrides
  };
}

describe('generateHTML: presentation modes', () => {
  test('an unrecognized/missing presentationMode falls back to "learning", not a crash', () => {
    const html = audioPlayer.generateHTML(baseConfig({ presentationMode: 'nonsense' }), 'rcb-test');
    expect(html).toContain('data-mode="learning"');
  });

  test('compact mode omits chapters/transcript/takeaways/progress/resume sections entirely', () => {
    const html = audioPlayer.generateHTML(baseConfig({
      presentationMode: 'compact', chapters: '0:00 | Intro', transcriptSegments: '0:00 | Text',
      takeaways: 'A point', items: [{ title: 'Clip', content: 'https://example.com/a.mp3', transcript: '<p>x</p>' }]
    }), 'rcb-test');
    expect(html).not.toContain('aud-chapter-nav');
    expect(html).not.toContain('aud-transcript-section');
    expect(html).not.toContain('aud-takeaways-panel');
    expect(html).not.toContain('aud-progress-status');
    expect(html).not.toContain('aud-resume-prompt');
    // Core controls remain.
    expect(html).toContain('aud-play-btn');
    expect(html).toContain('aud-skip-back-btn');
  });

  test('learning and podcast modes both render chapters/transcript/progress when present', () => {
    ['learning', 'podcast'].forEach(mode => {
      const html = audioPlayer.generateHTML(baseConfig({
        presentationMode: mode, chapters: '0:00 | Intro',
        items: [{ title: 'Clip', content: 'https://example.com/a.mp3', transcript: '<p>x</p>' }]
      }), 'rcb-test');
      expect(html).toContain('aud-chapter-nav');
      expect(html).toContain('aud-transcript-section');
      expect(html).toContain('aud-progress-status');
    });
  });

  test('no transcript at all renders the same sr-only fallback note as before, not a broken empty section', () => {
    const html = audioPlayer.generateHTML(baseConfig(), 'rcb-test');
    expect(html).toContain('No transcript has been supplied for this audio.');
  });

  test('a synchronized transcript takes priority over a plain transcript when both are set', () => {
    const html = audioPlayer.generateHTML(baseConfig({
      transcriptSegments: '0:00 | Synced text',
      items: [{ title: 'Clip', content: 'https://example.com/a.mp3', transcript: '<p>Plain fallback</p>' }]
    }), 'rcb-test');
    expect(html).toContain('Synced text');
    expect(html).not.toContain('Plain fallback');
  });
});

describe('generateJS: skip/completion constants and multi-instance safety', () => {
  test('skip and completion thresholds are emitted as named constants, not magic numbers scattered inline', () => {
    const js = audioPlayer.generateJS(baseConfig(), 'rcb-test');
    expect(js).toContain('AUD_SKIP_SECONDS = 10');
    expect(js).toContain('AUD_COMPLETION_THRESHOLD = 0.9');
  });

  test('singleton controls are looked up by instanceId-scoped getElementById, not a bare document.querySelector', () => {
    const js = audioPlayer.generateJS(baseConfig(), 'rcb-test');
    expect(js).toContain("document.getElementById('rcb-test-play-btn')");
    expect(js).not.toMatch(/document\.querySelector\('\.aud-play-btn'\)/);
  });

  test('the compiled script is syntactically valid across every presentation mode', () => {
    ['compact', 'learning', 'podcast'].forEach(mode => {
      const js = audioPlayer.generateJS(baseConfig({ presentationMode: mode }), 'rcb-test');
      expect(() => new Function(js)).not.toThrow();
    });
  });

  test('saveProgress is guarded against writing before localStorage has actually been read once (regression: a beforeunload/visibilitychange save firing before loadedmetadata\'s own read would otherwise clobber real prior progress with the freshly-initialized zeros)', () => {
    const js = audioPlayer.generateJS(baseConfig(), 'rcb-test');
    expect(js).toMatch(/if \(!PROGRESS_PERSISTENCE \|\| !progressHydrated\) return;/);
    expect(js).toMatch(/progressHydrated = true;/);
  });
});

describe('validate', () => {
  test('an item with no audio source is invalid', () => {
    expect(audioPlayer.validate({ items: [] })).toEqual({ valid: false, errors: ['Add an audio track.'] });
  });

  test('an item with an audio source is valid', () => {
    expect(audioPlayer.validate({ items: [{ content: 'https://example.com/a.mp3' }] })).toEqual({ valid: true, errors: [] });
  });
});
