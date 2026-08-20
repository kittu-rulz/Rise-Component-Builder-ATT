import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML, sanitizeRichText, sanitizeURL } from '../js/utilities.js';

export const id = 'flip-cards';
export const name = '3D Flip Cards';
export const category = 'interactive';
export const defaultConfig = {
  // Standard mode preserves the original click-to-reveal behavior exactly. Every field
  // below is additive/optional so an existing saved project (no flipCards* keys at all)
  // resolves identically to 'explore' with every feature off — see the `!== 'study'` /
  // `=== true` checks below, which treat `undefined` the same as the documented default.
  flipCardsMode: 'explore',
  flipCardsShuffle: false,
  flipCardsCategories: false,
  flipCardsSummary: false,
  flipCardsReset: false,
  flipCardsFrontLabel: 'Front',
  flipCardsBackLabel: 'Back',
  items: [
    { title: 'Front Side A', content: 'Hover to reveal definition.' },
    { title: 'Back Side A', content: 'Definitions should be concise.' },
    { title: 'Front Side B', content: 'Mobile compatibility check.' },
    { title: 'Back Side B', content: 'Rise blocks fit full width.' }
  ]
};
export const editorSchema = getEditorSchema(id);

const defaultFrontIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
const knowIcon = '<svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M11.33 26.75 1.29 16.71 2.71 15.29 11.33 23.92 29.29 5.96 30.71 7.37 11.33 26.75Z"/></svg>';

function renderCardArtwork(item, fallback = '') {
  const source = sanitizeURL(item?.iconImage, { allowDataImage: true, allowBlob: true, allowRelative: true });
  if (!source) return fallback;
  const decorative = item.iconDecorative !== false;
  const fit = item.iconFit === 'cover' ? 'cover' : 'contain';
  return `<img class="custom-item-icon" src="${escapeAttribute(source)}" alt="${decorative ? '' : escapeAttribute(item.iconAltText || '')}" ${decorative ? 'aria-hidden="true"' : ''} style="object-fit:${fit};">`;
}

export function generateHTML(config, instanceId) {
  const cards = [];
  for (let index = 0; index < config.items.length; index += 2) {
    if (config.items[index]) cards.push({ front: config.items[index], back: config.items[index + 1] || { title: 'Back Side Label', content: 'Back side description text.' } });
  }

  const studyMode = config.flipCardsMode === 'study';
  const categoriesEnabled = studyMode && config.flipCardsCategories === true;
  const showSummary = studyMode && config.flipCardsSummary === true;
  const showReset = studyMode && config.flipCardsReset === true;
  const backLabel = config.flipCardsBackLabel || 'Back';
  const categories = categoriesEnabled
    ? [...new Set(cards.map(card => (card.front.category || '').trim()).filter(Boolean))]
    : [];

  const toolbar = studyMode ? `
    <div class="flip-study-toolbar">
      ${categories.length ? `
        <div class="flip-category-filters" role="group" aria-label="Filter cards by category">
          <button type="button" class="flip-filter-chip active" data-filter-category="">All</button>
          ${categories.map(cat => `<button type="button" class="flip-filter-chip" data-filter-category="${escapeAttribute(cat)}">${escapeHTML(cat)}</button>`).join('')}
        </div>
      ` : ''}
      <div class="flip-study-controls">
        <button type="button" class="flip-review-filter-btn" aria-pressed="false">Show Review cards only</button>
        ${showReset ? '<button type="button" class="flip-reset-btn">Restart study set</button>' : ''}
      </div>
      <div class="flip-study-counts" id="${instanceId}-flip-counts" role="status" aria-live="polite" aria-atomic="true">Not viewed: ${cards.length} &middot; Know: 0 &middot; Review: 0</div>
    </div>
  ` : '';

  const summaryPanel = showSummary ? `
    <div class="flip-summary-panel" id="${instanceId}-flip-summary" role="status" aria-live="polite" hidden>
      <p class="flip-summary-text"></p>
      ${showReset ? '<button type="button" class="flip-summary-reset-btn">Restart study set</button>' : ''}
    </div>
  ` : '';

  return `<div class="flip-cards-block">
    ${toolbar}
    <div class="flip-cards-grid" id="${instanceId}-flip-grid">${cards.map((card, index) => {
      const frontArtwork = renderCardArtwork(card.front, defaultFrontIcon);
      const backArtwork = renderCardArtwork(card.back);
      const cardCategory = (card.front.category || '').trim();
      return `
      <div class="flip-card" role="button" tabindex="0" aria-expanded="false" aria-controls="${instanceId}-flip-card-back-${index}" aria-label="Reveal ${escapeAttribute(backLabel)} of ${escapeAttribute(card.front.title || 'Flip card')}" data-idx="${index}" ${cardCategory ? `data-category="${escapeAttribute(cardCategory)}"` : ''}>
        <div class="flip-card-inner">
        <div class="flip-card-front" id="${instanceId}-flip-card-front-${index}" aria-hidden="false">
          ${studyMode ? '<span class="flip-status-badge" data-role="status-badge" hidden></span>' : ''}
          <div class="card-icon-badge">${frontArtwork}</div><h3>${escapeHTML(card.front.title || 'Front Title')}</h3><p>${sanitizeRichText(card.front.content || 'Click to reveal definition.')}</p>
        </div>
        <div class="flip-card-back" id="${instanceId}-flip-card-back-${index}" aria-hidden="true">
          ${backArtwork ? `<div class="card-icon-badge">${backArtwork}</div>` : ''}<h3>${escapeHTML(card.back.title || 'Back Title')}</h3><p>${sanitizeRichText(card.back.content || 'Back description content goes here.')}</p>
          ${studyMode ? `
            <div class="flip-classify-row">
              <button type="button" class="flip-classify-btn flip-know-btn" data-classify="know" tabindex="-1" aria-pressed="false">${knowIcon}I know this</button>
              <button type="button" class="flip-classify-btn flip-review-btn" data-classify="review" tabindex="-1" aria-pressed="false">Needs review</button>
            </div>
          ` : ''}
        </div>
      </div></div>`;
    }).join('')}</div>
    ${summaryPanel}
  </div>`;
}

export function generateCSS() {
  return `
    .flip-cards-block {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .flip-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .flip-card {
      background-color: transparent;
      height: 180px;
      perspective: 1000px;
      cursor: pointer;
    }

    .flip-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      text-align: center;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      transform-style: preserve-3d;
    }

    .flip-card.flipped .flip-card-inner {
      transform: rotateY(180deg);
    }

    .flip-card-front, .flip-card-back {
      position: absolute;
      width: 100%;
      height: 100%;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      border-radius: var(--border-radius);
      border: var(--border-style);
      box-shadow: var(--shadow-style);
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }

    /* backface-visibility:hidden only hides a rotated-away face visually — it does not
       reliably stop it from receiving clicks in every rendering engine, which silently
       blocked the Know/Review buttons underneath once a card was flipped. The JS already
       toggles aria-hidden on whichever face isn't showing, so keying pointer-events off
       that (rather than adding separate state) can't drift out of sync with it. */
    .flip-card-front[aria-hidden="true"], .flip-card-back[aria-hidden="true"] {
      pointer-events: none;
    }

    .flip-card-front {
      background-color: var(--bg-card);
      color: var(--text-main);
      position: absolute;
    }

    .card-icon-badge {
      color: var(--accent);
      margin-bottom: 4px;
    }

    .card-icon-badge .custom-item-icon {
      width: 32px;
      height: 32px;
      border-radius: calc(var(--border-radius) / 2);
    }

    .flip-card-front h3, .flip-card-back h3 {
      font-size: 15px;
      font-weight: 600;
    }

    .flip-card-front p, .flip-card-back p {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .flip-card-back {
      background-color: var(--primary);
      color: var(--on-primary);
      transform: rotateY(180deg);
    }

    .flip-card-back h3 {
      color: var(--on-primary);
    }

    .flip-card-back p {
      color: var(--on-primary);
    }

    .flip-status-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 2px 8px;
      border-radius: 6px;
      background-color: var(--border-color);
      color: var(--text-main);
    }

    .flip-status-badge.flip-status-know::before {
      content: '\\2713 ';
    }

    .flip-status-badge.flip-status-review::before {
      content: '\\21BB ';
    }

    .flip-classify-row {
      display: flex;
      gap: 8px;
      margin-top: 6px;
    }

    .flip-classify-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background-color: var(--bg-card);
      color: var(--text-main);
      border: 1px solid var(--bg-card);
      border-radius: var(--button-radius);
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .flip-classify-btn:hover {
      border-color: var(--accent);
    }

    .flip-classify-btn.active {
      background-color: var(--bg-card);
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent) inset;
    }

    .flip-study-toolbar {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .flip-category-filters, .flip-study-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .flip-filter-chip, .flip-review-filter-btn, .flip-reset-btn, .flip-summary-reset-btn {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--button-radius);
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.2s;
    }

    .flip-filter-chip.active, .flip-review-filter-btn[aria-pressed="true"] {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent) inset;
    }

    .flip-study-counts {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }

    .flip-summary-panel {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 16px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
    }

    .flip-card[hidden] {
      display: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .flip-card-inner { transform: none !important; }
      .flip-card-front, .flip-card-back { transition: none !important; }
      .flip-card.flipped .flip-card-front { display: none; }
      .flip-card:not(.flipped) .flip-card-back { display: none; }
    }`;
}

export function generateJS(config, instanceId) {
  const studyMode = config.flipCardsMode === 'study';
  const shuffleOnInit = studyMode && config.flipCardsShuffle === true;
  const frontLabelLiteral = JSON.stringify(config.flipCardsFrontLabel || 'Front');
  const backLabelLiteral = JSON.stringify(config.flipCardsBackLabel || 'Back');

  return `
    var flipStudyMode = ${studyMode};
    var flipCardStates = {};

    function shuffleFlipCards(grid) {
      var cards = Array.prototype.slice.call(grid.children);
      for (var i = cards.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = cards[i];
        cards[i] = cards[j];
        cards[j] = temp;
      }
      cards.forEach(function(card) { grid.appendChild(card); });
    }

    function setCardStatusBadge(card, state) {
      var badge = card.querySelector('.flip-status-badge');
      if (!badge) return;
      if (!state) {
        badge.hidden = true;
        badge.textContent = '';
        badge.className = 'flip-status-badge';
        return;
      }
      badge.hidden = false;
      badge.textContent = state === 'know' ? 'Known' : 'Review';
      badge.className = 'flip-status-badge flip-status-' + state;
    }

    function updateFlipCounts() {
      var counts = document.getElementById('${instanceId}-flip-counts');
      var cards = document.querySelectorAll('.flip-card');
      var know = 0, review = 0;
      cards.forEach(function(card) {
        var state = flipCardStates[card.getAttribute('data-idx')];
        if (state === 'know') know++;
        else if (state === 'review') review++;
      });
      var notViewed = cards.length - know - review;
      if (counts) counts.textContent = 'Not viewed: ' + notViewed + ' \\u00b7 Know: ' + know + ' \\u00b7 Review: ' + review;
      maybeShowSummary(cards.length, know, review);
    }

    function maybeShowSummary(total, know, review) {
      var summary = document.getElementById('${instanceId}-flip-summary');
      if (!summary) return;
      if (total > 0 && know + review >= total) {
        summary.hidden = false;
        var text = summary.querySelector('.flip-summary-text');
        if (text) text.textContent = 'Study set complete: ' + know + ' of ' + total + ' known, ' + review + ' flagged for review.';
        announce('All cards classified. ' + know + ' known, ' + review + ' need review.');
      } else {
        summary.hidden = true;
      }
    }

    function classifyFlipCard(card, state) {
      var idx = card.getAttribute('data-idx');
      flipCardStates[idx] = state;
      setCardStatusBadge(card, state);
      card.querySelectorAll('.flip-classify-btn').forEach(function(btn) {
        var isActive = btn.getAttribute('data-classify') === state;
        btn.setAttribute('aria-pressed', String(isActive));
        btn.classList.toggle('active', isActive);
      });
      var titleEl = card.querySelector('.flip-card-front h3');
      announce((state === 'know' ? 'Marked known: ' : 'Marked for review: ') + (titleEl ? titleEl.textContent : ''));
      updateFlipCounts();
    }

    function applyFlipFilters() {
      var activeChip = document.querySelector('.flip-filter-chip.active');
      var categoryValue = activeChip ? activeChip.getAttribute('data-filter-category') : '';
      var reviewOnlyBtn = document.querySelector('.flip-review-filter-btn');
      var reviewOnly = !!reviewOnlyBtn && reviewOnlyBtn.getAttribute('aria-pressed') === 'true';
      var visibleCount = 0;
      document.querySelectorAll('.flip-card').forEach(function(card) {
        var matchesCategory = !categoryValue || card.getAttribute('data-category') === categoryValue;
        var matchesReview = !reviewOnly || flipCardStates[card.getAttribute('data-idx')] === 'review';
        var visible = matchesCategory && matchesReview;
        card.hidden = !visible;
        if (visible) visibleCount++;
      });
      announce(visibleCount + ' card' + (visibleCount === 1 ? '' : 's') + ' shown.');
    }

    function resetFlipStudy() {
      flipCardStates = {};
      document.querySelectorAll('.flip-card').forEach(function(card) {
        card.classList.remove('flipped');
        card.setAttribute('aria-expanded', 'false');
        var front = card.querySelector('.flip-card-front');
        var back = card.querySelector('.flip-card-back');
        if (front) front.setAttribute('aria-hidden', 'false');
        if (back) back.setAttribute('aria-hidden', 'true');
        card.querySelectorAll('.flip-classify-btn').forEach(function(btn) {
          btn.setAttribute('aria-pressed', 'false');
          btn.setAttribute('tabindex', '-1');
          btn.classList.remove('active');
        });
        setCardStatusBadge(card, null);
        card.hidden = false;
      });
      document.querySelectorAll('.flip-filter-chip').forEach(function(chip) {
        chip.classList.toggle('active', chip.getAttribute('data-filter-category') === '');
      });
      var reviewOnlyBtn = document.querySelector('.flip-review-filter-btn');
      if (reviewOnlyBtn) reviewOnlyBtn.setAttribute('aria-pressed', 'false');
      viewedItems.clear();
      updateProgress();
      updateFlipCounts();
      announce('Study set restarted.');
    }

    function initComponent() {
      var grid = document.getElementById('${instanceId}-flip-grid');
      if (grid && ${shuffleOnInit}) shuffleFlipCards(grid);

      document.querySelectorAll('.flip-card').forEach(function(card, idx) {
        card.addEventListener('click', function(event) {
          if (event.target.closest('.flip-classify-btn')) return;
          var flipped = card.classList.toggle('flipped');
          card.setAttribute('aria-expanded', String(flipped));
          var titleEl = card.querySelector('.flip-card-front h3');
          var titleText = titleEl ? titleEl.textContent : '';
          card.setAttribute('aria-label', (flipped ? 'Show ' + ${frontLabelLiteral} : 'Reveal ' + ${backLabelLiteral}) + ' of ' + titleText);
          card.querySelector('.flip-card-front').setAttribute('aria-hidden', String(flipped));
          card.querySelector('.flip-card-back').setAttribute('aria-hidden', String(!flipped));
          card.querySelectorAll('.flip-classify-btn').forEach(function(btn) { btn.setAttribute('tabindex', flipped ? '0' : '-1'); });
          announce((flipped ? ${backLabelLiteral} : ${frontLabelLiteral}) + ' shown');
          viewedItems.add(idx);
          updateProgress();
        });
        card.addEventListener('keydown', function(event) {
          if (event.target.closest('.flip-classify-btn')) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            card.click();
          }
        });
        card.querySelectorAll('.flip-classify-btn').forEach(function(btn) {
          btn.addEventListener('click', function(event) {
            event.stopPropagation();
            classifyFlipCard(card, btn.getAttribute('data-classify'));
          });
        });
      });

      document.querySelectorAll('.flip-filter-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          document.querySelectorAll('.flip-filter-chip').forEach(function(c) { c.classList.remove('active'); });
          chip.classList.add('active');
          applyFlipFilters();
        });
      });

      var reviewOnlyBtn = document.querySelector('.flip-review-filter-btn');
      if (reviewOnlyBtn) reviewOnlyBtn.addEventListener('click', function() {
        var pressed = reviewOnlyBtn.getAttribute('aria-pressed') === 'true';
        reviewOnlyBtn.setAttribute('aria-pressed', String(!pressed));
        applyFlipFilters();
      });

      document.querySelectorAll('.flip-reset-btn, .flip-summary-reset-btn').forEach(function(btn) {
        btn.addEventListener('click', resetFlipStudy);
      });

      if (flipStudyMode) updateFlipCounts();
    }`;
}

export function validate(config) {
  // flipCardsFrontLabel/flipCardsBackLabel are intentionally NOT required here: both
  // already fall back to 'Front'/'Back' at render time (generateHTML/generateJS), so a
  // missing or blank value never produces broken output — including for a project saved
  // before this field existed, which must still export cleanly with no config change.
  const errors = Array.isArray(config.items) && config.items.length ? [] : ['Add at least one card face.'];
  return { valid: errors.length === 0, errors };
}
