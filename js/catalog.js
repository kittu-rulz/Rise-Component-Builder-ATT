import { CATEGORIES, CLASSIFICATIONS, TIERS, COMPONENT_REGISTRY } from './component-registry.js';
import { escapeHTML } from './utilities.js';

const categoryNameById = new Map(CATEGORIES.map(category => [category.id, category.name]));
const classificationNameById = new Map(CLASSIFICATIONS.map(classification => [classification.id, classification.name]));
const tierNameById = new Map(TIERS.map(tier => [tier.id, tier.name]));

export const componentCatalog = COMPONENT_REGISTRY.map(entry => ({
  id: entry.id,
  title: entry.name,
  desc: entry.description,
  // Raw category id — .card-tag renders this directly (pre-existing behaviour, unchanged
  // here), relying on CSS text-transform:uppercase rather than the full display name.
  category: entry.categoryId,
  // Full display name ("Knowledge Checks", not "knowledge") — search-only, so "Category"
  // in the task's search requirement means what an author actually reads in the sidebar.
  categoryLabel: categoryNameById.get(entry.categoryId) || entry.categoryId,
  icon: entry.icon,
  editorSchema: entry.editorSchema,
  keywords: entry.keywords,
  status: entry.status,
  classification: entry.classification,
  classificationLabel: classificationNameById.get(entry.classification) || entry.classification,
  differentiator: entry.differentiator,
  // Strategic Next-Level metadata
  tier: entry.tier,
  tierLabel: tierNameById.get(entry.tier) || entry.tier,
  learningPurposes: entry.learningPurposes || [],
  riseRecommendation: entry.riseRecommendation,
  riseRecommendationSummary: entry.riseRecommendationSummary,
  riseEquivalent: entry.riseEquivalent,
  bestWhen: entry.bestWhen,
  nativeRiseWhen: entry.nativeRiseWhen,
  keyCapabilities: entry.keyCapabilities || [],
  complexity: entry.complexity,
  mediaRequirements: entry.mediaRequirements,
  accessibilitySummary: entry.accessibilitySummary,
  completionTracking: entry.completionTracking,
  readiness: entry.readiness,
  aliases: entry.aliases || []
}));

// Multi-facet catalog filtering: category, classification, learning purpose, and query
export function filterCatalog(catalog, { activeCategory, activeClassification, activePurpose, searchQuery, favorites, recentlyUsed }) {
  let filtered;
  if (activeCategory === 'favorites') {
    filtered = catalog.filter(item => favorites.has(item.id));
  } else if (activeCategory === 'recent') {
    const byId = new Map(catalog.map(item => [item.id, item]));
    filtered = (recentlyUsed || []).map(id => byId.get(id)).filter(Boolean);
  } else if (!activeCategory || activeCategory === 'all') {
    filtered = [...catalog];
  } else {
    filtered = catalog.filter(item => item.category === activeCategory);
  }

  // Filter by classification (Enhanced Rise vs Custom)
  if (activeClassification && activeClassification !== 'all') {
    filtered = filtered.filter(item => item.classification === activeClassification);
  }

  // Filter by learning purpose (Explore, Compare, Practice, Reflect, Assess, Explain, Navigate, Media)
  if (activePurpose && activePurpose !== 'all') {
    filtered = filtered.filter(item => (item.learningPurposes || []).includes(activePurpose));
  }

  const query = (searchQuery || '').trim().toLowerCase();
  if (query) {
    const queryTokens = query.split(/\s+/).filter(Boolean);
    filtered = filtered.filter(item => {
      const searchBlob = [
        item.title,
        item.desc,
        ...(item.keywords || []),
        item.categoryLabel,
        item.category,
        item.classificationLabel,
        item.differentiator,
        item.tier,
        item.tierLabel,
        ...(item.learningPurposes || []),
        item.riseEquivalent,
        item.bestWhen,
        item.riseRecommendationSummary,
        ...(item.keyCapabilities || []),
        ...(item.aliases || [])
      ].filter(Boolean).join(' ').toLowerCase();

      return queryTokens.every(token => searchBlob.includes(token));
    });
  }
  return filtered;
}

export function createCatalogCard(component, optionsOrSelect) {
  const onSelect = typeof optionsOrSelect === 'function' ? optionsOrSelect : (optionsOrSelect?.onSelect || (() => {}));
  const onOpenDetails = typeof optionsOrSelect === 'object' && typeof optionsOrSelect.onOpenDetails === 'function'
    ? optionsOrSelect.onOpenDetails
    : null;

  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'component-select-card';
  card.dataset.componentId = component.id;
  const classificationBadgeId = `card-classification-${component.id}`;
  const whyTextId = `card-why-${component.id}`;
  card.setAttribute('aria-label', `${component.title}: ${component.desc}`);
  card.setAttribute('aria-describedby', `${classificationBadgeId} ${whyTextId}`);

  const classificationLabel = component.classificationLabel || '';
  const classificationSlug = component.classification === 'custom' ? 'custom' : 'enhanced';
  const tierSlug = component.tier || 'enhanced-rise';
  const tierLabel = component.tierLabel || tierNameById.get(tierSlug) || 'Standard';

  const statusBadge = component.status === 'experimental'
    ? '<span class="badge badge-accent card-status-badge">Preview</span>'
    : (component.status === 'beta' ? '<span class="badge badge-beta card-status-badge">Beta</span>' : '');

  const purposeTags = (component.learningPurposes || []).slice(0, 2)
    .map(p => `<span class="card-purpose-chip">${escapeHTML(p)}</span>`)
    .join('');

  const recIcon = component.riseRecommendation === 'custom-recommended'
    ? '<svg class="card-rise-rec-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
    : (component.riseRecommendation === 'native-first'
      ? '<svg class="card-rise-rec-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>'
      : '<svg class="card-rise-rec-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>');
  const riseRecSummary = component.riseRecommendationSummary || component.differentiator || '';
  const isFavorited = typeof optionsOrSelect === 'object' && optionsOrSelect.isFavorited;
  const isPreviewed = typeof optionsOrSelect === 'object' && optionsOrSelect.isPreviewed;
  const isSelected = typeof optionsOrSelect === 'object' && optionsOrSelect.isSelected;

  if (isPreviewed) card.classList.add('is-previewed');
  if (isSelected) card.classList.add('is-selected');
  if (isFavorited) card.classList.add('is-favorited');

  card.innerHTML = `
    <div class="card-top-header">
      <div class="card-icon-container" aria-hidden="true">${component.icon}</div>
      <div class="card-header-badges">
        <span class="card-tier-badge card-tier-${tierSlug}">${tierLabel}</span>
        ${statusBadge}
        <span class="btn-card-favorite ${isFavorited ? 'is-active' : ''}" data-action="favorite" role="button" tabindex="0" aria-label="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="${isFavorited ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </span>
      </div>
    </div>
    <h3>${component.title}</h3>
    <p>${component.desc}</p>
    
    <div class="card-rise-rec card-rise-rec-${component.riseRecommendation || 'conditional'}">
      <span class="card-rise-rec-icon" aria-hidden="true">${recIcon}</span>
      <span class="card-rise-rec-text">${escapeHTML(riseRecSummary)}</span>
    </div>

    <div class="card-footer">
      <div class="card-footer-badges">
        <span class="card-tag">${component.category}</span>
        ${classificationLabel ? `<span id="${classificationBadgeId}" class="card-classification-badge card-classification-${classificationSlug}">${classificationLabel}</span>` : ''}
        ${purposeTags}
      </div>
      <span class="card-arrow" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>
    </div>

    ${component.differentiator ? `
    <div class="card-why">
      <span class="card-why-label">Why use it?</span>
      <p id="${whyTextId}" class="card-why-text">${component.differentiator}</p>
    </div>` : ''}

    <div class="card-quick-actions">
      <span class="btn btn-sm btn-ghost btn-card-preview" data-action="preview" role="button" tabindex="0" aria-label="Preview ${escapeHTML(component.title)}">Preview</span>
      <span class="btn btn-sm btn-primary btn-card-use" data-action="use" role="button" tabindex="0" aria-label="Use ${escapeHTML(component.title)}">Use Component</span>
      <span class="card-action-link" data-action="details" role="button" tabindex="0" aria-label="View details and Rise guidance for ${escapeHTML(component.title)}">Details &rarr;</span>
    </div>
  `;

  card.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const favoriteTrigger = target?.closest('[data-action="favorite"]');
    const detailsTrigger = target?.closest('[data-action="details"]');
    const previewTrigger = target?.closest('[data-action="preview"]');
    const useTrigger = target?.closest('[data-action="use"]');

    if (favoriteTrigger) {
      e.stopPropagation();
      if (typeof optionsOrSelect === 'object' && typeof optionsOrSelect.onToggleFavorite === 'function') {
        optionsOrSelect.onToggleFavorite(component.id);
      }
    } else if (detailsTrigger && onOpenDetails) {
      e.stopPropagation();
      onOpenDetails(component);
    } else if (previewTrigger) {
      e.stopPropagation();
      if (typeof optionsOrSelect === 'object' && typeof optionsOrSelect.onPreview === 'function') {
        optionsOrSelect.onPreview(component);
      } else {
        onSelect(component);
      }
    } else if (useTrigger) {
      e.stopPropagation();
      onSelect(component);
    } else {
      onSelect(component);
    }
  });

  return card;
}

/**
 * @param {Array<any>} catalog
 * @param {string} [sortMode]
 * @param {{ favorites?: Set<string>, recentlyUsed?: string[] }} [options]
 * @returns {Array<any>}
 */
export function sortCatalog(catalog, sortMode = 'recommended', { favorites: _favorites = new Set(), recentlyUsed = [] } = {}) {
  const list = [...catalog];
  switch (sortMode) {
    case 'recent': {
      const recIndex = new Map(recentlyUsed.map((id, i) => [id, i]));
      return list.sort((a, b) => {
        const aIdx = recIndex.has(a.id) ? recIndex.get(a.id) : 9999;
        const bIdx = recIndex.has(b.id) ? recIndex.get(b.id) : 9999;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.title.localeCompare(b.title);
      });
    }
    case 'az':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'native-alt':
      return list.sort((a, b) => {
        const aScore = a.tier === 'enhanced-rise' ? 0 : 1;
        const bScore = b.tier === 'enhanced-rise' ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return a.title.localeCompare(b.title);
      });
    case 'no-rise':
      return list.sort((a, b) => {
        const aScore = a.tier === 'signature' || a.tier === 'flagship' ? 0 : 1;
        const bScore = b.tier === 'signature' || b.tier === 'flagship' ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return a.title.localeCompare(b.title);
      });
    case 'interactive': {
      const compOrder = { 'Advanced': 0, 'Intermediate': 1, 'Basic': 2 };
      return list.sort((a, b) => {
        const aComp = compOrder[a.complexity] ?? 1;
        const bComp = compOrder[b.complexity] ?? 1;
        if (aComp !== bComp) return aComp - bComp;
        return a.title.localeCompare(b.title);
      });
    }
    case 'recommended':
    default: {
      const tierRank = { 'flagship': 0, 'signature': 1, 'strong-custom': 2, 'enhanced-rise': 3, 'rise-first': 4 };
      return list.sort((a, b) => {
        const aRank = tierRank[a.tier] ?? 3;
        const bRank = tierRank[b.tier] ?? 3;
        if (aRank !== bRank) return aRank - bRank;
        return a.title.localeCompare(b.title);
      });
    }
  }
}

/**
 * @param {HTMLElement | null} container
 * @param {any} activeState
 * @param {{ onRemoveChip?: (key: string) => void, onClearAll?: () => void }} [options]
 */
export function renderFilterChips(container, activeState, { onRemoveChip = () => {}, onClearAll = () => {} } = {}) {
  if (!container) return;
  const chips = [];
  if (activeState.category && activeState.category !== 'all') {
    chips.push({
      key: 'category',
      label: `Category: ${activeState.categoryLabel || activeState.category}`,
      type: 'category'
    });
  }
  if (activeState.classification && activeState.classification !== 'all') {
    chips.push({
      key: 'classification',
      label: `${activeState.classificationLabel || activeState.classification}`,
      type: 'classification'
    });
  }
  if (activeState.purpose && activeState.purpose !== 'all') {
    chips.push({
      key: 'purpose',
      label: `Goal: ${activeState.purpose}`,
      type: 'purpose'
    });
  }
  if (activeState.query) {
    chips.push({
      key: 'query',
      label: `"${activeState.query}"`,
      type: 'query'
    });
  }

  if (chips.length === 0) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.innerHTML = `
    <div class="filter-chips-list" role="list" aria-label="Active filters">
      ${chips.map(chip => `
        <span class="filter-chip" role="listitem">
          <span class="filter-chip-label">${escapeHTML(chip.label)}</span>
          <button type="button" class="filter-chip-remove" data-chip-key="${chip.key}" aria-label="Remove ${escapeHTML(chip.label)} filter">&times;</button>
        </span>
      `).join('')}
      <button type="button" class="btn-clear-all-filters" id="btn-clear-all-filters">Clear all</button>
    </div>
  `;

  container.querySelectorAll('.filter-chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.getAttribute('data-chip-key');
      if (typeof onRemoveChip === 'function') onRemoveChip(key);
    });
  });

  const clearBtn = container.querySelector('#btn-clear-all-filters');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof onClearAll === 'function') onClearAll();
    });
  }
}

let lastFocusedElementBeforeModal = null;

export function showComponentDetailsModal(component, onUseComponent, compilePreviewFn) {
  const modal = document.getElementById('modal-component-details');
  if (!modal) return;

  lastFocusedElementBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const titleEl = document.getElementById('modal-component-details-title');
  const subtitleEl = document.getElementById('details-subtitle');
  const tierBadgeEl = document.getElementById('details-tier-badge');
  const statusBadgeEl = document.getElementById('details-status-badge');
  const purposesEl = document.getElementById('details-purposes-container');
  const previewFrame = /** @type {HTMLIFrameElement|null} */ (document.getElementById('details-preview-frame'));
  const capabilitiesList = document.getElementById('details-capabilities-list');
  const riseEquivEl = document.getElementById('details-rise-equivalent');
  const riseRecBox = document.getElementById('details-rise-rec-summary');
  const bestWhenEl = document.getElementById('details-best-when');
  const nativeRiseWhenEl = document.getElementById('details-native-rise-when');
  const complexityEl = document.getElementById('details-complexity');
  const readinessEl = document.getElementById('details-readiness');
  const mediaReqsEl = document.getElementById('details-media-reqs');
  const completionEl = document.getElementById('details-completion');
  const a11ySummaryEl = document.getElementById('details-a11y-summary');
  const btnUse = document.getElementById('btn-details-use-component');

  if (titleEl) titleEl.textContent = component.title || component.name;
  if (subtitleEl) subtitleEl.textContent = component.desc || component.description;

  const tierSlug = component.tier || 'enhanced-rise';
  const tierLabel = component.tierLabel || tierNameById.get(tierSlug) || 'Standard';
  if (tierBadgeEl) {
    tierBadgeEl.className = `card-tier-badge card-tier-${tierSlug}`;
    tierBadgeEl.textContent = tierLabel;
  }

  if (statusBadgeEl) {
    if (component.status === 'beta') {
      statusBadgeEl.textContent = 'Beta';
      statusBadgeEl.className = 'badge badge-beta';
      statusBadgeEl.hidden = false;
    } else if (component.status === 'experimental') {
      statusBadgeEl.textContent = 'Preview';
      statusBadgeEl.className = 'badge badge-accent';
      statusBadgeEl.hidden = false;
    } else {
      statusBadgeEl.hidden = true;
    }
  }

  if (purposesEl) {
    purposesEl.innerHTML = (component.learningPurposes || [])
      .map(p => `<span class="purpose-chip-static">${escapeHTML(p)}</span>`)
      .join('');
  }

  if (capabilitiesList) {
    capabilitiesList.innerHTML = (component.keyCapabilities || [])
      .map(cap => `<li><span class="cap-check">✓</span> <span>${escapeHTML(cap)}</span></li>`)
      .join('');
  }

  if (riseEquivEl) riseEquivEl.textContent = component.riseEquivalent || 'No direct equivalent';
  if (riseRecBox) {
    const recText = component.riseRecommendationSummary || component.differentiator || '';
    riseRecBox.className = `guidance-rec-box guidance-rec-${component.riseRecommendation || 'conditional'}`;
    riseRecBox.textContent = recText;
  }
  if (bestWhenEl) bestWhenEl.textContent = component.bestWhen || component.differentiator || '';
  if (nativeRiseWhenEl) nativeRiseWhenEl.textContent = component.nativeRiseWhen || 'Standard native Rise block is sufficient.';
  if (complexityEl) complexityEl.textContent = component.complexity || 'Intermediate';
  if (readinessEl) {
    const r = component.readiness || { score: 5, max: 5, status: 'Production' };
    readinessEl.textContent = `${r.score}/${r.max} (${r.status})`;
  }
  if (mediaReqsEl) {
    const m = component.mediaRequirements || 'None';
    mediaReqsEl.textContent = typeof m === 'string' ? m : (Array.isArray(m) ? m.join(', ') : 'None');
  }
  if (completionEl) completionEl.textContent = component.completionTracking || 'Exploration tracking';
  if (a11ySummaryEl) a11ySummaryEl.textContent = component.accessibilitySummary || 'Accessible semantic HTML, keyboard, and screen reader support.';

  // Render safe representative preview inside iframe if compiler is provided
  if (previewFrame && typeof compilePreviewFn === 'function') {
    try {
      const sampleHtml = compilePreviewFn(component);
      previewFrame.srcdoc = '';
      previewFrame.srcdoc = sampleHtml;
    } catch (e) {
      console.warn('Could not render sample preview in details modal:', e);
    }
  }

  // Set up Use Component button
  if (btnUse && btnUse.parentNode) {
    const newBtn = btnUse.cloneNode(true);
    btnUse.parentNode.replaceChild(newBtn, btnUse);
    newBtn.addEventListener('click', () => {
      closeComponentDetailsModal();
      if (typeof onUseComponent === 'function') {
        onUseComponent(component);
      }
    });
  }

  modal.style.display = 'flex';
  const modalCard = modal.querySelector('.modal-card');
  if (modalCard instanceof HTMLElement) modalCard.focus();
}

export function closeComponentDetailsModal() {
  const modal = document.getElementById('modal-component-details');
  if (!modal) return;
  modal.style.display = 'none';
  if (lastFocusedElementBeforeModal && typeof lastFocusedElementBeforeModal.focus === 'function') {
    lastFocusedElementBeforeModal.focus();
  }
}
