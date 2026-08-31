import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';

export const id = 'audio-player';
export const name = 'Circular Audio Player';
export const category = 'media';
export const defaultConfig = {
  items: [
    { title: 'Introduction Podcast (Audio Clip)', content: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }
  ]
};
export const editorSchema = getEditorSchema(id);

// Volume/mute/transcript glyphs are real AT&T Brand Center icons (ATT Design
// System/Icon_Library_Mar_2026_032726.pptx — Navigation & Controls "volume-2"
// and "speaker-off", Documents "file"), verified the same way as flip-cards'
// and profile-cards' icons: rasterized from the library's own source SVGs and
// checked by eye, not approximated. Not hand-drawn.
const volumeOnIcon = '<svg class="volume-on-svg" width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M3.9 11C2.3 11 1 12.3 1 13.9L1 18.2C1 19.7 2.3 21 3.9 21L8.2 21 16.1 27.7 16.1 4.3 8.1 11 3.9 11ZM14 8.6 14 23.3 8.9 19 3.9 19C3.4 19 3 18.6 3 18.1L3 13.8C3 13.4 3.4 13 3.9 13L8.9 13 14 8.6Z"/><path d="M18.8 13.2C20.3 14.7 20.3 17.3 18.8 18.8L20.2 20.2C22.5 17.9 22.5 14.1 20.2 11.8L18.8 13.2Z"/><path d="M23.4 8.6 22 10C25.3 13.3 25.3 18.7 22 22L23.4 23.4C27.5 19.3 27.5 12.7 23.4 8.6Z"/></svg>';
const volumeOffIcon = '<svg class="volume-off-svg" width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" style="display:none;"><path d="M28.9 12.5 27.5 11.1 24 14.6 20.5 11.1 19.1 12.5 22.6 16 19.1 19.5 20.5 20.9 24 17.4 27.5 20.9 28.9 19.5 25.4 16Z"/><path d="M3.9 11C2.3 11 1 12.3 1 13.9L1 18.2C1 19.7 2.3 21 3.9 21L8.2 21 16.1 27.7 16.1 4.3 8.1 11 3.9 11ZM14 8.6 14 23.3 8.9 19 3.9 19C3.4 19 3 18.6 3 18.1L3 13.8C3 13.4 3.4 13 3.9 13L8.9 13 14 8.6Z"/></svg>';
const transcriptIcon = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M20.4 2 7 2C5.3 2 4 3.3 4 5L4 27C4 28.7 5.3 30 7 30L25 30C26.7 30 28 28.7 28 27L28 9.6 20.4 2ZM20 4.4 25.6 10 21 10C20.4 10 20 9.6 20 9L20 4.4ZM25 28 7 28C6.4 28 6 27.6 6 27L6 5C6 4.4 6.4 4 7 4L18 4 18 9C18 10.7 19.3 12 21 12L26 12 26 27C26 27.6 25.6 28 25 28Z"/></svg>';

function renderCustomItemArtwork(item, fallbackMarkup = '') {
  if (!item?.iconImage) return fallbackMarkup;
  const decorative = item.iconDecorative !== false;
  const fit = item.iconFit === 'cover' ? 'cover' : 'contain';
  return `<img class="custom-item-icon" src="${escapeAttribute(item.iconImage)}" alt="${decorative ? '' : escapeAttribute(item.iconAltText || '')}" ${decorative ? 'aria-hidden="true"' : ''} style="object-fit:${fit};">`;
}

// Node-side mirror of generateJS's runtime formatMediaTime(): only used to seed
// a real total-duration label into the static export markup (instead of "0:00")
// when the config already knows the clip's length, so the "elapsed / total"
// timer doesn't visibly jump the instant metadata loads.
function formatDurationLabel(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function generateHTML(config, instanceId) {
  const src = config.items[0]?.content || '';
  const transcript = config.items[0]?.transcript || '';
  const duration = config.items?.[0]?.contentDuration ?? config.items?.[0]?.content?.duration;
  const totalLabel = Number.isFinite(duration) ? formatDurationLabel(duration) : '0:00';
  return `
    <div class="audio-player-block">
      <div class="audio-info">
        <div class="audio-art">
          ${renderCustomItemArtwork(config.items[0], '<svg width="20" height="20" viewBox="0 0 96 96" fill="currentColor" aria-hidden="true"><path class="audio-art-accent" d="M31 16.4C32.5 17.7 34.1 18.8 35.8 19.6 38.6 21 41.7 21.9 44.8 22.1L44.9 20.1C42 19.9 39.2 19.2 36.6 17.9 34.3 16.8 32.3 15.3 30.6 13.4L29 11.5 29 43.5C27.3 41.4 24.5 40 21.5 40 16.3 40 12 44 12 49 12 54 16.3 58 21.5 58 26.7 58 31 54 31 49L31 16.4ZM21.5 56C17.4 56 14 52.9 14 49 14 45.1 17.4 42 21.5 42 25.6 42 29 45.1 29 49 29 52.9 25.6 56 21.5 56Z"/><path d="M70.3 21.8C66.3 19.8 62.8 17.1 59.7 13.9L58 12 58 66C55.4 61.8 50.7 59 45.2 59 37 59 30.4 65.3 30.4 73 30.4 80.7 37 87 45.2 87 53.4 87 60 80.7 60 73L60 17C62.8 19.7 66 21.9 69.4 23.6 74.2 26 79.3 27.4 84.7 27.8L84.8 25.8C79.8 25.5 74.9 24.1 70.3 21.8ZM45.2 85C38.1 85 32.4 79.6 32.4 73 32.4 66.4 38.1 61 45.2 61 52.3 61 58 66.4 58 73 58 79.6 52.3 85 45.2 85Z"/></svg>')}
        </div>
        <div class="audio-text-labels">
          <h5>${escapeHTML(config.items[0]?.title || 'Instructional Audio Segment')}</h5>
          <p>${Number.isFinite(duration) ? `Duration: ${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s` : 'Duration available after media loads'}</p>
        </div>
      </div>
      <div class="audio-controls-row">
        <button type="button" class="audio-play-btn" aria-label="Play audio" aria-pressed="false">
          <svg class="play-svg" aria-hidden="true" width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M22 16 13 22.7 13 9.3Z"/></svg>
          <svg class="pause-svg" aria-hidden="true" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" style="display:none;"><rect x="11" y="10" width="3" height="12"/><rect x="18" y="10" width="3" height="12"/></svg>
        </button>
        <div class="audio-scrub-bar" role="slider" tabindex="0" aria-label="Audio position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0 percent">
          <div class="scrub-fill" style="width: 0%;"></div>
        </div>
        <span class="audio-timer" aria-live="off">0:00 / ${totalLabel}</span>
        <button type="button" class="audio-speed-btn" aria-label="Playback speed: 1x">1x</button>
        <button type="button" class="audio-mute-btn" aria-label="Mute audio" aria-pressed="false">
          ${volumeOnIcon}
          ${volumeOffIcon}
        </button>
        ${transcript ? `<button type="button" class="audio-transcript-btn" aria-haspopup="dialog" aria-controls="${instanceId}-transcript-panel" aria-label="Open transcript">${transcriptIcon}</button>` : ''}
      </div>
      <audio id="${instanceId}-html5-audio-element" src="${escapeAttribute(src)}" preload="metadata" style="display:none;"></audio>
      ${transcript ? `
      <div id="${instanceId}-transcript-panel" class="audio-transcript-panel" role="dialog" aria-modal="true" aria-labelledby="${instanceId}-transcript-title" tabindex="-1" style="display:none;">
        <div class="audio-transcript-panel-inner">
          <div class="audio-transcript-panel-header">
            <h3 id="${instanceId}-transcript-title">Transcript</h3>
            <button type="button" class="audio-transcript-close" aria-label="Close transcript">&times;</button>
          </div>
          <div class="audio-transcript-body">${transcript}</div>
        </div>
      </div>
      ` : '<p class="media-alternative-note sr-only">No transcript has been supplied for this audio.</p>'}
    </div>
  `;
}

export function generateCSS() {
  return `
    .audio-player-block {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .audio-info {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .audio-art {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      /* Not --accent-light: a lighter shade of AT&T Blue isn't part of the approved
         palette. A neutral brand-grey backdrop also gives the icon better contrast
         than blue-on-light-blue did. */
      background-color: var(--border-color);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .audio-art .custom-item-icon { width: 100%; height: 100%; }
    .audio-art-accent { fill: var(--accent); }
    .audio-text-labels h5 {
      font-size: 12px;
      font-weight: 600;
    }
    .audio-text-labels p {
      font-size: 10px;
      color: var(--text-muted);
    }
    .audio-controls-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      row-gap: 8px;
    }
    .audio-play-btn {
      width: 32px;
      height: 32px;
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
    .audio-play-btn:hover {
      transform: scale(1.05);
    }
    .audio-scrub-bar {
      flex: 1 1 60px;
      min-width: 60px;
      height: 6px;
      border-radius: 4px;
      background-color: var(--bg-body);
      cursor: pointer;
      position: relative;
    }
    .scrub-fill {
      height: 100%;
      border-radius: 4px;
      background-color: var(--accent);
    }
    .audio-timer {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
    }
    /* Speed toggle: a complete pill, Cobalt-outlined at rest like sorting-activity's
       .target-btn, not just on hover/press — this button is clickable at all times. */
    .audio-speed-btn {
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
    .audio-speed-btn:hover {
      border-color: var(--primary-hover);
      color: var(--primary-hover);
    }
    .audio-mute-btn,
    .audio-transcript-btn {
      width: 26px;
      height: 26px;
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
    .audio-mute-btn:hover,
    .audio-transcript-btn:hover {
      border-color: var(--primary-hover);
      color: var(--primary-hover);
    }
    .audio-transcript-panel {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(15, 23, 42, 0.6);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .audio-transcript-panel-inner {
      background-color: var(--bg-card);
      color: var(--text-main);
      border-radius: var(--border-radius);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
      max-width: 480px;
      width: 100%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .audio-transcript-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: var(--border-style);
    }
    .audio-transcript-panel-header h3 {
      font-size: 15px;
      font-weight: 700;
      margin: 0;
    }
    .audio-transcript-close {
      background: none;
      border: none;
      font-size: 22px;
      line-height: 1;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .audio-transcript-close:hover {
      color: var(--text-main);
    }
    .audio-transcript-body {
      padding: 20px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.6;
    }
    @media (forced-colors: active) {
      .scrub-fill { background: Highlight; }
    }`;
}

export function generateJS(config, instanceId) {
  return `
    var AUDIO_PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2];
    var audioTranscriptReturnFocus = null;

    function toggleAudioPlayback(btn) {
      var audio = document.getElementById('${instanceId}-html5-audio-element');
      var playSvg = btn.querySelector('.play-svg');
      var pauseSvg = btn.querySelector('.pause-svg');

      if (audio.paused) {
        audio.play().catch(function(e) { console.log('Audio autoplay blocked or invalid source URL'); });
        playSvg.style.display = 'none';
        pauseSvg.style.display = 'block';
        // Cobalt (--primary-hover), not AT&T Blue: this button is clickable at
        // all times and must keep the Cobalt treatment while playing too — the
        // hover shade signals "active" without breaking the brand's color rule.
        btn.style.backgroundColor = 'var(--primary-hover)';
        btn.setAttribute('aria-label', 'Pause audio');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        audio.pause();
        playSvg.style.display = 'block';
        pauseSvg.style.display = 'none';
        btn.style.backgroundColor = 'var(--primary)';
        btn.setAttribute('aria-label', 'Play audio');
        btn.setAttribute('aria-pressed', 'false');
      }
    }

    function cycleAudioSpeed(btn) {
      var audio = document.getElementById('${instanceId}-html5-audio-element');
      var current = audio.playbackRate || 1;
      var idx = AUDIO_PLAYBACK_SPEEDS.indexOf(current);
      if (idx === -1) idx = 0;
      var next = AUDIO_PLAYBACK_SPEEDS[(idx + 1) % AUDIO_PLAYBACK_SPEEDS.length];
      audio.playbackRate = next;
      var label = next + 'x';
      btn.textContent = label;
      btn.setAttribute('aria-label', 'Playback speed: ' + label);
    }

    function toggleAudioMute(btn) {
      var audio = document.getElementById('${instanceId}-html5-audio-element');
      audio.muted = !audio.muted;
      var onSvg = btn.querySelector('.volume-on-svg');
      var offSvg = btn.querySelector('.volume-off-svg');
      if (audio.muted) {
        if (onSvg) onSvg.style.display = 'none';
        if (offSvg) offSvg.style.display = 'block';
        btn.setAttribute('aria-label', 'Unmute audio');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        if (onSvg) onSvg.style.display = 'block';
        if (offSvg) offSvg.style.display = 'none';
        btn.setAttribute('aria-label', 'Mute audio');
        btn.setAttribute('aria-pressed', 'false');
      }
    }

    function openAudioTranscript(trigger) {
      var panel = document.getElementById('${instanceId}-transcript-panel');
      if (!panel) return;
      panel.style.display = 'flex';
      audioTranscriptReturnFocus = trigger || document.activeElement;
      panel.focus();
    }

    function closeAudioTranscript() {
      var panel = document.getElementById('${instanceId}-transcript-panel');
      if (!panel || panel.style.display === 'none') return;
      panel.style.display = 'none';
      if (audioTranscriptReturnFocus) audioTranscriptReturnFocus.focus();
    }

    function scrubAudio(event) {
      var bar = event.currentTarget;
      var rect = bar.getBoundingClientRect();
      var clickX = event.clientX - rect.left;
      var width = rect.width;
      var percentage = (clickX / width) * 100;

      bar.querySelector('.scrub-fill').style.width = percentage + '%';
      bar.setAttribute('aria-valuenow', String(Math.round(percentage)));
      bar.setAttribute('aria-valuetext', Math.round(percentage) + ' percent');
      var audio = document.getElementById('${instanceId}-html5-audio-element');
      if (audio && audio.duration) audio.currentTime = audio.duration * percentage / 100;
    }

    function changeAudioSliderByKeyboard(event) {
      if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].indexOf(event.key) === -1) return;
      event.preventDefault();
      var slider = event.currentTarget;
      var value = Number(slider.getAttribute('aria-valuenow')) || 0;
      if (event.key === 'Home') value = 0;
      else if (event.key === 'End') value = 100;
      else value += (event.key === 'ArrowRight' || event.key === 'ArrowUp') ? 5 : -5;
      value = Math.max(0, Math.min(100, value));
      slider.setAttribute('aria-valuenow', String(value));
      slider.setAttribute('aria-valuetext', value + ' percent');
      var fill = slider.querySelector('.scrub-fill');
      if (fill) fill.style.width = value + '%';
      var media = document.getElementById('${instanceId}-html5-audio-element');
      if (media && media.duration) media.currentTime = media.duration * value / 100;
    }

    function formatMediaTime(seconds) {
      if (!Number.isFinite(seconds)) return '0:00';
      var minutes = Math.floor(seconds / 60);
      return minutes + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
    }

    function syncAudioProgress(media, slider, fill, timer) {
      if (!media || !slider || !media.duration) return;
      var value = Math.max(0, Math.min(100, media.currentTime / media.duration * 100));
      slider.setAttribute('aria-valuenow', String(Math.round(value)));
      slider.setAttribute('aria-valuetext', formatMediaTime(media.currentTime) + ' of ' + formatMediaTime(media.duration));
      if (fill) fill.style.width = value + '%';
      if (timer) timer.textContent = formatMediaTime(media.currentTime) + ' / ' + formatMediaTime(media.duration);
    }

    function initComponent() {
      var audioPlayBtn = document.querySelector('.audio-play-btn');
      var audioElement = document.getElementById('${instanceId}-html5-audio-element');
      var audioScrubBar = document.querySelector('.audio-scrub-bar');
      var audioSpeedBtn = document.querySelector('.audio-speed-btn');
      var audioMuteBtn = document.querySelector('.audio-mute-btn');
      var audioTranscriptBtn = document.querySelector('.audio-transcript-btn');
      var audioTranscriptPanel = document.getElementById('${instanceId}-transcript-panel');
      var audioTranscriptClose = document.querySelector('.audio-transcript-close');
      var audioTimer = document.querySelector('.audio-timer');

      if (audioPlayBtn) audioPlayBtn.addEventListener('click', function() { toggleAudioPlayback(audioPlayBtn); });
      if (audioScrubBar) audioScrubBar.addEventListener('click', scrubAudio);
      if (audioScrubBar) audioScrubBar.addEventListener('keydown', changeAudioSliderByKeyboard);
      if (audioSpeedBtn) audioSpeedBtn.addEventListener('click', function() { cycleAudioSpeed(audioSpeedBtn); });
      if (audioMuteBtn) audioMuteBtn.addEventListener('click', function() { toggleAudioMute(audioMuteBtn); });

      if (audioElement) audioElement.addEventListener('loadedmetadata', function() {
        if (audioTimer && audioElement.duration) {
          audioTimer.textContent = formatMediaTime(audioElement.currentTime) + ' / ' + formatMediaTime(audioElement.duration);
        }
      });
      if (audioElement) audioElement.addEventListener('timeupdate', function() {
        syncAudioProgress(audioElement, audioScrubBar, audioScrubBar && audioScrubBar.querySelector('.scrub-fill'), audioTimer);
      });
      if (audioElement) audioElement.addEventListener('ended', function() {
        viewedItems.add(0);
        updateProgress();
        if (audioPlayBtn) {
          audioPlayBtn.setAttribute('aria-label', 'Play audio');
          audioPlayBtn.setAttribute('aria-pressed', 'false');
        }
      });

      if (audioTranscriptBtn) audioTranscriptBtn.addEventListener('click', function() { openAudioTranscript(audioTranscriptBtn); });
      if (audioTranscriptClose) audioTranscriptClose.addEventListener('click', closeAudioTranscript);
      if (audioTranscriptPanel) {
        audioTranscriptPanel.addEventListener('click', function(event) {
          if (event.target === audioTranscriptPanel) closeAudioTranscript();
        });
        audioTranscriptPanel.addEventListener('keydown', function(event) {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeAudioTranscript();
          }
          if (event.key === 'Tab') {
            event.preventDefault();
            var close = audioTranscriptPanel.querySelector('.audio-transcript-close');
            if (close) close.focus();
          }
        });
      }
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add an audio track.'];
  return { valid: errors.length === 0, errors };
}
