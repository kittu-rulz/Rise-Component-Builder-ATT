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

function renderCustomItemArtwork(item, fallbackMarkup = '') {
  if (!item?.iconImage) return fallbackMarkup;
  const decorative = item.iconDecorative !== false;
  const fit = item.iconFit === 'cover' ? 'cover' : 'contain';
  return `<img class="custom-item-icon" src="${escapeAttribute(item.iconImage)}" alt="${decorative ? '' : escapeAttribute(item.iconAltText || '')}" ${decorative ? 'aria-hidden="true"' : ''} style="object-fit:${fit};">`;
}

export function generateHTML(config, instanceId) {
  const src = config.items[0]?.content || '';
  const transcript = config.items[0]?.transcript || '';
  const duration = config.items?.[0]?.contentDuration ?? config.items?.[0]?.content?.duration;
  return `
    <div class="audio-player-block">
      <div class="audio-info">
        <div class="audio-art">
          ${renderCustomItemArtwork(config.items[0], '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>')}
        </div>
        <div class="audio-text-labels">
          <h5>${escapeHTML(config.items[0]?.title || 'Instructional Audio Segment')}</h5>
          <p>${Number.isFinite(duration) ? `Duration: ${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s` : 'Duration available after media loads'}</p>
        </div>
      </div>
      <div class="audio-controls-row">
        <button type="button" class="audio-play-btn" aria-label="Play audio" aria-pressed="false">
          <svg class="play-svg" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <svg class="pause-svg" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        </button>
        <div class="audio-scrub-bar" role="slider" tabindex="0" aria-label="Audio position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="25" aria-valuetext="25 percent">
          <div class="scrub-fill" style="width: 25%;"></div>
        </div>
        <span class="audio-timer" aria-live="off">0:56</span>
      </div>
      <audio id="${instanceId}-html5-audio-element" src="${escapeAttribute(src)}" preload="metadata" style="display:none;"></audio>
      ${transcript ? `<details class="media-transcript"><summary>Transcript</summary><div>${transcript}</div></details>` : '<p class="media-alternative-note sr-only">No transcript has been supplied for this audio.</p>'}
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
      background-color: var(--accent-light);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .audio-art .custom-item-icon { width: 100%; height: 100%; }
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
    }
    .audio-play-btn:hover {
      transform: scale(1.05);
    }
    .audio-scrub-bar {
      flex: 1;
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
      width: 30px;
      text-align: right;
    }
    @media (forced-colors: active) {
      .scrub-fill { background: Highlight; }
    }`;
}

export function generateJS(config, instanceId) {
  return `
    function toggleAudioPlayback(btn) {
      var audio = document.getElementById('${instanceId}-html5-audio-element');
      var playSvg = btn.querySelector('.play-svg');
      var pauseSvg = btn.querySelector('.pause-svg');

      if (audio.paused) {
        audio.play().catch(function(e) { console.log('Audio autoplay blocked or invalid source URL'); });
        playSvg.style.display = 'none';
        pauseSvg.style.display = 'block';
        btn.style.backgroundColor = 'var(--accent)';
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
      if (timer) timer.textContent = formatMediaTime(media.currentTime);
    }

    function initComponent() {
      var audioPlayBtn = document.querySelector('.audio-play-btn');
      var audioElement = document.getElementById('${instanceId}-html5-audio-element');
      var audioScrubBar = document.querySelector('.audio-scrub-bar');
      if (audioPlayBtn) audioPlayBtn.addEventListener('click', function() { toggleAudioPlayback(audioPlayBtn); });
      if (audioScrubBar) audioScrubBar.addEventListener('click', scrubAudio);
      if (audioScrubBar) audioScrubBar.addEventListener('keydown', changeAudioSliderByKeyboard);
      if (audioElement) audioElement.addEventListener('timeupdate', function() {
        syncAudioProgress(audioElement, audioScrubBar, audioScrubBar && audioScrubBar.querySelector('.scrub-fill'), document.querySelector('.audio-timer'));
      });
      if (audioElement) audioElement.addEventListener('ended', function() {
        viewedItems.add(0);
        updateProgress();
        if (audioPlayBtn) {
          audioPlayBtn.setAttribute('aria-label', 'Play audio');
          audioPlayBtn.setAttribute('aria-pressed', 'false');
        }
      });
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add an audio track.'];
  return { valid: errors.length === 0, errors };
}
