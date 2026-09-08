import fs from 'fs';

const rawFunctional = JSON.parse(fs.readFileSync('ATT Design System/Claude Promts/ATT Design System Icons/icons/att-functional-icons.json', 'utf8'));

function cleanSvgMarkup(body) {
  let cleaned = body;
  cleaned = cleaned.replace(/<g id="Clear_Space"[^>]*>[\s\S]*?<\/g>/gi, '');
  cleaned = cleaned.replace(/<g id="Pixel_Grid"[^>]*>[\s\S]*?<\/g>\s*<\/g>\s*<\/g>/gi, '');
  cleaned = cleaned.replace(/<g id="Grid_Target"[^>]*>[\s\S]*?<\/g>\s*<\/g>/gi, '');
  cleaned = cleaned.replace(/<g id="Pixel_Grid"[^>]*>[\s\S]*?<\/g>/gi, '');
  cleaned = cleaned.replace(/<g id="Grid_Target"[^>]*>[\s\S]*?<\/g>/gi, '');
  cleaned = cleaned.replace(/<g id="Icon__x28_Outline_x29_"><g>/gi, '');
  cleaned = cleaned.replace(/<g id="Icon__x28_Outline_x29_">/gi, '');
  cleaned = cleaned.replace(/<g id="Icon__x28_outlined_x29_">/gi, '');
  
  cleaned = cleaned.replace(/^(?:\s*<\/g>)+/i, '');
  cleaned = cleaned.replace(/(?:<\/g>\s*)+$/i, '');
  
  cleaned = cleaned.replace(/fill-opacity="1"/gi, '');
  cleaned = cleaned.replace(/stroke-linecap="butt"/gi, '');
  cleaned = cleaned.replace(/stroke-width="1"/gi, '');
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

const functionalIcons = {};
for (const [key, val] of Object.entries(rawFunctional.icons)) {
  functionalIcons[key] = {
    cat: val.cat,
    viewBox: val.viewBox || '0 0 32 32',
    body: cleanSvgMarkup(val.body)
  };
}

const jsContent = `/**
 * AT&T Icon Library Module (Functional Icons)
 * Authoritative SVG iconography extracted from the January 2026 AT&T Design System.
 *
 * Rules:
 * - Functional icons are black/white only, using \`fill="currentColor"\`.
 * - Sized with --att-icon-* tokens (default 32x32 viewBox).
 * - Accessible: aria-hidden="true" when decorative, role="img" + <title> when meaningful.
 */

export const ATT_FUNCTIONAL_ICONS = ${JSON.stringify(functionalIcons, null, 2)};

/**
 * Renders an inline AT&T functional SVG icon.
 * @param {string} name - Icon name (e.g. 'chevron-down', 'play', 'check-circle-filled')
 * @param {Object} [options]
 * @param {string} [options.className=''] - CSS class names
 * @param {number|string} [options.width] - Width attribute/style (e.g. 24, 'var(--att-icon-md, 24px)')
 * @param {number|string} [options.height] - Height attribute/style
 * @param {string} [options.title] - Accessible title. If provided, role="img" is added.
 * @param {boolean} [options.ariaHidden=true] - aria-hidden attribute (forced false if title provided)
 * @param {string} [options.style] - Inline CSS style string
 * @returns {string} SVG HTML string
 */
export function getAttIconSvg(name, options = {}) {
  const icon = ATT_FUNCTIONAL_ICONS[name];
  if (!icon) {
    console.warn(\`[AT&T Icons] Unknown icon name: "\${name}"\`);
    return '';
  }

  const {
    className = '',
    width,
    height,
    title,
    ariaHidden = !title,
    style = ''
  } = options;

  const viewBox = icon.viewBox || '0 0 32 32';
  const classAttr = className ? \` class="\${className}"\` : '';
  const widthAttr = width !== undefined ? \` width="\${width}"\` : '';
  const heightAttr = height !== undefined ? \` height="\${height}"\` : '';
  const styleAttr = style ? \` style="\${style}"\` : '';
  
  let a11yAttrs = '';
  let titleEl = '';
  if (title) {
    a11yAttrs = ' role="img"';
    titleEl = \`<title>\${title}</title>\`;
  } else if (ariaHidden) {
    a11yAttrs = ' aria-hidden="true"';
  }

  return \`<svg viewBox="\${viewBox}" fill="currentColor"\${widthAttr}\${heightAttr}\${classAttr}\${styleAttr}\${a11yAttrs}>\${titleEl}\${icon.body}</svg>\`;
}

/**
 * Returns raw icon data (viewBox, body, category) for a given icon name.
 * @param {string} name
 * @returns {{cat: string, viewBox: string, body: string}|null}
 */
export function getAttIconData(name) {
  return ATT_FUNCTIONAL_ICONS[name] || null;
}
`;

fs.writeFileSync('js/att-icons.js', jsContent, 'utf8');
console.log(`Successfully generated js/att-icons.js (${(jsContent.length / 1024).toFixed(1)} KB)`);
