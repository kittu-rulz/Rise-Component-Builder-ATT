/**
 * @file component-thumbnails.js
 * Bespoke lightweight SVG wireframe illustrations for all 26 Rise interactive components.
 * Designed with clean AT&T brand wireframe aesthetics (Cobalt #00388F accents, Slate #53565A lines, #F4F6F9 surfaces).
 */

/**
 * Returns a custom SVG wireframe thumbnail representing the component structure and interaction model.
 * @param {string} type - Component type ID or alias
 * @param {Object} [options]
 * @param {number} [options.width=120] - SVG width
 * @param {number} [options.height=70] - SVG height
 * @returns {string} Safe SVG markup string
 */
export function getComponentThumbnailSvg(type, { width = 120, height = 70 } = {}) {
  const normType = (type || '').toLowerCase().trim();

  switch (normType) {
    case 'accordion':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Panel 1 (Expanded) -->
          <rect x="10" y="8" width="100" height="30" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.5"/>
          <rect x="16" y="14" width="45" height="4" rx="2" fill="#00388F"/>
          <polyline points="98,14 102,18 106,14" fill="none" stroke="#00388F" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="16" y="24" width="70" height="3" rx="1.5" fill="#B3C4DC"/>
          <rect x="16" y="30" width="50" height="3" rx="1.5" fill="#D8E2EE"/>
          <!-- Panel 2 (Collapsed) -->
          <rect x="10" y="42" width="100" height="10" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="16" y="46" width="35" height="3" rx="1.5" fill="#53565A"/>
          <polyline points="98,46 102,49 106,46" fill="none" stroke="#8A8D91" stroke-width="1.2" stroke-linecap="round"/>
          <!-- Panel 3 (Collapsed) -->
          <rect x="10" y="55" width="100" height="10" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="16" y="59" width="40" height="3" rx="1.5" fill="#53565A"/>
          <polyline points="98,59 102,62 106,59" fill="none" stroke="#8A8D91" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      `.trim();

    case 'tabs':
    case 'horizontal-tabs':
    case 'tab-blocks':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Tab Bar -->
          <rect x="10" y="8" width="32" height="12" rx="3" fill="#00388F"/>
          <rect x="15" y="13" width="22" height="3" rx="1.5" fill="#FFFFFF"/>
          <rect x="44" y="9" width="30" height="11" rx="3" fill="#E4E7EC"/>
          <rect x="49" y="13" width="20" height="3" rx="1.5" fill="#8A8D91"/>
          <rect x="76" y="9" width="30" height="11" rx="3" fill="#E4E7EC"/>
          <rect x="81" y="13" width="20" height="3" rx="1.5" fill="#8A8D91"/>
          <!-- Active Tab Content Area -->
          <rect x="10" y="22" width="100" height="40" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.5"/>
          <rect x="16" y="28" width="45" height="4" rx="2" fill="#00388F"/>
          <rect x="16" y="37" width="85" height="3" rx="1.5" fill="#B3C4DC"/>
          <rect x="16" y="44" width="75" height="3" rx="1.5" fill="#D8E2EE"/>
          <rect x="16" y="51" width="55" height="3" rx="1.5" fill="#D8E2EE"/>
        </svg>
      `.trim();

    case 'flip-cards':
    case 'study-cards':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Card Front -->
          <rect x="12" y="10" width="44" height="50" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.5"/>
          <circle cx="34" cy="24" r="8" fill="#EAF1FB" stroke="#00388F" stroke-width="1"/>
          <path d="M34 20v4M34 27h.01" stroke="#00388F" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="18" y="38" width="32" height="3" rx="1.5" fill="#53565A"/>
          <rect x="22" y="44" width="24" height="3" rx="1.5" fill="#B3C4DC"/>
          <!-- Card Back (Flipped Accent) -->
          <rect x="64" y="10" width="44" height="50" rx="4" fill="#00388F" stroke="#002A6B" stroke-width="1.5"/>
          <rect x="70" y="18" width="32" height="4" rx="2" fill="#FFFFFF"/>
          <rect x="70" y="27" width="32" height="3" rx="1.5" fill="#B3C4DC"/>
          <rect x="70" y="34" width="26" height="3" rx="1.5" fill="#B3C4DC"/>
          <rect x="70" y="48" width="14" height="6" rx="2" fill="#00A859"/>
          <rect x="88" y="48" width="14" height="6" rx="2" fill="#E84855"/>
        </svg>
      `.trim();

    case 'hotspots':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Background Image Container -->
          <rect x="10" y="8" width="100" height="54" rx="4" fill="#E8EDF4" stroke="#B3C4DC" stroke-width="1"/>
          <polygon points="10,50 35,32 55,45 80,24 110,50 110,62 10,62" fill="#D0DCEB"/>
          <!-- Hotspot Pin 1 (Active with Callout) -->
          <circle cx="42" cy="26" r="6" fill="#00388F"/>
          <circle cx="42" cy="26" r="10" stroke="#00388F" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/>
          <circle cx="42" cy="26" r="2.5" fill="#FFFFFF"/>
          <!-- Tooltip Callout -->
          <rect x="52" y="14" width="52" height="22" rx="3" fill="#FFFFFF" stroke="#00388F" stroke-width="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"/>
          <rect x="56" y="18" width="32" height="3" rx="1.5" fill="#00388F"/>
          <rect x="56" y="25" width="42" height="2.5" rx="1.2" fill="#8A8D91"/>
          <!-- Hotspot Pin 2 (Idle) -->
          <circle cx="85" cy="42" r="5" fill="#00388F"/>
          <circle cx="85" cy="42" r="2" fill="#FFFFFF"/>
        </svg>
      `.trim();

    case 'button-list':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Action Buttons Stack -->
          <rect x="12" y="9" width="96" height="15" rx="4" fill="#00388F"/>
          <rect x="22" y="15" width="45" height="3" rx="1.5" fill="#FFFFFF"/>
          <polyline points="96,14 100,16.5 96,19" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="12" y="28" width="96" height="15" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.2"/>
          <rect x="22" y="34" width="50" height="3" rx="1.5" fill="#00388F"/>
          <polyline points="96,33 100,35.5 96,38" fill="none" stroke="#00388F" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="12" y="47" width="96" height="15" rx="4" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="22" y="53" width="40" height="3" rx="1.5" fill="#53565A"/>
          <polyline points="96,52 100,54.5 96,57" fill="none" stroke="#8A8D91" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      `.trim();

    case 'menu-list':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <rect x="10" y="8" width="100" height="54" rx="4" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <!-- Item 1 Active -->
          <rect x="10" y="8" width="100" height="18" fill="#EAF1FB"/>
          <circle cx="20" cy="17" r="4" fill="#00388F"/>
          <rect x="28" y="15" width="45" height="4" rx="2" fill="#00388F"/>
          <polyline points="100,14 103,17 100,20" stroke="#00388F" stroke-width="1.5" fill="none"/>
          <!-- Item 2 -->
          <line x1="10" y1="26" x2="110" y2="26" stroke="#EFEFEF"/>
          <circle cx="20" cy="35" r="4" fill="#DCDFE3"/>
          <rect x="28" y="33" width="55" height="3.5" rx="1.7" fill="#53565A"/>
          <polyline points="100,32 103,35 100,38" stroke="#8A8D91" stroke-width="1.2" fill="none"/>
          <!-- Item 3 -->
          <line x1="10" y1="44" x2="110" y2="44" stroke="#EFEFEF"/>
          <circle cx="20" cy="53" r="4" fill="#DCDFE3"/>
          <rect x="28" y="51" width="40" height="3.5" rx="1.7" fill="#53565A"/>
          <polyline points="100,50 103,53 100,56" stroke="#8A8D91" stroke-width="1.2" fill="none"/>
        </svg>
      `.trim();

    case 'multiple-choice':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Question Stem -->
          <rect x="12" y="8" width="75" height="4" rx="2" fill="#111827"/>
          <rect x="12" y="15" width="50" height="3" rx="1.5" fill="#8A8D91"/>
          <!-- Radio 1 (Selected/Correct) -->
          <rect x="10" y="22" width="100" height="13" rx="3" fill="#F0FDF4" stroke="#22C55E" stroke-width="1"/>
          <circle cx="18" cy="28.5" r="4.5" fill="#FFFFFF" stroke="#22C55E" stroke-width="1.5"/>
          <circle cx="18" cy="28.5" r="2.5" fill="#22C55E"/>
          <rect x="27" y="27" width="55" height="3" rx="1.5" fill="#166534"/>
          <!-- Radio 2 -->
          <rect x="10" y="38" width="100" height="13" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <circle cx="18" cy="44.5" r="4.5" fill="#FFFFFF" stroke="#8A8D91" stroke-width="1.2"/>
          <rect x="27" y="43" width="65" height="3" rx="1.5" fill="#53565A"/>
          <!-- Radio 3 -->
          <rect x="10" y="53" width="100" height="12" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <circle cx="18" cy="59" r="4" fill="#FFFFFF" stroke="#8A8D91" stroke-width="1.2"/>
          <rect x="27" y="57.5" width="45" height="3" rx="1.5" fill="#53565A"/>
        </svg>
      `.trim();

    case 'multiple-select':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Question Stem -->
          <rect x="12" y="8" width="70" height="4" rx="2" fill="#111827"/>
          <rect x="12" y="15" width="45" height="3" rx="1.5" fill="#8A8D91"/>
          <!-- Checkbox 1 (Checked) -->
          <rect x="10" y="22" width="100" height="13" rx="3" fill="#EAF1FB" stroke="#00388F" stroke-width="1"/>
          <rect x="14" y="24.5" width="8" height="8" rx="2" fill="#00388F"/>
          <polyline points="16,28.5 17.5,30 20,26.5" stroke="#FFFFFF" stroke-width="1.2" fill="none"/>
          <rect x="27" y="27" width="55" height="3" rx="1.5" fill="#00388F"/>
          <!-- Checkbox 2 (Checked) -->
          <rect x="10" y="38" width="100" height="13" rx="3" fill="#EAF1FB" stroke="#00388F" stroke-width="1"/>
          <rect x="14" y="40.5" width="8" height="8" rx="2" fill="#00388F"/>
          <polyline points="16,44.5 17.5,46 20,42.5" stroke="#FFFFFF" stroke-width="1.2" fill="none"/>
          <rect x="27" y="43" width="60" height="3" rx="1.5" fill="#00388F"/>
          <!-- Checkbox 3 (Unchecked) -->
          <rect x="10" y="53" width="100" height="12" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="14" y="55" width="8" height="8" rx="2" fill="#FFFFFF" stroke="#8A8D91" stroke-width="1.2"/>
          <rect x="27" y="57.5" width="45" height="3" rx="1.5" fill="#53565A"/>
        </svg>
      `.trim();

    case 'sorting-activity':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Draggable Item Card -->
          <rect x="32" y="8" width="56" height="16" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"/>
          <rect x="42" y="14" width="36" height="4" rx="2" fill="#00388F"/>
          <!-- Drop Bucket 1 -->
          <rect x="10" y="30" width="46" height="32" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.2" stroke-dasharray="3 2"/>
          <rect x="16" y="36" width="34" height="4" rx="2" fill="#00388F"/>
          <rect x="16" y="44" width="34" height="12" rx="2" fill="#EAF1FB"/>
          <!-- Drop Bucket 2 -->
          <rect x="64" y="30" width="46" height="32" rx="4" fill="#FFFFFF" stroke="#8A8D91" stroke-width="1.2" stroke-dasharray="3 2"/>
          <rect x="70" y="36" width="34" height="4" rx="2" fill="#53565A"/>
          <rect x="70" y="44" width="34" height="12" rx="2" fill="#F4F6F9"/>
        </svg>
      `.trim();

    case 'fill-blank':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <rect x="10" y="10" width="100" height="50" rx="4" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <!-- Sentence with Inline Blank Input -->
          <rect x="16" y="20" width="28" height="4" rx="2" fill="#111827"/>
          <rect x="48" y="16" width="36" height="12" rx="3" fill="#EAF1FB" stroke="#00388F" stroke-width="1.5"/>
          <rect x="53" y="21" width="26" height="2.5" rx="1.2" fill="#00388F"/>
          <rect x="88" y="20" width="16" height="4" rx="2" fill="#111827"/>
          <!-- Check / Feedback Box -->
          <rect x="16" y="34" width="88" height="3" rx="1.5" fill="#DCDFE3"/>
          <rect x="16" y="44" width="30" height="10" rx="3" fill="#00388F"/>
          <rect x="22" y="47.5" width="18" height="3" rx="1.5" fill="#FFFFFF"/>
        </svg>
      `.trim();

    case 'vertical-timeline':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Vertical Spine Line -->
          <line x1="26" y1="10" x2="26" y2="60" stroke="#00388F" stroke-width="2"/>
          <!-- Node 1 (Active) -->
          <circle cx="26" cy="18" r="6" fill="#00388F"/>
          <circle cx="26" cy="18" r="2.5" fill="#FFFFFF"/>
          <rect x="38" y="12" width="70" height="12" rx="3" fill="#FFFFFF" stroke="#00388F" stroke-width="1"/>
          <rect x="44" y="16.5" width="35" height="3" rx="1.5" fill="#00388F"/>
          <!-- Node 2 -->
          <circle cx="26" cy="35" r="5" fill="#FFFFFF" stroke="#00388F" stroke-width="2"/>
          <rect x="38" y="29" width="70" height="12" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="44" y="33.5" width="45" height="3" rx="1.5" fill="#53565A"/>
          <!-- Node 3 -->
          <circle cx="26" cy="52" r="5" fill="#FFFFFF" stroke="#8A8D91" stroke-width="2"/>
          <rect x="38" y="46" width="70" height="12" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="44" y="50.5" width="40" height="3" rx="1.5" fill="#8A8D91"/>
        </svg>
      `.trim();

    case 'horizontal-timeline':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Horizontal Spine Line -->
          <line x1="16" y1="22" x2="104" y2="22" stroke="#00388F" stroke-width="2"/>
          <!-- Step 1 -->
          <circle cx="24" cy="22" r="6" fill="#00388F"/>
          <polyline points="21,22 23,24 27,20" stroke="#FFFFFF" stroke-width="1.2" fill="none"/>
          <!-- Step 2 (Active) -->
          <circle cx="60" cy="22" r="7" fill="#00388F" stroke="#B3C4DC" stroke-width="2"/>
          <circle cx="60" cy="22" r="3" fill="#FFFFFF"/>
          <!-- Step 3 -->
          <circle cx="96" cy="22" r="6" fill="#FFFFFF" stroke="#00388F" stroke-width="2"/>
          <circle cx="96" cy="22" r="2" fill="#00388F"/>
          <!-- Active Card Below -->
          <rect x="12" y="36" width="96" height="26" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.2"/>
          <rect x="18" y="42" width="40" height="3.5" rx="1.7" fill="#00388F"/>
          <rect x="18" y="49" width="75" height="2.5" rx="1.2" fill="#8A8D91"/>
          <rect x="18" y="54" width="60" height="2.5" rx="1.2" fill="#DCDFE3"/>
        </svg>
      `.trim();

    case 'process-flow':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Process Chevrons Sequence -->
          <!-- Step 1 -->
          <path d="M10 14h24l8 14-8 14H10l8-14z" fill="#00388F"/>
          <rect x="16" y="26" width="14" height="3" rx="1.5" fill="#FFFFFF"/>
          <!-- Step 2 Active -->
          <path d="M38 14h24l8 14-8 14H38l8-14z" fill="#EAF1FB" stroke="#00388F" stroke-width="1.2"/>
          <rect x="46" y="26" width="14" height="3" rx="1.5" fill="#00388F"/>
          <!-- Step 3 -->
          <path d="M66 14h24l8 14-8 14H66l8-14z" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="74" y="26" width="14" height="3" rx="1.5" fill="#8A8D91"/>
          <!-- Detail summary card -->
          <rect x="10" y="48" width="100" height="14" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="16" y="53" width="50" height="3.5" rx="1.7" fill="#53565A"/>
        </svg>
      `.trim();

    case 'scenario':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Character Dialogue Card -->
          <circle cx="24" cy="20" r="10" fill="#EAF1FB" stroke="#00388F" stroke-width="1.2"/>
          <circle cx="24" cy="18" r="4" fill="#00388F"/>
          <path d="M16 28c0-3 3-5 8-5s8 2 8 5" fill="#00388F"/>
          <rect x="40" y="10" width="70" height="20" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1"/>
          <rect x="46" y="15" width="40" height="3" rx="1.5" fill="#00388F"/>
          <rect x="46" y="21" width="55" height="2.5" rx="1.2" fill="#8A8D91"/>
          <!-- Decision Choice Buttons -->
          <rect x="10" y="36" width="100" height="13" rx="3" fill="#FFFFFF" stroke="#00388F" stroke-width="1"/>
          <rect x="16" y="41" width="60" height="3" rx="1.5" fill="#00388F"/>
          <rect x="10" y="52" width="100" height="12" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="16" y="56.5" width="50" height="3" rx="1.5" fill="#53565A"/>
        </svg>
      `.trim();

    case 'profile-cards':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Card 1 -->
          <rect x="10" y="8" width="46" height="54" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.2"/>
          <circle cx="33" cy="22" r="8" fill="#EAF1FB" stroke="#00388F" stroke-width="1"/>
          <rect x="18" y="35" width="30" height="4" rx="2" fill="#00388F"/>
          <rect x="22" y="42" width="22" height="2.5" rx="1.2" fill="#8A8D91"/>
          <rect x="16" y="48" width="34" height="2" rx="1" fill="#DCDFE3"/>
          <!-- Card 2 -->
          <rect x="64" y="8" width="46" height="54" rx="4" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <circle cx="87" cy="22" r="8" fill="#F4F6F9" stroke="#8A8D91" stroke-width="1"/>
          <rect x="72" y="35" width="30" height="4" rx="2" fill="#53565A"/>
          <rect x="76" y="42" width="22" height="2.5" rx="1.2" fill="#8A8D91"/>
          <rect x="70" y="48" width="34" height="2" rx="1" fill="#DCDFE3"/>
        </svg>
      `.trim();

    case 'info-grid':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Grid 2x2 Layout -->
          <rect x="10" y="8" width="47" height="25" rx="3" fill="#FFFFFF" stroke="#00388F" stroke-width="1.2"/>
          <rect x="15" y="13" width="7" height="7" rx="1.5" fill="#00388F"/>
          <rect x="26" y="14" width="25" height="3" rx="1.5" fill="#00388F"/>
          <rect x="15" y="24" width="35" height="2" rx="1" fill="#8A8D91"/>

          <rect x="63" y="8" width="47" height="25" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="68" y="13" width="7" height="7" rx="1.5" fill="#53565A"/>
          <rect x="79" y="14" width="25" height="3" rx="1.5" fill="#53565A"/>
          <rect x="68" y="24" width="35" height="2" rx="1" fill="#8A8D91"/>

          <rect x="10" y="37" width="47" height="25" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="15" y="42" width="7" height="7" rx="1.5" fill="#53565A"/>
          <rect x="26" y="43" width="25" height="3" rx="1.5" fill="#53565A"/>
          <rect x="15" y="53" width="35" height="2" rx="1" fill="#8A8D91"/>

          <rect x="63" y="37" width="47" height="25" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="68" y="42" width="7" height="7" rx="1.5" fill="#53565A"/>
          <rect x="79" y="43" width="25" height="3" rx="1.5" fill="#53565A"/>
          <rect x="68" y="53" width="35" height="2" rx="1" fill="#8A8D91"/>
        </svg>
      `.trim();

    case 'pricing-comparison':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Column 1 -->
          <rect x="8" y="14" width="32" height="48" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="12" y="18" width="24" height="3" rx="1.5" fill="#53565A"/>
          <rect x="12" y="25" width="18" height="5" rx="2" fill="#111827"/>
          <rect x="12" y="34" width="24" height="2" rx="1" fill="#8A8D91"/>
          <rect x="12" y="40" width="24" height="2" rx="1" fill="#8A8D91"/>
          <!-- Column 2 (Highlighted/Featured Tier) -->
          <rect x="44" y="6" width="32" height="56" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.8" filter="drop-shadow(0 2px 6px rgba(0,56,143,0.15))"/>
          <rect x="44" y="6" width="32" height="6" fill="#00388F"/>
          <rect x="48" y="16" width="24" height="3.5" rx="1.7" fill="#00388F"/>
          <rect x="48" y="23" width="20" height="6" rx="2" fill="#00388F"/>
          <rect x="48" y="33" width="24" height="2.5" rx="1.2" fill="#00388F"/>
          <rect x="48" y="39" width="24" height="2.5" rx="1.2" fill="#00388F"/>
          <rect x="48" y="47" width="24" height="9" rx="2" fill="#00388F"/>
          <!-- Column 3 -->
          <rect x="80" y="14" width="32" height="48" rx="3" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="84" y="18" width="24" height="3" rx="1.5" fill="#53565A"/>
          <rect x="84" y="25" width="18" height="5" rx="2" fill="#111827"/>
          <rect x="84" y="34" width="24" height="2" rx="1" fill="#8A8D91"/>
          <rect x="84" y="40" width="24" height="2" rx="1" fill="#8A8D91"/>
        </svg>
      `.trim();

    case 'audio-player':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <rect x="10" y="12" width="100" height="46" rx="6" fill="#FFFFFF" stroke="#00388F" stroke-width="1.2"/>
          <!-- Play Button Circle -->
          <circle cx="28" cy="35" r="12" fill="#00388F"/>
          <polygon points="25,29 34,35 25,41" fill="#FFFFFF"/>
          <!-- Audio Waveform Bars -->
          <line x1="46" y1="30" x2="46" y2="40" stroke="#00388F" stroke-width="2" stroke-linecap="round"/>
          <line x1="52" y1="24" x2="52" y2="46" stroke="#00388F" stroke-width="2" stroke-linecap="round"/>
          <line x1="58" y1="20" x2="58" y2="50" stroke="#00388F" stroke-width="2" stroke-linecap="round"/>
          <line x1="64" y1="28" x2="64" y2="42" stroke="#00388F" stroke-width="2" stroke-linecap="round"/>
          <line x1="70" y1="22" x2="70" y2="48" stroke="#00388F" stroke-width="2" stroke-linecap="round"/>
          <line x1="76" y1="32" x2="76" y2="38" stroke="#B3C4DC" stroke-width="2" stroke-linecap="round"/>
          <line x1="82" y1="26" x2="82" y2="44" stroke="#B3C4DC" stroke-width="2" stroke-linecap="round"/>
          <line x1="88" y1="30" x2="88" y2="40" stroke="#B3C4DC" stroke-width="2" stroke-linecap="round"/>
          <line x1="94" y1="33" x2="94" y2="37" stroke="#B3C4DC" stroke-width="2" stroke-linecap="round"/>
          <line x1="100" y1="31" x2="100" y2="39" stroke="#B3C4DC" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `.trim();

    case 'video-frame':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Video Frame Display -->
          <rect x="10" y="8" width="100" height="54" rx="4" fill="#0B132B" stroke="#00388F" stroke-width="1.2"/>
          <!-- Play Trigger -->
          <circle cx="60" cy="32" r="11" fill="rgba(255,255,255,0.2)" stroke="#FFFFFF" stroke-width="1.5"/>
          <polygon points="57,26 66,32 57,38" fill="#FFFFFF"/>
          <!-- Control Bar -->
          <rect x="10" y="52" width="100" height="10" fill="#001845"/>
          <rect x="14" y="56" width="35" height="2" rx="1" fill="#00388F"/>
          <circle cx="49" cy="57" r="2" fill="#FFFFFF"/>
          <rect x="51" y="56" width="55" height="2" rx="1" fill="#53565A"/>
        </svg>
      `.trim();

    case 'image-gallery':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Main Image Display -->
          <rect x="10" y="8" width="100" height="38" rx="4" fill="#E8EDF4" stroke="#00388F" stroke-width="1.2"/>
          <circle cx="28" cy="20" r="5" fill="#B3C4DC"/>
          <polygon points="10,38 35,24 55,34 80,18 110,38 110,46 10,46" fill="#00388F" opacity="0.35"/>
          <!-- Thumbnails Row -->
          <rect x="10" y="50" width="22" height="14" rx="2" fill="#FFFFFF" stroke="#00388F" stroke-width="1.5"/>
          <rect x="36" y="50" width="22" height="14" rx="2" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="62" y="50" width="22" height="14" rx="2" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <rect x="88" y="50" width="22" height="14" rx="2" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
        </svg>
      `.trim();

    case 'interactive-video':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <rect x="10" y="8" width="100" height="54" rx="4" fill="#0B132B" stroke="#00388F" stroke-width="1.2"/>
          <!-- Video Screen Play -->
          <circle cx="60" cy="30" r="10" fill="rgba(0,56,143,0.8)" stroke="#FFFFFF" stroke-width="1.2"/>
          <polygon points="57,25 65,30 57,35" fill="#FFFFFF"/>
          <!-- Interactive Scrubber with Milestone Markers -->
          <rect x="10" y="50" width="100" height="12" fill="#001845"/>
          <line x1="14" y1="56" x2="106" y2="56" stroke="#53565A" stroke-width="2"/>
          <line x1="14" y1="56" x2="52" y2="56" stroke="#00388F" stroke-width="2"/>
          <!-- Milestone Pins -->
          <circle cx="34" cy="56" r="3" fill="#00A859" stroke="#FFFFFF" stroke-width="1"/>
          <circle cx="52" cy="56" r="3.5" fill="#00388F" stroke="#FFFFFF" stroke-width="1.2"/>
          <circle cx="78" cy="56" r="3" fill="#E84855" stroke="#FFFFFF" stroke-width="1"/>
          <circle cx="94" cy="56" r="3" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1"/>
        </svg>
      `.trim();

    case 'comparison-slider':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Before / After Card -->
          <rect x="10" y="8" width="100" height="54" rx="4" fill="#E8EDF4" stroke="#DCDFE3" stroke-width="1"/>
          <!-- Left side (Before) -->
          <path d="M10 8h50v54H10z" fill="#D0DCEB"/>
          <rect x="16" y="14" width="22" height="3" rx="1.5" fill="#00388F"/>
          <!-- Right side (After) -->
          <rect x="76" y="14" width="22" height="3" rx="1.5" fill="#53565A"/>
          <!-- Vertical Split Handle -->
          <line x1="60" y1="8" x2="60" y2="62" stroke="#00388F" stroke-width="2"/>
          <circle cx="60" cy="35" r="7" fill="#00388F" stroke="#FFFFFF" stroke-width="1.5"/>
          <polyline points="57,35 59,33 59,37" stroke="#FFFFFF" stroke-width="1.2" fill="none"/>
          <polyline points="63,35 61,33 61,37" stroke="#FFFFFF" stroke-width="1.2" fill="none"/>
        </svg>
      `.trim();

    case 'dial-gauge':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <rect x="10" y="8" width="100" height="54" rx="4" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <!-- Radial Speedometer Arc -->
          <path d="M35 48 A 30 30 0 1 1 85 48" fill="none" stroke="#E4E7EC" stroke-width="6" stroke-linecap="round"/>
          <path d="M35 48 A 30 30 0 0 1 68 20" fill="none" stroke="#00388F" stroke-width="6" stroke-linecap="round"/>
          <!-- Needle Pointer -->
          <circle cx="60" cy="48" r="5" fill="#111827"/>
          <line x1="60" y1="48" x2="68" y2="24" stroke="#00388F" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="60" cy="48" r="2" fill="#FFFFFF"/>
          <rect x="46" y="56" width="28" height="4" rx="2" fill="#00388F"/>
        </svg>
      `.trim();

    case 'callout-box':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Banner Callout with Left Accent Border -->
          <rect x="10" y="10" width="100" height="50" rx="4" fill="#EAF1FB" stroke="#B3C4DC" stroke-width="1"/>
          <rect x="10" y="10" width="5" height="50" rx="2" fill="#00388F"/>
          <!-- Icon Badge -->
          <circle cx="28" cy="25" r="7" fill="#00388F"/>
          <path d="M28 22v3.5M28 28h.01" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
          <!-- Text lines -->
          <rect x="40" y="20" width="40" height="4" rx="2" fill="#00388F"/>
          <rect x="40" y="28" width="62" height="3" rx="1.5" fill="#53565A"/>
          <rect x="40" y="35" width="55" height="3" rx="1.5" fill="#8A8D91"/>
          <rect x="40" y="42" width="45" height="3" rx="1.5" fill="#8A8D91"/>
        </svg>
      `.trim();

    case 'card-carousel':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <!-- Left Arrow -->
          <circle cx="16" cy="32" r="6" fill="#FFFFFF" stroke="#00388F" stroke-width="1"/>
          <polyline points="17,29 14,32 17,35" stroke="#00388F" stroke-width="1.2" fill="none"/>
          <!-- Slide Card (Featured Center) -->
          <rect x="28" y="10" width="64" height="44" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"/>
          <rect x="36" y="18" width="30" height="4" rx="2" fill="#00388F"/>
          <rect x="36" y="26" width="48" height="3" rx="1.5" fill="#8A8D91"/>
          <rect x="36" y="32" width="40" height="3" rx="1.5" fill="#DCDFE3"/>
          <rect x="36" y="38" width="44" height="3" rx="1.5" fill="#DCDFE3"/>
          <!-- Right Arrow -->
          <circle cx="104" cy="32" r="6" fill="#00388F"/>
          <polyline points="103,29 106,32 103,35" stroke="#FFFFFF" stroke-width="1.2" fill="none"/>
          <!-- Pagination Dots -->
          <circle cx="52" cy="60" r="2.5" fill="#00388F"/>
          <circle cx="60" cy="60" r="2" fill="#B3C4DC"/>
          <circle cx="68" cy="60" r="2" fill="#B3C4DC"/>
        </svg>
      `.trim();

    case 'confidence-matrix':
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <rect x="10" y="8" width="100" height="54" rx="4" fill="#FFFFFF" stroke="#DCDFE3" stroke-width="1"/>
          <!-- Row 1 -->
          <rect x="15" y="14" width="35" height="3" rx="1.5" fill="#111827"/>
          <circle cx="62" cy="15.5" r="3.5" fill="#FFFFFF" stroke="#8A8D91" stroke-width="1"/>
          <circle cx="78" cy="15.5" r="4.5" fill="#00388F"/>
          <circle cx="94" cy="15.5" r="3.5" fill="#FFFFFF" stroke="#8A8D91" stroke-width="1"/>
          <!-- Row 2 -->
          <line x1="15" y1="26" x2="105" y2="26" stroke="#EFEFEF"/>
          <rect x="15" y="32" width="40" height="3" rx="1.5" fill="#111827"/>
          <circle cx="62" cy="33.5" r="3.5" fill="#FFFFFF" stroke="#8A8D91" stroke-width="1"/>
          <circle cx="78" cy="33.5" r="3.5" fill="#FFFFFF" stroke="#8A8D91" stroke-width="1"/>
          <circle cx="94" cy="33.5" r="4.5" fill="#22C55E"/>
          <!-- Row 3 -->
          <line x1="15" y1="44" x2="105" y2="44" stroke="#EFEFEF"/>
          <rect x="15" y="50" width="30" height="3" rx="1.5" fill="#111827"/>
          <circle cx="62" cy="51.5" r="4.5" fill="#E84855"/>
          <circle cx="78" cy="51.5" r="3.5" fill="#FFFFFF" stroke="#8A8D91" stroke-width="1"/>
          <circle cx="94" cy="51.5" r="3.5" fill="#FFFFFF" stroke="#8A8D91" stroke-width="1"/>
        </svg>
      `.trim();

    default:
      return `
        <svg viewBox="0 0 120 70" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="120" height="70" rx="6" fill="#F4F6F9"/>
          <rect x="10" y="10" width="100" height="50" rx="4" fill="#FFFFFF" stroke="#00388F" stroke-width="1.2"/>
          <rect x="18" y="18" width="45" height="4" rx="2" fill="#00388F"/>
          <rect x="18" y="27" width="84" height="3" rx="1.5" fill="#8A8D91"/>
          <rect x="18" y="34" width="70" height="3" rx="1.5" fill="#DCDFE3"/>
          <rect x="18" y="44" width="30" height="8" rx="2" fill="#00388F"/>
        </svg>
      `.trim();
  }
}
