import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML, sanitizeRichText, sanitizeURL, serializeForInlineScript } from '../js/utilities.js';
import { combineValidationResults } from '../js/validation-utils.js';

/**
 * Interactive Video Component Configuration (Phase 1 — foundation)
 * @typedef {Object} InteractiveVideoConfig
 * @property {string} title - Video block title
 * @property {string} [introduction] - Optional intro rich text shown above the video
 * @property {'upload'|'url'} videoSourceType - Which of videoMediaId/videoUrl is authoritative
 * @property {string} [videoMediaId] - Resolved upload URL (media reference, field type 'video')
 * @property {string} [videoUrl] - External direct video file URL
 * @property {string} [posterImage] - Resolved poster image URL
 * @property {string} [posterAltText]
 * @property {boolean} [posterDecorative]
 * @property {string} [captionsUrl] - Resolved WebVTT URL (upload or external)
 * @property {string} [captionsLabel]
 * @property {string} [transcript] - Rich text transcript
 * @property {Array<Object>} items - Interaction markers (see below)
 * @property {boolean} [showMarkerNavigation]
 * @property {boolean} [showVideoProgress]
 * @property {boolean} [allowRestart]
 * @property {'manual'|'automaticAfterInformation'|'automaticAfterCorrectAnswer'} [resumeBehaviour]
 * @property {'videoEnded'|'allRequiredInteractionsCompleted'|'videoEndedAndRequiredInteractionsCompleted'} [completionRule]
 *
 * Each interaction item: { type: 'information'|'multipleChoice', timestamp (seconds),
 * title, required, pauseVideo, continueButtonLabel, body (information only),
 * question, answer1-4Label, correctAnswerIndex, answer1-4Feedback,
 * generalCorrectFeedback, generalIncorrectFeedback, hint, maxAttempts,
 * showCorrectAfterFinal (multiple choice only) }. Both field sets are always present in
 * the schema regardless of `type` — this editor has no conditional field visibility
 * (docs/COMPONENT-SCHEMA.md "Recommended schema improvements") — the generator below
 * only reads the set matching the item's own type.
 */

export const id = 'interactive-video';
export const name = 'Interactive Video';
export const category = 'advanced';

/** @type {InteractiveVideoConfig} */
export const defaultConfig = {
  title: 'Interactive Video',
  introduction: '',
  // Matches components/video-frame.js's own default exactly — every registered
  // component ships a real, immediately-valid, previewable configuration (verified by
  // tests/unit/component-registry.test.js's "default data passes its own editor schema"
  // contract), not an empty placeholder the author must fill in before anything renders.
  videoSourceType: 'url',
  videoMediaId: '',
  videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  posterImage: '',
  posterAltText: '',
  posterDecorative: false,
  captionsUrl: '',
  captionsLabel: 'English',
  transcript: '',
  // Phase 1 ships the video shell + a non-interactive, chronologically-ordered marker
  // preview list. Pause-at-marker playback, information/multiple-choice interaction
  // panels, and real completion logic are Phase 3/4/5 — see docs/COMPONENT-SCHEMA.md.
  showMarkerNavigation: true,
  showVideoProgress: true,
  allowRestart: false,
  resumeBehaviour: 'manual',
  completionRule: 'videoEnded',
  items: []
};
export const editorSchema = getEditorSchema(id);

// Exported (not just a private helper) so app.js's authoring-timeline widget can reuse
// the identical MM:SS/H:MM:SS formatting for the learner-facing marker list, current-time
// readout, and marker tick tooltips, rather than a second implementation drifting from
// this one over time.
export function formatTimestamp(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(secs).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

const markerTypeIcons = {
  // AT&T "info" and "check" glyphs, matching the icon-set already wired into this
  // catalog's other components this session — never color-only: each marker also
  // carries a visible text type label alongside the icon.
  information: '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M17 22 17 14 13 14 13 16 15 16 15 22 12 22 12 24 20 24 20 22Z"/><path d="M16 8C14.9 8 14 8.9 14 10 14 11.1 14.9 12 16 12 17.1 12 18 11.1 18 10 18 8.9 17.1 8 16 8Z"/></svg>',
  multipleChoice: '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M11.33 26.75 1.29 16.71 2.71 15.29 11.33 23.92 29.29 5.96 30.71 7.37 11.33 26.75Z"/></svg>'
};

function renderMarkerListItem(item, originalIndex) {
  const type = item.type === 'multipleChoice' ? 'multipleChoice' : 'information';
  const typeLabel = type === 'multipleChoice' ? 'Multiple Choice' : 'Information';
  const title = item.type === 'multipleChoice' ? (item.question || item.title) : item.title;
  // The state badge starts empty/hidden — no learner progress exists at compile time
  // (ivMarkerStatus is always freshly initialized on load, never persisted across page
  // loads), so the client-side ivUpdateMarkerListItemState() is the only thing that ever
  // populates it, keeping one source of truth for this element's markup.
  return `<li class="iv-marker-item" data-idx="${originalIndex}" data-type="${type}">
    <button type="button" class="iv-marker-item-btn" data-idx="${originalIndex}" aria-label="Jump to ${escapeAttribute(formatTimestamp(item.timestamp))}: ${escapeAttribute(String(title || 'Untitled marker').replace(/<[^>]*>/g, ''))}">
      <span class="iv-marker-type-icon">${markerTypeIcons[type]}</span>
      <span class="iv-marker-time">${escapeHTML(formatTimestamp(item.timestamp))}</span>
      <span class="iv-marker-type-label">${typeLabel}</span>
      <span class="iv-marker-title">${escapeHTML(String(title || 'Untitled marker').replace(/<[^>]*>/g, ''))}</span>
      ${item.required ? '<span class="iv-marker-required-badge">Required</span>' : ''}
      <span class="iv-marker-state-badge" hidden></span>
    </button>
  </li>`;
}

export function generateHTML(config, instanceId) {
  const videoSrc = sanitizeURL(
    config.videoSourceType === 'url' ? config.videoUrl : config.videoMediaId,
    { allowBlob: true, allowRelative: true }
  );
  const posterSrc = sanitizeURL(config.posterImage, { allowDataImage: true, allowBlob: true, allowRelative: true });
  const captionsSrc = sanitizeURL(config.captionsUrl, { allowBlob: true, allowRelative: true });
  const posterAlt = config.posterDecorative ? '' : escapeAttribute(config.posterAltText || '');

  const orderedMarkers = config.items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => (Number(a.item.timestamp) || 0) - (Number(b.item.timestamp) || 0));

  // Both toggles are independent — showVideoProgress gets its own "X of N completed"
  // summary (distinct from the shared, project-level "Progress Completion" bar every
  // trackCompletion-enabled component already gets from js/export-shell.js) and
  // showMarkerNavigation gets the clickable list itself — but they share one wrapper
  // when either is on, so there's exactly one container to reason about placement for.
  const showNav = config.showMarkerNavigation !== false;
  const showProgress = config.showVideoProgress !== false;
  const navBlock = (showNav || showProgress) && orderedMarkers.length ? `
    <div class="iv-marker-nav" id="${instanceId}-marker-nav">
      <h4 class="iv-marker-nav-title">Interactions (${orderedMarkers.length})</h4>
      ${showProgress ? `<p class="iv-progress-summary" id="${instanceId}-progress-summary">0 of ${orderedMarkers.length} completed</p>` : ''}
      ${showNav ? `<ol class="iv-marker-list">
        ${orderedMarkers.map(({ item, originalIndex }) => renderMarkerListItem(item, originalIndex)).join('')}
      </ol>` : ''}
    </div>` : '';

  const restartBlock = config.allowRestart && videoSrc
    ? `<button type="button" class="iv-restart-btn" id="${instanceId}-restart-btn">Restart Video</button>` : '';

  const transcriptBlock = config.transcript
    ? `<details class="iv-transcript"><summary>Transcript</summary><div class="iv-transcript-body">${sanitizeRichText(config.transcript)}</div></details>`
    : '<p class="iv-no-transcript-note sr-only">No transcript has been supplied for this video.</p>';

  return `
    <div class="iv-block">
      <h3 class="iv-title">${escapeHTML(config.title || 'Interactive Video')}</h3>
      ${config.introduction ? `<div class="iv-introduction">${sanitizeRichText(config.introduction)}</div>` : ''}
      <div class="iv-video-wrapper">
        ${videoSrc ? `<video id="${instanceId}-video" class="iv-video" controls preload="metadata" playsinline ${posterSrc ? `poster="${escapeAttribute(posterSrc)}"` : ''} ${posterAlt ? `aria-label="${posterAlt}"` : ''}>
          <source src="${escapeAttribute(videoSrc)}">
          ${captionsSrc ? `<track kind="captions" src="${escapeAttribute(captionsSrc)}" srclang="en" label="${escapeAttribute(config.captionsLabel || 'Captions')}">` : ''}
          Your browser does not support the video element.
        </video>` : `<div class="iv-missing-video-notice" role="status">No video source is configured yet. Add an uploaded video or an external direct video URL in the editor.</div>`}
      </div>
      <div class="iv-interaction-panel" id="${instanceId}-interaction-panel" role="region" tabindex="-1" hidden></div>
      ${restartBlock}
      ${navBlock}
      ${transcriptBlock}
    </div>
  `;
}

export function generateCSS() {
  return `
    .iv-block {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .iv-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }
    .iv-introduction {
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-muted);
    }
    .iv-video-wrapper {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background-color: #000;
      border-radius: var(--border-radius);
      overflow: hidden;
    }
    .iv-video {
      display: block;
      width: 100%;
      height: 100%;
    }
    .iv-missing-video-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 20px;
      text-align: center;
      color: #F1F5F9;
      background-color: #1E293B;
      font-size: 13px;
      line-height: 1.5;
    }
    .iv-interaction-panel {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      outline: none;
    }
    .iv-interaction-panel[hidden] {
      display: none;
    }
    .iv-panel-type-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      /* --text-muted (matching .iv-marker-nav-title/.iv-marker-type-label below), not
         --accent: at this size/weight, the AT&T brand blue only reaches ~3:1 contrast on
         a white card background — short of WCAG AA's 4.5:1 for non-large text, caught by
         an axe-core color-contrast scan (Phase 6). --text-muted is designed for exactly
         this kind of small caption text. */
      color: var(--text-muted);
    }
    .iv-panel-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .iv-panel-body {
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-muted);
    }
    .iv-continue-btn {
      align-self: flex-start;
      margin-top: 4px;
      padding: 10px 24px;
      border-radius: var(--button-radius);
      border: none;
      background-color: var(--primary);
      color: var(--on-primary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--animation-speed);
    }
    .iv-continue-btn:hover {
      background-color: var(--primary-hover);
    }
    .iv-panel-question {
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-main);
    }
    .iv-mc-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .iv-mc-option {
      background-color: var(--bg-body);
      border: var(--border-style);
      border-radius: var(--border-radius);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 13px;
    }
    .iv-mc-option:hover {
      border-color: var(--primary);
    }
    .iv-mc-option.iv-mc-selected {
      border-color: var(--accent);
      background-color: var(--accent-tint);
    }
    .iv-mc-option[aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.7;
    }
    .iv-mc-option-check {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid var(--text-muted);
      position: relative;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .iv-mc-option.iv-mc-selected .iv-mc-option-check {
      border-color: var(--accent);
      background-color: var(--accent);
    }
    .iv-mc-option.iv-mc-selected .iv-mc-option-check::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #FFFFFF;
    }
    .iv-mc-option-text {
      flex: 1;
    }
    .iv-mc-correct-flag {
      font-size: 11px;
      font-weight: 700;
      color: var(--success);
      flex-shrink: 0;
    }
    .iv-mc-submit-btn {
      align-self: flex-start;
      margin-top: 4px;
      padding: 10px 24px;
      border-radius: var(--button-radius);
      border: none;
      background-color: var(--primary);
      color: var(--on-primary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--animation-speed);
    }
    .iv-mc-submit-btn:hover {
      background-color: var(--primary-hover);
    }
    .iv-mc-submit-btn[aria-disabled="true"] {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .iv-mc-hint {
      padding: 10px 14px;
      border-radius: var(--border-radius);
      border: 1px dashed var(--border-color);
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-main);
    }
    .iv-mc-feedback {
      padding: 14px;
      border-radius: var(--border-radius);
      font-size: 13px;
      line-height: 1.5;
    }
    .iv-mc-feedback.iv-correct {
      background-color: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #065F46;
    }
    .iv-mc-feedback.iv-incorrect {
      background-color: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #991B1B;
    }
    .iv-marker-nav {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 16px 20px;
    }
    .iv-marker-nav-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 10px;
    }
    .iv-marker-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .iv-marker-item {
      border-radius: 8px;
      background-color: var(--bg-body);
      font-size: 12px;
      transition: box-shadow 0.2s ease;
    }
    .iv-marker-item.iv-marker-item-active {
      box-shadow: 0 0 0 2px var(--accent) inset;
    }
    .iv-marker-item-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 10px;
      border: none;
      background: transparent;
      font: inherit;
      color: inherit;
      text-align: left;
      cursor: pointer;
      border-radius: 8px;
    }
    .iv-marker-item-btn:hover {
      background-color: var(--accent-tint);
    }
    .iv-marker-state-badge {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 2px 8px;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .iv-marker-state-badge.iv-state-visited {
      background-color: var(--border-color);
      color: var(--text-main);
    }
    .iv-marker-state-badge.iv-state-completed {
      background-color: var(--accent-tint);
      color: var(--accent);
    }
    .iv-marker-state-badge.iv-state-correct {
      background-color: rgba(16, 185, 129, 0.15);
      color: #065F46;
    }
    .iv-marker-state-badge.iv-state-incorrect {
      background-color: rgba(239, 68, 68, 0.15);
      color: #991B1B;
    }
    .iv-progress-summary {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 10px;
    }
    .iv-restart-btn {
      align-self: flex-start;
      padding: 8px 20px;
      border-radius: var(--button-radius);
      border: var(--border-style);
      background-color: transparent;
      color: var(--text-main);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .iv-restart-btn:hover {
      background-color: var(--bg-body);
    }
    .iv-marker-type-icon {
      display: inline-flex;
      color: var(--accent);
      flex-shrink: 0;
    }
    .iv-marker-time {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-main);
      flex-shrink: 0;
      min-width: 44px;
    }
    .iv-marker-type-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--text-muted);
      flex-shrink: 0;
    }
    .iv-marker-title {
      flex: 1;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .iv-marker-required-badge {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 2px 8px;
      border-radius: 6px;
      background-color: var(--border-color);
      color: var(--text-main);
      flex-shrink: 0;
    }
    .iv-transcript {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 14px 18px;
    }
    .iv-transcript summary {
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }
    .iv-transcript-body {
      margin-top: 10px;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-muted);
    }
    @media (max-width: 480px) {
      .iv-marker-item {
        flex-wrap: wrap;
      }
      .iv-marker-title {
        white-space: normal;
        min-width: 100%;
        order: 10;
      }
    }`;
}

export function generateJS(config, instanceId) {
  const completionRule = config.completionRule;
  const resumeBehaviour = config.resumeBehaviour;
  // Markers reach the client already sanitized for their own declared type (body/question
  // through sanitizeRichText at the js/utilities.js#sanitizePreviewConfig boundary, same as
  // every other richtext field in this codebase) — but title/continueButtonLabel/answer
  // labels/feedback/hint are plain schema 'text'/'textarea' fields with no HTML-escaping
  // applied at that boundary (matching how every other component's plain item.title is
  // escaped once, at its own point of insertion, not pre-escaped generically — see that
  // boundary's own per-field comments). ivEscapeHtml() below is that point of insertion for
  // this component's client-side (not generateHTML-time) rendering of those fields, so a
  // title containing "<script>" is never capable of being interpreted as markup, and so this
  // never risks the double-escaping a boundary-level pre-escape would cause against
  // generateHTML's own already-correct escapeHTML() calls on the very same fields.
  return `
    var ivMarkers = ${serializeForInlineScript(config.items)};
    var ivMarkerStatus = {};
    // Multiple-choice-only: set once a marker concludes ('correct' | 'incorrect'), read by
    // ivUpdateMarkerListItemState() to distinguish a completed MC marker's outcome from a
    // completed Information marker (which has no such concept) in the marker list.
    var ivMarkerOutcome = {};
    var ivActiveMarkerIndex = null;
    var ivLastCheckedTime = -1;
    var ivVideoEnded = false;
    var ivResumeBehaviour = ${JSON.stringify(resumeBehaviour)};
    var ivCompletionRule = ${JSON.stringify(completionRule)};
    var ivMcAttempts = {};

    function ivEscapeHtml(value) {
      var div = document.createElement('div');
      div.textContent = value == null ? '' : String(value);
      return div.innerHTML;
    }

    function ivAllRequiredCompleted() {
      for (var i = 0; i < ivMarkers.length; i++) {
        if (ivMarkers[i].required && ivMarkerStatus[i] !== 'completed') return false;
      }
      return true;
    }

    function ivEvaluateCompletion() {
      if (ivCompletionRule === 'videoEnded') {
        if (ivVideoEnded) updateTrackerComplete();
      } else if (ivCompletionRule === 'allRequiredInteractionsCompleted') {
        if (ivAllRequiredCompleted()) updateTrackerComplete();
      } else if (ivCompletionRule === 'videoEndedAndRequiredInteractionsCompleted') {
        if (ivVideoEnded && ivAllRequiredCompleted()) updateTrackerComplete();
      }
    }

    function ivFindTriggerTarget(prevTime, currentTime) {
      var candidates = [];
      ivMarkers.forEach(function(marker, idx) {
        var t = Number(marker.timestamp) || 0;
        if (t > prevTime && t <= currentTime && marker.pauseVideo && ivMarkerStatus[idx] !== 'completed') {
          candidates.push({ idx: idx, t: t, required: !!marker.required });
        }
      });
      if (!candidates.length) return null;
      var required = candidates.filter(function(c) { return c.required; });
      var pool = required.length ? required : candidates;
      pool.sort(function(a, b) { return a.t - b.t; });
      return pool[0];
    }

    // Markers crossed without pauseVideo (or already completed) are recorded as "visited"
    // in ivMarkerStatus only — deliberately NOT via the shared viewedItems/updateProgress()
    // path. That shared path treats viewedItems.size reaching totalItems as 100% and
    // auto-fires the completion message (see js/export-shell.js#updateProgress); merely
    // passing a marker's timestamp is not the same as completing it, so feeding it into
    // that shared counter would fire completion early. viewedItems/updateProgress() here
    // are reserved for genuine completions (ivCompleteInformationMarker), matching the
    // MVP's own distinct "markers visited" vs. "required markers completed" state model.
    function ivMarkPassedMarkersVisited(prevTime, currentTime) {
      ivMarkers.forEach(function(marker, idx) {
        var t = Number(marker.timestamp) || 0;
        if (t > prevTime && t <= currentTime && ivMarkerStatus[idx] !== 'completed') {
          ivMarkerStatus[idx] = 'visited';
          ivUpdateMarkerListItemState(idx);
        }
      });
    }

    // Reflects one marker's current not-visited/visited/completed(+correct/incorrect)
    // state and active-panel highlight in the (optional) learner-facing marker list. A
    // no-op if the list isn't rendered (showMarkerNavigation off) or that marker's row
    // isn't present for any other reason — every call site here is allowed to fire
    // regardless of whether the list exists.
    function ivUpdateMarkerListItemState(idx) {
      var li = document.querySelector('.iv-marker-item[data-idx="' + idx + '"]');
      if (!li) return;
      var isActive = ivActiveMarkerIndex === idx;
      li.classList.toggle('iv-marker-item-active', isActive);
      var btn = li.querySelector('.iv-marker-item-btn');
      if (btn) {
        if (isActive) btn.setAttribute('aria-current', 'true');
        else btn.removeAttribute('aria-current');
      }
      var badge = li.querySelector('.iv-marker-state-badge');
      if (!badge) return;
      var status = ivMarkerStatus[idx];
      if (!status) {
        badge.hidden = true;
        badge.textContent = '';
        badge.className = 'iv-marker-state-badge';
        return;
      }
      var outcome = ivMarkerOutcome[idx];
      var label = 'Visited';
      var stateClass = 'iv-state-visited';
      if (status === 'completed') {
        if (outcome === 'correct') { label = 'Correct'; stateClass = 'iv-state-correct'; }
        else if (outcome === 'incorrect') { label = 'Incorrect'; stateClass = 'iv-state-incorrect'; }
        else { label = 'Completed'; stateClass = 'iv-state-completed'; }
      }
      badge.hidden = false;
      badge.textContent = label;
      badge.className = 'iv-marker-state-badge ' + stateClass;
    }

    // Distinct from the shared, project-level "Progress Completion" bar (which reflects
    // trackCompletion percent across every component on the page) — this is this
    // component's own "N of M interactions completed" summary, shown only when
    // showVideoProgress is on.
    function ivUpdateProgressSummary() {
      var el = document.getElementById('${instanceId}-progress-summary');
      if (!el) return;
      var completedCount = 0;
      ivMarkers.forEach(function(marker, idx) { if (ivMarkerStatus[idx] === 'completed') completedCount++; });
      el.textContent = completedCount + ' of ' + ivMarkers.length + ' completed';
    }

    function ivCloseInteractionPanel() {
      var panel = document.getElementById('${instanceId}-interaction-panel');
      var prevIdx = ivActiveMarkerIndex;
      if (panel) {
        panel.hidden = true;
        panel.innerHTML = '';
        panel.removeAttribute('aria-label');
      }
      ivActiveMarkerIndex = null;
      if (prevIdx !== null) ivUpdateMarkerListItemState(prevIdx);
    }

    // Shared by both marker types' terminal (Continue-clicked) step — only a genuine
    // completion feeds viewedItems/updateProgress(), per ivMarkPassedMarkersVisited's own
    // comment above.
    function ivMarkMarkerCompleted(idx) {
      ivMarkerStatus[idx] = 'completed';
      viewedItems.add(idx);
      updateProgress();
      ivUpdateMarkerListItemState(idx);
      ivUpdateProgressSummary();
      ivEvaluateCompletion();
    }

    function ivCompleteInformationMarker(idx) {
      ivMarkMarkerCompleted(idx);
      ivCloseInteractionPanel();
      if (ivResumeBehaviour === 'automaticAfterInformation') {
        var video = document.getElementById('${instanceId}-video');
        if (video) video.play().catch(function() {});
      }
    }

    function ivShowInformationPanel(marker, idx) {
      var panel = document.getElementById('${instanceId}-interaction-panel');
      if (!panel) return;
      var titleText = marker.title || 'Information';
      panel.innerHTML =
        '<div class="iv-panel-type-label">Information</div>' +
        '<h4 class="iv-panel-title">' + ivEscapeHtml(titleText) + '</h4>' +
        '<div class="iv-panel-body">' + (marker.body || '') + '</div>' +
        '<button type="button" class="iv-continue-btn">' + ivEscapeHtml(marker.continueButtonLabel || 'Continue') + '</button>';
      panel.hidden = false;
      panel.setAttribute('aria-label', 'Information: ' + titleText);
      var continueBtn = panel.querySelector('.iv-continue-btn');
      if (continueBtn) continueBtn.addEventListener('click', function() { ivCompleteInformationMarker(idx); });
      // Controlled focus move (Requirement: "in a controlled manner") — the panel itself,
      // not the Continue button, so a screen-reader user's very next reading-order stop is
      // the marker's own title/body rather than skipping straight past it to the action.
      panel.focus();
      var bodyText = String(marker.body || '').replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();
      announce('Information: ' + titleText + (bodyText ? '. ' + bodyText : ''));
    }

    // Answer-specific feedback (answer1Feedback..answer4Feedback) takes precedence when
    // authored; falling back to the marker's general correct/incorrect feedback, and
    // finally to a plain default — the same "specific overrides general" resolution order
    // as the schema's own field labels ("Feedback for Answer N (Optional)" alongside
    // "General Correct/Incorrect Feedback") imply, since both exist for the same marker.
    function ivResolveMcFeedback(answer, isCorrect, marker) {
      if (answer && answer.feedback && String(answer.feedback).trim()) return String(answer.feedback);
      var general = isCorrect ? marker.generalCorrectFeedback : marker.generalIncorrectFeedback;
      if (general && String(general).trim()) return String(general);
      return isCorrect ? 'Correct!' : 'Incorrect.';
    }

    function ivShowMultipleChoicePanel(marker, idx) {
      var panel = document.getElementById('${instanceId}-interaction-panel');
      if (!panel) return;
      var titleText = marker.title || 'Question';
      var answers = [];
      [1, 2, 3, 4].forEach(function(n) {
        var label = marker['answer' + n + 'Label'];
        if (label && String(label).trim()) {
          answers.push({ n: n, label: String(label), feedback: marker['answer' + n + 'Feedback'] || '' });
        }
      });
      // Schema stores this as a '1'-'4' string (1-based, matching the answer slot numbering
      // used throughout the item editor) — not a 0-based array index.
      var correctN = parseInt(marker.correctAnswerIndex, 10) || 1;
      var maxAttempts = Number(marker.maxAttempts) > 0 ? Number(marker.maxAttempts) : 1;
      if (!(idx in ivMcAttempts)) ivMcAttempts[idx] = 0;
      var selected = null;
      var hintText = String(marker.hint || '').trim();

      panel.innerHTML =
        '<div class="iv-panel-type-label">Multiple Choice</div>' +
        '<h4 class="iv-panel-title">' + ivEscapeHtml(titleText) + '</h4>' +
        '<div class="iv-panel-body iv-panel-question">' + (marker.question || '') + '</div>' +
        '<div class="iv-mc-options" role="radiogroup" aria-label="Answer choices">' +
        answers.map(function(answer, i) {
          return '<div class="iv-mc-option" role="radio" tabindex="' + (i === 0 ? '0' : '-1') + '" aria-checked="false" data-n="' + answer.n + '">' +
            '<div class="iv-mc-option-check" aria-hidden="true"></div>' +
            '<div class="iv-mc-option-text">' + ivEscapeHtml(answer.label) + '</div>' +
            '<span class="iv-mc-correct-flag" hidden> — Correct answer</span></div>';
        }).join('') +
        '</div>' +
        '<button type="button" class="iv-mc-submit-btn">Submit</button>' +
        '<div class="iv-mc-hint" role="status" aria-live="polite" hidden></div>' +
        '<div class="iv-mc-feedback" role="status" aria-live="polite" aria-atomic="true" tabindex="-1" hidden></div>';
      panel.hidden = false;
      panel.setAttribute('aria-label', 'Multiple Choice: ' + titleText);

      var optionEls = Array.prototype.slice.call(panel.querySelectorAll('.iv-mc-option'));
      var submitBtn = panel.querySelector('.iv-mc-submit-btn');
      var hintEl = panel.querySelector('.iv-mc-hint');
      var feedbackEl = panel.querySelector('.iv-mc-feedback');

      function selectOption(n, element) {
        selected = n;
        optionEls.forEach(function(el) {
          el.classList.remove('iv-mc-selected');
          el.setAttribute('aria-checked', 'false');
          el.setAttribute('tabindex', '-1');
        });
        element.classList.add('iv-mc-selected');
        element.setAttribute('aria-checked', 'true');
        element.setAttribute('tabindex', '0');
      }

      optionEls.forEach(function(el) {
        el.addEventListener('click', function() {
          if (el.getAttribute('aria-disabled') === 'true') return;
          selectOption(parseInt(el.getAttribute('data-n'), 10), el);
        });
        el.addEventListener('keydown', function(event) {
          if (el.getAttribute('aria-disabled') === 'true') return;
          var current = optionEls.indexOf(el);
          var next = current;
          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (current + 1) % optionEls.length;
          else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (current - 1 + optionEls.length) % optionEls.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = optionEls.length - 1;
          else if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            selectOption(parseInt(el.getAttribute('data-n'), 10), el);
            return;
          } else return;
          event.preventDefault();
          selectOption(parseInt(optionEls[next].getAttribute('data-n'), 10), optionEls[next]);
          optionEls[next].focus();
        });
      });

      function concludeOptions() {
        optionEls.forEach(function(el) {
          el.setAttribute('aria-disabled', 'true');
          el.setAttribute('tabindex', '-1');
        });
        submitBtn.setAttribute('aria-disabled', 'true');
      }

      function revealCorrectFlag() {
        optionEls.forEach(function(el) {
          if (parseInt(el.getAttribute('data-n'), 10) === correctN) {
            var flag = el.querySelector('.iv-mc-correct-flag');
            if (flag) flag.hidden = false;
          }
        });
      }

      function showContinueButton(isCorrect) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'iv-continue-btn';
        btn.textContent = marker.continueButtonLabel || 'Continue';
        panel.appendChild(btn);
        btn.addEventListener('click', function() {
          ivMarkMarkerCompleted(idx);
          ivCloseInteractionPanel();
          if (isCorrect && ivResumeBehaviour === 'automaticAfterCorrectAnswer') {
            var video = document.getElementById('${instanceId}-video');
            if (video) video.play().catch(function() {});
          }
        });
        btn.focus();
      }

      function submit() {
        if (selected === null) {
          feedbackEl.hidden = false;
          feedbackEl.className = 'iv-mc-feedback iv-incorrect';
          feedbackEl.textContent = 'Select an answer first.';
          feedbackEl.focus();
          return;
        }
        var answer = answers.filter(function(a) { return a.n === selected; })[0];
        var isCorrect = selected === correctN;
        ivMcAttempts[idx]++;
        var feedbackText = ivResolveMcFeedback(answer, isCorrect, marker);

        if (isCorrect) {
          ivMarkerOutcome[idx] = 'correct';
          concludeOptions();
          feedbackEl.hidden = false;
          feedbackEl.className = 'iv-mc-feedback iv-correct';
          feedbackEl.textContent = feedbackText;
          if (hintEl) hintEl.hidden = true;
          feedbackEl.focus();
          showContinueButton(true);
        } else if (ivMcAttempts[idx] < maxAttempts) {
          var remaining = maxAttempts - ivMcAttempts[idx];
          feedbackEl.hidden = false;
          feedbackEl.className = 'iv-mc-feedback iv-incorrect';
          feedbackEl.textContent = feedbackText + ' ' + remaining + ' attempt' + (remaining === 1 ? '' : 's') + ' remaining.';
          if (hintEl && hintText) { hintEl.hidden = false; hintEl.textContent = 'Hint: ' + hintText; }
          selected = null;
          optionEls.forEach(function(el, i) {
            el.classList.remove('iv-mc-selected');
            el.setAttribute('aria-checked', 'false');
            el.setAttribute('tabindex', i === 0 ? '0' : '-1');
          });
          feedbackEl.focus();
        } else {
          ivMarkerOutcome[idx] = 'incorrect';
          concludeOptions();
          feedbackEl.hidden = false;
          feedbackEl.className = 'iv-mc-feedback iv-incorrect';
          feedbackEl.textContent = feedbackText;
          if (hintEl) hintEl.hidden = true;
          if (marker.showCorrectAfterFinal) revealCorrectFlag();
          feedbackEl.focus();
          showContinueButton(false);
        }
      }

      submitBtn.addEventListener('click', submit);
      panel.focus();
      var questionText = String(marker.question || '').replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();
      announce('Multiple Choice: ' + titleText + (questionText ? '. ' + questionText : ''));
    }

    function ivTriggerMarker(target) {
      var marker = ivMarkers[target.idx];
      var video = document.getElementById('${instanceId}-video');
      if (!video) return;
      video.pause();
      // Seeking exactly onto a timestamp that already just fired 'timeupdate' can be a
      // no-op; only correct the position when we're meaningfully past it (e.g. the learner
      // dragged the scrubber well beyond a still-incomplete required marker).
      if (Math.abs(video.currentTime - target.t) > 0.3) video.currentTime = target.t;
      ivActiveMarkerIndex = target.idx;
      // Deliberately not viewedItems/updateProgress() here — see ivMarkPassedMarkersVisited's
      // comment; merely triggering (opening) a marker is not a completion.
      if (ivMarkerStatus[target.idx] !== 'completed') ivMarkerStatus[target.idx] = 'visited';
      ivUpdateMarkerListItemState(target.idx);
      if (marker.type === 'multipleChoice') {
        ivShowMultipleChoicePanel(marker, target.idx);
      } else {
        ivShowInformationPanel(marker, target.idx);
      }
    }

    // Marker-nav-driven navigation: a deliberate learner action to jump to a specific
    // marker, independent of that marker's own pauseVideo setting (pauseVideo only governs
    // automatic crossing-based triggering during normal playback/seeking, not an explicit
    // "take me there" click). An already-completed marker is never re-opened — seeking is
    // still useful on its own, so the video moves there, but ivFindTriggerTarget's own
    // "never re-trigger a completed marker" rule holds here too.
    function ivJumpToMarker(idx) {
      var marker = ivMarkers[idx];
      var video = document.getElementById('${instanceId}-video');
      if (!video || !marker) return;
      var t = Number(marker.timestamp) || 0;
      video.pause();
      video.currentTime = t;
      // Establish a fresh crossing-detection baseline at the marker's own timestamp —
      // without this, resuming playback afterward would compare against the stale
      // pre-jump position and could spuriously (re)trigger or skip markers in between.
      ivLastCheckedTime = t;
      if (ivMarkerStatus[idx] === 'completed') return;
      if (ivActiveMarkerIndex !== null) ivCloseInteractionPanel();
      ivActiveMarkerIndex = idx;
      ivMarkerStatus[idx] = 'visited';
      ivUpdateMarkerListItemState(idx);
      if (marker.type === 'multipleChoice') {
        ivShowMultipleChoicePanel(marker, idx);
      } else {
        ivShowInformationPanel(marker, idx);
      }
    }

    // Resets the learner's own progress through the video/markers so they can watch again
    // from the start. Deliberately does NOT touch RiseComponentCompletion's one-way
    // hasCompleted flag or send any message to a host — there is no "un-complete" in Rise's
    // documented completion contract (js/completion.js), and a host that already recorded
    // this satisfied should not be told otherwise. This mirrors multiple-choice.js's own
    // resetQuiz() precedent: local UI/practice state resets, a completion already reported
    // stays reported.
    function ivRestart() {
      var video = document.getElementById('${instanceId}-video');
      ivCloseInteractionPanel();
      ivMarkerStatus = {};
      ivMarkerOutcome = {};
      ivMcAttempts = {};
      ivVideoEnded = false;
      ivLastCheckedTime = -1;
      viewedItems.clear();
      if (video) { video.pause(); video.currentTime = 0; }
      ivMarkers.forEach(function(marker, idx) { ivUpdateMarkerListItemState(idx); });
      ivUpdateProgressSummary();
      var txt = document.getElementById('${instanceId}-completion-text');
      var bar = document.getElementById('${instanceId}-progress-fill');
      if (txt && bar) { txt.textContent = '0%'; bar.style.width = '0%'; }
      setProgressAccessibility(0);
      var completionMsgEl = document.getElementById('${instanceId}-completion-message');
      if (completionMsgEl) completionMsgEl.hidden = true;
      announce('Video restarted.');
    }

    function ivCheckMarkerCrossing() {
      var video = document.getElementById('${instanceId}-video');
      // Never trigger a second marker while one is already open, and never evaluate
      // mid-drag — only once a seek has actually settled (the explicit 'seeked' listener
      // below covers that moment; 'timeupdate' alone can fire while video.seeking is still
      // true during a scrub).
      if (!video || video.seeking || ivActiveMarkerIndex !== null) return;
      var currentTime = video.currentTime;
      var prevTime = ivLastCheckedTime;
      var target = ivFindTriggerTarget(prevTime, currentTime);
      if (target) {
        ivTriggerMarker(target);
      } else {
        ivMarkPassedMarkersVisited(prevTime, currentTime);
      }
      ivLastCheckedTime = currentTime;
    }

    function initComponent() {
      var video = document.getElementById('${instanceId}-video');
      if (video) {
        video.addEventListener('timeupdate', ivCheckMarkerCrossing);
        video.addEventListener('seeked', ivCheckMarkerCrossing);
        video.addEventListener('ended', function() {
          ivVideoEnded = true;
          updateProgress();
          ivEvaluateCompletion();
        });
      }
      Array.prototype.forEach.call(document.querySelectorAll('.iv-marker-item-btn'), function(btn) {
        btn.addEventListener('click', function() {
          ivJumpToMarker(parseInt(btn.getAttribute('data-idx'), 10));
        });
      });
      var restartBtn = document.getElementById('${instanceId}-restart-btn');
      if (restartBtn) restartBtn.addEventListener('click', ivRestart);
    }`;
}

/**
 * Validates Interactive Video component configuration (Phase 1 scope).
 * Full timestamp/duration/duplicate-marker validation is Phase 2 (Timeline authoring);
 * this covers exactly what Phase 1 can already break: a missing video source, and
 * required fields on whatever markers already exist.
 * @param {InteractiveVideoConfig} config
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validate(config) {
  const results = [];
  const hasSource = config.videoSourceType === 'url' ? Boolean(config.videoUrl) : Boolean(config.videoMediaId);
  if (!hasSource) {
    results.push({ valid: false, error: 'Add a video: upload a file or provide an external direct video URL.' });
  }

  if (Array.isArray(config.items)) {
    config.items.forEach((item, index) => {
      const label = `Marker ${index + 1}`;
      if (!item.title || !String(item.title).trim()) {
        results.push({ valid: false, error: `${label}: Title is required.` });
      }
      if (!Number.isFinite(Number(item.timestamp)) || Number(item.timestamp) < 0) {
        results.push({ valid: false, error: `${label}: Timestamp must be a non-negative number of seconds.` });
      }
      if (item.type === 'multipleChoice') {
        if (!item.question || !String(item.question).replace(/<[^>]*>/g, '').trim()) {
          results.push({ valid: false, error: `${label}: A question is required for a Multiple Choice marker.` });
        }
        const answers = [item.answer1Label, item.answer2Label, item.answer3Label, item.answer4Label].filter(a => String(a || '').trim());
        if (answers.length < 2) {
          results.push({ valid: false, error: `${label}: Add at least two answers for a Multiple Choice marker.` });
        }
      } else if (!item.body || !String(item.body).replace(/<[^>]*>/g, '').trim()) {
        results.push({ valid: false, error: `${label}: Body content is required for an Information marker.` });
      }
    });
  }

  return combineValidationResults(results);
}
