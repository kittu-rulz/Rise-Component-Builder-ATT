// Production-grade, schema-driven preflight validation. See docs/VALIDATION-RULES.md for
// the full rule catalog, severity definitions, and the reasoning behind every rule below —
// this file's comments point at *what*, that doc explains *why* in depth.
//
// Three severities, and only one of them ever blocks export:
//   BLOCKING       — export must not proceed (the output would be broken, empty, or
//                    fundamentally unusable — e.g. no correct answer, empty component).
//   WARNING        — export proceeds; a real, demonstrable defect the author should know
//                    about (missing alt text, insecure URL, insufficient contrast).
//   RECOMMENDATION — export proceeds; a quality/best-practice suggestion, not a defect
//                    (missing hotspot background image, empty per-option feedback).
//
// Two layers:
//   collectSyncIssues(...)  — pure, synchronous, safe to call on every keystroke. Covers
//                             every rule except media-existence (needs an IndexedDB read).
//   runPreflight(...)       — async wrapper: sync issues + the one async rule (broken
//                             media references), for the consolidated preflight panel and
//                             the export gate, where an async round-trip is acceptable.
//
// Reuses existing, already-tested logic rather than re-implementing it: validateSchemaField
// (js/editor.js) for required/format checks, validateMediaAccessibility (js/media.js) for
// alt-text/transcript checks, resolveThemeTokens + contrastRatio (js/themes.js) for contrast.

import { validateSchemaField } from './field-validation.js';
import { isMediaReference, resolveMediaLimits, validateMediaAccessibility } from './media.js';
import { getMediaRecord } from './media-storage.js';
import { sanitizeRichText, sanitizeURL } from './utilities.js';
import { contrastRatio, resolveThemeTokens } from './themes.js';

export const SEVERITY = Object.freeze({
  BLOCKING: 'blocking',
  WARNING: 'warning',
  RECOMMENDATION: 'recommendation'
});

const CATEGORY = Object.freeze({
  GENERAL: 'general',
  KNOWLEDGE: 'knowledge',
  MEDIA: 'media',
  HOTSPOTS: 'hotspots'
});

function issue(ruleId, severity, category, message, extra = {}) {
  return { ruleId, severity, category, message, fieldId: extra.fieldId ?? null, itemIndex: extra.itemIndex ?? null };
}

function plainText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function isEmptyValue(value) {
  return value === undefined || value === null || plainText(value) === '';
}

// ---------------------------------------------------------------------------
// General rules
// ---------------------------------------------------------------------------

function checkRequiredFields(schema, config) {
  const issues = [];
  (schema.componentFields || []).forEach(field => {
    validateSchemaField(field, config[field.id], []).forEach(message => {
      issues.push(issue('general-required-field', SEVERITY.BLOCKING, CATEGORY.GENERAL, message, { fieldId: field.id }));
    });
  });
  // `requiredOne` fields (e.g. multiple-choice's radio-group "correct answer") are a
  // cross-item constraint — check them once for the whole collection, not once per item,
  // or the same "select one X" message would repeat once per item.
  const items = config.items || [];
  (schema.itemFields || []).filter(field => field.requiredOne).forEach(field => {
    validateSchemaField(field, undefined, items).forEach(message => {
      issues.push(issue('general-required-field', SEVERITY.BLOCKING, CATEGORY.GENERAL, message, { fieldId: field.id }));
    });
  });
  items.forEach((item, itemIndex) => {
    (schema.itemFields || []).filter(field => !field.requiredOne).forEach(field => {
      validateSchemaField(field, item[field.id], items).forEach(message => {
        issues.push(issue('general-required-field', SEVERITY.BLOCKING, CATEGORY.GENERAL, message, { fieldId: field.id, itemIndex }));
      });
    });
  });
  return issues;
}

function checkEmptyComponent(schema, config) {
  const items = Array.isArray(config.items) ? config.items : [];
  const minItems = schema.minItems || 0;
  if (items.length >= minItems) return [];
  const label = (schema.itemLabel || 'item').toLowerCase();
  return [issue('general-empty-component', SEVERITY.BLOCKING, CATEGORY.GENERAL,
    `Add at least ${minItems} ${label}${minItems === 1 ? '' : 's'} — this component has none of the content it needs to render.`)];
}

// Fields with an explicit maxLength are already hard-capped (a Blocking, save-time
// concern handled by checkRequiredFields' reuse of validateSchemaField, which includes
// the maxLength check). This rule is the *soft* heuristic for fields with no declared
// limit — long-form richtext/textarea content that's still technically valid but likely
// to overflow the fixed-width block layout, or a short text/select field that's
// unusually long for what's meant to be a short label.
const LONG_TEXT_WARNING_LENGTH = 200;
const LONG_RICH_CONTENT_RECOMMENDATION_LENGTH = 4000;

function checkExcessiveLength(schema, config) {
  const issues = [];
  const checkField = (field, value, itemIndex) => {
    if (field.maxLength || isEmptyValue(value)) return; // already hard-capped, or nothing to measure
    const length = plainText(value).length;
    if (['text', 'select'].includes(field.type) && length > LONG_TEXT_WARNING_LENGTH) {
      issues.push(issue('general-excessive-length', SEVERITY.WARNING, CATEGORY.GENERAL,
        `${field.label} is ${length} characters — unusually long for a short label field.`, { fieldId: field.id, itemIndex }));
    } else if (['textarea', 'richtext'].includes(field.type) && length > LONG_RICH_CONTENT_RECOMMENDATION_LENGTH) {
      issues.push(issue('general-excessive-length', SEVERITY.RECOMMENDATION, CATEGORY.GENERAL,
        `${field.label} is ${length} characters — consider splitting this into multiple items for readability.`, { fieldId: field.id, itemIndex }));
    }
  };
  (schema.componentFields || []).forEach(field => checkField(field, config[field.id], null));
  (config.items || []).forEach((item, itemIndex) => (schema.itemFields || []).forEach(field => checkField(field, item[field.id], itemIndex)));
  return issues;
}

function checkUnsupportedRichHtml(schema, config) {
  const issues = [];
  const checkField = (field, value, itemIndex) => {
    if (field.type !== 'richtext' || isEmptyValue(value)) return;
    const sanitized = sanitizeRichText(value);
    // sanitizeRichText is idempotent on already-clean, fully-supported input (it round-trips
    // to the exact same string); a difference means the author's markup contained something
    // outside the supported allowlist (see js/utilities.js#sanitizeRichText) that was
    // escaped into visible text or otherwise altered on save.
    if (sanitized !== value) {
      issues.push(issue('general-unsupported-rich-html', SEVERITY.WARNING, CATEGORY.GENERAL,
        `${field.label} contains formatting or markup that isn't supported and was removed on save.`, { fieldId: field.id, itemIndex }));
    }
  };
  (schema.componentFields || []).forEach(field => checkField(field, config[field.id], null));
  (config.items || []).forEach((item, itemIndex) => (schema.itemFields || []).forEach(field => checkField(field, item[field.id], itemIndex)));
  return issues;
}

function checkInvalidUrls(schema, config) {
  const issues = [];
  const checkField = (field, value, itemIndex) => {
    if (field.type !== 'url' || isEmptyValue(value) || isMediaReference(value)) return;
    if (!sanitizeURL(value)) {
      issues.push(issue('general-invalid-url', SEVERITY.BLOCKING, CATEGORY.GENERAL,
        `${field.label} is not a valid http(s) URL.`, { fieldId: field.id, itemIndex }));
    }
  };
  (schema.componentFields || []).forEach(field => checkField(field, config[field.id], null));
  (config.items || []).forEach((item, itemIndex) => (schema.itemFields || []).forEach(field => checkField(field, item[field.id], itemIndex)));
  return issues;
}

function checkMissingAccessibleName(config) {
  if (!isEmptyValue(config.blockHeadline)) return [];
  return [issue('general-missing-accessible-name', SEVERITY.BLOCKING, CATEGORY.GENERAL,
    'The block headline is empty. It is used as this component\'s accessible name for screen readers navigating by region — it cannot be blank.',
    { fieldId: 'blockHeadline' })];
}

function checkMissingAltText(config, componentId) {
  return validateMediaAccessibility(config, componentId).map(message =>
    issue('general-missing-alt-text', SEVERITY.WARNING, CATEGORY.GENERAL, message));
}

// Checks the pairs actually rendered by every generated component (js/export-shell.js's
// BASE_RESET_CSS/shared chrome plus the component's own card): body text on the card
// background, muted text on the card background, and button text on the primary color.
// This is a focused subset of js/themes.js#validateThemeContrast (which checks the full
// theme-manager token set) — validation is scoped to what this specific component
// actually displays, using its fully resolved (theme + per-component override) colors.
const CONTRAST_PAIRS = [
  { label: 'Body text on card background', fg: 'text', bg: 'surface' },
  { label: 'Muted text on card background', fg: 'mutedText', bg: 'surface' },
  { label: 'Button text on primary color', fg: 'surface', bg: 'primary' }
];

function checkColorContrast(theme, componentOverrides) {
  const tokens = resolveThemeTokens(theme, componentOverrides);
  return CONTRAST_PAIRS.flatMap(({ label, fg, bg }) => {
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    if (ratio >= 4.5) return [];
    return [issue('general-insufficient-contrast', SEVERITY.WARNING, CATEGORY.GENERAL,
      `${label} has a contrast ratio of ${ratio.toFixed(2)}:1, below the WCAG AA minimum of 4.5:1 for normal text.`)];
  });
}

function primaryFieldValue(schema, item) {
  const field = (schema.itemFields || []).find(candidate => ['title', 'label'].includes(candidate.id));
  return field ? plainText(item[field.id]).toLowerCase() : '';
}

function checkDuplicateItems(schema, config) {
  const items = Array.isArray(config.items) ? config.items : [];
  const secondaryField = (schema.itemFields || []).find(field => field.id === 'content');
  const seen = new Map();
  const issues = [];
  items.forEach((item, itemIndex) => {
    const primary = primaryFieldValue(schema, item);
    const secondary = secondaryField ? plainText(item[secondaryField.id]).toLowerCase() : '';
    if (!primary) return;
    const key = `${primary}::${secondary}`;
    if (seen.has(key)) {
      issues.push(issue('general-duplicate-items', SEVERITY.WARNING, CATEGORY.GENERAL,
        `${schema.itemLabel || 'Item'} ${itemIndex + 1} appears to duplicate ${schema.itemLabel || 'item'} ${seen.get(key) + 1} — same title and content.`,
        { itemIndex }));
    } else {
      seen.set(key, itemIndex);
    }
  });
  return issues;
}

function checkCompletionConfig(config, settings) {
  const issues = [];
  if (!config.trackCompletion) return issues;
  const items = Array.isArray(config.items) ? config.items : [];
  if (items.length === 0) {
    issues.push(issue('general-invalid-completion-config', SEVERITY.BLOCKING, CATEGORY.GENERAL,
      'Completion tracking is required, but there are no items to track — this block can never be completed.', { fieldId: 'trackCompletion' }));
  }
  if (isEmptyValue(config.completionMsg)) {
    issues.push(issue('general-invalid-completion-config', SEVERITY.WARNING, CATEGORY.GENERAL,
      'Completion tracking is on, but the completion message is empty — a default message will be used instead.', { fieldId: 'completionMsg' }));
  }
  if (settings && !settings.completionParentOrigin) {
    issues.push(issue('general-invalid-completion-config', SEVERITY.RECOMMENDATION, CATEGORY.GENERAL,
      'Consider setting an expected parent frame origin in Builder Settings for stricter completion-message validation — see docs/COMPLETION-INTEGRATION.md.'));
  }
  return issues;
}

const UNSUPPORTED_EXPORT_FORMATS = { zip: 'ZIP package', scorm: 'SCORM 1.2 package' };

function checkUnsupportedExportFeatures(settings) {
  if (!settings || !UNSUPPORTED_EXPORT_FORMATS[settings.exportFormat]) return [];
  return [issue('general-unsupported-export-feature', SEVERITY.WARNING, CATEGORY.GENERAL,
    `Default export package is set to "${UNSUPPORTED_EXPORT_FORMATS[settings.exportFormat]}", but that packaging is not implemented yet — only a single HTML file actually downloads. See docs/RISE-COMPATIBILITY-MATRIX.md.`)];
}

// ---------------------------------------------------------------------------
// Media rules — schema-driven: scans every image/audio/video field, regardless of
// which component owns it, rather than a hardcoded per-component list.
// ---------------------------------------------------------------------------

const MEDIA_MIME_ALLOWLIST = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'],
  video: ['video/mp4', 'video/webm']
};

function mediaFields(schema) {
  return [...(schema.componentFields || []), ...(schema.itemFields || [])].filter(field => ['image', 'audio', 'video'].includes(field.type));
}

function checkMediaRules(schema, config, settings) {
  const issues = [];
  const limits = resolveMediaLimits(settings?.mediaLimitsMb);
  const checkOne = (field, value, itemIndex) => {
    if (isEmptyValue(value)) return;
    if (isMediaReference(value)) {
      const allowlist = MEDIA_MIME_ALLOWLIST[value.kind] || MEDIA_MIME_ALLOWLIST[field.type];
      if (allowlist && !allowlist.includes(value.mimeType)) {
        issues.push(issue('media-unsupported-file-type', SEVERITY.BLOCKING, CATEGORY.MEDIA,
          `${field.label}: "${value.mimeType}" is not a supported ${field.type} type for export.`, { fieldId: field.id, itemIndex }));
      }
      if (Number.isFinite(value.size) && value.size > limits[field.type]) {
        issues.push(issue('media-oversized-file', SEVERITY.WARNING, CATEGORY.MEDIA,
          `${field.label}: file is larger than the configured ${field.type} limit and may block single-file export or slow the page down.`, { fieldId: field.id, itemIndex }));
      }
    } else if (typeof value === 'string' && !value.startsWith('data:')) {
      issues.push(issue('media-external-asset-dependency', SEVERITY.RECOMMENDATION, CATEGORY.MEDIA,
        `${field.label} references an external URL rather than an uploaded file — it will require network access after export and won't travel with the exported file.`,
        { fieldId: field.id, itemIndex }));
      if (value.trim().toLowerCase().startsWith('http://')) {
        issues.push(issue('media-insecure-http-url', SEVERITY.WARNING, CATEGORY.MEDIA,
          `${field.label} uses an insecure http:// URL — browsers may block it as mixed content on an https page.`, { fieldId: field.id, itemIndex }));
      }
    }
  };

  const fields = mediaFields(schema);
  fields.forEach(field => checkOne(field, config[field.id], null));
  (config.items || []).forEach((item, itemIndex) => fields.filter(field => (schema.itemFields || []).includes(field))
    .forEach(field => checkOne(field, item[field.id], itemIndex)));
  return issues;
}

async function checkBrokenMediaReferences(schema, config, mediaStore) {
  const issues = [];
  const checkOne = async (field, value, itemIndex) => {
    if (!isMediaReference(value)) return;
    const record = await getMediaRecord(value.mediaId, mediaStore);
    if (record?.blob) return;
    const severity = field.required ? SEVERITY.BLOCKING : SEVERITY.WARNING;
    issues.push(issue('media-broken-reference', severity, CATEGORY.MEDIA,
      `${field.label}: "${value.name}" is missing from local storage and cannot be exported.`, { fieldId: field.id, itemIndex }));
  };

  const fields = mediaFields(schema);
  await Promise.all(fields.map(field => checkOne(field, config[field.id], null)));
  await Promise.all((config.items || []).flatMap((item, itemIndex) =>
    fields.filter(field => (schema.itemFields || []).includes(field)).map(field => checkOne(field, item[field.id], itemIndex))));
  return issues;
}

// ---------------------------------------------------------------------------
// Knowledge-check rules — scoped to components with an item-level `correct` boolean
// (multiple-choice, multiple-select); sorting-activity/fill-blank have a different
// correctness shape (a category match / a text answer) and are covered by the general
// rules (required fields, empty component) plus their own component.validate().
// ---------------------------------------------------------------------------

const KNOWLEDGE_CHECK_COMPONENTS = new Set(['multiple-choice', 'multiple-select']);

function checkKnowledgeCheckRules(componentId, schema, config) {
  if (!KNOWLEDGE_CHECK_COMPONENTS.has(componentId)) return [];
  const items = Array.isArray(config.items) ? config.items : [];
  const issues = [];
  const correctCount = items.filter(item => item.correct === true).length;

  if (correctCount === 0) {
    issues.push(issue('knowledge-no-correct-answer', SEVERITY.BLOCKING, CATEGORY.KNOWLEDGE,
      'No answer option is marked correct.', { fieldId: 'correct' }));
    if (items.length >= 2) {
      issues.push(issue('knowledge-impossible-passing', SEVERITY.BLOCKING, CATEGORY.KNOWLEDGE,
        'As configured, no possible learner selection can pass this knowledge check — at least one option must be marked correct.'));
    }
  }
  if (componentId === 'multiple-choice' && correctCount > 1) {
    issues.push(issue('knowledge-multiple-correct-single-allowed', SEVERITY.BLOCKING, CATEGORY.KNOWLEDGE,
      `${correctCount} options are marked correct, but this is a single-answer question — only one is allowed.`, { fieldId: 'correct' }));
  }

  const seenLabels = new Map();
  items.forEach((item, itemIndex) => {
    const label = plainText(item.label).toLowerCase();
    if (!label) return;
    if (seenLabels.has(label)) {
      issues.push(issue('knowledge-duplicate-options', SEVERITY.WARNING, CATEGORY.KNOWLEDGE,
        `Option ${itemIndex + 1} duplicates the wording of option ${seenLabels.get(label) + 1}.`, { fieldId: 'label', itemIndex }));
    } else {
      seenLabels.set(label, itemIndex);
    }
    if (isEmptyValue(item.content)) {
      issues.push(issue('knowledge-empty-feedback', SEVERITY.RECOMMENDATION, CATEGORY.KNOWLEDGE,
        `Option ${itemIndex + 1} has no feedback text — learners won't see an explanation when they choose it.`, { fieldId: 'content', itemIndex }));
    }
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Hotspot rules
// ---------------------------------------------------------------------------

// "Overlapping" — pins within this percentage-distance of each other are visually hard
// to tell apart / click independently at typical block widths.
const HOTSPOT_OVERLAP_THRESHOLD = 3;

function checkHotspotRules(componentId, config) {
  if (componentId !== 'hotspots') return [];
  const items = Array.isArray(config.items) ? config.items : [];
  const issues = [];

  if (isEmptyValue(config.backgroundImage)) {
    issues.push(issue('hotspot-missing-image', SEVERITY.RECOMMENDATION, CATEGORY.HOTSPOTS,
      'No background image is set — a generic schematic placeholder will be used instead of your own image.', { fieldId: 'backgroundImage' }));
  }

  const positions = [];
  items.forEach((item, itemIndex) => {
    const x = Number(item.x);
    const y = Number(item.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) {
      issues.push(issue('hotspot-out-of-range-position', SEVERITY.BLOCKING, CATEGORY.HOTSPOTS,
        `Hotspot ${itemIndex + 1}'s position is out of the valid 0–100% range and will render incorrectly or off-frame.`, { fieldId: 'x', itemIndex }));
      return;
    }
    positions.push({ itemIndex, x, y });
  });

  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const a = positions[i];
      const b = positions[j];
      if (Math.abs(a.x - b.x) <= HOTSPOT_OVERLAP_THRESHOLD && Math.abs(a.y - b.y) <= HOTSPOT_OVERLAP_THRESHOLD) {
        issues.push(issue('hotspot-overlapping', SEVERITY.WARNING, CATEGORY.HOTSPOTS,
          `Hotspots ${a.itemIndex + 1} and ${b.itemIndex + 1} are positioned close enough together that they may overlap and be hard to tell apart or click individually.`,
          { itemIndex: b.itemIndex }));
      }
    }
  }

  const seenLabels = new Map();
  items.forEach((item, itemIndex) => {
    const label = plainText(item.title).toLowerCase();
    if (!label) return; // covered by general-required-field
    if (seenLabels.has(label)) {
      issues.push(issue('hotspot-keyboard-accessibility', SEVERITY.WARNING, CATEGORY.HOTSPOTS,
        `Hotspots ${seenLabels.get(label) + 1} and ${itemIndex + 1} share the same label — a keyboard or screen-reader user tabbing between them cannot tell which is which by name alone.`,
        { fieldId: 'title', itemIndex }));
    } else {
      seenLabels.set(label, itemIndex);
    }
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Every rule that can run without an I/O round-trip. Safe to call frequently (e.g. on
 * every editor change) — used by both the inline field UI and as the bulk of the
 * consolidated preflight panel.
 */
export function collectSyncIssues({ componentId, schema, config, theme, componentOverrides, settings }) {
  return [
    ...checkRequiredFields(schema, config),
    ...checkEmptyComponent(schema, config),
    ...checkExcessiveLength(schema, config),
    ...checkUnsupportedRichHtml(schema, config),
    ...checkInvalidUrls(schema, config),
    ...checkMissingAccessibleName(config),
    ...checkMissingAltText(config, componentId),
    ...checkColorContrast(theme, componentOverrides),
    ...checkDuplicateItems(schema, config),
    ...checkCompletionConfig(config, settings),
    ...checkUnsupportedExportFeatures(settings),
    ...checkMediaRules(schema, config, settings),
    ...checkKnowledgeCheckRules(componentId, schema, config),
    ...checkHotspotRules(componentId, config)
  ];
}

/**
 * Full preflight: sync issues plus the one rule that requires an IndexedDB read (broken
 * media references). Used by the consolidated preflight panel and the export gate.
 */
export async function runPreflight({ componentId, schema, config, theme, componentOverrides, settings, mediaStore }) {
  const [syncIssues, brokenMediaIssues] = await Promise.all([
    Promise.resolve(collectSyncIssues({ componentId, schema, config, theme, componentOverrides, settings })),
    checkBrokenMediaReferences(schema, config, mediaStore)
  ]);
  return [...syncIssues, ...brokenMediaIssues];
}

export function summarizePreflight(issues) {
  const blocking = issues.filter(item => item.severity === SEVERITY.BLOCKING);
  const warnings = issues.filter(item => item.severity === SEVERITY.WARNING);
  const recommendations = issues.filter(item => item.severity === SEVERITY.RECOMMENDATION);
  return { blocking, warnings, recommendations, canExport: blocking.length === 0 };
}
