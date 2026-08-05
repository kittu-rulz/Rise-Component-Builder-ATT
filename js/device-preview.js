export const DEVICE_MODES = [
  { id: 'desktop', width: null, label: 'Desktop', ariaLabel: 'Desktop preview width' },
  { id: 'tablet', width: 768, label: 'Tablet', ariaLabel: 'Tablet preview width, 768 pixels' },
  { id: 'mobile-lg', width: 430, label: 'Large Mobile', ariaLabel: 'Large mobile preview width, 430 pixels' },
  { id: 'mobile', width: 375, label: 'Mobile', ariaLabel: 'Mobile preview width, 375 pixels' }
];

export const DEFAULT_DEVICE_MODE = 'desktop';

export function isValidDeviceMode(id) {
  return DEVICE_MODES.some(mode => mode.id === id);
}

export function getDeviceMode(id) {
  return DEVICE_MODES.find(mode => mode.id === id) || null;
}

export function getDeviceWidthLabel(id, componentMaxWidth) {
  const mode = getDeviceMode(id);
  if (!mode) return '';
  return mode.width === null ? `Up to ${componentMaxWidth}px` : `${mode.width}px`;
}
