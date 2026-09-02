import { getEditorSchema } from '../js/editor-schemas.js';
import { isEmpty } from '../js/field-validation.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';

export const id = 'audio-player';
export const name = 'Interactive Learning Audio';
export const category = 'media';
export const defaultConfig = {
  presentationMode: 'learning',
  chapters: '0:00 | Introduction | What this segment covers\n0:45 | Getting started | The first practical step',
  transcriptSegments: '',
  progressPersistence: true,
  takeaways: '',
  takeawaysVisibility: 'always',
  items: [
    { title: 'Introduction Podcast (Audio Clip)', content: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }
  ]
};
export const editorSchema = getEditorSchema(id);

// How far Replay/Forward move the playhead, and the completion threshold, named per the
// project's own "use constants" convention (matches AUDIO_COMPLETION_TAIL_SECONDS below —
// reaching either counts as "completed," since a learner who stops 2 seconds from the end
// has, for practical purposes, finished listening).
const AUDIO_SKIP_SECONDS = 10;
const AUDIO_COMPLETION_THRESHOLD = 0.9;
const AUDIO_COMPLETION_TAIL_SECONDS = 3;
// Below this, a resume prompt isn't worth showing — restarting from 0:00-0:09 is not
// meaningfully different from just pressing Play.
const AUDIO_RESUME_MIN_SECONDS = 10;

// Replay/Forward glyphs are real AT&T Brand Center icons (ATT Design System/
// Icon_Library_Mar_2026_032726.pptx — Navigation & Controls "restart" (counterclockwise)
// and its clockwise pair), verified the same rasterize-and-inspect way as this file's
// other icons. The "10" is ordinary typography composited over the real icon path, not a
// separate invented pictogram — the same convention most media players use to numeral a
// generic skip glyph, and the accessible name ("Replay 10 seconds") is the source of
// truth regardless of what the glyph shows.
const skipBackIcon = '<svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 1C11.2 1 6.8 3.3 4 7L4 3 2 3 2 11 10 11 10 9 5.1 9C7.4 5.3 11.6 3 16 3 23.2 3 29 8.8 29 16 29 23.2 23.2 29 16 29 8.8 29 3 23.2 3 16L1 16C1 24.3 7.7 31 16 31 24.3 31 31 24.3 31 16 31 7.7 24.3 1 16 1Z"/><text x="16.5" y="20.5" font-size="11" font-weight="700" text-anchor="middle" font-family="Arial, sans-serif">10</text></svg>';
const skipForwardIcon = '<svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M29 16C29 23.2 23.2 29 16 29 8.8 29 3 23.2 3 16 3 8.8 8.8 3 16 3 20.4 3 24.6 5.3 26.9 9L22 9 22 11 30 11 30 3 28 3 28 7C25.2 3.3 20.8 1 16 1 7.7 1 1 7.7 1 16 1 24.3 7.7 31 16 31 24.3 31 31 24.3 31 16L29 16Z"/><text x="16" y="20.5" font-size="11" font-weight="700" text-anchor="middle" font-family="Arial, sans-serif">10</text></svg>';
// Volume/mute/transcript glyphs: same AT&T Brand Center icons already verified and used
// by this component (Navigation & Controls "volume-2"/"speaker-off", Documents "file").
const volumeOnIcon = '<svg class="aud-volume-on-svg" width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M3.9 11C2.3 11 1 12.3 1 13.9L1 18.2C1 19.7 2.3 21 3.9 21L8.2 21 16.1 27.7 16.1 4.3 8.1 11 3.9 11ZM14 8.6 14 23.3 8.9 19 3.9 19C3.4 19 3 18.6 3 18.1L3 13.8C3 13.4 3.4 13 3.9 13L8.9 13 14 8.6Z"/><path d="M18.8 13.2C20.3 14.7 20.3 17.3 18.8 18.8L20.2 20.2C22.5 17.9 22.5 14.1 20.2 11.8L18.8 13.2Z"/><path d="M23.4 8.6 22 10C25.3 13.3 25.3 18.7 22 22L23.4 23.4C27.5 19.3 27.5 12.7 23.4 8.6Z"/></svg>';
const volumeOffIcon = '<svg class="aud-volume-off-svg" width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" style="display:none;"><path d="M28.9 12.5 27.5 11.1 24 14.6 20.5 11.1 19.1 12.5 22.6 16 19.1 19.5 20.5 20.9 24 17.4 27.5 20.9 28.9 19.5 25.4 16Z"/><path d="M3.9 11C2.3 11 1 12.3 1 13.9L1 18.2C1 19.7 2.3 21 3.9 21L8.2 21 16.1 27.7 16.1 4.3 8.1 11 3.9 11ZM14 8.6 14 23.3 8.9 19 3.9 19C3.4 19 3 18.6 3 18.1L3 13.8C3 13.4 3.4 13 3.9 13L8.9 13 14 8.6Z"/></svg>';
const transcriptIcon = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M20.4 2 7 2C5.3 2 4 3.3 4 5L4 27C4 28.7 5.3 30 7 30L25 30C26.7 30 28 28.7 28 27L28 9.6 20.4 2ZM20 4.4 25.6 10 21 10C20.4 10 20 9.6 20 9L20 4.4ZM25 28 7 28C6.4 28 6 27.6 6 27L6 5C6 4.4 6.4 4 7 4L18 4 18 9C18 10.7 19.3 12 21 12L26 12 26 27C26 27.6 25.6 28 25 28Z"/></svg>';
// Chapters/Key Takeaways heading icons: same real AT&T Brand Center source (rasterized and
// visually verified the same way as this file's other icons) — "list" (Content & Media) for
// Chapters, since a chapter nav is literally a navigable list of sections; "led-lightbulb"
// (Objects) for Key Takeaways, the library's own idea/insight glyph. Both stripped down to
// plain currentColor fills (the lightbulb's source art has two accent-blue rays) to match
// every other icon in this file rather than hardcoding a brand hex into markup.
const chaptersIcon = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><rect x="3" y="6" width="2" height="2"/><rect x="8" y="6" width="21" height="2"/><rect x="8" y="24.1" width="21" height="2"/><rect x="8" y="15" width="21" height="2"/><rect x="3" y="15" width="2" height="2"/><rect x="3" y="24" width="2" height="2"/></svg>';
const takeawaysIcon = '<svg width="14" height="14" viewBox="0 0 96 96" fill="currentColor" aria-hidden="true"><path d="M73.4 30.4C72.7 26.9 71.2 23.6 68.8 20.4 63.9 13.8 56.3 10 48 10 39.7 10 32.1 13.8 27.2 20.4 24.8 23.6 23.3 26.9 22.6 30.4 21.3 37 23.3 44.2 27.8 49.6L32 54.4C36.7 59.1 37 66.8 37 67L37 80C37 83.3 39.7 86 43 86L53 86C56.3 86 59 83.3 59 80L59 67C59 66.8 59.3 59 64 54.4L68.2 49.6C72.7 44.2 74.7 37.1 73.4 30.4ZM24.6 30.8C25.2 27.6 26.6 24.6 28.8 21.6 33.3 15.5 40.4 12 48 12 55.6 12 62.7 15.5 67.2 21.6 69.4 24.5 70.8 27.6 71.4 30.8 71.8 32.8 71.8 34.9 71.6 37L24.4 37C24.1 34.9 24.2 32.8 24.6 30.8ZM57 72 39 72 39 68 57 68 57 72ZM39 74 57 74 57 78 39 78 39 74ZM53 84 43 84C40.8 84 39 82.2 39 80L57 80C57 82.2 55.2 84 53 84ZM66.7 48.3 62.5 53C58.3 57.2 57.3 63.6 57 66L38.9 66C38.7 63.6 37.7 57.3 33.5 53.1L29.3 48.4C27 45.7 25.4 42.4 24.7 39L71.3 39C70.5 42.4 69 45.6 66.7 48.3Z"/><rect x="38.4" y="42.4" width="2" height="21.3" transform="matrix(0.9401 -0.3409 0.3409 0.9401 -15.7077 16.6061)"/><rect x="46" y="52" width="21.3" height="2" transform="matrix(0.3409 -0.9401 0.9401 0.3409 -12.5193 88.1437)"/><rect x="47" y="43" width="2" height="20"/></svg>';

function renderCustomItemArtwork(item, fallbackMarkup = '') {
  if (!item?.iconImage) return fallbackMarkup;
  const decorative = item.iconDecorative !== false;
  const fit = item.iconFit === 'cover' ? 'cover' : 'contain';
  return `<img class="custom-item-icon" src="${escapeAttribute(item.iconImage)}" alt="${decorative ? '' : escapeAttribute(item.iconAltText || '')}" ${decorative ? 'aria-hidden="true"' : ''} style="object-fit:${fit};">`;
}

// "3:24" / "03:24" / "1:03:24" -> seconds. Returns null (never throws) for anything else,
// so one malformed authored line degrades to "skip this row," never to a broken preview
// or export — shared by parseChapters/parseTranscriptSegments below, per "avoid
// duplicating timestamp parsing and formatting logic."
export function parseTimestampToSeconds(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const parts = text.split(':').map(part => part.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some(part => !/^\d+$/.test(part))) return null;
  const numbers = parts.map(Number);
  const seconds = numbers.length === 3
    ? numbers[0] * 3600 + numbers[1] * 60 + numbers[2]
    : numbers[0] * 60 + numbers[1];
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

// Node-side mirror of generateJS's runtime formatSecondsLabel() — duplicated deliberately
// (one runs at compile time, one is a string the browser executes), matching the existing
// formatDurationLabel/formatMediaTime split already established in this file.
export function formatSecondsLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${String(mins).padStart(2, '0')}:${secs}` : `${mins}:${secs}`;
}

// Chapters: one per line, "timestamp | Title | Description (optional)". A line with no
// valid timestamp or no title is skipped, not thrown — see js/editor-schemas.js's
// audio-player comment for why this is a delimited field rather than a nested repeatable
// schema list. Always returned in chronological order regardless of authoring order.
export function parseChapters(raw) {
  const chapters = String(raw ?? '').split('\n').reduce((list, line) => {
    if (!line.trim()) return list;
    const parts = line.split('|');
    const timestamp = parseTimestampToSeconds(parts[0]);
    const title = (parts[1] || '').trim();
    const description = (parts[2] || '').trim();
    if (timestamp === null || !title) return list;
    list.push({ timestamp, title, description });
    return list;
  }, []);
  return chapters.sort((a, b) => a.timestamp - b.timestamp);
}

// Transcript segments: one per line, "timestamp | Speaker (optional) | Text". A 2-part
// line ("timestamp | Text", no speaker column) is also accepted so authors aren't forced
// to type an empty speaker column when nobody needs one.
export function parseTranscriptSegments(raw) {
  const segments = String(raw ?? '').split('\n').reduce((list, line) => {
    if (!line.trim()) return list;
    const parts = line.split('|');
    const timestamp = parseTimestampToSeconds(parts[0]);
    if (timestamp === null) return list;
    const speaker = parts.length >= 3 ? (parts[1] || '').trim() : '';
    const text = (parts.length >= 3 ? parts.slice(2).join('|') : (parts[1] || '')).trim();
    if (!text) return list;
    list.push({ timestamp, speaker, text });
    return list;
  }, []);
  return segments.sort((a, b) => a.timestamp - b.timestamp);
}

// Key takeaways: one plain-text item per non-blank line — the same "each line is one
// entry" convention as the two parsers above, at its simplest since a takeaway has no
// timestamp or sub-fields.
export function parseTakeaways(raw) {
  return String(raw ?? '').split('\n').map(line => line.trim()).filter(Boolean);
}

export function generateHTML(config, instanceId) {
  const item = config.items[0] || {};
  const src = item.content || '';
  const title = item.title || 'Instructional Audio Segment';
  const seriesLabel = item.seriesLabel || '';
  const description = item.description || '';
  const plainTranscript = item.transcript || '';
  const mode = ['compact', 'podcast'].includes(config.presentationMode) ? config.presentationMode : 'learning';
  const chapters = parseChapters(config.chapters);
  const segments = parseTranscriptSegments(config.transcriptSegments);
  const takeaways = parseTakeaways(config.takeaways);
  const progressPersistence = config.progressPersistence !== false;
  const takeawaysVisibility = config.takeawaysVisibility === 'afterCompletion' ? 'afterCompletion' : 'always';
  // isEmpty(), not a bare truthy check: a richtext field's "empty" value from the
  // contentEditable editor is often not the literal string '' but a visually-empty
  // fragment like '<p></p>' or '<br>' — strips tags/&nbsp; before deciding, matching how
  // this same field type's own required/warning checks already treat "empty" elsewhere
  // (js/field-validation.js).
  const hasTranscript = Boolean(segments.length) || !isEmpty(plainTranscript);
  const isCompact = mode === 'compact';

  const identityBlock = `
    <div class="aud-identity">
      <div class="aud-art">
        ${renderCustomItemArtwork(item, '<svg width="20" height="20" viewBox="0 0 96 96" fill="currentColor" aria-hidden="true"><path class="aud-art-accent" d="M31 16.4C32.5 17.7 34.1 18.8 35.8 19.6 38.6 21 41.7 21.9 44.8 22.1L44.9 20.1C42 19.9 39.2 19.2 36.6 17.9 34.3 16.8 32.3 15.3 30.6 13.4L29 11.5 29 43.5C27.3 41.4 24.5 40 21.5 40 16.3 40 12 44 12 49 12 54 16.3 58 21.5 58 26.7 58 31 54 31 49L31 16.4ZM21.5 56C17.4 56 14 52.9 14 49 14 45.1 17.4 42 21.5 42 25.6 42 29 45.1 29 49 29 52.9 25.6 56 21.5 56Z"/><path d="M70.3 21.8C66.3 19.8 62.8 17.1 59.7 13.9L58 12 58 66C55.4 61.8 50.7 59 45.2 59 37 59 30.4 65.3 30.4 73 30.4 80.7 37 87 45.2 87 53.4 87 60 80.7 60 73L60 17C62.8 19.7 66 21.9 69.4 23.6 74.2 26 79.3 27.4 84.7 27.8L84.8 25.8C79.8 25.5 74.9 24.1 70.3 21.8ZM45.2 85C38.1 85 32.4 79.6 32.4 73 32.4 66.4 38.1 61 45.2 61 52.3 61 58 66.4 58 73 58 79.6 52.3 85 45.2 85Z"/></svg>')}
      </div>
      <div class="aud-identity-text">
        ${!isCompact && seriesLabel ? `<p class="aud-series-label">${escapeHTML(seriesLabel)}</p>` : ''}
        <h3 class="aud-title">${escapeHTML(title)}</h3>
        ${!isCompact && description ? `<p class="aud-description">${escapeHTML(description)}</p>` : ''}
      </div>
    </div>`;

  const currentChapterBlock = !isCompact && chapters.length
    ? `<p class="aud-current-chapter" id="${instanceId}-current-chapter" aria-live="off">${escapeHTML(chapters[0].title)}</p>`
    : '';

  const resumeBlock = !isCompact && progressPersistence
    ? `<div class="aud-resume-prompt" id="${instanceId}-resume-prompt" hidden>
        <span class="aud-resume-text" id="${instanceId}-resume-text"></span>
        <button type="button" class="aud-resume-btn" id="${instanceId}-resume-btn">Resume</button>
        <button type="button" class="aud-restart-choice-btn" id="${instanceId}-restart-choice-btn">Start Over</button>
      </div>`
    : '';

  const controlsBlock = `
    <div class="aud-controls-row">
      <button type="button" class="aud-skip-btn aud-skip-back-btn" id="${instanceId}-skip-back" aria-label="Replay ${AUDIO_SKIP_SECONDS} seconds" disabled>${skipBackIcon}</button>
      <button type="button" class="aud-play-btn" id="${instanceId}-play-btn" aria-label="Play audio" aria-pressed="false">
        <svg class="aud-play-svg" aria-hidden="true" width="18" height="18" viewBox="0 0 32 32" fill="currentColor"><path d="M22 16 13 22.7 13 9.3Z"/></svg>
        <svg class="aud-pause-svg" aria-hidden="true" width="18" height="18" viewBox="0 0 32 32" fill="currentColor" style="display:none;"><rect x="11" y="10" width="3" height="12"/><rect x="18" y="10" width="3" height="12"/></svg>
      </button>
      <button type="button" class="aud-skip-btn aud-skip-forward-btn" id="${instanceId}-skip-forward" aria-label="Forward ${AUDIO_SKIP_SECONDS} seconds" disabled>${skipForwardIcon}</button>
      <div class="aud-scrub-wrap">
        <div class="aud-scrub-bar" id="${instanceId}-scrub" role="slider" tabindex="0" aria-label="Audio position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0 percent">
          <div class="aud-scrub-fill" id="${instanceId}-scrub-fill"></div>
        </div>
        <div class="aud-chapter-markers" id="${instanceId}-chapter-markers"></div>
      </div>
      <span class="aud-timer" id="${instanceId}-timer" aria-live="off">0:00 / 0:00</span>
      <button type="button" class="aud-speed-btn" id="${instanceId}-speed-btn" aria-label="Playback speed: 1x">1x</button>
      <button type="button" class="aud-mute-btn" id="${instanceId}-mute-btn" aria-label="Mute audio" aria-pressed="false">
        ${volumeOnIcon}
        ${volumeOffIcon}
      </button>
    </div>`;

  const chapterNavBlock = !isCompact && chapters.length
    ? `<nav class="aud-chapter-nav" aria-label="Chapters">
        <button type="button" class="aud-chapter-toggle" id="${instanceId}-chapter-toggle" aria-expanded="true" aria-controls="${instanceId}-chapter-list">
          <span class="aud-chapter-toggle-label">${chaptersIcon}<span class="aud-section-heading">Chapters</span></span>
          <svg class="aud-chapter-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M16 21.99 5.29 11.28 6.71 9.87 16 19.16 25.29 9.87 26.71 11.28Z"/></svg>
        </button>
        <ul class="aud-chapter-list" id="${instanceId}-chapter-list">
          ${chapters.map((chapter, i) => `
            <li>
              <button type="button" class="aud-chapter-item" data-idx="${i}" data-time="${chapter.timestamp}" aria-label="Jump to chapter: ${escapeAttribute(chapter.title)}, ${escapeAttribute(formatSecondsLabel(chapter.timestamp))}">
                <span class="aud-chapter-time">${escapeHTML(formatSecondsLabel(chapter.timestamp))}</span>
                <span class="aud-chapter-title">${escapeHTML(chapter.title)}</span>
                ${chapter.description ? `<span class="aud-chapter-desc">${escapeHTML(chapter.description)}</span>` : ''}
              </button>
            </li>`).join('')}
        </ul>
      </nav>`
    : '';

  const progressStatusBlock = !isCompact
    ? `<div class="aud-progress-status">
        <p class="aud-progress-text" id="${instanceId}-progress-text">Not started</p>
      </div>`
    : '';

  const transcriptBlock = !isCompact
    ? (hasTranscript
      ? `<div class="aud-transcript-section">
          <button type="button" class="aud-transcript-toggle" id="${instanceId}-transcript-toggle" aria-expanded="false" aria-controls="${instanceId}-transcript-panel">
            ${transcriptIcon}<span>Show Transcript</span>
          </button>
          <div class="aud-transcript-panel" id="${instanceId}-transcript-panel" hidden>
            ${segments.length ? `
              <div class="aud-transcript-search-row">
                <label class="sr-only" for="${instanceId}-transcript-search">Search transcript</label>
                <input type="search" class="aud-transcript-search" id="${instanceId}-transcript-search" placeholder="Search transcript">
              </div>
              <p class="aud-transcript-search-status" id="${instanceId}-transcript-search-status" role="status" aria-live="polite"></p>
              <div class="aud-transcript-segments" id="${instanceId}-transcript-segments">
                ${segments.map((segment, i) => `
                  <button type="button" class="aud-transcript-segment" data-idx="${i}" data-time="${segment.timestamp}">
                    <span class="aud-segment-time">${escapeHTML(formatSecondsLabel(segment.timestamp))}</span>
                    ${segment.speaker ? `<span class="aud-segment-speaker">${escapeHTML(segment.speaker)}:</span>` : ''}
                    <span class="aud-segment-text">${escapeHTML(segment.text)}</span>
                  </button>`).join('')}
              </div>
              <p class="aud-transcript-no-results" id="${instanceId}-transcript-no-results" hidden>No matching transcript lines.</p>
            ` : `<div class="aud-transcript-plain">${plainTranscript}</div>`}
          </div>
        </div>`
      : '<p class="media-alternative-note sr-only">No transcript has been supplied for this audio.</p>')
    : '';

  const takeawaysBlock = !isCompact && takeaways.length
    ? `<div class="aud-takeaways-panel">
        <h4 class="aud-section-heading aud-takeaways-heading">${takeawaysIcon}<span>Key Takeaways</span></h4>
        ${takeawaysVisibility === 'afterCompletion' ? `<p class="aud-takeaways-locked-msg" id="${instanceId}-takeaways-locked">Complete the audio to reveal key takeaways.</p>` : ''}
        <ul class="aud-takeaways-list" id="${instanceId}-takeaways-list" ${takeawaysVisibility === 'afterCompletion' ? 'hidden' : ''}>
          ${takeaways.map(takeaway => `<li>${escapeHTML(takeaway)}</li>`).join('')}
        </ul>
      </div>`
    : '';

  return `
    <div class="aud-player" id="${instanceId}-root" data-mode="${mode}"
      data-chapters="${escapeAttribute(JSON.stringify(chapters))}"
      data-segments="${escapeAttribute(JSON.stringify(segments))}"
      data-progress-persistence="${progressPersistence ? '1' : '0'}"
      data-takeaways-visibility="${takeawaysVisibility}"
      data-takeaways-count="${takeaways.length}">
      ${identityBlock}
      ${currentChapterBlock}
      <p class="aud-status-region sr-only" id="${instanceId}-status" role="status" aria-live="polite"></p>
      ${resumeBlock}
      ${controlsBlock}
      <audio id="${instanceId}-audio-el" src="${escapeAttribute(src)}" preload="metadata" style="display:none;"></audio>
      ${chapterNavBlock}
      ${progressStatusBlock}
      ${transcriptBlock}
      ${takeawaysBlock}
    </div>
  `;
}

export function generateCSS() {
  return `
    .aud-player {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .aud-identity {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .aud-art {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      /* Not a lighter shade of AT&T Blue: not part of the approved palette. A neutral
         brand-grey backdrop also gives the icon better contrast than blue-on-light-blue. */
      background-color: var(--border-color);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      transition: width 0.2s, height 0.2s;
    }
    .aud-art .custom-item-icon { width: 100%; height: 100%; }
    .aud-art-accent { fill: var(--accent); }
    .aud-series-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--text-muted);
      margin-bottom: 2px;
    }
    .aud-title {
      font-size: 13px;
      font-weight: 600;
    }
    .aud-description {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .aud-current-chapter {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin: -4px 0 0;
    }
    .aud-status-region { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .aud-resume-prompt {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      background-color: var(--bg-body);
      border-radius: var(--border-radius);
      padding: 8px 10px;
      font-size: 11px;
    }
    .aud-resume-text { color: var(--text-main); margin-right: auto; }
    .aud-resume-btn,
    .aud-restart-choice-btn {
      background-color: var(--bg-card);
      border: 1px solid var(--primary);
      color: var(--primary);
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      border-radius: var(--button-radius);
      cursor: pointer;
    }
    .aud-resume-btn { background-color: var(--primary); color: var(--on-primary); }
    .aud-resume-btn:hover { background-color: var(--primary-hover); border-color: var(--primary-hover); }
    .aud-restart-choice-btn:hover { border-color: var(--primary-hover); color: var(--primary-hover); }
    .aud-controls-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      row-gap: 8px;
    }
    .aud-play-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background-color: var(--primary);
      color: var(--on-primary);
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;
      flex-shrink: 0;
    }
    .aud-play-btn:hover { transform: scale(1.05); }
    /* Replay/Forward are secondary to the main play button — smaller, outlined rather than
       filled, so the play control stays visually dominant (still ~40px, a real touch
       target). Cobalt-outlined at rest like sorting-activity's .target-btn, since these
       are clickable at all times. */
    .aud-skip-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--bg-card);
      border: 1px solid var(--primary);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .aud-skip-btn:hover { border-color: var(--primary-hover); color: var(--primary-hover); }
    .aud-skip-btn:disabled { opacity: 0.5; cursor: default; }
    /* Chapter markers are a sibling overlay (.aud-chapter-markers), not children of
       .aud-scrub-bar itself: axe's "nested-interactive" rule correctly flags real <button>
       markers living inside an element with role="slider" — a slider's content model
       doesn't expect focusable descendants. Positioned absolutely over .aud-scrub-wrap
       instead, which looks identical but keeps the two interactive widgets as DOM siblings. */
    .aud-scrub-wrap {
      position: relative;
      flex: 1 1 80px;
      min-width: 80px;
    }
    .aud-scrub-bar {
      height: 6px;
      border-radius: 4px;
      background-color: var(--bg-body);
      cursor: pointer;
      position: relative;
    }
    .aud-scrub-fill {
      height: 100%;
      border-radius: 4px;
      background-color: var(--accent);
    }
    .aud-chapter-markers {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    /* A 24x24 hit target (WCAG 2.2 target-size) centered on the timestamp, but the visible
       glyph (::before) stays a small 10px dot so the track itself doesn't read as noisy —
       "visible without making the timeline noisy" and an adequate touch/click target are
       both satisfied by decoupling hit-area size from visual size, not by picking one. */
    .aud-chapter-marker {
      position: absolute;
      top: 50%;
      width: 24px;
      height: 24px;
      margin-left: -12px;
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .aud-chapter-marker::before {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--bg-card);
      border: 2px solid var(--primary);
    }
    .aud-chapter-marker:hover::before { background-color: var(--primary); }
    .aud-timer {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .aud-speed-btn {
      background-color: var(--bg-card);
      border: 1px solid var(--primary);
      color: var(--primary);
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: var(--button-radius);
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .aud-speed-btn:hover { border-color: var(--primary-hover); color: var(--primary-hover); }
    .aud-mute-btn {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background-color: var(--bg-card);
      border: 1px solid var(--primary);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
      padding: 0;
    }
    .aud-mute-btn:hover { border-color: var(--primary-hover); color: var(--primary-hover); }
    .aud-section-heading {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .aud-chapter-nav { border-top: var(--border-style); padding-top: 10px; }
    .aud-chapter-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      background: none;
      border: none;
      padding: 0;
      margin-bottom: 6px;
      cursor: pointer;
    }
    .aud-chapter-toggle .aud-section-heading { margin-bottom: 0; }
    .aud-chapter-toggle-label { display: flex; align-items: center; gap: 6px; color: var(--text-muted); }
    .aud-chapter-chevron {
      color: var(--primary);
      flex-shrink: 0;
      transition: transform 0.25s ease;
    }
    /* Points down (content visible below) at rest — chapters start expanded — and rotates
       to point sideways once collapsed, the same convention accordion.js's own chevron
       already establishes for expanded/collapsed state. */
    .aud-chapter-toggle[aria-expanded="false"] .aud-chapter-chevron { transform: rotate(-90deg); }
    /* list-style/margin/padding reset: a bare <ul>'s browser-default bullet + indent was
       leaking through (display: flex on the *list*, below, doesn't change each <li>'s own
       default display: list-item — that needs resetting directly, not inherited). Only the
       active row's own "▸" marker (.aud-chapter-item.aud-chapter-active below) should ever
       appear, never a generic bullet. */
    .aud-chapter-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    .aud-chapter-list li { list-style: none; margin: 0; padding: 0; }
    .aud-chapter-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      border-radius: 6px;
      padding: 6px 8px;
      cursor: pointer;
      font-size: 12px;
      color: var(--text-main);
    }
    .aud-chapter-item:hover { background-color: var(--bg-body); }
    .aud-chapter-item.aud-chapter-active {
      background-color: var(--bg-body);
      font-weight: 700;
      /* Not color alone: the active row also gets aria-current="true" (generateJS) and a
         leading marker character, not just a background tint. */
    }
    .aud-chapter-item.aud-chapter-active .aud-chapter-title::before { content: '▸ '; color: var(--primary); }
    .aud-chapter-time { color: var(--text-muted); font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .aud-chapter-desc { display: block; width: 100%; font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .aud-progress-status { font-size: 11px; color: var(--text-muted); }
    .aud-transcript-section { border-top: var(--border-style); padding-top: 10px; }
    .aud-transcript-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--primary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 0;
    }
    .aud-transcript-toggle:hover { color: var(--primary-hover); }
    .aud-transcript-panel {
      margin-top: 8px;
      max-height: 260px;
      overflow-y: auto;
      border: var(--border-style);
      border-radius: var(--border-radius);
      padding: 10px;
    }
    .aud-transcript-search-row { margin-bottom: 8px; }
    .aud-transcript-search {
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      font-size: 12px;
      border: var(--border-style);
      border-radius: 6px;
      background-color: var(--bg-card);
      color: var(--text-main);
    }
    .aud-transcript-search-status { font-size: 11px; color: var(--text-muted); margin: 0 0 6px; }
    .aud-transcript-segments { display: flex; flex-direction: column; gap: 2px; }
    .aud-transcript-segment {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      border-radius: 6px;
      padding: 6px 8px;
      cursor: pointer;
      font-size: 12px;
      color: var(--text-main);
      line-height: 1.5;
    }
    .aud-transcript-segment:hover { background-color: var(--bg-body); }
    .aud-transcript-segment.aud-segment-active {
      background-color: var(--bg-body);
      border-left: 3px solid var(--primary);
      /* Not color alone: also carries a leading time-column emphasis and font-weight. */
      font-weight: 600;
    }
    .aud-segment-time { color: var(--text-muted); font-variant-numeric: tabular-nums; flex-shrink: 0; font-weight: 400; }
    .aud-segment-speaker { font-weight: 700; flex-shrink: 0; }
    .aud-search-highlight { background-color: var(--warning); color: var(--text-main); border-radius: 2px; padding: 0 1px; }
    .aud-transcript-plain { font-size: 12px; line-height: 1.6; }
    .aud-transcript-no-results { font-size: 12px; color: var(--text-muted); font-style: italic; }
    .aud-takeaways-panel {
      background-color: var(--bg-body);
      border-radius: var(--border-radius);
      padding: 12px;
    }
    .aud-takeaways-heading { display: flex; align-items: center; gap: 6px; }
    .aud-takeaways-list { padding-left: 18px; font-size: 12px; line-height: 1.7; }
    .aud-takeaways-locked-msg { font-size: 12px; color: var(--text-muted); font-style: italic; }

    /* Podcast mode: larger artwork, laid out beside the identity text on wider screens. */
    .aud-player[data-mode="podcast"] .aud-art { width: 72px; height: 72px; border-radius: var(--border-radius); }
    .aud-player[data-mode="podcast"] .aud-title { font-size: 16px; }

    /* Compact mode: condensed single-row control set, no secondary sections (those are
       simply not rendered for compact — see generateHTML — this only tightens sizing). */
    .aud-player[data-mode="compact"] { padding: 10px 12px; gap: 8px; }
    .aud-player[data-mode="compact"] .aud-art { width: 28px; height: 28px; }
    .aud-player[data-mode="compact"] .aud-title { font-size: 12px; }
    .aud-player[data-mode="compact"] .aud-play-btn { width: 34px; height: 34px; }
    .aud-player[data-mode="compact"] .aud-skip-btn { width: 30px; height: 30px; }

    @media (max-width: 420px) {
      .aud-controls-row { row-gap: 10px; }
      .aud-scrub-wrap { flex-basis: 100%; order: 1; }
      .aud-timer { order: 2; }
    }
    @media (forced-colors: active) {
      .aud-scrub-fill { background: Highlight; }
      .aud-chapter-marker::before { border-color: Highlight; }
    }`;
}

export function generateJS(config, instanceId) {
  return `
    var AUD_SKIP_SECONDS = ${AUDIO_SKIP_SECONDS};
    var AUD_COMPLETION_THRESHOLD = ${AUDIO_COMPLETION_THRESHOLD};
    var AUD_COMPLETION_TAIL_SECONDS = ${AUDIO_COMPLETION_TAIL_SECONDS};
    var AUD_RESUME_MIN_SECONDS = ${AUDIO_RESUME_MIN_SECONDS};
    var AUD_SPEEDS = [1, 1.25, 1.5, 2];

    function audFormatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
      var total = Math.floor(seconds);
      var hrs = Math.floor(total / 3600);
      var mins = Math.floor((total % 3600) / 60);
      var secs = String(total % 60).padStart(2, '0');
      return hrs > 0 ? (hrs + ':' + String(mins).padStart(2, '0') + ':' + secs) : (mins + ':' + secs);
    }

    // A short, stable, non-cryptographic hash (djb2) of instanceId + audio source — the
    // localStorage key. Deterministic per component instance and per source, so changing
    // the audio source naturally orphans old progress instead of misapplying it, with no
    // separate "reset on source change" step needed.
    function audHash(str) {
      var hash = 5381;
      for (var i = 0; i < str.length; i++) { hash = ((hash << 5) + hash) + str.charCodeAt(i); hash = hash & hash; }
      return (hash >>> 0).toString(36);
    }

    function audReadProgress(key) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }
    function audWriteProgress(key, data) {
      try { window.localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* storage unavailable/blocked — playback continues normally */ }
    }

    function audRenderSegmentText(container, text, query) {
      container.textContent = '';
      if (!query) { container.appendChild(document.createTextNode(text)); return; }
      var lower = text.toLowerCase();
      var q = query.toLowerCase();
      var pos = 0;
      var idx = lower.indexOf(q, pos);
      if (idx === -1) { container.appendChild(document.createTextNode(text)); return; }
      while (idx !== -1) {
        if (idx > pos) container.appendChild(document.createTextNode(text.slice(pos, idx)));
        var mark = document.createElement('mark');
        mark.className = 'aud-search-highlight';
        mark.textContent = text.slice(idx, idx + query.length);
        container.appendChild(mark);
        pos = idx + query.length;
        idx = lower.indexOf(q, pos);
      }
      if (pos < text.length) container.appendChild(document.createTextNode(text.slice(pos)));
    }

    function initAudioPlayer() {
      var root = document.getElementById('${instanceId}-root');
      if (!root) return;
      var audio = document.getElementById('${instanceId}-audio-el');
      var playBtn = document.getElementById('${instanceId}-play-btn');
      var skipBackBtn = document.getElementById('${instanceId}-skip-back');
      var skipForwardBtn = document.getElementById('${instanceId}-skip-forward');
      var scrubBar = document.getElementById('${instanceId}-scrub');
      var scrubFill = document.getElementById('${instanceId}-scrub-fill');
      var chapterMarkersEl = document.getElementById('${instanceId}-chapter-markers');
      var timerEl = document.getElementById('${instanceId}-timer');
      var speedBtn = document.getElementById('${instanceId}-speed-btn');
      var muteBtn = document.getElementById('${instanceId}-mute-btn');
      var statusEl = document.getElementById('${instanceId}-status');
      var currentChapterEl = document.getElementById('${instanceId}-current-chapter');
      var chapterListEl = document.getElementById('${instanceId}-chapter-list');
      var chapterToggle = document.getElementById('${instanceId}-chapter-toggle');
      var progressTextEl = document.getElementById('${instanceId}-progress-text');
      var resumePrompt = document.getElementById('${instanceId}-resume-prompt');
      var resumeText = document.getElementById('${instanceId}-resume-text');
      var resumeBtn = document.getElementById('${instanceId}-resume-btn');
      var restartChoiceBtn = document.getElementById('${instanceId}-restart-choice-btn');
      var transcriptToggle = document.getElementById('${instanceId}-transcript-toggle');
      var transcriptPanel = document.getElementById('${instanceId}-transcript-panel');
      var transcriptSearch = document.getElementById('${instanceId}-transcript-search');
      var transcriptSearchStatus = document.getElementById('${instanceId}-transcript-search-status');
      var transcriptSegmentsEl = document.getElementById('${instanceId}-transcript-segments');
      var transcriptNoResults = document.getElementById('${instanceId}-transcript-no-results');
      var takeawaysList = document.getElementById('${instanceId}-takeaways-list');
      var takeawaysLocked = document.getElementById('${instanceId}-takeaways-locked');
      if (!audio || !playBtn) return;

      var CHAPTERS = [];
      var SEGMENTS = [];
      try { CHAPTERS = JSON.parse(root.getAttribute('data-chapters') || '[]'); } catch (e) { CHAPTERS = []; }
      try { SEGMENTS = JSON.parse(root.getAttribute('data-segments') || '[]'); } catch (e) { SEGMENTS = []; }
      var PROGRESS_PERSISTENCE = root.getAttribute('data-progress-persistence') === '1';
      var TAKEAWAYS_VISIBILITY = root.getAttribute('data-takeaways-visibility') || 'always';
      var TAKEAWAYS_COUNT = Number(root.getAttribute('data-takeaways-count') || '0');
      var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      var progressKey = 'rcb-audio-progress-' + audHash('${instanceId}|' + (audio.getAttribute('src') || ''));
      var furthestPosition = 0;
      var completed = false;
      var resumeHandled = false;
      var lastSaveTime = 0;
      var lastActiveChapterIdx = -1;
      var lastActiveSegmentIdx = -1;
      var transcriptUserScrolled = false;
      var programmaticScroll = false;
      // furthestPosition/completed only reflect real prior progress once the
      // loadedmetadata handler has actually read localStorage (below). Without this guard,
      // a beforeunload/visibilitychange save firing before that read completes (e.g. slow
      // network, or a tab closed the instant it opened) would write the JS-initialized
      // zeros and silently erase real progress from an earlier session.
      var progressHydrated = !PROGRESS_PERSISTENCE;
      // A second, distinct guard: even *after* hydration, audio.currentTime genuinely is
      // 0 until the learner actually plays or seeks — a visibilitychange/beforeunload save
      // firing in that window (e.g. the tab loses focus while the resume prompt is still
      // showing, before it's been acted on) would silently overwrite a real prior
      // "position: 20" with "position: 0", even though the resume prompt itself already
      // read and displayed the correct value — the *next* Resume click would then read
      // the just-clobbered 0 back out. Set true by the native 'seeking' event (covers
      // scrub/skip/chapter-click/segment-click/Resume/Start Over — every way currentTime
      // can change) and by 'play', so a save is never written before the learner has
      // actually done something this load.
      var hasEngaged = false;

      function announce(text) { if (statusEl) statusEl.textContent = text; }

      function saveProgress(force) {
        if (!PROGRESS_PERSISTENCE || !progressHydrated || !hasEngaged) return;
        var now = Date.now();
        if (!force && now - lastSaveTime < 5000) return;
        lastSaveTime = now;
        audWriteProgress(progressKey, {
          position: audio.currentTime || 0,
          furthest: furthestPosition,
          completed: completed,
          updatedAt: now
        });
      }

      function updateProgressStatusText() {
        if (!progressTextEl) return;
        if (completed) { progressTextEl.textContent = 'Completed'; return; }
        if (audio.duration && furthestPosition > 0) {
          var pct = Math.round(Math.max(0, Math.min(1, furthestPosition / audio.duration)) * 100);
          progressTextEl.textContent = pct + '% listened';
          return;
        }
        progressTextEl.textContent = 'Not started';
      }

      function markCompleted() {
        if (completed) return;
        completed = true;
        saveProgress(true);
        if (TAKEAWAYS_VISIBILITY === 'afterCompletion' && takeawaysList) {
          takeawaysList.hidden = false;
          if (takeawaysLocked) takeawaysLocked.hidden = true;
        }
        updateProgressStatusText();
        announce('Audio completed.' + (TAKEAWAYS_COUNT ? ' Key takeaways are now available.' : ''));
        viewedItems.add(0);
        updateProgress();
      }

      function checkCompletion() {
        if (completed || !audio.duration) return;
        var reachedThreshold = (audio.currentTime / audio.duration) >= AUD_COMPLETION_THRESHOLD;
        var reachedTail = (audio.duration - audio.currentTime) <= AUD_COMPLETION_TAIL_SECONDS;
        if (reachedThreshold || reachedTail) markCompleted();
      }

      // --- Playback core: play/pause, Replay/Forward, scrub, speed, mute ---
      function togglePlayback() {
        if (audio.paused) {
          audio.play().catch(function() { /* autoplay blocked or invalid source URL */ });
        } else {
          audio.pause();
        }
      }
      playBtn.addEventListener('click', togglePlayback);

      audio.addEventListener('seeking', function() { hasEngaged = true; });

      audio.addEventListener('play', function() {
        hasEngaged = true;
        // Pause any other audio/video element on the page — multiple instances of this
        // (or any other) component must operate independently, but only one should audibly
        // play at once. Plain DOM traversal, no shared global state.
        var others = document.querySelectorAll('audio, video');
        for (var i = 0; i < others.length; i++) {
          if (others[i] !== audio && !others[i].paused) others[i].pause();
        }
        playBtn.querySelector('.aud-play-svg').style.display = 'none';
        playBtn.querySelector('.aud-pause-svg').style.display = 'block';
        playBtn.style.backgroundColor = 'var(--primary-hover)';
        playBtn.setAttribute('aria-label', 'Pause audio');
        playBtn.setAttribute('aria-pressed', 'true');
        if (resumePrompt && !resumePrompt.hidden) resumePrompt.hidden = true;
        announce('Playing.');
      });
      audio.addEventListener('pause', function() {
        playBtn.querySelector('.aud-play-svg').style.display = 'block';
        playBtn.querySelector('.aud-pause-svg').style.display = 'none';
        playBtn.style.backgroundColor = 'var(--primary)';
        playBtn.setAttribute('aria-label', 'Play audio');
        playBtn.setAttribute('aria-pressed', 'false');
        saveProgress(true);
        if (!audio.ended) announce('Paused.');
      });

      function skipBy(delta) {
        if (!Number.isFinite(audio.duration)) return;
        audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta));
      }
      if (skipBackBtn) skipBackBtn.addEventListener('click', function() { skipBy(-AUD_SKIP_SECONDS); });
      if (skipForwardBtn) skipForwardBtn.addEventListener('click', function() { skipBy(AUD_SKIP_SECONDS); });

      function scrubAudio(event) {
        var rect = scrubBar.getBoundingClientRect();
        var percentage = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        scrubFill.style.width = percentage + '%';
        scrubBar.setAttribute('aria-valuenow', String(Math.round(percentage)));
        scrubBar.setAttribute('aria-valuetext', Math.round(percentage) + ' percent');
        if (audio.duration) audio.currentTime = audio.duration * percentage / 100;
      }
      scrubBar.addEventListener('click', scrubAudio);
      scrubBar.addEventListener('keydown', function(event) {
        if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].indexOf(event.key) === -1) return;
        event.preventDefault();
        var value = Number(scrubBar.getAttribute('aria-valuenow')) || 0;
        if (event.key === 'Home') value = 0;
        else if (event.key === 'End') value = 100;
        else value += (event.key === 'ArrowRight' || event.key === 'ArrowUp') ? 5 : -5;
        value = Math.max(0, Math.min(100, value));
        scrubBar.setAttribute('aria-valuenow', String(value));
        scrubBar.setAttribute('aria-valuetext', value + ' percent');
        scrubFill.style.width = value + '%';
        if (audio.duration) audio.currentTime = audio.duration * value / 100;
      });

      if (speedBtn) speedBtn.addEventListener('click', function() {
        var current = audio.playbackRate || 1;
        var idx = AUD_SPEEDS.indexOf(current);
        if (idx === -1) idx = 0;
        var next = AUD_SPEEDS[(idx + 1) % AUD_SPEEDS.length];
        audio.playbackRate = next;
        var label = next + 'x';
        speedBtn.textContent = label;
        speedBtn.setAttribute('aria-label', 'Playback speed: ' + label);
      });

      if (muteBtn) muteBtn.addEventListener('click', function() {
        audio.muted = !audio.muted;
        var onSvg = muteBtn.querySelector('.aud-volume-on-svg');
        var offSvg = muteBtn.querySelector('.aud-volume-off-svg');
        if (audio.muted) {
          if (onSvg) onSvg.style.display = 'none';
          if (offSvg) offSvg.style.display = 'block';
          muteBtn.setAttribute('aria-label', 'Unmute audio');
          muteBtn.setAttribute('aria-pressed', 'true');
        } else {
          if (onSvg) onSvg.style.display = 'block';
          if (offSvg) offSvg.style.display = 'none';
          muteBtn.setAttribute('aria-label', 'Mute audio');
          muteBtn.setAttribute('aria-pressed', 'false');
        }
      });

      // --- Chapters: markers on the scrub bar, chapter list, "current chapter" label ---
      function renderChapterMarkers() {
        if (!chapterMarkersEl || !audio.duration || !CHAPTERS.length) return;
        chapterMarkersEl.innerHTML = '';
        CHAPTERS.forEach(function(chapter, i) {
          if (chapter.timestamp > audio.duration) return;
          // Inset slightly from the very ends of the track (not a bare 0-100 clamp): a
          // marker's own 24px hit target (WCAG target-size) would otherwise sit flush
          // against — or overlapping — the Replay/Forward buttons immediately outside the
          // scrub track at 0%/100%.
          var pct = Math.max(6, Math.min(94, (chapter.timestamp / audio.duration) * 100));
          var marker = document.createElement('button');
          marker.type = 'button';
          marker.className = 'aud-chapter-marker';
          marker.style.left = pct + '%';
          marker.setAttribute('aria-label', 'Jump to chapter: ' + chapter.title + ', ' + audFormatTime(chapter.timestamp));
          marker.addEventListener('click', function(event) {
            event.stopPropagation();
            seekTo(chapter.timestamp);
          });
          chapterMarkersEl.appendChild(marker);
        });
      }

      function seekTo(seconds) {
        audio.currentTime = seconds;
        if (audio.paused) audio.play().catch(function() {});
      }

      if (chapterListEl) {
        Array.prototype.forEach.call(chapterListEl.querySelectorAll('.aud-chapter-item'), function(btn) {
          btn.addEventListener('click', function() {
            var time = Number(btn.getAttribute('data-time'));
            if (Number.isFinite(time)) seekTo(time);
          });
        });
      }

      if (chapterToggle && chapterListEl) {
        chapterToggle.addEventListener('click', function() {
          var expanded = chapterToggle.getAttribute('aria-expanded') === 'true';
          chapterToggle.setAttribute('aria-expanded', String(!expanded));
          chapterListEl.hidden = expanded;
        });
      }

      function updateCurrentChapter() {
        if (!CHAPTERS.length) return;
        var activeIdx = -1;
        for (var i = 0; i < CHAPTERS.length; i++) {
          if (CHAPTERS[i].timestamp <= audio.currentTime) activeIdx = i; else break;
        }
        if (activeIdx === lastActiveChapterIdx) return;
        lastActiveChapterIdx = activeIdx;
        var active = activeIdx >= 0 ? CHAPTERS[activeIdx] : null;
        if (currentChapterEl && active) currentChapterEl.textContent = active.title;
        if (chapterListEl) {
          Array.prototype.forEach.call(chapterListEl.querySelectorAll('.aud-chapter-item'), function(el, i) {
            var isActive = i === activeIdx;
            el.classList.toggle('aud-chapter-active', isActive);
            if (isActive) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current');
          });
        }
      }

      // --- Synchronized transcript: toggle, search, click-to-seek, active-segment sync ---
      if (transcriptToggle && transcriptPanel) {
        transcriptToggle.addEventListener('click', function() {
          var expanded = transcriptToggle.getAttribute('aria-expanded') === 'true';
          transcriptToggle.setAttribute('aria-expanded', String(!expanded));
          transcriptPanel.hidden = expanded;
          var label = transcriptToggle.querySelector('span');
          if (label) label.textContent = expanded ? 'Show Transcript' : 'Hide Transcript';
        });
      }

      if (transcriptSegmentsEl) {
        Array.prototype.forEach.call(transcriptSegmentsEl.querySelectorAll('.aud-transcript-segment'), function(btn) {
          btn.addEventListener('click', function() {
            var time = Number(btn.getAttribute('data-time'));
            if (Number.isFinite(time)) { transcriptUserScrolled = false; seekTo(time); }
          });
        });
        transcriptPanel && transcriptPanel.addEventListener('scroll', function() {
          if (programmaticScroll) return;
          transcriptUserScrolled = true;
        });
      }

      if (transcriptSearch) {
        transcriptSearch.addEventListener('input', function() {
          var query = transcriptSearch.value.trim();
          var elements = transcriptSegmentsEl ? transcriptSegmentsEl.querySelectorAll('.aud-transcript-segment') : [];
          var matches = 0;
          Array.prototype.forEach.call(elements, function(el, i) {
            var segment = SEGMENTS[i];
            var isMatch = !query || segment.text.toLowerCase().indexOf(query.toLowerCase()) !== -1
              || (segment.speaker && segment.speaker.toLowerCase().indexOf(query.toLowerCase()) !== -1);
            el.hidden = !isMatch;
            var textSpan = el.querySelector('.aud-segment-text');
            if (textSpan) audRenderSegmentText(textSpan, segment.text, query);
            if (isMatch) matches++;
          });
          if (transcriptNoResults) transcriptNoResults.hidden = !(query && matches === 0);
          if (transcriptSearchStatus) {
            transcriptSearchStatus.textContent = query
              ? (matches + ' matching line' + (matches === 1 ? '' : 's') + ' found.')
              : '';
          }
        });
      }

      function updateActiveSegment() {
        if (!SEGMENTS.length || !transcriptSegmentsEl) return;
        var activeIdx = -1;
        for (var i = 0; i < SEGMENTS.length; i++) {
          if (SEGMENTS[i].timestamp <= audio.currentTime) activeIdx = i; else break;
        }
        if (activeIdx === lastActiveSegmentIdx) return;
        lastActiveSegmentIdx = activeIdx;
        var elements = transcriptSegmentsEl.querySelectorAll('.aud-transcript-segment');
        Array.prototype.forEach.call(elements, function(el, i) { el.classList.toggle('aud-segment-active', i === activeIdx); });
        if (activeIdx !== -1 && !transcriptUserScrolled && transcriptPanel && !transcriptPanel.hidden) {
          var el = elements[activeIdx];
          if (el) {
            var panelRect = transcriptPanel.getBoundingClientRect();
            var elRect = el.getBoundingClientRect();
            var inView = elRect.top >= panelRect.top && elRect.bottom <= panelRect.bottom;
            if (!inView) {
              programmaticScroll = true;
              el.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
              setTimeout(function() { programmaticScroll = false; }, 400);
            }
          }
        }
      }

      // --- Resume prompt ---
      function showResumePrompt(position) {
        if (!resumePrompt || resumeHandled) return;
        resumeHandled = true;
        if (resumeText) resumeText.textContent = 'Resume from ' + audFormatTime(position);
        resumePrompt.hidden = false;
      }
      if (resumeBtn) resumeBtn.addEventListener('click', function() {
        if (resumePrompt) resumePrompt.hidden = true;
        var stored = audReadProgress(progressKey);
        if (stored && Number.isFinite(stored.position)) audio.currentTime = stored.position;
        audio.play().catch(function() {});
      });
      if (restartChoiceBtn) restartChoiceBtn.addEventListener('click', function() {
        if (resumePrompt) resumePrompt.hidden = true;
        audio.currentTime = 0;
      });

      // --- Metadata / timeupdate / ended wiring ---
      audio.addEventListener('loadedmetadata', function() {
        if (skipBackBtn) skipBackBtn.disabled = false;
        if (skipForwardBtn) skipForwardBtn.disabled = false;
        if (timerEl) timerEl.textContent = audFormatTime(audio.currentTime) + ' / ' + audFormatTime(audio.duration);
        renderChapterMarkers();
        if (PROGRESS_PERSISTENCE) {
          var stored = audReadProgress(progressKey);
          if (stored) {
            furthestPosition = Number.isFinite(stored.furthest) ? stored.furthest : 0;
            completed = Boolean(stored.completed);
            updateProgressStatusText();
            var withinTail = Number.isFinite(audio.duration) && (audio.duration - stored.position) <= AUD_COMPLETION_TAIL_SECONDS;
            if (!completed && stored.position >= AUD_RESUME_MIN_SECONDS && !withinTail) showResumePrompt(stored.position);
            if (completed && TAKEAWAYS_VISIBILITY === 'afterCompletion' && takeawaysList) {
              takeawaysList.hidden = false;
              if (takeawaysLocked) takeawaysLocked.hidden = true;
            }
          }
          // Only after this read (found a record or not) is furthestPosition/completed a
          // trustworthy reflection of "no prior progress" vs. "not checked yet" — see the
          // progressHydrated declaration above.
          progressHydrated = true;
        }
      });

      audio.addEventListener('timeupdate', function() {
        if (!audio.duration) return;
        var value = Math.max(0, Math.min(100, (audio.currentTime / audio.duration) * 100));
        scrubBar.setAttribute('aria-valuenow', String(Math.round(value)));
        scrubBar.setAttribute('aria-valuetext', audFormatTime(audio.currentTime) + ' of ' + audFormatTime(audio.duration));
        scrubFill.style.width = value + '%';
        if (timerEl) timerEl.textContent = audFormatTime(audio.currentTime) + ' / ' + audFormatTime(audio.duration);
        if (audio.currentTime > furthestPosition) furthestPosition = audio.currentTime;
        updateCurrentChapter();
        updateActiveSegment();
        updateProgressStatusText();
        saveProgress(false);
        checkCompletion();
      });

      audio.addEventListener('ended', function() {
        // markCompleted() itself calls viewedItems.add(0)/updateProgress() — the shared
        // completion tracker every component wires into — so nothing further is needed
        // here beyond making sure a full listen always counts as completed even if the
        // 90%/tail-seconds threshold in checkCompletion() was somehow not yet reached.
        furthestPosition = audio.duration || furthestPosition;
        markCompleted();
        playBtn.setAttribute('aria-label', 'Play audio');
        playBtn.setAttribute('aria-pressed', 'false');
      });

      window.addEventListener('visibilitychange', function() { if (document.visibilityState === 'hidden') saveProgress(true); });
      window.addEventListener('beforeunload', function() { saveProgress(true); });
    }

    function initComponent() { initAudioPlayer(); }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add an audio track.'];
  return { valid: errors.length === 0, errors };
}
