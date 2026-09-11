import { sanitizeRichText } from './utilities.js';

export const ATT_BRAND_COLORS = [
  { name: 'AT&T Blue', hex: '#0057B8' },
  { name: 'AT&T Navy', hex: '#00388F' },
  { name: 'AT&T Cyan', hex: '#009FDB' },
  { name: 'Charcoal', hex: '#111827' },
  { name: 'Muted Gray', hex: '#6B7280' },
  { name: 'Alert Red', hex: '#DA291C' },
  { name: 'Success Green', hex: '#00873D' },
  { name: 'Warm Orange', hex: '#FF7300' },
  { name: 'Deep Violet', hex: '#6B3FA0' }
];

export const HIGHLIGHT_COLORS = [
  { name: 'Yellow Glow', hex: '#FFF3CD' },
  { name: 'Cyan Tint', hex: '#E0F7FA' },
  { name: 'Green Tint', hex: '#D4EDDA' },
  { name: 'Orange Tint', hex: '#FFE8D6' },
  { name: 'Pink Tint', hex: '#F8D7DA' }
];

export const FONT_SIZES = [
  { label: 'Small (13px)', size: '13px' },
  { label: 'Normal (16px)', size: '16px' },
  { label: 'Medium (18px)', size: '18px' },
  { label: 'Large (22px)', size: '22px' },
  { label: 'X-Large (26px)', size: '26px' }
];

/**
 * Executes a formatting action on the current DOM selection or applies custom style wrapper.
 * @param {string} command - execCommand name or custom action
 * @param {string} [value] - optional parameter value
 * @param {HTMLElement} [editorEl] - the contentEditable element
 */
export function executeFormatting(command, value = null, editorEl = null) {
  if (editorEl) editorEl.focus();

  if (command === 'fontSizeStyle' && value) {
    applyInlineStyle('font-size', value, editorEl);
  } else if (command === 'textColor' && value) {
    applyInlineStyle('color', value, editorEl);
  } else if (command === 'highlightColor' && value) {
    applyInlineStyle('background-color', value, editorEl);
  } else if (command === 'clearHighlight') {
    applyInlineStyle('background-color', 'transparent', editorEl);
  } else {
    document.execCommand(command, false, value);
  }
}

/**
 * Wraps selection in a span with inline style or updates existing parent span.
 * @param {string} property 
 * @param {string} value 
 * @param {HTMLElement} [_editorEl] 
 */
function applyInlineStyle(property, value, _editorEl) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);

  if (range.collapsed) {
    // If no text is selected, create an empty styled span and place cursor inside
    const span = document.createElement('span');
    span.style[property] = value;
    span.innerHTML = '&#8203;'; // Zero-width space
    range.insertNode(span);
    range.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }

  // Extract selected contents
  const fragment = range.extractContents();
  const span = document.createElement('span');
  span.style[property] = value;
  span.appendChild(fragment);
  range.insertNode(span);

  // Restore selection around the newly wrapped node
  range.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Creates an accessible rich text formatting toolbar and contentEditable editor.
 * @param {Object} options
 * @param {string} options.controlId - Unique ID for the editor element
 * @param {string} options.fieldId - ID of the field in state/schema
 * @param {string} [options.value=''] - Initial HTML or plain text value
 * @param {string} [options.placeholder=''] - Placeholder text
 * @param {boolean} [options.isSingleLine=false] - Whether to restrict multi-paragraph features
 * @param {(val: string) => void} options.onChange - Change listener callback
 * @returns {{ element: HTMLElement, validationControl: HTMLElement, getValue: () => string, setValue: (val: string) => void }}
 */
export function createRichTextEditor({
  controlId,
  fieldId,
  value = '',
  placeholder = '',
  isSingleLine = false,
  onChange
}) {
  const container = document.createElement('div');
  container.className = 'rich-text-editor-container';

  // 1. Toolbar Shell
  const toolbar = document.createElement('div');
  toolbar.className = 'rich-text-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Formatting tools');

  // Editable area reference
  const editor = document.createElement('div');
  editor.id = controlId;
  editor.dataset.fieldId = fieldId;
  editor.className = 'schema-richtext rich-text-contenteditable';
  editor.contentEditable = 'true';
  editor.setAttribute('contenteditable', 'true');
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-multiline', isSingleLine ? 'false' : 'true');
  if (placeholder) editor.dataset.placeholder = placeholder;
  editor.innerHTML = sanitizeRichText(value || '');

  let activePopover = null;

  function closePopovers() {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target instanceof Node && !container.contains(e.target)) {
      closePopovers();
    }
  });

  function createToolbarButton(label, title, iconHtml, onClick, isToggle = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rt-btn';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    if (isToggle) btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = iconHtml;

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Keep focus inside editor
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closePopovers();
      onClick(btn, e);
      editor.focus();
      triggerChange();
    });

    return btn;
  }

  function triggerChange() {
    const rawHTML = editor.innerHTML;
    const sanitized = sanitizeRichText(rawHTML);
    onChange(sanitized);
  }

  // --- Toolbar Items ---

  // Bold
  const boldBtn = createToolbarButton(
    'Bold', 'Bold (Ctrl+B)',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>',
    () => executeFormatting('bold', null, editor),
    true
  );
  toolbar.appendChild(boldBtn);

  // Italic
  const italicBtn = createToolbarButton(
    'Italic', 'Italic (Ctrl+I)',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>',
    () => executeFormatting('italic', null, editor),
    true
  );
  toolbar.appendChild(italicBtn);

  // Underline
  const underlineBtn = createToolbarButton(
    'Underline', 'Underline (Ctrl+U)',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>',
    () => executeFormatting('underline', null, editor),
    true
  );
  toolbar.appendChild(underlineBtn);

  // Separator
  const sep1 = document.createElement('span');
  sep1.className = 'rt-separator';
  toolbar.appendChild(sep1);

  // Font Size Dropdown Popover
  const sizeWrapper = document.createElement('div');
  sizeWrapper.className = 'rt-dropdown-wrapper';
  const sizeBtn = createToolbarButton(
    'Font Size', 'Font Size',
    '<span class="rt-btn-text">Size <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></span>',
    () => {
      if (activePopover && activePopover.dataset.popoverType === 'size') {
        closePopovers();
        return;
      }
      closePopovers();
      const popover = document.createElement('div');
      popover.className = 'rt-popover rt-size-popover';
      popover.dataset.popoverType = 'size';
      
      FONT_SIZES.forEach(fs => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'rt-menu-item';
        item.textContent = fs.label;
        item.addEventListener('mousedown', e => e.preventDefault());
        item.addEventListener('click', () => {
          executeFormatting('fontSizeStyle', fs.size, editor);
          closePopovers();
          triggerChange();
        });
        popover.appendChild(item);
      });

      const resetItem = document.createElement('button');
      resetItem.type = 'button';
      resetItem.className = 'rt-menu-item rt-menu-reset';
      resetItem.textContent = 'Default Size';
      resetItem.addEventListener('mousedown', e => e.preventDefault());
      resetItem.addEventListener('click', () => {
        executeFormatting('fontSizeStyle', 'inherit', editor);
        closePopovers();
        triggerChange();
      });
      popover.appendChild(resetItem);

      sizeWrapper.appendChild(popover);
      activePopover = popover;
    }
  );
  sizeWrapper.appendChild(sizeBtn);
  toolbar.appendChild(sizeWrapper);

  // Text Color Popover
  const colorWrapper = document.createElement('div');
  colorWrapper.className = 'rt-dropdown-wrapper';
  const colorBtn = createToolbarButton(
    'Text Color', 'Text Color',
    '<span class="rt-btn-color-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"></path><path d="m6 16 6-12 6 12"></path><path d="M8 12h8"></path></svg><span class="rt-color-bar" id="rt-color-indicator-' + controlId + '"></span></span>',
    () => {
      if (activePopover && activePopover.dataset.popoverType === 'color') {
        closePopovers();
        return;
      }
      closePopovers();
      const popover = document.createElement('div');
      popover.className = 'rt-popover rt-color-popover';
      popover.dataset.popoverType = 'color';

      const title = document.createElement('div');
      title.className = 'rt-popover-heading';
      title.textContent = 'Text Color';
      popover.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'rt-color-grid';
      ATT_BRAND_COLORS.forEach(c => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'rt-color-swatch';
        swatch.style.backgroundColor = c.hex;
        swatch.title = `${c.name} (${c.hex})`;
        swatch.setAttribute('aria-label', `${c.name} (${c.hex})`);
        swatch.addEventListener('mousedown', e => e.preventDefault());
        swatch.addEventListener('click', () => {
          executeFormatting('textColor', c.hex, editor);
          closePopovers();
          triggerChange();
        });
        grid.appendChild(swatch);
      });
      popover.appendChild(grid);

      // Custom color row
      const customRow = document.createElement('div');
      customRow.className = 'rt-custom-color-row';
      const customLabel = document.createElement('label');
      customLabel.textContent = 'Custom:';
      const customInput = document.createElement('input');
      customInput.type = 'color';
      customInput.className = 'rt-color-input';
      customInput.value = '#0057B8';
      customInput.addEventListener('input', () => {
        executeFormatting('textColor', customInput.value, editor);
        triggerChange();
      });
      customRow.append(customLabel, customInput);
      popover.appendChild(customRow);

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'rt-menu-item rt-menu-reset';
      resetBtn.textContent = 'Default Color';
      resetBtn.addEventListener('mousedown', e => e.preventDefault());
      resetBtn.addEventListener('click', () => {
        executeFormatting('textColor', 'inherit', editor);
        closePopovers();
        triggerChange();
      });
      popover.appendChild(resetBtn);

      colorWrapper.appendChild(popover);
      activePopover = popover;
    }
  );
  colorWrapper.appendChild(colorBtn);
  toolbar.appendChild(colorWrapper);

  // Highlight / Background Color Popover
  const highlightWrapper = document.createElement('div');
  highlightWrapper.className = 'rt-dropdown-wrapper';
  const highlightBtn = createToolbarButton(
    'Highlight', 'Text Highlight Color',
    '<span class="rt-btn-color-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 11-6 6v3h3l6-6"></path><path d="m22 2-4.5 4.5"></path><path d="m14 6 4 4"></path></svg><span class="rt-color-bar rt-highlight-bar"></span></span>',
    () => {
      if (activePopover && activePopover.dataset.popoverType === 'highlight') {
        closePopovers();
        return;
      }
      closePopovers();
      const popover = document.createElement('div');
      popover.className = 'rt-popover rt-color-popover';
      popover.dataset.popoverType = 'highlight';

      const title = document.createElement('div');
      title.className = 'rt-popover-heading';
      title.textContent = 'Highlight Color';
      popover.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'rt-color-grid';
      HIGHLIGHT_COLORS.forEach(c => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'rt-color-swatch';
        swatch.style.backgroundColor = c.hex;
        swatch.title = `${c.name} (${c.hex})`;
        swatch.setAttribute('aria-label', `${c.name} (${c.hex})`);
        swatch.addEventListener('mousedown', e => e.preventDefault());
        swatch.addEventListener('click', () => {
          executeFormatting('highlightColor', c.hex, editor);
          closePopovers();
          triggerChange();
        });
        grid.appendChild(swatch);
      });
      popover.appendChild(grid);

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'rt-menu-item rt-menu-reset';
      resetBtn.textContent = 'Clear Highlight';
      resetBtn.addEventListener('mousedown', e => e.preventDefault());
      resetBtn.addEventListener('click', () => {
        executeFormatting('clearHighlight', null, editor);
        closePopovers();
        triggerChange();
      });
      popover.appendChild(resetBtn);

      highlightWrapper.appendChild(popover);
      activePopover = popover;
    }
  );
  highlightWrapper.appendChild(highlightBtn);
  toolbar.appendChild(highlightWrapper);

  // Lists (for multi-line fields)
  if (!isSingleLine) {
    const sep2 = document.createElement('span');
    sep2.className = 'rt-separator';
    toolbar.appendChild(sep2);

    // Bullet List
    const bulletBtn = createToolbarButton(
      'Bullet List', 'Bullet List',
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
      () => executeFormatting('insertUnorderedList', null, editor)
    );
    toolbar.appendChild(bulletBtn);

    // Numbered List
    const numberBtn = createToolbarButton(
      'Numbered List', 'Numbered List',
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>',
      () => executeFormatting('insertOrderedList', null, editor)
    );
    toolbar.appendChild(numberBtn);
  }

  // Separator & Clear Formatting
  const sep3 = document.createElement('span');
  sep3.className = 'rt-separator';
  toolbar.appendChild(sep3);

  const clearBtn = createToolbarButton(
    'Clear Formatting', 'Clear Formatting (Reset text styles)',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    () => executeFormatting('removeFormat', null, editor)
  );
  toolbar.appendChild(clearBtn);

  // 2. Editor Event Handlers
  editor.addEventListener('input', () => {
    triggerChange();
  });

  editor.addEventListener('keydown', (e) => {
    if (isSingleLine && e.key === 'Enter') {
      e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        executeFormatting('bold', null, editor);
        triggerChange();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        executeFormatting('italic', null, editor);
        triggerChange();
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        executeFormatting('underline', null, editor);
        triggerChange();
      }
    }
  });

  // Track active selection state for toolbar buttons
  function updateToolbarState() {
    try {
      boldBtn.classList.toggle('is-active', document.queryCommandState('bold'));
      italicBtn.classList.toggle('is-active', document.queryCommandState('italic'));
      underlineBtn.classList.toggle('is-active', document.queryCommandState('underline'));
    } catch {
      // queryCommandState might fail in certain environments
    }
  }

  editor.addEventListener('keyup', updateToolbarState);
  editor.addEventListener('mouseup', updateToolbarState);

  container.append(toolbar, editor);

  return {
    element: container,
    validationControl: editor,
    getValue: () => sanitizeRichText(editor.innerHTML),
    setValue: (val) => {
      editor.innerHTML = sanitizeRichText(val || '');
    }
  };
}
