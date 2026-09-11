import { getEditorSchema } from './editor-schemas.js';
import { getAttIconSvg } from './att-icons.js';
import * as accordion from '../components/accordion.js';
import * as tabs from '../components/tabs.js';
import * as flipCards from '../components/flip-cards.js';
import * as hotspots from '../components/hotspots.js';
import * as buttonList from '../components/button-list.js';
import * as menuList from '../components/menu-list.js';
import * as multipleChoice from '../components/multiple-choice.js';
import * as multipleSelect from '../components/multiple-select.js';
import * as sortingActivity from '../components/sorting-activity.js';
import * as fillBlank from '../components/fill-blank.js';
import * as verticalTimeline from '../components/vertical-timeline.js';
import * as horizontalTimeline from '../components/horizontal-timeline.js';
import * as processFlow from '../components/process-flow.js';
import * as scenario from '../components/scenario.js';
import * as profileCards from '../components/profile-cards.js';
import * as infoGrid from '../components/info-grid.js';
import * as pricingComparison from '../components/pricing-comparison.js';
import * as audioPlayer from '../components/audio-player.js';
import * as videoFrame from '../components/video-frame.js';
import * as imageGallery from '../components/image-gallery.js';
import * as interactiveVideo from '../components/interactive-video.js';
import * as comparisonSlider from '../components/comparison-slider.js';
import * as dialGauge from '../components/dial-gauge.js';
import * as calloutBox from '../components/callout-box.js';
import * as cardCarousel from '../components/card-carousel.js';
import * as confidenceMatrix from '../components/confidence-matrix.js';

export const CATEGORIES = [
  { id: 'interactive', name: 'Interactive' },
  { id: 'navigation', name: 'Navigation' },
  { id: 'knowledge', name: 'Knowledge Checks' },
  { id: 'timelines', name: 'Timelines' },
  { id: 'process', name: 'Process Flows' },
  { id: 'cards', name: 'Cards & Layouts' },
  { id: 'media', name: 'Media Blocks' },
  { id: 'advanced', name: 'Advanced Interactions' }
];

export const CLASSIFICATIONS = [
  { id: 'enhanced', name: 'Enhanced Rise Alternative', description: 'Similar to a Rise block but adds meaningful customization.' },
  { id: 'custom', name: 'Advanced Custom Interaction', description: 'Provides an interaction not available as a standard Rise block.' }
];

// Strategic component tiers (decision-oriented taxonomy)
export const TIERS = [
  { id: 'flagship', name: 'Flagship', label: 'Flagship', description: 'Highest-impact custom interactive experience' },
  { id: 'signature', name: 'No Rise Equivalent', label: 'No Rise Equivalent', description: 'Provides an interaction not available as a standard Rise block' },
  { id: 'strong-custom', name: 'Custom Recommended', label: 'Custom Recommended', description: 'Custom version is recommended when its advanced behavior is required' },
  { id: 'enhanced-rise', name: 'Enhanced Rise Alternative', label: 'Enhanced Rise Alternative', description: 'Similar to a Rise block but adds meaningful customization' },
  { id: 'rise-first', name: 'Use Native Rise', label: 'Use Native Rise', description: 'Rise’s native block is preferable unless specific custom behavior is needed' }
];

// Controlled learning purposes taxonomy (Prompt section 3)
export const LEARNING_PURPOSES = [
  'Explore',
  'Compare',
  'Practice',
  'Reflect',
  'Assess',
  'Explain',
  'Navigate',
  'Media'
];

export const RISE_RECOMMENDATIONS = [
  { id: 'native-first', name: 'Native Rise Recommended', label: 'Native Rise recommended for basic use' },
  { id: 'conditional', name: 'Conditional Custom', label: 'Conditional custom recommended' },
  { id: 'custom-recommended', name: 'Custom Recommended', label: 'Custom recommended / No direct Rise equivalent' }
];

export const COMPLEXITY_LEVELS = ['Basic', 'Intermediate', 'Advanced'];

const MEDIA_FIELD_TYPES = ['image', 'audio', 'video'];

function deriveMedia(schema) {
  const fields = [...(schema?.componentFields || []), ...(schema?.itemFields || [])];
  const mediaFields = fields.filter(mediaField => MEDIA_FIELD_TYPES.includes(mediaField.type));
  return {
    required: mediaFields.some(mediaField => mediaField.required),
    kinds: [...new Set(mediaFields.map(mediaField => mediaField.type))]
  };
}

const SHARED_EXPORTER = { type: 'shared', module: 'js/export.js#buildExportPayload' };

function moduleRenderer(componentModule) {
  return {
    type: 'module',
    generateHTML: componentModule.generateHTML,
    generateCSS: componentModule.generateCSS,
    generateJS: componentModule.generateJS
  };
}

function fromModule(componentModule, {
  name,
  description,
  keywords,
  icon,
  status = 'production',
  classification,
  differentiator,
  tier,
  learningPurposes = [],
  riseRecommendation,
  riseRecommendationSummary,
  riseEquivalent,
  bestWhen,
  nativeRiseWhen,
  keyCapabilities = [],
  complexity = 'Intermediate',
  mediaRequirements = 'None',
  accessibilitySummary = '',
  completionTracking = '',
  readiness = null,
  aliases = []
}) {
  const editorSchema = componentModule.editorSchema || getEditorSchema(componentModule.id);
  const { items, ...rest } = componentModule.defaultConfig;
  const defaultDesign = {};
  const defaultBehaviour = {};
  Object.entries(rest).forEach(([key, value]) => {
    if (key === 'iconStyle') defaultDesign[key] = value;
    else defaultBehaviour[key] = value;
  });
  const displayName = name || componentModule.name;
  return {
    id: componentModule.id,
    name: displayName,
    aliases: Array.from(new Set([componentModule.id, displayName.toLowerCase(), ...(aliases || [])])),
    categoryId: componentModule.category,
    description,
    keywords,
    version: '1.0.0',
    icon,
    editorSchema,
    defaultContent: { items },
    defaultDesign,
    defaultBehaviour,
    renderer: moduleRenderer(componentModule),
    exporter: SHARED_EXPORTER,
    validate: componentModule.validate,
    accessibilitySupport: true,
    media: deriveMedia(editorSchema),
    completionSupport: true,
    status,
    classification,
    differentiator,
    // Strategic metadata (Section 1 & 2)
    tier,
    learningPurposes,
    riseRecommendation,
    riseRecommendationSummary: riseRecommendationSummary || differentiator,
    riseEquivalent: riseEquivalent || 'No direct equivalent',
    bestWhen: bestWhen || differentiator,
    nativeRiseWhen: nativeRiseWhen || 'A standard native Rise block is sufficient.',
    keyCapabilities,
    complexity,
    mediaRequirements,
    accessibilitySummary,
    completionTracking,
    readiness: readiness || {
      score: status === 'beta' ? 4 : 5,
      max: 5,
      status: status === 'beta' ? 'Beta' : 'Production',
      dimensions: {
        accessibility: true,
        responsive: true,
        riseTested: true,
        completionTested: true,
        mediaOptimized: true
      }
    }
  };
}

export const COMPONENT_REGISTRY = [
  fromModule(accordion, {
    name: 'Accordion',
    description: 'Collapsible vertically stacked headers. Best for structured concepts, FAQs, and expanding key details.',
    keywords: ['collapsible', 'faq', 'dropdown', 'expandable', 'stacked headers'],
    icon: getAttIconSvg('list', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds branded styling, flexible panel behaviour, sequential locking, and search.',
    tier: 'enhanced-rise',
    learningPurposes: ['Explore', 'Explain'],
    riseRecommendation: 'conditional',
    riseRecommendationSummary: 'Use custom when sequential locking or search is required',
    riseEquivalent: 'Rise Accordion Block',
    bestWhen: 'Use custom only for sequential locking, search, explored progress, visited badges, reset, or Expand All. Recommend native Rise for a basic accordion or FAQ.',
    nativeRiseWhen: 'A standard basic accordion or FAQ list is sufficient.',
    keyCapabilities: ['Sequential panel locking', 'In-accordion text search', 'Expand All / Collapse All toggles', 'Exploration progress tracking', 'Visited panel badges'],
    complexity: 'Basic',
    mediaRequirements: 'None',
    accessibilitySummary: 'WAI-ARIA Accordion Pattern (aria-expanded, aria-controls), keyboard Enter/Space expansion.',
    completionTracking: 'Panel exploration & visited state tracking',
    aliases: ['accordion', 'faq', 'collapsible']
  }),
  fromModule(flipCards, {
    name: 'Study Cards',
    description: 'Interactive double-sided cards that flip on click. Great for definitions, vocabulary, and card drills.',
    keywords: ['flashcards', 'vocabulary', 'definitions', '3d', 'double-sided', 'study cards'],
    icon: getAttIconSvg('question-circle-filled', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds animated 3D presentation, Study Mode (Know/Review self-rating), and shuffle.',
    tier: 'strong-custom',
    learningPurposes: ['Practice', 'Reflect', 'Assess'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'Custom recommended when Study Mode or self-rating is used',
    riseEquivalent: 'Rise Flashcard Grid / Stack',
    bestWhen: 'Promote Know/Review classification, shuffle, categories, and summary. Recommend Rise for simple front/back cards.',
    nativeRiseWhen: 'Simple front/back flashcards without self-rating, shuffle, or categorization are needed.',
    keyCapabilities: ['3D card flip animation', 'Study Mode (Know / Review self-rating)', 'Card shuffle & category filters', 'Progress counter & mastery summary', 'Full keyboard navigation'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'ARIA live state for flipped cards, button triggers with clear accessible names.',
    completionTracking: 'Card flip & mastery rate tracking',
    aliases: ['flip-cards', 'flashcards', 'flip cards', 'study cards', 'study-cards']
  }),
  fromModule(tabs, {
    name: 'Horizontal Tabs',
    description: 'Clean tabbed layout switching content panels horizontally. Perfect for organizing multi-step topics.',
    keywords: ['tabs', 'panels', 'horizontal', 'sections'],
    icon: getAttIconSvg('folder', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds vertical/numbered layouts, sequential progression, progress, visited state, and side-by-side comparison.',
    tier: 'enhanced-rise',
    learningPurposes: ['Explore', 'Compare', 'Explain'],
    riseRecommendation: 'conditional',
    riseRecommendationSummary: 'Use custom when vertical tabs, progression, or visited tracking is required',
    riseEquivalent: 'Rise Tabs Block',
    bestWhen: 'Custom is justified by vertical/numbered layouts, sequential progression, progress, visited state, or side-by-side comparison. Use Rise for ordinary tabs.',
    nativeRiseWhen: 'A basic horizontal 3-tab layout without gating or visited tracking is needed.',
    keyCapabilities: ['Vertical and horizontal tab layouts', 'Sequential progression gating', 'Visited tab badges', 'Side-by-side comparison panels', 'Auto-advancing step mode'],
    complexity: 'Basic',
    mediaRequirements: 'None',
    accessibilitySummary: 'ARIA Tablist pattern (role="tablist", role="tab", role="tabpanel"), keyboard Left/Right/Up/Down roving tabindex.',
    completionTracking: 'All-tabs visited tracking',
    aliases: ['tabs', 'tabbed layout', 'tab-panel', 'horizontal-tabs']
  }),
  fromModule(hotspots, {
    name: 'Hotspots',
    description: 'Place interactive click indicators over custom images to reveal explanatory tooltips and annotations.',
    keywords: ['image map', 'tooltip', 'annotations', 'clickable points', 'labeled graphic'],
    icon: getAttIconSvg('hotspot', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds customizable markers, tooltip presentation, and branded image exploration.',
    tier: 'rise-first',
    learningPurposes: ['Explore', 'Explain'],
    riseRecommendation: 'native-first',
    riseRecommendationSummary: 'Native Rise Labeled Graphic recommended for standard diagrams',
    riseEquivalent: 'Rise Labeled Graphic Block',
    bestWhen: 'Rise Labeled Graphic is preferred unless advanced exploration, state tracking, custom markers, or audio narration is needed.',
    nativeRiseWhen: 'Standard image pins with text popovers are sufficient.',
    keyCapabilities: ['Custom vector marker icons', 'Interactive tooltip / drawer callouts', 'Explored marker progress counter', 'Audio narration trigger on hotspot', 'Zoom & pan exploration'],
    complexity: 'Intermediate',
    mediaRequirements: 'image',
    accessibilitySummary: 'Numbered button pins with accessible names, keyboard Tab navigation, popover focus management.',
    completionTracking: 'All hotspots explored tracking',
    aliases: ['hotspots', 'image map', 'labeled graphic']
  }),
  fromModule(buttonList, {
    name: 'Button List',
    description: 'Curated list of customized buttons directing learners to external resources or course milestones.',
    keywords: ['links', 'buttons', 'resources', 'navigation', 'resource hub'],
    icon: getAttIconSvg('open-new', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds curated resource presentation, grouping, download metadata, and button styling.',
    tier: 'rise-first',
    learningPurposes: ['Navigate'],
    riseRecommendation: 'native-first',
    riseRecommendationSummary: 'Native Rise Button / List recommended for basic links',
    riseEquivalent: 'Rise Button Block / Button Stack',
    bestWhen: 'Custom is justified when group tags, download badges, or resource filters are required.',
    nativeRiseWhen: 'A simple button linking to a single URL or document is needed.',
    keyCapabilities: ['Categorized resource grouping', 'Download badges & metadata', 'Custom action button styles', 'External link security attributes', 'Searchable link directory'],
    complexity: 'Basic',
    mediaRequirements: 'None',
    accessibilitySummary: 'Accessible anchor links with target announcement, clear descriptive button labels.',
    completionTracking: 'Resource link click tracking',
    aliases: ['button-list', 'resource hub', 'button list', 'links']
  }),
  fromModule(menuList, {
    name: 'Reference Explorer',
    description: 'Expandable sub-lesson links or glossary panels designed to sit natively inside your custom Rise blocks.',
    keywords: ['menu', 'drawer', 'glossary', 'sub-lesson', 'reference explorer'],
    icon: getAttIconSvg('message-3', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Useful as an expandable glossary, reference browser, or in-block navigation tool.',
    tier: 'strong-custom',
    learningPurposes: ['Navigate', 'Explore'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'Custom recommended as an in-block glossary or reference browser',
    riseEquivalent: 'Rise Button / List Block',
    bestWhen: 'Useful as an expandable glossary, reference browser, or in-block navigation tool.',
    nativeRiseWhen: 'A standard bulleted link list is sufficient.',
    keyCapabilities: ['Expandable reference drawer', 'Alphabetical or category indexing', 'In-block search & filter', 'Rich definition previews', 'Quick-jump navigation'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'Disclosure semantics (aria-expanded), search input labelling, keyboard list navigation.',
    completionTracking: 'Item exploration tracking',
    aliases: ['menu-list', 'reference explorer', 'glossary', 'menu list', 'reference-explorer']
  }),
  fromModule(multipleChoice, {
    name: 'Multiple Choice',
    description: 'Self-correcting interactive knowledge check card. Supports feedback answers and custom status.',
    keywords: ['quiz', 'knowledge check', 'single answer', 'assessment', 'confidence check'],
    icon: getAttIconSvg('check-circle-filled', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds confidence-before-answer, hints, retry limits, and confidence-plus-correctness evaluation.',
    tier: 'rise-first',
    learningPurposes: ['Assess', 'Practice', 'Reflect'],
    riseRecommendation: 'conditional',
    riseRecommendationSummary: 'Use custom for confidence-before-answer, hints, or retry limits',
    riseEquivalent: 'Rise Multiple Choice Knowledge Check',
    bestWhen: 'Use custom for confidence-before-answer, hints, retry limits, or confidence-plus-correctness interpretation. Use Rise for ordinary MC questions.',
    nativeRiseWhen: 'A standard single-question knowledge check with default feedback is needed.',
    keyCapabilities: ['Confidence self-rating before answer', 'Multi-attempt retry limits', 'Contextual hints on failure', 'Custom feedback explanations', 'Correctness and confidence matrix score'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'Radiogroup semantics, keyboard selection, feedback live region.',
    completionTracking: 'Pass/fail & confidence rating tracking',
    aliases: ['multiple-choice', 'confidence check', 'multiple choice', 'quiz']
  }),
  fromModule(multipleSelect, {
    name: 'Multiple Select',
    description: 'Select-all-that-apply knowledge check where more than one answer option can be correct.',
    keywords: ['quiz', 'select all', 'checkbox', 'assessment'],
    icon: getAttIconSvg('check-circle', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds branded select-all-that-apply interactions, partial credit scoring, and remediation.',
    tier: 'rise-first',
    learningPurposes: ['Assess', 'Practice'],
    riseRecommendation: 'native-first',
    riseRecommendationSummary: 'Native Rise Multiple Response recommended for standard use',
    riseEquivalent: 'Rise Multiple Response Knowledge Check',
    bestWhen: 'Custom is justified for staged feedback, partial credit scoring, or custom remediation.',
    nativeRiseWhen: 'A standard multi-checkbox quiz block is all that is required.',
    keyCapabilities: ['Select-all-that-apply checkbox logic', 'Partial credit scoring', 'Specific option remediation hints', 'Custom retry limits', 'Branded question card styling'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'Checkbox role with aria-checked, keyboard space toggle, descriptive error feedback.',
    completionTracking: 'Correct answer set submission tracking',
    aliases: ['multiple-select', 'select all', 'multiple select']
  }),
  fromModule(sortingActivity, {
    name: 'Sorting Activity',
    description: 'Let learners sort concept cards into category columns with instant matching indicator flags.',
    keywords: ['drag and drop', 'categorize', 'sorting', 'matching'],
    icon: getAttIconSvg('arrows-vertical-1', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds multi-column category sorting, explanations after placement, and scoring insights.',
    tier: 'rise-first',
    learningPurposes: ['Practice', 'Assess'],
    riseRecommendation: 'native-first',
    riseRecommendationSummary: 'Native Rise Sorting Activity recommended unless custom multi-column scoring is needed',
    riseEquivalent: 'Rise Sorting Activity Block',
    bestWhen: 'Custom requires a real differentiator such as explanation after placement, scoring insights, or multi-stage categorization.',
    nativeRiseWhen: 'A standard 2-category drag-and-drop card sort is needed.',
    keyCapabilities: ['Multi-column category sorting', 'Instant matching feedback flags', 'Explanation after card placement', 'Keyboard accessible sorting controls', 'Mistake counter & retry'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'Keyboard alternative to drag-and-drop, category select dropdowns, live region sort announcements.',
    completionTracking: '100% correct placement tracking',
    aliases: ['sorting-activity', 'drag and drop', 'sorting']
  }),
  fromModule(fillBlank, {
    name: 'Fill in the Blank',
    description: 'Interactive sentence checks. Great for verification of terminology, syntax, or statements.',
    keywords: ['cloze', 'fill in the blank', 'terminology', 'sentence'],
    icon: getAttIconSvg('pencil', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds multiple accepted synonyms, staged clues, fuzzy matching, and inline feedback.',
    tier: 'rise-first',
    learningPurposes: ['Practice', 'Assess'],
    riseRecommendation: 'native-first',
    riseRecommendationSummary: 'Native Rise Fill in the Blank recommended for standard terminology checks',
    riseEquivalent: 'Rise Fill in the Blank Block',
    bestWhen: 'Custom is justified only by richer practice modes, staged clues, contextual feedback, or multiple valid variants.',
    nativeRiseWhen: 'A single keyword or exact phrase check is needed.',
    keyCapabilities: ['Multiple accepted synonyms / variants', 'Staged progressive clues', 'Case-insensitive fuzzy match options', 'Inline text feedback', 'Instant validation toggle'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'Accessible text input with aria-describedby for hints, immediate accessible feedback.',
    completionTracking: 'Correct answer entered tracking',
    aliases: ['fill-blank', 'cloze', 'fill in the blank']
  }),
  fromModule(verticalTimeline, {
    name: 'Guided Vertical Timeline',
    description: 'Elegant step indicators moving vertically. Designed with micro-animations on scroll/click.',
    keywords: ['timeline', 'steps', 'vertical', 'milestones', 'guided vertical timeline'],
    icon: getAttIconSvg('clock', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds category filters, comparison streams, collapsible detail, sequential locking, and reset.',
    tier: 'strong-custom',
    learningPurposes: ['Explore', 'Explain', 'Navigate'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'Custom recommended for filtered streams, categories, and locking',
    riseEquivalent: 'Rise Timeline Block',
    bestWhen: 'Emphasize categories, filters, comparison streams, collapsible detail, chronological locking, progress, and reset.',
    nativeRiseWhen: 'A static, linear 4-event sequence is sufficient.',
    keyCapabilities: ['Category filtering', 'Collapsible detail cards', 'Sequential milestone locking', 'Visited state badges', 'Micro-animated timeline spine'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'Ordered list semantics, expandable event disclosures, visible focus indicators.',
    completionTracking: 'Milestone exploration tracking',
    aliases: ['vertical-timeline', 'vertical timeline', 'guided vertical timeline']
  }),
  fromModule(horizontalTimeline, {
    name: 'Horizontal Timeline',
    description: 'Interactive slider card demonstrating chronological milestones, histories, or developmental processes.',
    keywords: ['timeline', 'journey map', 'history', 'slider'],
    icon: getAttIconSvg('arrow-right', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Presents milestones as an interactive horizontal journey with media and milestone nodes.',
    tier: 'signature',
    learningPurposes: ['Explore', 'Explain', 'Navigate'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'No direct Rise equivalent',
    riseEquivalent: 'No direct equivalent',
    bestWhen: 'Strong for journeys, maturity models, history, and process evolution across time.',
    nativeRiseWhen: 'A simple vertical list or standard process block is sufficient.',
    keyCapabilities: ['Horizontal timeline slide journey', 'Interactive milestone nodes', 'Media & description popups', 'Touch/swipe milestone switching', 'Keyboard navigation'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'Keyboard roving tabindex, step role announcements, high-contrast active states.',
    completionTracking: 'All-milestones viewed tracking',
    aliases: ['horizontal-timeline', 'horizontal timeline', 'journey map']
  }),
  fromModule(processFlow, {
    name: 'Guided Process',
    description: 'Process block that hides future steps until the learner clicks "Next Step" to progress.',
    keywords: ['process', 'steps', 'next step', 'workflow', 'guided process'],
    icon: getAttIconSvg('step-forward', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Reveals a process progressively with gating, step completion badges, and summary review.',
    tier: 'enhanced-rise',
    learningPurposes: ['Explain', 'Practice', 'Navigate'],
    riseRecommendation: 'conditional',
    riseRecommendationSummary: 'Use custom when progressive reveal or gated progression is required',
    riseEquivalent: 'Rise Process Block',
    bestWhen: 'Emphasize progressive reveal and guided progression. Use Rise for a simple process sequence.',
    nativeRiseWhen: 'A simple linear process where all steps are immediately clickable is acceptable.',
    keyCapabilities: ['Progressive reveal (Next Step gate)', 'Step completion badges', 'Interactive branch choices', 'Visited step breadcrumb', 'Step summary review'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'Step progression announcements, disabled state handling for locked steps, keyboard navigation.',
    completionTracking: 'End-of-process reached tracking',
    aliases: ['process-flow', 'guided process', 'process flow']
  }),
  fromModule(scenario, {
    name: 'Scenario',
    description: 'Interactive mini-simulation where learner selections route to customized response dialogue paths.',
    keywords: ['branching scenario', 'simulation', 'decision', 'dialogue', 'decision simulator'],
    icon: getAttIconSvg('message-2', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Routes learners through customized decision paths, cumulative score meter, and review dialogue.',
    tier: 'rise-first',
    learningPurposes: ['Practice', 'Assess', 'Reflect'],
    riseRecommendation: 'native-first',
    riseRecommendationSummary: 'Native Rise Scenario recommended unless complex decision branching is needed',
    riseEquivalent: 'Rise Scenario Block',
    bestWhen: 'Prefer Rise for ordinary scenarios. Custom should evolve only toward a demonstrably richer Decision Simulator.',
    nativeRiseWhen: 'A standard 2-person dialogue with stock Rise avatars is sufficient.',
    keyCapabilities: ['Multi-branch decision simulation', 'Custom character avatars & emotions', 'Cumulative score / consequence meter', 'Dialogue history review', 'Feedback on each decision step'],
    complexity: 'Advanced',
    mediaRequirements: 'image',
    accessibilitySummary: 'Dialogue landmark roles, keyboard choice selection, consequence score announcements.',
    completionTracking: 'Scenario conclusion reached tracking',
    aliases: ['scenario', 'branching scenario', 'decision simulator']
  }),
  fromModule(profileCards, {
    name: 'Profile Cards',
    description: 'Two-column interactive biography grids. Great for team intros, characters, or subject-matter experts.',
    keywords: ['team', 'bio', 'profile', 'people grid'],
    icon: getAttIconSvg('person', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Presents people, roles, experts, or characters in a purpose-built profile layout with modals.',
    tier: 'strong-custom',
    learningPurposes: ['Explore', 'Explain'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'Custom recommended for persona grids, experts, and stakeholders',
    riseEquivalent: 'Rise Image & Text Block',
    bestWhen: 'Suitable for personas, experts, stakeholders, archetypes, and scenario characters.',
    nativeRiseWhen: 'Simple static avatar images with a paragraph are sufficient.',
    keyCapabilities: ['Persona bio grid', 'Expandable detail drawers', 'Role tags and social/contact links', 'Interactive quotes & highlights', 'Accessible modal profile view'],
    complexity: 'Basic',
    mediaRequirements: 'image',
    accessibilitySummary: 'Accessible card headings, modal focus trapping, image alt tags.',
    completionTracking: 'Profile view tracking',
    aliases: ['profile-cards', 'people grid', 'team profiles']
  }),
  fromModule(infoGrid, {
    name: 'Info Grid',
    description: 'A flexible cards layout with beautiful SVG icons, description headers, and rounded card styling.',
    keywords: ['info cards', 'icons', 'grid layout', 'features'],
    icon: getAttIconSvg('grid', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Creates flexible branded information cards with icons, column layouts, and descriptions.',
    tier: 'enhanced-rise',
    learningPurposes: ['Explain'],
    riseRecommendation: 'conditional',
    riseRecommendationSummary: 'Retain as a layout utility; use custom for branded icon cards',
    riseEquivalent: 'Rise Grid / Column Blocks',
    bestWhen: 'Retain as a productivity/layout component, not a flagship interaction.',
    nativeRiseWhen: 'A basic 2-column or 3-column text block without styled cards is needed.',
    keyCapabilities: ['Branded SVG icon headers', 'Responsive 2, 3, or 4 column grid', 'Accent border & shadow styling', 'Card hover micro-interactions', 'Subtitle & badge support'],
    complexity: 'Basic',
    mediaRequirements: 'None',
    accessibilitySummary: 'Card landmark headings, high-contrast borders, responsive wrapping.',
    completionTracking: 'Card exploration tracking',
    aliases: ['info-grid', 'info cards', 'grid layout']
  }),
  fromModule(pricingComparison, {
    name: 'Comparison Matrix',
    description: 'Interactive table matrix cards highlighting differences in programs, paths, or pricing packages.',
    keywords: ['pricing', 'comparison table', 'plans', 'matrix', 'comparison matrix', 'options'],
    icon: getAttIconSvg('tag', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Provides a purpose-built visual comparison of products, paths, policies, or programs.',
    tier: 'signature',
    learningPurposes: ['Compare', 'Explain'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'No direct Rise equivalent',
    riseEquivalent: 'Rise Table Block',
    bestWhen: 'Generalize beyond pricing to products, policies, roles, options, approaches, pathways, and plans.',
    nativeRiseWhen: 'A simple unstyled reference table is all that is required.',
    keyCapabilities: ['Multi-tier feature comparison', 'Highlighted recommended column', 'Badges, tooltips, and action buttons', 'Responsive mobile card breakdown', 'Feature matrix checklist'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'Accessible table semantics, clear header associations (scope="col/row"), responsive matrix transposition.',
    completionTracking: 'Option inspection tracking',
    aliases: ['pricing-comparison', 'comparison matrix', 'plans', 'pricing', 'product matrix cards']
  }),
  fromModule(audioPlayer, {
    name: 'Learning Audio Player',
    description: 'Audio player with chapters, a synchronized transcript, resume/progress tracking, and key takeaways — Compact, Learning, or Podcast presentation.',
    keywords: ['audio', 'podcast', 'transcript', 'player', 'chapters', 'takeaways', 'resume', 'learning audio player'],
    icon: getAttIconSvg('volume-3', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Adds chapters, synchronized transcript, resume, progress, and takeaways.',
    tier: 'flagship',
    learningPurposes: ['Media', 'Explain', 'Reflect'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'Custom recommended for chapters and synchronized transcripts',
    riseEquivalent: 'Native Rise Audio block',
    bestWhen: 'Chapters, synchronized transcript, resume, progress, takeaways, and Compact/Learning/Podcast modes justify it.',
    nativeRiseWhen: 'A simple standalone audio playback without transcript or chapters is sufficient.',
    keyCapabilities: ['Synchronized interactive transcript', 'Chapter markers & navigation', 'Progress persistence & resume', 'Key takeaways drawer', 'Compact / Learning / Podcast layouts'],
    complexity: 'Intermediate',
    mediaRequirements: 'audio',
    accessibilitySummary: 'Full keyboard navigation, synchronized caption highlights, screen reader transcript sync.',
    completionTracking: 'Listen threshold & transcript exploration tracking',
    aliases: ['audio-player', 'learning audio player', 'podcast', 'audio player']
  }),
  fromModule(videoFrame, {
    name: 'Learning Video Player',
    description: 'Video player with chapters, a synchronized transcript, resume/progress tracking, and key takeaways — custom overlay controls, captions, and audio description.',
    keywords: ['video', 'embed', 'captions', 'player', 'chapters', 'takeaways', 'resume', 'learning video player'],
    icon: getAttIconSvg('play', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Adds chapters, transcript, resume, captions, and enhanced playback controls.',
    tier: 'strong-custom',
    learningPurposes: ['Media', 'Explain'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'Custom recommended for chapters and synchronized transcripts',
    riseEquivalent: 'Native Rise Video Block',
    bestWhen: 'Chapters, transcript, resume, takeaways, captions, audio description, and enhanced controls justify it.',
    nativeRiseWhen: 'A basic standard video player with no chaptering or notes is needed.',
    keyCapabilities: ['Synchronized video transcript', 'Chapter navigation markers', 'Takeaways & summary drawer', 'Custom branding overlay', 'Resume playback tracking'],
    complexity: 'Intermediate',
    mediaRequirements: 'video',
    accessibilitySummary: 'Captions, transcript sync, keyboard shortcuts, screen reader announcements.',
    completionTracking: 'Watch percentage & chapter exploration tracking',
    aliases: ['video-frame', 'learning video player', 'video player']
  }),
  fromModule(imageGallery, {
    name: 'Image Gallery',
    description: 'Responsive photo gallery with beautiful modal popups and image detail descriptions.',
    keywords: ['gallery', 'photos', 'modal', 'grid'],
    icon: getAttIconSvg('photo-gallery', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds responsive image grids, detailed descriptions, and modal viewing.',
    tier: 'enhanced-rise',
    learningPurposes: ['Media', 'Explore'],
    riseRecommendation: 'conditional',
    riseRecommendationSummary: 'Use custom when annotated collections or detailed captions are required',
    riseEquivalent: 'Rise Gallery Block',
    bestWhen: 'Use Rise for a normal gallery. Custom is appropriate for annotated or explanatory collections with meaningful descriptions.',
    nativeRiseWhen: 'A simple 2-column or 3-column static image grid is sufficient.',
    keyCapabilities: ['Annotated image cards', 'Modal lightbox zoom with captions', 'Masonry and uniform grid layouts', 'Category filter tags', 'Accessible modal focus management'],
    complexity: 'Basic',
    mediaRequirements: 'image',
    accessibilitySummary: 'Lightbox modal focus trapping, escape key dismiss, descriptive image alt text.',
    completionTracking: 'Lightbox open and gallery exploration tracking',
    aliases: ['image-gallery', 'photo gallery', 'gallery']
  }),
  fromModule(interactiveVideo, {
    name: 'Interactive Video',
    description: 'Video with timestamp-based information and multiple-choice markers. Pauses at each marker, records learner progress, and resumes on your terms.',
    keywords: ['video', 'interactive video', 'markers', 'timeline', 'knowledge check', 'pause'],
    status: 'beta',
    icon: getAttIconSvg('information-circle-filled', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Adds timestamp-based information and question markers with progress persistence.',
    tier: 'flagship',
    learningPurposes: ['Media', 'Assess', 'Explore'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'No direct Rise equivalent',
    riseEquivalent: 'No direct equivalent (Rise Video block is non-interactive)',
    bestWhen: 'Timestamp markers, pauses, information panels, questions, progress persistence, and resume behavior are required.',
    nativeRiseWhen: 'A simple, un-gated video player is sufficient.',
    keyCapabilities: ['Timestamped pause markers', 'Inline quiz checkpoints', 'Information overlays', 'Learner progress persistence', 'Resume playback'],
    complexity: 'Advanced',
    mediaRequirements: 'video',
    accessibilitySummary: 'Keyboard accessible controls, screen-reader status announcements, ARIA video state.',
    completionTracking: 'Full marker & playback tracking',
    readiness: {
      score: 4,
      max: 5,
      status: 'Beta',
      dimensions: {
        accessibility: true,
        responsive: true,
        riseTested: true,
        completionTested: true,
        mediaOptimized: false
      }
    },
    aliases: ['interactive-video', 'interactive video player', 'interactive video']
  }),
  fromModule(comparisonSlider, {
    name: 'Comparison Slider',
    description: 'Interactive before-and-after visual split-view slider with keyboard support, smooth touch drag, and responsive badges.',
    keywords: ['comparison', 'slider', 'before and after', 'split view', 'difference', 'visual comparison'],
    icon: getAttIconSvg('arrows-horizontal', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Interactive split-view comparison with touch drag, keyboard accessibility, and completion tracking.',
    tier: 'signature',
    learningPurposes: ['Compare', 'Explore'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'No direct Rise equivalent',
    riseEquivalent: 'No direct equivalent',
    bestWhen: 'Strong for before/after, compliant/non-compliant, old/new, inspection, and change comparisons.',
    nativeRiseWhen: 'Side-by-side static images or standard two-column blocks are adequate.',
    keyCapabilities: ['Smooth touch & mouse drag split-view', 'Keyboard arrow slider control (role="slider")', 'Customizable before/after badges', 'Vertical & horizontal split orientations', 'Exploration tracking'],
    complexity: 'Intermediate',
    mediaRequirements: 'image',
    accessibilitySummary: 'ARIA slider semantics with aria-valuenow/valuemin/valuemax, Arrow key manipulation, high contrast dividers.',
    completionTracking: 'Interactive exploration & split-drag tracking',
    aliases: ['comparison-slider', 'before and after slider', 'comparison slider']
  }),
  fromModule(dialGauge, {
    name: 'Interactive Gauge',
    description: 'Dynamic interactive metric dial and gauge with animated vector arc, needle indicator, operational tier presets, and real-time contextual feedback.',
    keywords: ['dial', 'gauge', 'metric', 'speedometer', 'meter', 'performance', 'slider', 'kpi', 'interactive gauge', 'metric explorer'],
    icon: getAttIconSvg('high-meter', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Interactive metric simulation with vector gauge arc, tier presets, real-time insights, and keyboard accessibility.',
    tier: 'signature',
    learningPurposes: ['Explore', 'Practice', 'Explain'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'No direct Rise equivalent',
    riseEquivalent: 'No direct equivalent',
    bestWhen: 'Use for maturity, risk, performance, KPI, and operational exploration with contextual feedback linked to learner input.',
    nativeRiseWhen: 'Static charts or simple numeric text are sufficient.',
    keyCapabilities: ['Vector arc needle visualization', 'Interactive slider & value controls', 'Color-coded operational zones (Risk, Maturity, KPI)', 'Dynamic real-time feedback thresholds', 'Smooth animated needle pivot'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'ARIA slider role, value announcement via live regions, high-contrast SVG arcs.',
    completionTracking: 'Exploration and target zone reaching tracking',
    aliases: ['dial-gauge', 'interactive gauge', 'metric explorer', 'dial gauge']
  }),
  fromModule(calloutBox, {
    name: 'Policy & Alert Cards',
    description: 'Elevated multi-tone callout and alert matrix supporting Information, Policy Directives, Safety Warnings, and interactive compliance acknowledgment.',
    keywords: ['callout', 'alert', 'notice', 'warning', 'tip', 'compliance', 'security', 'note', 'matrix', 'policy'],
    icon: getAttIconSvg('information-circle-filled', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Multi-card alert matrix with AT&T brand tones, responsive grid layouts, and interactive learner acknowledgment.',
    tier: 'enhanced-rise',
    learningPurposes: ['Explain', 'Reflect'],
    riseRecommendation: 'conditional',
    riseRecommendationSummary: 'Use custom for multi-tone alert matrix or learner acknowledgment',
    riseEquivalent: 'Rise Note / Warning Block',
    bestWhen: 'Native Rise is sufficient for decoration or simple statements. Custom is justified by policy, safety, compliance, or acknowledgment behavior.',
    nativeRiseWhen: 'A single generic note callout icon with 1 sentence is needed.',
    keyCapabilities: ['Multi-tone brand palette (Information, Policy, Warning, Tip)', 'Interactive "I Acknowledge" checkbox gate', 'Multi-card alert grid layout', 'Custom AT&T iconography', 'Compliance acknowledgment tracking'],
    complexity: 'Basic',
    mediaRequirements: 'None',
    accessibilitySummary: 'Semantic alert roles (role="region" / aria-label), high-contrast border accents, keyboard checkbox controls.',
    completionTracking: 'Acknowledgment click tracking',
    aliases: ['callout-box', 'policy and alert cards', 'alert matrix', 'callout box']
  }),
  fromModule(cardCarousel, {
    name: 'Card Carousel',
    description: 'Fluid card stack and carousel showcase with category badges, rich media, touch swipe, keyboard navigation, and completion tracking.',
    keywords: ['carousel', 'cards', 'slider', 'stack', 'gallery', 'showcase', 'swipe'],
    icon: getAttIconSvg('multi-screen', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Horizontal fluid card carousel with category tags, swipe support, and dot navigation.',
    tier: 'enhanced-rise',
    learningPurposes: ['Explore', 'Media'],
    riseRecommendation: 'conditional',
    riseRecommendationSummary: 'Use custom for rich card badges, swipe, and completion tracking',
    riseEquivalent: 'Rise Carousel Block',
    bestWhen: 'Use Rise for basic carousel content. Custom is justified by richer media, badges, swipe, keyboard navigation, and completion tracking.',
    nativeRiseWhen: 'A basic text and image carousel is needed.',
    keyCapabilities: ['Touch & pointer drag swiping', 'Category tags and status badges', 'Dot & arrow navigation', 'Slide exploration progress', 'Responsive multi-card density'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'ARIA Carousel pattern (role="region", aria-roledescription="carousel"), keyboard previous/next, live region announcements.',
    completionTracking: 'All slides viewed tracking',
    aliases: ['card-carousel', 'card stack', 'carousel showcase', 'card carousel']
  }),
  fromModule(confidenceMatrix, {
    name: 'Confidence Matrix',
    description: 'Interactive multi-domain skills and confidence self-assessment matrix with real-time competency scoring and diagnostic feedback.',
    keywords: ['confidence', 'skills', 'assessment', 'matrix', 'competency', 'diagnostic', 'survey', 'self-assessment', 'scoring'],
    icon: getAttIconSvg('check-shield', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Diagnostic skills matrix with interactive 4-level competency rating, overall score tracking, and strengths/growth analysis.',
    tier: 'flagship',
    learningPurposes: ['Assess', 'Reflect'],
    riseRecommendation: 'custom-recommended',
    riseRecommendationSummary: 'No direct Rise equivalent',
    riseEquivalent: 'No direct equivalent',
    bestWhen: 'Self-assessment across domains, four-level ratings, summary scoring, strengths, and growth diagnostics are needed.',
    nativeRiseWhen: 'Only simple multiple choice questions or surveys are needed.',
    keyCapabilities: ['4-level competency rating', 'Multi-domain evaluation', 'Real-time category scoring', 'Strengths & growth analysis', 'Print/export summary'],
    complexity: 'Intermediate',
    mediaRequirements: 'None',
    accessibilitySummary: 'Radiogroup semantics, full keyboard arrow navigation, live region score updates.',
    completionTracking: 'Matrix completion & competency rating tracking',
    aliases: ['confidence-matrix', 'skills matrix', 'confidence self-assessment', 'skills self-assessment', 'confidence matrix']
  })
];

const STATUSES = ['production', 'beta', 'experimental'];

export function validateRegistry(registry, categories = CATEGORIES, classifications = CLASSIFICATIONS, tiers = TIERS) {
  if (!Array.isArray(registry) || !registry.length) throw new Error('Component registry must be a non-empty array.');
  const categoryIds = new Set(categories.map(category => category.id));
  const classificationIds = new Set(classifications.map(classification => classification.id));
  const tierIds = new Set(tiers.map(tier => tier.id));
  const validPurposes = new Set(LEARNING_PURPOSES);
  const validRecommendations = new Set(RISE_RECOMMENDATIONS.map(r => r.id));
  const seenIds = new Set();

  registry.forEach((entry, index) => {
    const label = entry?.id || `entry #${index}`;
    if (typeof entry.id !== 'string' || !entry.id.trim()) throw new Error(`Component registry entry at index ${index} is missing a valid id.`);
    if (seenIds.has(entry.id)) throw new Error(`Component registry has a duplicate id: "${entry.id}".`);
    seenIds.add(entry.id);
    if (typeof entry.name !== 'string' || !entry.name.trim()) throw new Error(`Component "${label}" is missing a display name.`);
    if (typeof entry.description !== 'string' || !entry.description.trim()) throw new Error(`Component "${label}" is missing a description.`);
    if (!categoryIds.has(entry.categoryId)) throw new Error(`Component "${label}" has an unknown categoryId: "${entry.categoryId}".`);
    if (!Array.isArray(entry.keywords) || !entry.keywords.length) throw new Error(`Component "${label}" must define at least one search keyword.`);
    if (typeof entry.version !== 'string' || !entry.version.trim()) throw new Error(`Component "${label}" is missing a version.`);
    if (typeof entry.icon !== 'string' || !entry.icon.trim()) throw new Error(`Component "${label}" is missing a thumbnail/icon.`);
    if (!entry.editorSchema || typeof entry.editorSchema !== 'object') throw new Error(`Component "${label}" is missing an editor schema.`);
    if (!entry.defaultContent || !Array.isArray(entry.defaultContent.items)) throw new Error(`Component "${label}" is missing default content.`);
    if (!entry.defaultDesign || typeof entry.defaultDesign !== 'object') throw new Error(`Component "${label}" is missing default design values.`);
    if (!entry.defaultBehaviour || typeof entry.defaultBehaviour !== 'object') throw new Error(`Component "${label}" is missing default behaviour values.`);
    if (!entry.renderer || typeof entry.renderer.type !== 'string') throw new Error(`Component "${label}" is missing a renderer reference.`);
    if (typeof entry.renderer.generateHTML !== 'function' || typeof entry.renderer.generateCSS !== 'function' || typeof entry.renderer.generateJS !== 'function') {
      throw new Error(`Component "${label}" has an incomplete renderer (must implement generateHTML/generateCSS/generateJS).`);
    }
    if (!entry.exporter || typeof entry.exporter.type !== 'string') throw new Error(`Component "${label}" is missing an exporter reference.`);
    if (!entry.media || typeof entry.media.required !== 'boolean' || !Array.isArray(entry.media.kinds)) throw new Error(`Component "${label}" has invalid media requirements.`);
    if (typeof entry.accessibilitySupport !== 'boolean') throw new Error(`Component "${label}" is missing accessibility support status.`);
    if (typeof entry.completionSupport !== 'boolean') throw new Error(`Component "${label}" is missing completion support status.`);
    if (!STATUSES.includes(entry.status)) throw new Error(`Component "${label}" has an invalid status: "${entry.status}". Expected one of ${STATUSES.join(', ')}.`);
    if (!classificationIds.has(entry.classification)) throw new Error(`Component "${label}" has an unknown classification: "${entry.classification}". Expected one of ${[...classificationIds].join(', ')}.`);
    if (typeof entry.differentiator !== 'string' || !entry.differentiator.trim()) throw new Error(`Component "${label}" is missing a differentiator.`);

    // Next-Level metadata validations
    if (!tierIds.has(entry.tier)) throw new Error(`Component "${label}" has an invalid tier: "${entry.tier}". Expected one of ${[...tierIds].join(', ')}.`);
    if (!Array.isArray(entry.learningPurposes) || !entry.learningPurposes.length || !entry.learningPurposes.every(lp => validPurposes.has(lp))) {
      throw new Error(`Component "${label}" has invalid learning purposes. Must be non-empty array of valid purposes: ${LEARNING_PURPOSES.join(', ')}.`);
    }
    if (!validRecommendations.has(entry.riseRecommendation)) {
      throw new Error(`Component "${label}" has an invalid riseRecommendation: "${entry.riseRecommendation}".`);
    }
    if (typeof entry.riseRecommendationSummary !== 'string' || !entry.riseRecommendationSummary.trim()) {
      throw new Error(`Component "${label}" is missing a riseRecommendationSummary.`);
    }
    if (typeof entry.riseEquivalent !== 'string' || !entry.riseEquivalent.trim()) {
      throw new Error(`Component "${label}" is missing riseEquivalent metadata.`);
    }
    if (typeof entry.bestWhen !== 'string' || !entry.bestWhen.trim()) {
      throw new Error(`Component "${label}" is missing bestWhen guidance.`);
    }
    if (typeof entry.nativeRiseWhen !== 'string' || !entry.nativeRiseWhen.trim()) {
      throw new Error(`Component "${label}" is missing nativeRiseWhen guidance.`);
    }
    if (!Array.isArray(entry.keyCapabilities) || entry.keyCapabilities.length < 2) {
      throw new Error(`Component "${label}" must define at least 2 key capabilities.`);
    }
    if (!COMPLEXITY_LEVELS.includes(entry.complexity)) {
      throw new Error(`Component "${label}" has an invalid complexity: "${entry.complexity}".`);
    }
    if (typeof entry.accessibilitySummary !== 'string' || !entry.accessibilitySummary.trim()) {
      throw new Error(`Component "${label}" is missing an accessibilitySummary.`);
    }
    if (typeof entry.completionTracking !== 'string' || !entry.completionTracking.trim()) {
      throw new Error(`Component "${label}" is missing completionTracking guidance.`);
    }
    if (!entry.readiness || typeof entry.readiness.score !== 'number' || typeof entry.readiness.max !== 'number') {
      throw new Error(`Component "${label}" is missing a valid readiness score object.`);
    }
  });
  return true;
}

validateRegistry(COMPONENT_REGISTRY);

export function getCategoriesWithCounts(registry = COMPONENT_REGISTRY, categories = CATEGORIES) {
  return categories.map(category => ({
    ...category,
    count: registry.filter(entry => entry.categoryId === category.id).length
  }));
}

export function getTiersWithCounts(registry = COMPONENT_REGISTRY, tiers = TIERS) {
  return tiers.map(tier => ({
    ...tier,
    count: registry.filter(entry => entry.tier === tier.id).length
  }));
}

export function getLearningPurposesWithCounts(registry = COMPONENT_REGISTRY, purposes = LEARNING_PURPOSES) {
  return purposes.map(purpose => ({
    purpose,
    count: registry.filter(entry => (entry.learningPurposes || []).includes(purpose)).length
  }));
}

export function getComponentById(registry, idOrAlias) {
  if (!idOrAlias) return null;
  const target = String(idOrAlias).trim().toLowerCase();
  return registry.find(entry =>
    entry.id === idOrAlias ||
    entry.id.toLowerCase() === target ||
    entry.name.toLowerCase() === target ||
    (entry.aliases && entry.aliases.some(alias => alias.toLowerCase() === target))
  ) || null;
}

export function searchComponents(registry, query, categories = CATEGORIES, classifications = CLASSIFICATIONS) {
  if (!query) return registry;
  const needle = query.toLowerCase().trim();
  const categoryNameById = new Map(categories.map(category => [category.id, category.name]));
  const classificationNameById = new Map(classifications.map(classification => [classification.id, classification.name]));
  return registry.filter(entry =>
    entry.name.toLowerCase().includes(needle) ||
    entry.description.toLowerCase().includes(needle) ||
    entry.keywords.some(keyword => keyword.toLowerCase().includes(needle)) ||
    (categoryNameById.get(entry.categoryId) || '').toLowerCase().includes(needle) ||
    (classificationNameById.get(entry.classification) || '').toLowerCase().includes(needle) ||
    (entry.differentiator || '').toLowerCase().includes(needle) ||
    (entry.tier || '').toLowerCase().includes(needle) ||
    (entry.learningPurposes || []).some(lp => lp.toLowerCase().includes(needle)) ||
    (entry.riseEquivalent || '').toLowerCase().includes(needle) ||
    (entry.bestWhen || '').toLowerCase().includes(needle) ||
    (entry.riseRecommendationSummary || '').toLowerCase().includes(needle) ||
    (entry.keyCapabilities || []).some(cap => cap.toLowerCase().includes(needle))
  );
}

export function getDefaultConfig(entry) {
  return structuredClone({ ...entry.defaultDesign, ...entry.defaultBehaviour, ...entry.defaultContent });
}
