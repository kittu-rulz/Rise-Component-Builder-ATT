// @ts-nocheck
import { escapeAttribute } from '../../utilities.js';

/**
 * Creates the Style & Position settings editor UI.
 * @param {any} config
 * @param {() => void} onUpdate
 * @returns {HTMLElement}
 */
export function createSettingsEditor(config, onUpdate) {
  const container = document.createElement('div');
  container.className = 'ppt-tool-editor ppt-settings-editor';

  const settings = config.settings;

  container.innerHTML = `
    <div class="ppt-editor-header-bar">
      <div class="ppt-editor-title-group">
        <h3>Launcher Style & Positioning</h3>
        <p class="field-hint">Configure how the persistent Course Tools launcher appears and behaves across all lessons.</p>
      </div>
    </div>

    <div class="ppt-section-box">
      <h4 class="ppt-section-title">Launcher Presentation</h4>
      <div class="ppt-form-grid">
        <div class="input-wrapper">
          <label>Launcher Button Label</label>
          <input type="text" class="input-launcher-label" value="${escapeAttribute(settings.launcherLabel)}" maxlength="40" placeholder="Course Tools">
        </div>
        <div class="input-wrapper">
          <label>Launcher Style</label>
          <select class="select-launcher-style">
            <option value="icon-label" ${settings.launcherStyle === 'icon-label' ? 'selected' : ''}>Icon + Label (Recommended)</option>
            <option value="icon-only" ${settings.launcherStyle === 'icon-only' ? 'selected' : ''}>Icon Only (Compact)</option>
          </select>
        </div>
        <div class="input-wrapper">
          <label>Screen Position</label>
          <select class="select-launcher-pos">
            <option value="bottom-right" ${settings.launcherPosition === 'bottom-right' ? 'selected' : ''}>Bottom Right (Standard)</option>
            <option value="bottom-left" ${settings.launcherPosition === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
          </select>
        </div>
        <div class="input-wrapper">
          <label>Default Active Tool Tab</label>
          <select class="select-default-tool">
            <option value="glossary" ${settings.defaultOpenTool === 'glossary' ? 'selected' : ''}>Glossary</option>
            <option value="resources" ${settings.defaultOpenTool === 'resources' ? 'selected' : ''}>Resources</option>
            <option value="help" ${settings.defaultOpenTool === 'help' ? 'selected' : ''}>Help & Support</option>
          </select>
        </div>
      </div>
    </div>

    <div class="ppt-section-box">
      <h4 class="ppt-section-title">Color Theme & Surface</h4>
      <div class="ppt-form-grid">
        <div class="input-wrapper">
          <label>Brand Theme Color</label>
          <select class="select-launcher-theme">
            <option value="default" ${settings.launcherTheme === 'default' ? 'selected' : ''}>AT&T Blue (#0057B8)</option>
            <option value="cobalt" ${settings.launcherTheme === 'cobalt' ? 'selected' : ''}>AT&T Cobalt (#00388F)</option>
            <option value="navy" ${settings.launcherTheme === 'navy' ? 'selected' : ''}>Dark Navy (#002B66)</option>
            <option value="cyan" ${settings.launcherTheme === 'cyan' ? 'selected' : ''}>AT&T Cyan (#009FDB)</option>
          </select>
        </div>
        <div class="input-wrapper">
          <label>Drawer Surface Theme</label>
          <select class="select-surface-theme">
            <option value="light" ${settings.surfaceTheme === 'light' ? 'selected' : ''}>Light Surface (Clean White)</option>
            <option value="dark" ${settings.surfaceTheme === 'dark' ? 'selected' : ''}>Dark Surface (Sleek Charcoal)</option>
          </select>
        </div>
        <div class="input-wrapper">
          <label>Desktop Bottom Margin (px)</label>
          <input type="number" class="input-offset-bottom" value="${settings.desktopOffsetBottom}" min="8" max="120" step="4">
        </div>
        <div class="input-wrapper">
          <label>Desktop Side Margin (px)</label>
          <input type="number" class="input-offset-side" value="${settings.desktopOffsetSide}" min="8" max="120" step="4">
        </div>
      </div>

      <div class="input-wrapper ppt-checkbox-wrapper" style="margin-top: 14px;">
        <label class="checkbox-label">
          <input type="checkbox" class="input-cover-page" ${settings.displayOnCoverPage ? 'checked' : ''}>
          <span>Display persistent Course Tools launcher on Rise Course Cover / Title Page</span>
        </label>
      </div>
    </div>
  `;

  // Bind inputs
  const labelInput = container.querySelector('.input-launcher-label');
  labelInput.addEventListener('input', () => { settings.launcherLabel = labelInput.value; onUpdate(); });

  const styleSelect = container.querySelector('.select-launcher-style');
  styleSelect.addEventListener('change', () => { settings.launcherStyle = styleSelect.value; onUpdate(); });

  const posSelect = container.querySelector('.select-launcher-pos');
  posSelect.addEventListener('change', () => { settings.launcherPosition = posSelect.value; onUpdate(); });

  const defToolSelect = container.querySelector('.select-default-tool');
  defToolSelect.addEventListener('change', () => { settings.defaultOpenTool = defToolSelect.value; onUpdate(); });

  const themeSelect = container.querySelector('.select-launcher-theme');
  themeSelect.addEventListener('change', () => { settings.launcherTheme = themeSelect.value; onUpdate(); });

  const surfaceSelect = container.querySelector('.select-surface-theme');
  surfaceSelect.addEventListener('change', () => { settings.surfaceTheme = surfaceSelect.value; onUpdate(); });

  const bottomInput = container.querySelector('.input-offset-bottom');
  bottomInput.addEventListener('input', () => { settings.desktopOffsetBottom = Number(bottomInput.value) || 24; onUpdate(); });

  const sideInput = container.querySelector('.input-offset-side');
  sideInput.addEventListener('input', () => { settings.desktopOffsetSide = Number(sideInput.value) || 24; onUpdate(); });

  const coverInput = container.querySelector('.input-cover-page');
  coverInput.addEventListener('change', () => { settings.displayOnCoverPage = coverInput.checked; onUpdate(); });

  return container;
}
