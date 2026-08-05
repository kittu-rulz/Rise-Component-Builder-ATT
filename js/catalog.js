import { COMPONENT_REGISTRY } from './component-registry.js';

export const componentCatalog = COMPONENT_REGISTRY.map(entry => ({
  id: entry.id,
  title: entry.name,
  desc: entry.description,
  category: entry.categoryId,
  icon: entry.icon,
  editorSchema: entry.editorSchema,
  keywords: entry.keywords,
  status: entry.status
}));

export function filterCatalog(catalog, { activeCategory, searchQuery, favorites }) {
  let filtered = activeCategory === 'favorites'
    ? catalog.filter(item => favorites.has(item.id))
    : catalog.filter(item => item.category === activeCategory);

  if (searchQuery) {
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(searchQuery) ||
      item.desc.toLowerCase().includes(searchQuery) ||
      (item.keywords || []).some(keyword => keyword.toLowerCase().includes(searchQuery)));
  }
  return filtered;
}

export function createCatalogCard(component, onSelect) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'component-select-card';
  card.setAttribute('aria-label', `${component.title}: ${component.desc}`);
  card.innerHTML = `
    <div class="card-icon-container" aria-hidden="true">${component.icon}</div>
    <h3>${component.title}</h3>
    <p>${component.desc}</p>
    <div class="card-footer">
      <span class="card-tag">${component.category}</span>
      ${component.status === 'experimental' ? '<span class="badge badge-accent card-status-badge">Experimental</span>' : ''}
      <span class="card-arrow" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>
    </div>`;
  card.addEventListener('click', () => onSelect(component));
  return card;
}
