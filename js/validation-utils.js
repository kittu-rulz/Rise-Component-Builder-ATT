/**
 * Shared validation utilities for component configuration validation.
 * Provides reusable validation functions for common field types and patterns.
 * @module js/validation-utils
 */

/**
 * Validates that a value is a non-empty string.
 * @param {*} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateRequiredString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    return { valid: false, error: `${fieldName} is required.` };
  }
  return { valid: true, error: null };
}

/**
 * Validates that a value is a positive number within optional bounds.
 * @param {*} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {number} [min=0] - Minimum allowed value
 * @param {number} [max=Infinity] - Maximum allowed value
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validatePositiveNumber(value, fieldName, min = 0, max = Infinity) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) {
    const range = max === Infinity ? `greater than or equal to ${min}` : `between ${min} and ${max}`;
    return { valid: false, error: `${fieldName} must be ${range}.` };
  }
  return { valid: true, error: null };
}

/**
 * Validates that a value is a valid URL with optional protocol restrictions.
 * @param {*} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {Object} [options] - Validation options
 * @param {boolean} [options.allowRelative=false] - Allow relative URLs
 * @param {boolean} [options.allowDataImage=false] - Allow data:image URLs
 * @param {boolean} [options.allowBlob=false] - Allow blob: URLs
 * @param {boolean} [options.required=false] - Whether the URL is required
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateURL(value, fieldName, options = {}) {
  const { allowRelative = false, allowDataImage = false, allowBlob = false, required = false } = options;
  const input = String(value ?? '').trim();
  
  if (!input) {
    return required 
      ? { valid: false, error: `${fieldName} is required.` }
      : { valid: true, error: null };
  }

  // Check for dangerous protocols
  const schemeEnd = input.indexOf(':');
  if (schemeEnd >= 1) {
    // eslint-disable-next-line no-control-regex -- intentionally strips control characters that could hide a scheme, e.g. a NUL byte inside "javascript:"
    const normalizedScheme = input.slice(0, schemeEnd).replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase();
    if (normalizedScheme === 'javascript' || normalizedScheme === 'vbscript') {
      return { valid: false, error: `${fieldName} contains an invalid protocol.` };
    }
    if (normalizedScheme === 'data' && !allowDataImage) {
      return { valid: false, error: `${fieldName} does not support data URLs.` };
    }
    if (normalizedScheme === 'blob' && !allowBlob) {
      return { valid: false, error: `${fieldName} does not support blob URLs.` };
    }
  }

  // Allow relative URLs if configured
  if (allowRelative && /^assets\/[a-z0-9._-]+$/i.test(input)) {
    return { valid: true, error: null };
  }

  // Validate absolute URLs
  try {
    new URL(input);
    return { valid: true, error: null };
  } catch {
    return { valid: false, error: `${fieldName} must be a valid URL.` };
  }
}

/**
 * Validates that an array has at least one item.
 * @param {*} value - The value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {number} [minLength=1] - Minimum required length
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateNonEmptyArray(value, fieldName, minLength = 1) {
  if (!Array.isArray(value) || value.length < minLength) {
    const msg = minLength === 1 
      ? `${fieldName} must contain at least one item.`
      : `${fieldName} must contain at least ${minLength} items.`;
    return { valid: false, error: msg };
  }
  return { valid: true, error: null };
}

/**
 * Validates quiz answer configuration ensuring at least one correct answer exists.
 * @param {Array} items - Array of quiz items with isCorrect property
 * @param {string} componentType - Type of quiz component ('multiple-choice' | 'multiple-select')
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateQuizAnswers(items, componentType) {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one answer option is required.' };
  }

  const correctCount = items.filter(item => item.correct === true).length;
  
  if (correctCount === 0) {
    return { valid: false, error: 'At least one correct answer must be selected.' };
  }

  if (componentType === 'multiple-choice' && correctCount > 1) {
    return { valid: false, error: 'Multiple choice questions can only have one correct answer.' };
  }

  return { valid: true, error: null };
}

/**
 * Validates hotspot coordinates are within valid percentage ranges.
 * @param {Array} hotspots - Array of hotspot items with x/y coordinates
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateHotspotCoordinates(hotspots) {
  if (!Array.isArray(hotspots) || hotspots.length === 0) {
    return { valid: false, error: 'At least one hotspot is required.' };
  }

  for (let i = 0; i < hotspots.length; i++) {
    const hotspot = hotspots[i];
    const x = Number(hotspot.x);
    const y = Number(hotspot.y);
    
    if (!Number.isFinite(x) || x < 0 || x > 100) {
      return { valid: false, error: `Hotspot ${i + 1}: X coordinate must be between 0 and 100.` };
    }
    if (!Number.isFinite(y) || y < 0 || y > 100) {
      return { valid: false, error: `Hotspot ${i + 1}: Y coordinate must be between 0 and 100.` };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validates scenario branching configuration ensuring valid transitions.
 * @param {Array} items - Array of scenario items with nextSlide references
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateScenarioBranching(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one scenario step is required.' };
  }

  const slideIds = new Set(items.map((_, idx) => `slide-${idx}`));
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.nextSlide && !slideIds.has(item.nextSlide) && item.nextSlide !== 'end') {
      return { valid: false, error: `Step ${i + 1}: Invalid next slide reference "${item.nextSlide}".` };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validates sorting activity configuration ensuring unique correct positions.
 * @param {Array} items - Array of sortable items with order property
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateSortingOrder(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one sortable item is required.' };
  }

  const orders = items.map(item => Number(item.order));
  const uniqueOrders = new Set(orders);
  
  if (uniqueOrders.size !== orders.length) {
    return { valid: false, error: 'Each item must have a unique sort order.' };
  }

  for (let i = 0; i < orders.length; i++) {
    if (!Number.isFinite(orders[i]) || orders[i] < 0 || orders[i] >= items.length) {
      return { valid: false, error: `Item ${i + 1}: Sort order must be between 0 and ${items.length - 1}.` };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validates fill-in-the-blank answers ensuring each blank has a solution.
 * @param {Array} items - Array of fill-blank items with answer property
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateFillBlankAnswers(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one fill-in-the-blank question is required.' };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.content || !String(item.content).trim()) {
      return { valid: false, error: `Question ${i + 1}: Answer is required.` };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validates timeline events ensuring chronological order.
 * @param {Array} events - Array of timeline events with date/year properties
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateTimelineEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return { valid: false, error: 'At least one timeline event is required.' };
  }

  let previousDate = null;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const currentDate = event.date || event.year;
    
    if (!currentDate) {
      return { valid: false, error: `Event ${i + 1}: Date or year is required.` };
    }

    if (previousDate !== null && currentDate < previousDate) {
      return { valid: false, error: `Event ${i + 1}: Events must be in chronological order.` };
    }
    
    previousDate = currentDate;
  }

  return { valid: true, error: null };
}

/**
 * Creates a composite validation result from multiple validators.
 * @param {Array<{valid: boolean, error: string|null}>} results - Array of validation results
 * @returns {{valid: boolean, errors: string[]}} Combined validation result
 */
export function combineValidationResults(results) {
  const errors = results
    .filter(result => !result.valid && result.error)
    .map(result => result.error);
  
  return { valid: errors.length === 0, errors };
}
