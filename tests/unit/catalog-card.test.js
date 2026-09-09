// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { createCatalogCard, filterCatalog, componentCatalog, showComponentDetailsModal, closeComponentDetailsModal } from '../../js/catalog.js';

function component(overrides = {}) {
  return {
    id: 'accordion',
    title: 'Responsive Accordion',
    desc: 'Expand and collapse content sections.',
    category: 'Interactive',
    icon: '<svg></svg>',
    status: 'production',
    classification: 'enhanced',
    classificationLabel: 'Enhanced Rise Alternative',
    differentiator: 'Adds branded styling, flexible panel behaviour, and richer content presentation.',
    tier: 'enhanced-rise',
    tierLabel: 'Enhanced Rise',
    learningPurposes: ['Explore', 'Explain'],
    riseRecommendation: 'conditional',
    riseRecommendationSummary: 'Use custom when sequential locking or search is required',
    riseEquivalent: 'Rise Accordion Block',
    bestWhen: 'Use custom only for sequential locking, search, explored progress, visited badges, reset, or Expand All.',
    nativeRiseWhen: 'A standard basic accordion or FAQ list is sufficient.',
    keyCapabilities: ['Sequential panel locking', 'In-accordion text search'],
    complexity: 'Basic',
    mediaRequirements: 'None',
    accessibilitySummary: 'WAI-ARIA Accordion Pattern.',
    completionTracking: 'Panel exploration tracking',
    readiness: { score: 5, max: 5, status: 'Production', dimensions: { accessibility: true, responsive: true, riseTested: true, completionTested: true, mediaOptimized: true } },
    aliases: ['accordion', 'faq'],
    ...overrides
  };
}

describe('createCatalogCard', () => {
  test('renders title, description, category tag, and an accessible label', () => {
    const card = createCatalogCard(component(), () => {});
    expect(card.tagName).toBe('BUTTON');
    expect(card.querySelector('h3').textContent).toBe('Responsive Accordion');
    expect(card.querySelector('p').textContent).toBe('Expand and collapse content sections.');
    expect(card.querySelector('.card-tag').textContent).toBe('Interactive');
    expect(card.getAttribute('aria-label')).toBe('Responsive Accordion: Expand and collapse content sections.');
  });

  test('shows a Preview badge only for experimental-status components and Beta for beta status', () => {
    const experimental = createCatalogCard(component({ status: 'experimental' }), () => {});
    expect(experimental.querySelector('.card-status-badge').textContent).toBe('Preview');

    const beta = createCatalogCard(component({ status: 'beta' }), () => {});
    expect(beta.querySelector('.card-status-badge').textContent).toBe('Beta');

    const production = createCatalogCard(component({ status: 'production' }), () => {});
    expect(production.querySelector('.card-status-badge')).toBeNull();
  });

  test('clicking the card invokes onSelect with the component', () => {
    const onSelect = vi.fn();
    const item = component();
    const card = createCatalogCard(item, onSelect);
    card.click();
    expect(onSelect).toHaveBeenCalledWith(item);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test('clicking details link triggers onOpenDetails callback', () => {
    const onSelect = vi.fn();
    const onOpenDetails = vi.fn();
    const item = component();
    const card = createCatalogCard(item, { onSelect, onOpenDetails });
    const detailsLink = card.querySelector('[data-action="details"]');
    expect(detailsLink).not.toBeNull();
    detailsLink.click();
    expect(onOpenDetails).toHaveBeenCalledWith(item);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('renders the classification badge with the correct label and visual class', () => {
    const enhanced = createCatalogCard(component({ classification: 'enhanced', classificationLabel: 'Enhanced Rise Alternative' }), () => {});
    const enhancedBadge = enhanced.querySelector('.card-classification-badge');
    expect(enhancedBadge.textContent).toBe('Enhanced Rise Alternative');
    expect(enhancedBadge.classList.contains('card-classification-enhanced')).toBe(true);
    expect(enhancedBadge).not.toBe(enhanced.querySelector('.card-tag'));

    const custom = createCatalogCard(component({ id: 'audio-player', classification: 'custom', classificationLabel: 'Advanced Custom Interaction' }), () => {});
    const customBadge = custom.querySelector('.card-classification-badge');
    expect(customBadge.textContent).toBe('Advanced Custom Interaction');
    expect(customBadge.classList.contains('card-classification-custom')).toBe(true);
  });

  test('renders the strategic tier badge with appropriate class', () => {
    const flagship = createCatalogCard(component({ tier: 'flagship', tierLabel: 'Flagship' }), () => {});
    const flagshipBadge = flagship.querySelector('.card-tier-badge');
    expect(flagshipBadge.textContent).toBe('Flagship');
    expect(flagshipBadge.classList.contains('card-tier-flagship')).toBe(true);

    const signature = createCatalogCard(component({ tier: 'signature', tierLabel: 'Signature' }), () => {});
    expect(signature.querySelector('.card-tier-badge').textContent).toBe('Signature');
  });

  test('renders the one-line Rise recommendation summary bar', () => {
    const card = createCatalogCard(component({
      riseRecommendation: 'custom-recommended',
      riseRecommendationSummary: 'No direct Rise equivalent'
    }), () => {});
    const recBar = card.querySelector('.card-rise-rec');
    expect(recBar).not.toBeNull();
    expect(recBar.classList.contains('card-rise-rec-custom-recommended')).toBe(true);
    expect(recBar.textContent).toContain('No direct Rise equivalent');
  });

  test('renders a "Why use it?" section with the differentiator text', () => {
    const card = createCatalogCard(component({ differentiator: 'Adds branded styling, flexible panel behaviour, and richer content presentation.' }), () => {});
    const label = card.querySelector('.card-why-label');
    const text = card.querySelector('.card-why-text');
    expect(label.textContent).toBe('Why use it?');
    expect(text.textContent).toBe('Adds branded styling, flexible panel behaviour, and richer content presentation.');
    expect(text.hasAttribute('hidden')).toBe(false);
    expect(card.querySelector('[aria-expanded]')).toBeNull();
  });

  test('the classification badge and differentiator are referenced via aria-describedby', () => {
    const card = createCatalogCard(component(), () => {});
    const describedBy = card.getAttribute('aria-describedby').split(' ');
    const badge = card.querySelector('.card-classification-badge');
    const whyText = card.querySelector('.card-why-text');
    expect(describedBy).toContain(badge.id);
    expect(describedBy).toContain(whyText.id);
    expect(card.getAttribute('aria-label')).not.toContain('Enhanced Rise Alternative');
    expect(card.getAttribute('aria-label')).not.toContain('branded styling');
  });
});

describe('filterCatalog learning purposes & multi-facet discovery (Prompt Section 3)', () => {
  test('filters catalog by learning purpose (Explore, Compare, Assess, etc.)', () => {
    const explore = filterCatalog(componentCatalog, {
      activeCategory: 'all',
      activeClassification: 'all',
      activePurpose: 'Explore',
      searchQuery: '',
      favorites: new Set()
    });
    expect(explore.length).toBeGreaterThan(0);
    expect(explore.every(item => item.learningPurposes.includes('Explore'))).toBe(true);

    const compare = filterCatalog(componentCatalog, {
      activeCategory: 'all',
      activeClassification: 'all',
      activePurpose: 'Compare',
      searchQuery: '',
      favorites: new Set()
    });
    expect(compare.some(item => item.id === 'comparison-slider')).toBe(true);
    expect(compare.every(item => item.learningPurposes.includes('Compare'))).toBe(true);

    const assess = filterCatalog(componentCatalog, {
      activeCategory: 'all',
      activeClassification: 'all',
      activePurpose: 'Assess',
      searchQuery: '',
      favorites: new Set()
    });
    expect(assess.some(item => item.id === 'confidence-matrix')).toBe(true);
    expect(assess.every(item => item.learningPurposes.includes('Assess'))).toBe(true);
  });

  test('combines learning purpose filter with search query predictably', () => {
    const results = filterCatalog(componentCatalog, {
      activeCategory: 'all',
      activeClassification: 'all',
      activePurpose: 'Assess',
      searchQuery: 'Skills Self-Assessment',
      favorites: new Set()
    });
    expect(results.length).toBe(1);
    expect(results[0].id === 'confidence-matrix').toBe(true);
  });

  test('activePurpose="all" matches all components in category', () => {
    const all = filterCatalog(componentCatalog, {
      activeCategory: 'knowledge',
      activeClassification: 'all',
      activePurpose: 'all',
      searchQuery: '',
      favorites: new Set()
    });
    expect(all.length).toBe(5);
  });
});

describe('Component Details Modal (Prompt Section 5)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="modal-component-details" class="modal-overlay" style="display: none;">
        <div class="modal-card modal-xl" role="dialog" aria-modal="true" tabindex="-1">
          <div class="modal-header">
            <h3 id="modal-component-details-title"></h3>
            <span id="details-tier-badge"></span>
            <span id="details-status-badge"></span>
            <p id="details-subtitle"></p>
            <div id="details-purposes-container"></div>
            <button class="modal-close-btn" id="btn-close-component-details">&times;</button>
          </div>
          <div class="modal-body">
            <iframe id="details-preview-frame"></iframe>
            <ul id="details-capabilities-list"></ul>
            <span id="details-rise-equivalent"></span>
            <div id="details-rise-rec-summary"></div>
            <p id="details-best-when"></p>
            <p id="details-native-rise-when"></p>
            <span id="details-complexity"></span>
            <span id="details-readiness"></span>
            <span id="details-media-reqs"></span>
            <span id="details-completion"></span>
            <p id="details-a11y-summary"></p>
          </div>
          <div class="modal-footer">
            <button id="btn-details-cancel">Cancel</button>
            <button id="btn-details-use-component">Use This Component</button>
          </div>
        </div>
      </div>
    `;
  });

  test('showComponentDetailsModal populates all guidance fields and opens modal', () => {
    const item = component({
      title: 'Comparison Slider',
      tier: 'signature',
      tierLabel: 'Signature',
      riseRecommendation: 'custom-recommended',
      riseRecommendationSummary: 'No direct Rise equivalent',
      riseEquivalent: 'No direct equivalent',
      bestWhen: 'Strong for before/after comparison.',
      nativeRiseWhen: 'Side-by-side static images are adequate.',
      keyCapabilities: ['Smooth touch drag split-view', 'Keyboard arrow slider control'],
      complexity: 'Intermediate',
      accessibilitySummary: 'ARIA slider semantics.'
    });

    const onUse = vi.fn();
    const compilePreview = vi.fn(() => '<html><body>Preview</body></html>');

    showComponentDetailsModal(item, onUse, compilePreview);

    const modal = document.getElementById('modal-component-details');
    expect(modal.style.display).toBe('flex');
    expect(document.getElementById('modal-component-details-title').textContent).toBe('Comparison Slider');
    expect(document.getElementById('details-tier-badge').textContent).toBe('Signature');
    expect(document.getElementById('details-rise-equivalent').textContent).toBe('No direct equivalent');
    expect(document.getElementById('details-rise-rec-summary').textContent).toBe('No direct Rise equivalent');
    expect(document.getElementById('details-best-when').textContent).toBe('Strong for before/after comparison.');
    expect(document.getElementById('details-native-rise-when').textContent).toBe('Side-by-side static images are adequate.');
    expect(document.getElementById('details-complexity').textContent).toBe('Intermediate');
    expect(document.getElementById('details-a11y-summary').textContent).toBe('ARIA slider semantics.');
    expect(document.getElementById('details-capabilities-list').children.length).toBe(2);
    expect(compilePreview).toHaveBeenCalledWith(item);

    // Clicking Use Component triggers callback and closes modal
    const useBtn = document.getElementById('btn-details-use-component');
    useBtn.click();
    expect(onUse).toHaveBeenCalledWith(item);
    expect(modal.style.display).toBe('none');
  });

  test('closeComponentDetailsModal closes the modal dialog', () => {
    const modal = document.getElementById('modal-component-details');
    modal.style.display = 'flex';
    closeComponentDetailsModal();
    expect(modal.style.display).toBe('none');
  });
});
