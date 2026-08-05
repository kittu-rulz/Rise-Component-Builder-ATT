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
          <rect width="100%" height="100%" fill="#F1F5F9" rx="12"></rect>
          <circle cx="400" cy="225" r="100" fill="none" stroke="#CBD5E1" stroke-width="4" stroke-dasharray="10 10"></circle>
          <line x1="100" y1="225" x2="700" y2="225" stroke="#E2E8F0" stroke-width="2"></line>
          <line x1="400" y1="50" x2="400" y2="400" stroke="#E2E8F0" stroke-width="2"></line>
          <text x="400" y="230" text-anchor="middle" fill="#94A3B8" font-size="16" font-weight="600">SCHEMATIC PATHWAY MAP</text>
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
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-style);
      padding: 12px;
    }
    .hotspot-img-wrapper {
      position: relative;
      width: 100%;
      border-radius: calc(var(--border-radius) - 4px);
      overflow: hidden;
    }
    .hotspot-schematic-svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .hotspot-background-image {
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
      display: block;
      background: var(--bg-body);
    }
    .hotspot-point {
      position: absolute;
      width: 28px;
      height: 28px;
      transform: translate(-50%, -50%);
      z-index: 10;
    }
    .hotspot-pin {
      position: relative;
      width: 28px;
      height: 28px;
      background-color: var(--accent);
      border: 2px solid #FFFFFF;
      color: var(--on-accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.15);
      z-index: 1;
    }
    .hotspot-pin .pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: var(--accent);
      animation: pinPulse 2s infinite;
      z-index: -1;
    }
    .hotspot-tooltip {
      position: absolute;
      bottom: 38px;
      left: 50%;
      transform: translateX(-50%) translateY(8px);
      width: 220px;
      background-color: #0F172A;
      color: #F1F5F9;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
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
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #FFFFFF;
    }
    .hotspot-tooltip-title {
      display: block;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #FFFFFF;
    }
    .hotspot-tooltip p {
      font-size: 11px;
      line-height: 1.4;
      color: #94A3B8;
    }
    .hotspot-tooltip-content {
      display: block;
      font-size: 11px;
      line-height: 1.4;
      color: #CBD5E1;
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
