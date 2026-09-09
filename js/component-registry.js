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

// Catalog-positioning metadata (not to be confused with the "advanced" *category* above,
// a pre-existing and unrelated grouping) — lets an author tell at a glance whether a
// component maps onto a native Rise block Rise already offers (just with more branding/
// presentation/behaviour), or is a purpose-built interaction Rise has no single native
// equivalent for. Deliberately two IDs, not sharing the word "advanced" with CATEGORIES,
// so the two concepts never collide in code even though both surface in the same card.
export const CLASSIFICATIONS = [
  { id: 'enhanced', name: 'Enhanced Rise Alternative' },
  { id: 'custom', name: 'Advanced Custom Interaction' }
];

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

function fromModule(componentModule, { description, keywords, icon, status = 'production', classification, differentiator }) {
  const editorSchema = componentModule.editorSchema || getEditorSchema(componentModule.id);
  const { items, ...rest } = componentModule.defaultConfig;
  const defaultDesign = {};
  const defaultBehaviour = {};
  Object.entries(rest).forEach(([key, value]) => {
    if (key === 'iconStyle') defaultDesign[key] = value;
    else defaultBehaviour[key] = value;
  });
  return {
    id: componentModule.id,
    name: componentModule.name,
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
    // Catalog-positioning metadata (see CLASSIFICATIONS above) — required for every
    // component, enforced by validateRegistry() below so a future addition can't ship
    // without it.
    classification,
    differentiator
  };
}

export const COMPONENT_REGISTRY = [
  fromModule(accordion, {
    description: 'Collapsible vertically stacked headers. Best for structured concepts, FAQs, and expanding key details.',
    keywords: ['collapsible', 'faq', 'dropdown', 'expandable', 'stacked headers'],
    icon: getAttIconSvg('list', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds branded styling, flexible panel behaviour, and richer content presentation.'
  }),
  fromModule(flipCards, {
    description: 'Interactive double-sided cards that flip on click. Great for definitions, vocabulary, and card drills.',
    keywords: ['flashcards', 'vocabulary', 'definitions', '3d', 'double-sided'],
    icon: getAttIconSvg('question-circle-filled', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds animated 3D presentation and customizable double-sided card layouts.'
  }),
  fromModule(tabs, {
    description: 'Clean tabbed layout switching content panels horizontally. Perfect for organizing multi-step topics.',
    keywords: ['tabs', 'panels', 'horizontal', 'sections'],
    icon: getAttIconSvg('folder', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds branded tab navigation and flexible multi-panel presentation.'
  }),
  fromModule(hotspots, {
    description: 'Place interactive click indicators over custom images to reveal explanatory tooltips and annotations.',
    keywords: ['image map', 'tooltip', 'annotations', 'clickable points'],
    icon: getAttIconSvg('hotspot', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds customizable markers, tooltip presentation, and branded image exploration.'
  }),
  fromModule(buttonList, {
    description: 'Curated list of customized buttons directing learners to external resources or course milestones.',
    keywords: ['links', 'buttons', 'resources', 'navigation'],
    icon: getAttIconSvg('open-new', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds curated resource presentation and more flexible button styling.'
  }),
  fromModule(menuList, {
    description: 'Expandable sub-lesson links or glossary panels designed to sit natively inside your custom Rise blocks.',
    keywords: ['menu', 'drawer', 'glossary', 'sub-lesson'],
    icon: getAttIconSvg('message-3', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Adds an expandable in-block navigation or reference panel.'
  }),
  fromModule(multipleChoice, {
    description: 'Self-correcting interactive knowledge check card. Supports feedback answers and custom status.',
    keywords: ['quiz', 'knowledge check', 'single answer', 'assessment'],
    icon: getAttIconSvg('check-circle-filled', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds customizable question-card presentation and feedback styling.'
  }),
  fromModule(multipleSelect, {
    description: 'Select-all-that-apply knowledge check where more than one answer option can be correct.',
    keywords: ['quiz', 'select all', 'checkbox', 'assessment'],
    icon: getAttIconSvg('check-circle', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds branded select-all-that-apply interactions and feedback.'
  }),
  fromModule(sortingActivity, {
    description: 'Let learners sort concept cards into category columns with instant matching indicator flags.',
    keywords: ['drag and drop', 'categorize', 'sorting', 'matching'],
    icon: getAttIconSvg('arrows-vertical-1', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds visual category columns and instant matching indicators.'
  }),
  fromModule(fillBlank, {
    description: 'Interactive sentence checks. Great for verification of terminology, syntax, or statements.',
    keywords: ['cloze', 'fill in the blank', 'terminology', 'sentence'],
    icon: getAttIconSvg('pencil', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds customizable sentence-based practice and feedback presentation.'
  }),
  fromModule(verticalTimeline, {
    description: 'Elegant step indicators moving vertically. Designed with micro-animations on scroll/click.',
    keywords: ['timeline', 'steps', 'vertical', 'milestones'],
    icon: getAttIconSvg('clock', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds animated vertical progression and branded step presentation.'
  }),
  fromModule(horizontalTimeline, {
    description: 'Interactive slider card demonstrating chronological milestones, histories, or developmental processes.',
    keywords: ['timeline', 'journey map', 'history', 'slider'],
    icon: getAttIconSvg('arrow-right', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Presents milestones as an interactive horizontal journey.'
  }),
  fromModule(processFlow, {
    description: 'Process block that hides future steps until the learner clicks "Next Step" to progress.',
    keywords: ['process', 'steps', 'next step', 'workflow'],
    icon: getAttIconSvg('step-forward', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Reveals a process progressively and controls when future steps appear.'
  }),
  fromModule(scenario, {
    description: 'Interactive mini-simulation where learner selections route to customized response dialogue paths.',
    keywords: ['branching scenario', 'simulation', 'decision', 'dialogue'],
    icon: getAttIconSvg('message-2', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Routes learners through customized decision and response paths.'
  }),
  fromModule(profileCards, {
    description: 'Two-column interactive biography grids. Great for team intros, characters, or subject-matter experts.',
    keywords: ['team', 'bio', 'profile', 'people grid'],
    icon: getAttIconSvg('person', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Presents people, roles, experts, or characters in a purpose-built profile layout.'
  }),
  fromModule(infoGrid, {
    description: 'A flexible cards layout with beautiful SVG icons, description headers, and rounded card styling.',
    keywords: ['info cards', 'icons', 'grid layout', 'features'],
    icon: getAttIconSvg('grid', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Creates flexible branded information cards with icons and descriptions.'
  }),
  fromModule(pricingComparison, {
    description: 'Interactive table matrix cards highlighting differences in programs, paths, or pricing packages.',
    keywords: ['pricing', 'comparison table', 'plans', 'matrix'],
    icon: getAttIconSvg('tag', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Provides a purpose-built visual comparison of products, paths, or programs.'
  }),
  fromModule(audioPlayer, {
    description: 'Audio player with chapters, a synchronized transcript, resume/progress tracking, and key takeaways — Compact, Learning, or Podcast presentation.',
    keywords: ['audio', 'podcast', 'transcript', 'player', 'chapters', 'takeaways', 'resume'],
    icon: getAttIconSvg('volume-3', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Adds chapters, synchronized transcript, resume, progress, and takeaways.'
  }),
  fromModule(videoFrame, {
    description: 'Video player with chapters, a synchronized transcript, resume/progress tracking, and key takeaways — custom overlay controls, captions, and audio description.',
    keywords: ['video', 'embed', 'captions', 'player', 'chapters', 'takeaways', 'resume'],
    icon: getAttIconSvg('play', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Adds chapters, transcript, resume, captions, and enhanced playback controls.'
  }),
  fromModule(imageGallery, {
    description: 'Responsive photo gallery with beautiful modal popups and image detail descriptions.',
    keywords: ['gallery', 'photos', 'modal', 'grid'],
    icon: getAttIconSvg('photo-gallery', { width: 24, height: 24, ariaHidden: true }),
    classification: 'enhanced',
    differentiator: 'Adds responsive image grids, detailed descriptions, and modal viewing.'
  }),
  fromModule(interactiveVideo, {
    description: 'Video with timestamp-based information and multiple-choice markers. Pauses at each marker, records learner progress, and resumes on your terms.',
    keywords: ['video', 'interactive video', 'markers', 'timeline', 'knowledge check', 'pause'],
    status: 'beta',
    icon: getAttIconSvg('information-circle-filled', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Adds timestamp-based information and question markers with progress persistence.'
  }),
  fromModule(comparisonSlider, {
    description: 'Interactive before-and-after visual split-view slider with keyboard support, smooth touch drag, and responsive badges.',
    keywords: ['comparison', 'slider', 'before and after', 'split view', 'difference', 'visual comparison'],
    icon: getAttIconSvg('arrows-horizontal', { width: 24, height: 24, ariaHidden: true }),
    classification: 'custom',
    differentiator: 'Interactive split-view comparison with touch drag, keyboard accessibility, and completion tracking.'
  })
];

const STATUSES = ['production', 'beta', 'experimental'];

export function validateRegistry(registry, categories = CATEGORIES, classifications = CLASSIFICATIONS) {
  if (!Array.isArray(registry) || !registry.length) throw new Error('Component registry must be a non-empty array.');
  const categoryIds = new Set(categories.map(category => category.id));
  const classificationIds = new Set(classifications.map(classification => classification.id));
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

export function getComponentById(registry, id) {
  return registry.find(entry => entry.id === id) || null;
}

export function searchComponents(registry, query, categories = CATEGORIES, classifications = CLASSIFICATIONS) {
  if (!query) return registry;
  const needle = query.toLowerCase();
  const categoryNameById = new Map(categories.map(category => [category.id, category.name]));
  const classificationNameById = new Map(classifications.map(classification => [classification.id, classification.name]));
  return registry.filter(entry =>
    entry.name.toLowerCase().includes(needle) ||
    entry.description.toLowerCase().includes(needle) ||
    entry.keywords.some(keyword => keyword.toLowerCase().includes(needle)) ||
    (categoryNameById.get(entry.categoryId) || '').toLowerCase().includes(needle) ||
    (classificationNameById.get(entry.classification) || '').toLowerCase().includes(needle) ||
    (entry.differentiator || '').toLowerCase().includes(needle));
}

export function getDefaultConfig(entry) {
  return structuredClone({ ...entry.defaultDesign, ...entry.defaultBehaviour, ...entry.defaultContent });
}
