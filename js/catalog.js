import { CATEGORIES, CLASSIFICATIONS, COMPONENT_REGISTRY } from './component-registry.js';

const categoryNameById = new Map(CATEGORIES.map(category => [category.id, category.name]));
const classificationNameById = new Map(CLASSIFICATIONS.map(classification => [classification.id, classification.name]));

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
  // Next-Level metadata
  tier: entry.tier,
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

// 'all' (or omitted) matches every classification — see filterCatalog's own comment for
// why this is a second, independent facet from activeCategory rather than folded into it.
export function filterCatalog(catalog, { activeCategory, activeClassification, searchQuery, favorites, recentlyUsed }) {
  let filtered;
  if (activeCategory === 'favorites') {
    filtered = catalog.filter(item => favorites.has(item.id));
  } else if (activeCategory === 'recent') {
    // Ordered by recency (most-recently-used first), not catalog order — the whole point
    // of this category is "what did I just touch," which a category/alphabetical sort
    // would defeat.
    const byId = new Map(catalog.map(item => [item.id, item]));
    filtered = (recentlyUsed || []).map(id => byId.get(id)).filter(Boolean);
  } else {
    filtered = catalog.filter(item => item.category === activeCategory);
  }

  // Orthogonal to activeCategory (which picks one sidebar grouping at a time): whether a
  // component is a branded reskin of a native Rise block, or a purpose-built interaction
  // Rise has no equivalent for. Applies inside Favorites/Recent too, same as search does.
  if (activeClassification && activeClassification !== 'all') {
    filtered = filtered.filter(item => item.classification === activeClassification);
  }

  const query = (searchQuery || '').trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query) ||
      (item.keywords || []).some(keyword => keyword.toLowerCase().includes(query)) ||
      (item.categoryLabel || item.category || '').toLowerCase().includes(query) ||
      (item.classificationLabel || '').toLowerCase().includes(query) ||
      (item.differentiator || '').toLowerCase().includes(query));
  }
  return filtered;
}

export function createCatalogCard(component, onSelect) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'component-select-card';
  const classificationBadgeId = `card-classification-${component.id}`;
  const whyTextId = `card-why-${component.id}`;
  card.setAttribute('aria-label', `${component.title}: ${component.desc}`);
  // aria-describedby (not a longer aria-label) carries the classification + differentiator
  // to screen-reader users who Tab to the card, without bloating the primary accessible
  // name with the entire card's content (P-series convention already used throughout this
  // codebase: a short name, a separate describedby for supporting detail). Both referenced
  // elements are already plain visible text below — nothing here is hidden or duplicated
  // markup, just cross-referenced for assistive tech.
  card.setAttribute('aria-describedby', `${classificationBadgeId} ${whyTextId}`);
  const classificationLabel = component.classificationLabel || '';
  const classificationSlug = component.classification === 'custom' ? 'custom' : 'enhanced';
  card.innerHTML = `
    <div class="card-icon-container" aria-hidden="true">${component.icon}</div>
    <h3>${component.title}</h3>
    <p>${component.desc}</p>
    <div class="card-footer">
      <div class="card-footer-badges">
        <span class="card-tag">${component.category}</span>
        ${classificationLabel ? `<span id="${classificationBadgeId}" class="card-classification-badge card-classification-${classificationSlug}">${classificationLabel}</span>` : ''}
        ${component.status === 'experimental' ? '<span class="badge badge-accent card-status-badge">Preview</span>' : ''}
      </div>
      <span class="card-arrow" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>
    </div>
    ${component.differentiator ? `
    <div class="card-why">
      <span class="card-why-label">Why use it?</span>
      <p id="${whyTextId}" class="card-why-text">${component.differentiator}</p>
    </div>` : ''}`;
  card.addEventListener('click', () => onSelect(component));
  return card;
}
