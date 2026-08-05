import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute } from '../js/utilities.js';

export const id = 'video-frame';
export const name = 'Custom Video Embed';
export const category = 'media';
export const defaultConfig = {
  items: [
    { title: 'Rise Builder Workspace Walkthrough', content: 'https://www.w3schools.com/html/mov_bbb.mp4' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  const src = config.items[0]?.content || '';
  const captionsUrl = config.items[0]?.captionsUrl || '';
  const audioDescription = config.items[0]?.audioDescription || '';
  const poster = config.items[0]?.posterImage || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800';
  return `
    <div class="video-player-block">
      <div class="video-wrapper">
        <video id="${instanceId}-html5-video-element" poster="${escapeAttribute(poster)}" width="100%" height="auto" controls aria-label="${escapeAttribute(config.items[0]?.title || 'Instructional video')}">
          <source src="${escapeAttribute(src)}" type="video/mp4">
          ${captionsUrl ? `<track kind="captions" src="${escapeAttribute(captionsUrl)}" srclang="en" label="English" default>` : ''}
        </video>
        <button type="button" class="video-overlay-play" aria-label="Play video">
          <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
      </div>
      <div class="video-control-strip">
        <button type="button" class="video-mini-play" aria-label="Play video" aria-pressed="false">Play</button>
        <div class="video-timeline-scrub" role="slider" tabindex="0" aria-label="Video position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0 percent">
          <div class="video-fill" style="width: 0%;"></div>
        </div>
      </div>
      ${audioDescription ? `<details class="media-transcript"><summary>Visual description</summary><div>${audioDescription}</div></details>` : '<p class="media-alternative-note sr-only">No visual description has been supplied for this video.</p>'}
    </div>
  `;
}

export function generateCSS() {
  return `
    .video-player-block {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .video-wrapper {
      position: relative;
      width: 100%;
      border-radius: calc(var(--border-radius) - 4px);
      overflow: hidden;
      background-color: #000;
    }
    .video-wrapper video {
      display: block;
    }
    .video-overlay-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: rgba(15, 23, 42, 0.7);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      padding: 0;
      font: inherit;
      border: 0;
    }
    .video-wrapper:hover .video-overlay-play {
      background-color: var(--accent);
    }
    .video-control-strip {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px;
    }
    .video-mini-play {
      background: transparent;
      border: none;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      color: var(--accent);
    }
    .video-timeline-scrub {
      flex: 1;
      height: 6px;
      background-color: var(--bg-body);
      border-radius: 4px;
      position: relative;
    }
    .video-fill {
      height: 100%;
      background-color: var(--accent);
      border-radius: 4px;
    }
    @media (forced-colors: active) {
      .video-fill { background: Highlight; }
    }`;
}

export function generateJS(config, instanceId) {
  return `
    function toggleVideoPlayback(trigger) {
      var video = document.getElementById('${instanceId}-html5-video-element');
      var overlayPlay = document.querySelector('.video-overlay-play');
      var playBtn = document.querySelector('.video-mini-play');

      if (video.paused) {
        video.play().catch(function(e) { console.log('Video autoplay blocked or invalid source URL'); });
        overlayPlay.style.display = 'none';
        playBtn.textContent = 'Pause';
        playBtn.setAttribute('aria-label', 'Pause video');
        playBtn.setAttribute('aria-pressed', 'true');
      } else {
        video.pause();
        overlayPlay.style.display = 'flex';
        playBtn.textContent = 'Play';
        playBtn.setAttribute('aria-label', 'Play video');
        playBtn.setAttribute('aria-pressed', 'false');
      }
    }

    function scrubVideo(event) {
      var video = document.getElementById('${instanceId}-html5-video-element');
      var bar = event.currentTarget;
      var rect = bar.getBoundingClientRect();
      var percentage = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));

      bar.querySelector('.video-fill').style.width = (percentage * 100) + '%';
      bar.setAttribute('aria-valuenow', String(Math.round(percentage * 100)));
      bar.setAttribute('aria-valuetext', Math.round(percentage * 100) + ' percent');

      if (video && video.duration) {
        video.currentTime = video.duration * percentage;
      }
    }

    function changeVideoSliderByKeyboard(event) {
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
      var fill = slider.querySelector('.video-fill');
      if (fill) fill.style.width = value + '%';
      var media = document.getElementById('${instanceId}-html5-video-element');
      if (media && media.duration) media.currentTime = media.duration * value / 100;
    }

    function formatMediaTime(seconds) {
      if (!Number.isFinite(seconds)) return '0:00';
      var minutes = Math.floor(seconds / 60);
      return minutes + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
    }

    function syncVideoProgress(media, slider, fill) {
      if (!media || !slider || !media.duration) return;
      var value = Math.max(0, Math.min(100, media.currentTime / media.duration * 100));
      slider.setAttribute('aria-valuenow', String(Math.round(value)));
      slider.setAttribute('aria-valuetext', formatMediaTime(media.currentTime) + ' of ' + formatMediaTime(media.duration));
      if (fill) fill.style.width = value + '%';
    }

    function initComponent() {
      var videoOverlay = document.querySelector('.video-overlay-play');
      var videoMiniPlay = document.querySelector('.video-mini-play');
      var videoElement = document.getElementById('${instanceId}-html5-video-element');
      var videoScrubBar = document.querySelector('.video-timeline-scrub');

      if (videoOverlay) videoOverlay.addEventListener('click', function() { toggleVideoPlayback(videoOverlay); });
      if (videoMiniPlay) videoMiniPlay.addEventListener('click', function() { toggleVideoPlayback(videoMiniPlay); });
      if (videoScrubBar) videoScrubBar.addEventListener('click', scrubVideo);
      if (videoScrubBar) videoScrubBar.addEventListener('keydown', changeVideoSliderByKeyboard);
      if (videoElement) videoElement.addEventListener('ended', function() { viewedItems.add(0); updateProgress(); });
      if (videoElement) videoElement.addEventListener('timeupdate', function() {
        syncVideoProgress(videoElement, videoScrubBar, videoScrubBar && videoScrubBar.querySelector('.video-fill'));
      });
      if (videoElement) videoElement.addEventListener('play', function() {
        if (videoOverlay) videoOverlay.style.display = 'none';
        if (videoMiniPlay) {
          videoMiniPlay.textContent = 'Pause';
          videoMiniPlay.setAttribute('aria-label', 'Pause video');
          videoMiniPlay.setAttribute('aria-pressed', 'true');
        }
      });
      if (videoElement) videoElement.addEventListener('pause', function() {
        if (videoOverlay && !videoElement.ended) videoOverlay.style.display = 'flex';
        if (videoMiniPlay) {
          videoMiniPlay.textContent = 'Play';
          videoMiniPlay.setAttribute('aria-label', 'Play video');
          videoMiniPlay.setAttribute('aria-pressed', 'false');
        }
      });
    }`;
}

export function validate(config) {
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add a video.'];
  return { valid: errors.length === 0, errors };
}
