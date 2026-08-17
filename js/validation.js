// Production-grade, schema-driven preflight validation. See docs/VALIDATION-RULES.md for
// the full rule catalog, severity definitions, the reasoning behind every rule below, and
// (P05) how to register a new rule — this file's comments point at *what*, that doc
// explains *why* in depth.
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
//   collectSyncIssues(...)  — pure, synchronous, safe to call on every keystroke. Runs
//                             every registered rule except media-existence (needs an
//                             IndexedDB read).
//   runPreflight(...)       — async wrapper: sync issues + the one async rule (broken
//                             media references), for the consolidated preflight panel and
//                             the export gate, where an async round-trip is acceptable.
//
// P05: rules live in a registry (REGISTERED_RULES / registerValidationRule below), not a
// hardcoded conditional chain — see "Rule registry" for the extensibility model this
// replaces the old flat function-call list with. Every result is enriched into a stable
// shape (ruleId, severity, title, explanation, target, fix) before it leaves this module —
// see "Result shape".
//
// Reuses existing, already-tested logic rather than re-implementing it: validateSchemaField
// (js/editor.js) for required/format checks, validateMediaAccessibility (js/media.js) for
// alt-text/transcript checks, resolveThemeTokens + contrastRatio (js/themes.js) for contrast.

import { validateSchemaField } from './field-validation.js';
import { isMediaReference, resolveMediaLimits, validateMediaAccessibility } from './media.js';
import { getMediaRecord } from './media-storage.js';
import { formatItemLabel, sanitizeRichText, sanitizeURL } from './utilities.js';
import { contrastRatio, resolveThemeTokens } from './themes.js';
import { isExportFormatCompletionCompatible } from './compatibility.js';

// Requirement wording (P02): the one sentence describing what "completion" means here,
// reused verbatim everywhere this is explained — Behavior tab help text, Preflight
// messages, and the export modal — so authors never see two different explanations of
// the same thing.
export const COMPLETION_CLAIM_STATEMENT = 'Require learners to view every item before this component reports completion. Rise course completion support requires the Rise Code Block export and a compatible host configuration.';

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

// Short, static, human-readable label for each rule — the "title" half of the result
// model (Requirement 1, P05). The detailed, instance-specific text (which field, which
// item, which count) is the separate "explanation". One rule id can still emit issues at
// different severities in different situations (e.g. general-invalid-completion-config) —
// the title describes the rule, the explanation describes the specific case.
const RULE_TITLES = Object.freeze({
  'general-required-field': 'Required field is empty',
  'general-empty-component': 'Component has no content',
  'general-excessive-length': 'Field content is unusually long',
  'general-unsupported-rich-html': 'Unsupported formatting was removed',
  'general-invalid-url': 'Invalid URL',
  'general-missing-accessible-name': 'Missing accessible name',
  'general-missing-alt-text': 'Missing alt text or transcript',
  'general-insufficient-contrast': 'Insufficient color contrast',
  'general-duplicate-items': 'Duplicate item content',
  'general-duplicate-titles': 'Duplicate item titles',
  'general-item-count-exceeded': 'Extra items will not be exported',
  'general-heading-level-outline': "Heading level may conflict with Rise's own outline",
  'general-non-descriptive-link-text': 'Non-descriptive link text',
  'general-external-url-destination': 'Links to an external destination',
  'general-invalid-completion-config': 'Completion tracking configuration issue',
  'general-completion-iframe-format': 'Export format may not report completion',
  'general-completion-export-incompatible': "Selected export format can't report completion",
  'media-unsupported-file-type': 'Unsupported media file type',
  'media-oversized-file': 'Media file exceeds size limit',
  'media-external-asset-dependency': 'External media URL, not an uploaded file',
  'media-insecure-http-url': 'Insecure media URL',
  'media-broken-reference': 'Uploaded media file is missing',
  'knowledge-no-correct-answer': 'No correct answer marked',
  'knowledge-impossible-passing': 'Knowledge check can never be passed',
  'knowledge-multiple-correct-single-allowed': 'Multiple correct answers on a single-answer question',
  'knowledge-duplicate-options': 'Duplicate answer option wording',
  'knowledge-empty-feedback': 'Missing answer feedback',
  'hotspot-missing-image': 'No background image set',
  'hotspot-out-of-range-position': 'Hotspot position out of range',
  'hotspot-overlapping': 'Hotspots may overlap',
  'hotspot-keyboard-accessibility': 'Hotspots share the same label'
});

function issue(ruleId, severity, category, explanation, extra = {}) {
  return { ruleId, severity, category, explanation, fieldId: extra.fieldId ?? null, itemIndex: extra.itemIndex ?? null };
}

/**
 * Result shape (Requirement 1, P05): every issue leaving this module — from
 * collectSyncIssues, runPreflight, or checkCompletionExportFormatIssue — has been passed
 * through this enrichment, so callers never need to special-case which rule produced a
 * result. `fieldId`/`itemIndex` stay at the top level too (existing call sites read them
 * directly); `target`/`fix` are additive, structured equivalents.
 *   - title: short, static, rule-level label (RULE_TITLES, falling back to the owning
 *     registry entry's own `title`, then the ruleId itself so nothing is ever blank).
 *   - explanation: the detailed, instance-specific text (was called `message`).
 *   - target: `{ componentId, itemIndex, fieldId }` — where in the config this issue lives.
 *   - fix: `{ type, label }` when there's something to navigate to (a field, or at least
 *     the item card), else `null`. `itemIndex` alone (no `fieldId`) still gets a fix action
 *     — jumpToPreflightField (app.js) already falls back to focusing the item card itself
 *     when there's no more specific field to target.
 */
function enrichIssue(rawIssue, componentId, ruleTitle) {
  const hasField = rawIssue.fieldId !== null && rawIssue.fieldId !== undefined;
  const hasItem = rawIssue.itemIndex !== null && rawIssue.itemIndex !== undefined;
  return {
    ...rawIssue,
    title: RULE_TITLES[rawIssue.ruleId] || ruleTitle || rawIssue.ruleId,
    target: { componentId: componentId ?? null, itemIndex: rawIssue.itemIndex, fieldId: rawIssue.fieldId },
    fix: hasField || hasItem
      ? { type: hasField ? 'goToField' : 'goToItem', label: hasField ? 'Go to field' : 'Go to item' }
      : null
  };
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
        `${formatItemLabel(schema, itemIndex)} appears to duplicate ${formatItemLabel(schema, seen.get(key))} — same title and content.`,
        { itemIndex }));
    } else {
      seen.set(key, itemIndex);
    }
  });
  return issues;
}

// Same title, *different* content — a distinct concern from checkDuplicateItems above
// (same title AND same content). Two items titled identically but saying different things
// are ambiguous to navigate by title alone (a sighted user scanning headings, or a
// screen-reader user jumping by heading/label), even though nothing is technically broken.
// Skipped for components already covered by a more specific duplicate-label rule
// (knowledge-check's answer options, hotspot pin labels) so the same pair of items never
// gets flagged twice under two different rule ids.
function checkDuplicateTitles(schema, config, componentId) {
  if (KNOWLEDGE_CHECK_COMPONENTS.has(componentId) || componentId === 'hotspots') return [];
  const items = Array.isArray(config.items) ? config.items : [];
  const secondaryField = (schema.itemFields || []).find(field => field.id === 'content');
  const seenTitles = new Map();
  const issues = [];
  items.forEach((item, itemIndex) => {
    const primary = primaryFieldValue(schema, item);
    if (!primary) return;
    const secondary = secondaryField ? plainText(item[secondaryField.id]).toLowerCase() : '';
    if (seenTitles.has(primary)) {
      const firstIndex = seenTitles.get(primary);
      const firstSecondary = secondaryField ? plainText(items[firstIndex][secondaryField.id]).toLowerCase() : '';
      if (secondary !== firstSecondary) {
        issues.push(issue('general-duplicate-titles', SEVERITY.WARNING, CATEGORY.GENERAL,
          `${formatItemLabel(schema, itemIndex)}'s title matches ${formatItemLabel(schema, firstIndex)}'s, even though their content differs — this can be confusing for a learner navigating by title alone.`,
          { itemIndex }));
      }
    } else {
      seenTitles.set(primary, itemIndex);
    }
  });
  return issues;
}

// Component-level item-count ceiling (Requirement, P06) — schema.maxItems (js/editor-schemas.js)
// already prevents authoring past this limit through the normal "Add Item"/"Duplicate"
// buttons (js/editor.js, app.js#updateAddItemButtonState), but a hand-edited or imported
// project file can still carry more items than that. The generator for a maxItems: 1
// component (audio-player, video-frame) only ever renders items[0] — anything beyond the
// limit is silently dropped from the export with no other signal that it happened.
function checkItemCountLimits(schema, config) {
  const items = Array.isArray(config.items) ? config.items : [];
  if (!Number.isInteger(schema.maxItems) || items.length <= schema.maxItems) return [];
  const label = (schema.itemLabel || 'item').toLowerCase();
  const extra = items.length - schema.maxItems;
  return [issue('general-item-count-exceeded', SEVERITY.WARNING, CATEGORY.GENERAL,
    `This component only uses the first ${schema.maxItems} ${label}${schema.maxItems === 1 ? '' : 's'} — ${extra} extra ${extra === 1 ? 'entry is' : 'entries are'} present but will not appear in the exported output.`)];
}

// Rise 360 lesson pages already have their own h1 (js/utilities.js#HEADING_LEVELS'
// comment) — an author-selected h1 here creates a second, competing h1 in the host page's
// heading outline, which is confusing for a screen-reader user navigating heading-by-heading.
function checkHeadingLevelOutline(config) {
  if (config.blockHeadingLevel !== 'h1') return [];
  return [issue('general-heading-level-outline', SEVERITY.WARNING, CATEGORY.GENERAL,
    'The headline heading level is set to Heading 1 (h1). Rise 360 lesson pages already have their own h1 — an additional h1 here can create a confusing, duplicate heading outline for screen-reader users navigating by heading. Heading 2 (h2) is the recommended default.',
    { fieldId: 'blockHeadingLevel' })];
}

// A deliberately conservative, documented heuristic (Implementation note 2, P06) — flags
// only the small set of phrases accessibility guidance (WCAG SC 2.4.4) most consistently
// cites as non-descriptive out of context, not every vague-sounding label. Scoped to
// button-list specifically: its items are a bare {label, URL} pair with no surrounding
// descriptive text, so the button's own label is the *only* thing telling a screen-reader
// user (who may be navigating a page's links out of context) where it goes.
const NON_DESCRIPTIVE_LINK_PHRASES = new Set([
  'click here', 'click', 'here', 'this link', 'link', 'read more', 'more', 'more info'
]);

function checkNonDescriptiveLinkText(componentId, config) {
  if (componentId !== 'button-list') return [];
  const items = Array.isArray(config.items) ? config.items : [];
  const issues = [];
  items.forEach((item, itemIndex) => {
    if (isEmptyValue(item.content)) return;
    const label = plainText(item.title).toLowerCase();
    if (NON_DESCRIPTIVE_LINK_PHRASES.has(label)) {
      issues.push(issue('general-non-descriptive-link-text', SEVERITY.WARNING, CATEGORY.GENERAL,
        `"${plainText(item.title)}" doesn't describe where this link goes on its own — a screen-reader user often navigates by jumping between link labels out of context. Use a label that describes the destination (e.g. "Download the study guide" instead of "Click here").`,
        { fieldId: 'title', itemIndex }));
    }
  });
  return issues;
}

// Not a defect — every genuinely external destination gets the same advisory, so an
// author can double-check a URL (a mistyped domain, a stale link) before publishing. Scoped
// to every `url`-type field a schema declares (schema-driven, like checkInvalidUrls above),
// excluding media references (those get their own, more specific media-* rules). Shows
// `sanitizeURL`'s own canonicalized value, never the raw authored string, so what's
// displayed is exactly what the export would actually use.
function checkExternalUrlDestinations(schema, config) {
  const issues = [];
  const urlFields = [...(schema.componentFields || []), ...(schema.itemFields || [])].filter(field => field.type === 'url');
  const checkField = (field, value, itemIndex) => {
    if (isEmptyValue(value) || isMediaReference(value)) return;
    const safe = sanitizeURL(value);
    if (!safe) return; // invalid URLs are already Blocking via general-invalid-url
    issues.push(issue('general-external-url-destination', SEVERITY.WARNING, CATEGORY.GENERAL,
      `${field.label} points to ${safe} — confirm this is the destination you intend before publishing.`, { fieldId: field.id, itemIndex }));
  };
  urlFields.forEach(field => checkField(field, config[field.id], null));
  (config.items || []).forEach((item, itemIndex) => urlFields.filter(field => (schema.itemFields || []).includes(field))
    .forEach(field => checkField(field, item[field.id], itemIndex)));
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
      'Optional: Builder Settings has an "Expected parent frame origin" field for extra security. Most authors can leave it blank.'));
  }
  issues.push(issue('general-completion-iframe-format', SEVERITY.WARNING, CATEGORY.GENERAL,
    `${COMPLETION_CLAIM_STATEMENT} Use "Copy for Rise" in the Export panel — the Iframe Snippet and Web Package ZIP formats are not confirmed to report completion.`));
  return issues;
}

/**
 * Central Preflight blocking check (Requirement 4, P02) for a specific export format the
 * author is actively about to use (e.g. the Advanced "Iframe Snippet" or "Web Package ZIP"
 * pane). Unlike checkCompletionConfig above — which fires an informational Warning with no
 * format context — this is Blocking, because a specific, incompatible format has actually
 * been selected. Not part of the rule registry below (it needs an `exportFormat` argument
 * the registry's `check(ctx)` signature doesn't carry, and it runs at a different time —
 * once a format is chosen, not during general preflight); called directly wherever a
 * specific format is about to be used. Still passed through the same enrichIssue() as
 * every registry result, so its shape is identical (Requirement 1, P05).
 * js/compatibility.js#isExportFormatCompletionCompatible is the single source of truth
 * this defers to.
 */
export function checkCompletionExportFormatIssue(config, exportFormat) {
  if (!config.trackCompletion || !exportFormat) return null;
  if (isExportFormatCompletionCompatible(exportFormat)) return null;
  const raw = issue('general-completion-export-incompatible', SEVERITY.BLOCKING, CATEGORY.GENERAL,
    `${COMPLETION_CLAIM_STATEMENT} This export format doesn't. Use "Copy for Rise" in the main panel instead.`);
  return enrichIssue(raw, null, RULE_TITLES['general-completion-export-incompatible']);
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
// Rule registry (Requirement 2, P05)
//
// Each entry is `{ id, title, appliesTo, check }`:
//   id       — a short, unique registry key (distinct from the ruleId(s) its check may
//              emit — one entry can emit issues under more than one ruleId, e.g.
//              'completion-config' below covers both general-invalid-completion-config
//              and general-completion-iframe-format).
//   title    — fallback title for any ruleId this entry emits that RULE_TITLES doesn't
//              separately cover.
//   appliesTo — `(ctx) => boolean`, or omitted to run for every component. This is the
//              mechanism component-specific rules use instead of a hardcoded
//              `if (componentId !== 'x') return []` buried in a shared module — see
//              registerValidationRule() below to add one from anywhere.
//   check    — `(ctx) => Issue[]`, where ctx is the same context object collectSyncIssues
//              receives: { componentId, schema, config, theme, componentOverrides, settings }.
//
// To add a new rule: call registerValidationRule({ id, appliesTo, check }) — from this
// file, or (since it's an exported function) from any other module loaded before the rule
// needs to run. No edit to collectSyncIssues itself is required. See docs/VALIDATION-RULES.md
// "Adding a rule" for a worked example.
// ---------------------------------------------------------------------------

const registry = [];

export function registerValidationRule(rule) {
  if (!rule || typeof rule.check !== 'function') throw new Error('A validation rule needs a check(ctx) function.');
  if (!rule.id) throw new Error('A validation rule needs a unique id.');
  registry.push({ appliesTo: null, title: null, ...rule });
  return rule;
}

/** Test/extensibility helper — removes a previously registered rule by id. */
export function unregisterValidationRule(id) {
  const index = registry.findIndex(rule => rule.id === id);
  if (index !== -1) registry.splice(index, 1);
}

/** The registry's current rule ids, in run order — mainly useful for tests/debugging. */
export function listRegisteredRuleIds() {
  return registry.map(rule => rule.id);
}

registerValidationRule({ id: 'required-fields', check: ({ schema, config }) => checkRequiredFields(schema, config) });
registerValidationRule({ id: 'empty-component', check: ({ schema, config }) => checkEmptyComponent(schema, config) });
registerValidationRule({ id: 'excessive-length', check: ({ schema, config }) => checkExcessiveLength(schema, config) });
registerValidationRule({ id: 'unsupported-rich-html', check: ({ schema, config }) => checkUnsupportedRichHtml(schema, config) });
registerValidationRule({ id: 'invalid-urls', check: ({ schema, config }) => checkInvalidUrls(schema, config) });
registerValidationRule({ id: 'missing-accessible-name', check: ({ config }) => checkMissingAccessibleName(config) });
registerValidationRule({ id: 'missing-alt-text', check: ({ config, componentId }) => checkMissingAltText(config, componentId) });
registerValidationRule({ id: 'color-contrast', check: ({ theme, componentOverrides }) => checkColorContrast(theme, componentOverrides) });
registerValidationRule({ id: 'duplicate-items', check: ({ schema, config }) => checkDuplicateItems(schema, config) });
registerValidationRule({ id: 'duplicate-titles', check: ({ schema, config, componentId }) => checkDuplicateTitles(schema, config, componentId) });
registerValidationRule({ id: 'item-count-limits', check: ({ schema, config }) => checkItemCountLimits(schema, config) });
registerValidationRule({ id: 'heading-level-outline', check: ({ config }) => checkHeadingLevelOutline(config) });
registerValidationRule({
  id: 'non-descriptive-link-text',
  appliesTo: ({ componentId }) => componentId === 'button-list',
  check: ({ componentId, config }) => checkNonDescriptiveLinkText(componentId, config)
});
registerValidationRule({ id: 'external-url-destinations', check: ({ schema, config }) => checkExternalUrlDestinations(schema, config) });
registerValidationRule({ id: 'completion-config', check: ({ config, settings }) => checkCompletionConfig(config, settings) });
registerValidationRule({ id: 'media-rules', check: ({ schema, config, settings }) => checkMediaRules(schema, config, settings) });
registerValidationRule({
  id: 'knowledge-check-rules',
  appliesTo: ({ componentId }) => KNOWLEDGE_CHECK_COMPONENTS.has(componentId),
  check: ({ componentId, schema, config }) => checkKnowledgeCheckRules(componentId, schema, config)
});
registerValidationRule({
  id: 'hotspot-rules',
  appliesTo: ({ componentId }) => componentId === 'hotspots',
  check: ({ componentId, config }) => checkHotspotRules(componentId, config)
});

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Every rule that can run without an I/O round-trip. Safe to call frequently (e.g. on
 * every editor change) — used by both the inline field UI and as the bulk of the
 * consolidated preflight panel. Runs every registered rule whose `appliesTo` (if any)
 * matches this context, then enriches each raw issue into the stable result shape.
 */
export function collectSyncIssues(ctx) {
  return registry
    .filter(rule => !rule.appliesTo || rule.appliesTo(ctx))
    .flatMap(rule => rule.check(ctx).map(rawIssue => enrichIssue(rawIssue, ctx.componentId, rule.title)));
}

/**
 * Full preflight: sync issues plus the one rule that requires an IndexedDB read (broken
 * media references). Used by the consolidated preflight panel and the export gate. Kept
 * outside the sync registry above since it's async and needs `mediaStore` — see
 * checkBrokenMediaReferences's own comment for why this is the sole exception to the
 * registry pattern.
 */
export async function runPreflight(ctx) {
  const [syncIssues, brokenMediaIssues] = await Promise.all([
    Promise.resolve(collectSyncIssues(ctx)),
    checkBrokenMediaReferences(ctx.schema, ctx.config, ctx.mediaStore)
  ]);
  return [...syncIssues, ...brokenMediaIssues.map(rawIssue => enrichIssue(rawIssue, ctx.componentId, null))];
}

export function summarizePreflight(issues) {
  const blocking = issues.filter(item => item.severity === SEVERITY.BLOCKING);
  const warnings = issues.filter(item => item.severity === SEVERITY.WARNING);
  const recommendations = issues.filter(item => item.severity === SEVERITY.RECOMMENDATION);
  return { blocking, warnings, recommendations, canExport: blocking.length === 0 };
}

/**
 * A short, human-readable summary of a preflight run — "No issues found.", "2 issues: 1
 * blocking, 1 warning.", etc. — for a single concise accessible announcement (Requirement
 * 5, P05), instead of a screen reader re-reading the entire detailed issue list on every
 * update. See app.js's `#preflight-announcement`/`#export-preflight-announcement`.
 */
export function summarizePreflightForAnnouncement(issues) {
  const summary = summarizePreflight(issues);
  const total = summary.blocking.length + summary.warnings.length + summary.recommendations.length;
  if (total === 0) return 'No issues found.';
  const parts = [];
  if (summary.blocking.length) parts.push(`${summary.blocking.length} blocking`);
  if (summary.warnings.length) parts.push(`${summary.warnings.length} warning${summary.warnings.length === 1 ? '' : 's'}`);
  if (summary.recommendations.length) parts.push(`${summary.recommendations.length} recommendation${summary.recommendations.length === 1 ? '' : 's'}`);
  return `${total} issue${total === 1 ? '' : 's'}: ${parts.join(', ')}.`;
}
