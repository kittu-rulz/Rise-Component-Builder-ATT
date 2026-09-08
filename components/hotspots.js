import { getEditorSchema } from '../js/editor-schemas.js';
import { escapeAttribute, escapeHTML } from '../js/utilities.js';
import { validateHotspotCoordinates, combineValidationResults } from '../js/validation-utils.js';

/**
 * Hotspots Component Configuration
 * @typedef {Object} HotspotsConfig
 * @property {string} [backgroundImage] - Background image URL
 * @property {string} [backgroundAltText] - Alt text for background image
 * @property {boolean} [backgroundDecorative] - Whether background is decorative
 * @property {'contain'|'cover'} [backgroundFit] - Image fit mode
 * @property {number} [backgroundFocalX=50] - Focal point X percentage
 * @property {number} [backgroundFocalY=50] - Focal point Y percentage
 * @property {Array<{title: string, content: string, x: string, y: string}>} items - Array of hotspot items
 */

export const id = 'hotspots';
export const name = 'Interactive Hotspots';
export const category = 'interactive';

/** @type {HotspotsConfig} */
export const defaultConfig = {
  items: [
    { title: 'Engine Valve', content: 'Manages the fuel-air mixture entry.', x: '25', y: '40' },
    { title: 'Spark Plug', content: 'Triggers the combustion spark.', x: '50', y: '25' },
    { title: 'Piston Rod', content: 'Transmits linear force to rotational crankshaft torque.', x: '75', y: '65' }
  ]
};
export const editorSchema = getEditorSchema(id);

export function generateHTML(config, instanceId) {
  const hotspotImage = config.backgroundImage || '';
  return `
    <div class="hotspots-container">
      <div class="hotspot-img-wrapper">
        ${hotspotImage ? `<img class="hotspot-background-image" src="${escapeAttribute(hotspotImage)}" alt="${config.backgroundDecorative ? '' : escapeAttribute(config.backgroundAltText || '')}" ${config.backgroundDecorative ? 'aria-hidden="true"' : ''} style="object-fit:${config.backgroundFit};object-position:${config.backgroundFocalX}% ${config.backgroundFocalY}%;">` : `<svg viewBox="0 0 800 450" class="hotspot-schematic-svg" role="img" aria-label="Schematic pathway map">
          <rect width="100%" height="100%" class="hotspot-schematic-bg" rx="12"></rect>
          <circle cx="400" cy="225" r="100" fill="none" class="hotspot-schematic-ring" stroke-width="4" stroke-dasharray="10 10"></circle>
          <line x1="100" y1="225" x2="700" y2="225" class="hotspot-schematic-line" stroke-width="2"></line>
          <line x1="400" y1="50" x2="400" y2="400" class="hotspot-schematic-line" stroke-width="2"></line>
          <text x="400" y="230" text-anchor="middle" class="hotspot-schematic-label" font-size="16" font-weight="600">Schematic Pathway Map</text>
        </svg>`}
        ${config.items.map((item, idx) => `
          <span class="hotspot-point" style="left: ${item.x || '50'}%; top: ${item.y || '50'}%;">
            <button type="button" class="hotspot-pin" data-idx="${idx}" aria-expanded="false" aria-controls="${instanceId}-hotspot-tooltip-${idx}" aria-label="Hotspot ${idx + 1}: ${escapeAttribute(item.title || 'Indicator')}">
              <span class="pulse" aria-hidden="true"></span>
              <span class="pin-dot" aria-hidden="true">${idx + 1}</span>
            </button>
            <span class="hotspot-tooltip" id="${instanceId}-hotspot-tooltip-${idx}" role="region" aria-label="Hotspot details" aria-hidden="true">
              <span class="hotspot-tooltip-title">${escapeHTML(item.title || 'Indicator')}</span>
              <span class="hotspot-tooltip-content">${item.content || 'Details...'}</span>
            </span>
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

export function generateCSS() {
  return `
    .hotspots-container {
      background-color: var(--bg-card);
      border: var(--border-style);
      border-radius: var(--att-radius-lg, var(--border-radius, 20px));
      box-shadow: var(--shadow-style);
      padding: var(--att-space-4, 16px);
    }
    .hotspot-img-wrapper {
      position: relative;
      width: 100%;
      border-radius: var(--att-radius-lg, 20px);
      overflow: hidden;
    }
    .hotspot-schematic-svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .hotspot-schematic-bg { fill: var(--bg-body); }
    .hotspot-schematic-ring, .hotspot-schematic-line { stroke: var(--border-color); }
    .hotspot-schematic-label { fill: var(--text-muted); }
    .hotspot-background-image {
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
      display: block;
      background: var(--bg-body);
    }
    .hotspot-point {
      position: absolute;
      width: 32px;
      height: 32px;
      transform: translate(-50%, -50%);
      z-index: 10;
    }
    .hotspot-pin {
      position: relative;
      width: 32px;
      height: 32px;
      /* Cobalt (--primary), not AT&T Blue (--accent): this pin is a clickable
         control, and clickable elements must use the Cobalt-on-white or
         white-on-Cobalt treatment, not the accent color. Cobalt's 10.7:1
         contrast against white also clears the white-text pairing at any size,
         unlike --accent (3.01:1, restricted to >=19px text). */
      background-color: var(--primary);
      border: 2px solid var(--bg-card);
      color: var(--on-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--att-fs-body-sm, 0.875rem);
      font-weight: var(--att-fw-bold, 700);
      cursor: pointer;
      box-shadow: var(--att-shadow-1, 0 4px 6px rgba(0,0,0,0.15));
      z-index: 1;
      padding: 0;
      position: absolute;
    }
    .hotspot-pin::before {
      content: '';
      position: absolute;
      top: -6px;
      left: -6px;
      right: -6px;
      bottom: -6px;
      min-width: 44px;
      min-height: 44px;
    }
    .hotspot-pin:hover {
      background-color: var(--primary-hover);
    }
    .hotspot-pin:active {
      transform: translate(-50%, -50%) scale(0.98);
    }
    .hotspot-pin:focus-visible {
      outline: 3px solid var(--att-cobalt, var(--primary));
      outline-offset: 2px;
    }
    .hotspot-pin .pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: var(--primary);
      animation: pinPulse 2s infinite;
      z-index: -1;
    }
    .hotspot-tooltip {
      position: absolute;
      bottom: 42px;
      left: 50%;
      transform: translateX(-50%) translateY(8px);
      width: 260px;
      max-width: 70ch;
      /* This popup is passive content (no interactive control inside it), so it
         must not use Cobalt as its surface color. Built from the theme's own
         text/surface tokens (inverted) rather than an invented dark-gray hex. */
      background-color: var(--text-main);
      color: var(--bg-card);
      padding: var(--att-space-4, 16px);
      border-radius: var(--att-radius-md, var(--border-radius, 12px));
      box-shadow: var(--att-shadow-2, 0 10px 15px -3px rgba(0, 0, 0, 0.2));
      display: none;
      z-index: 20;
      pointer-events: none;
      text-align: left;
      opacity: 0;
      transition: opacity 0.2s, transform 0.2s;
    }
    .hotspot-pin.active + .hotspot-tooltip {
      display: block;
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .hotspot-tooltip h5 {
      font-size: var(--att-fs-body, 1rem);
      font-weight: var(--att-fw-bold, 700);
      line-height: var(--att-lh-heading, 1.25);
      margin-bottom: 6px;
      color: var(--bg-card);
    }
    .hotspot-tooltip-title {
      display: block;
      font-size: var(--att-fs-body, 1rem);
      font-weight: var(--att-fw-bold, 700);
      line-height: var(--att-lh-heading, 1.25);
      margin-bottom: 6px;
      color: var(--bg-card);
    }
    .hotspot-tooltip p {
      font-size: var(--att-fs-body-sm, 0.875rem);
      line-height: var(--att-lh-body, 1.5);
      font-weight: 400;
      color: var(--bg-card);
      margin: 0;
    }
    .hotspot-tooltip-content {
      display: block;
      font-size: var(--att-fs-body-sm, 0.875rem);
      line-height: var(--att-lh-body, 1.5);
      font-weight: 400;
      color: var(--bg-card);
    }
    @keyframes pinPulse {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hotspot-pin .pulse { display: none; }
    }`;
}

export function generateJS() {
  return `
    function toggleHotspot(index, pin) {
      var isCurrentlyActive = pin.classList.contains('active');
      document.querySelectorAll('.hotspot-pin').forEach(function(p) {
        p.classList.remove('active');
        p.setAttribute('aria-expanded', 'false');
        var tooltip = p.parentElement.querySelector('.hotspot-tooltip');
        if (tooltip) tooltip.setAttribute('aria-hidden', 'true');
      });

      if (!isCurrentlyActive) {
        pin.classList.add('active');
        pin.setAttribute('aria-expanded', 'true');
        var tooltip = pin.parentElement.querySelector('.hotspot-tooltip');
        if (tooltip) tooltip.setAttribute('aria-hidden', 'false');
        if (tooltip) announce(tooltip.textContent.trim());
        viewedItems.add(index);
        updateProgress();
      }
    }

    function initComponent() {
      document.querySelectorAll('.hotspot-pin').forEach(function(pin) {
        pin.addEventListener('click', function(event) {
          event.stopPropagation();
          toggleHotspot(parseInt(pin.getAttribute('data-idx'), 10), pin);
        });
        pin.addEventListener('keydown', function(event) {
          if (event.key === 'Escape' && pin.classList.contains('active')) {
            event.preventDefault();
            toggleHotspot(parseInt(pin.getAttribute('data-idx'), 10), pin);
          }
        });
        // Close this pin's tooltip when keyboard focus moves away from it (e.g. via
        // Tab), rather than leaving it visibly open while an unrelated pin is focused.
        pin.addEventListener('blur', function() {
          if (pin.classList.contains('active')) {
            toggleHotspot(parseInt(pin.getAttribute('data-idx'), 10), pin);
          }
        });
      });

      document.addEventListener('click', function(event) {
        if (!event.target.closest('.hotspot-pin')) {
          document.querySelectorAll('.hotspot-pin').forEach(function(pin) {
            pin.classList.remove('active');
            pin.setAttribute('aria-expanded', 'false');
            var tooltip = pin.parentElement.querySelector('.hotspot-tooltip');
            if (tooltip) tooltip.setAttribute('aria-hidden', 'true');
          });
        }
      });
    }`;
}

/**
 * Validates hotspots component configuration.
 * @param {HotspotsConfig} config - The configuration to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with error messages
 */
export function validate(config) {
  const results = [
    validateHotspotCoordinates(config.items)
  ];
  
  // Validate each item has required fields
  if (Array.isArray(config.items)) {
    config.items.forEach((item, index) => {
      if (!item.title || !String(item.title).trim()) {
        results.push({ valid: false, error: `Hotspot ${index + 1}: Title is required.` });
      }
      if (!item.content || !String(item.content).trim()) {
        results.push({ valid: false, error: `Hotspot ${index + 1}: Content is required.` });
      }
    });
  }
  
  return combineValidationResults(results);
}
