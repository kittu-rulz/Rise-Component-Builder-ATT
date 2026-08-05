import { getEditorSchema } from './editor-schemas.js';
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
import * as aiGenerator from '../components/ai-generator.js';
import * as aiQuizMaker from '../components/ai-quiz-maker.js';

export const CATEGORIES = [
  { id: 'interactive', name: 'Interactive' },
  { id: 'navigation', name: 'Navigation' },
  { id: 'knowledge', name: 'Knowledge Checks' },
  { id: 'timelines', name: 'Timelines' },
  { id: 'process', name: 'Process Flows' },
  { id: 'cards', name: 'Cards & Layouts' },
  { id: 'media', name: 'Media Blocks' },
  { id: 'ai', name: 'AI Components' }
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

function fromModule(componentModule, { description, keywords, icon, status = 'production' }) {
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
    status
  };
}

export const COMPONENT_REGISTRY = [
  fromModule(accordion, {
    description: 'Collapsible vertically stacked headers. Best for structured concepts, FAQs, and expanding key details.',
    keywords: ['collapsible', 'faq', 'dropdown', 'expandable', 'stacked headers'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line><polyline points="18 4 21 6 18 8"></polyline><polyline points="18 10 21 12 18 14"></polyline><polyline points="18 16 21 18 18 20"></polyline></svg>'
  }),
  fromModule(flipCards, {
    description: 'Interactive double-sided cards that flip on click. Great for definitions, vocabulary, and card drills.',
    keywords: ['flashcards', 'vocabulary', 'definitions', '3d', 'double-sided'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"></rect><rect x="14" y="3" width="7" height="18" rx="1"></rect></svg>'
  }),
  fromModule(tabs, {
    description: 'Clean tabbed layout switching content panels horizontally. Perfect for organizing multi-step topics.',
    keywords: ['tabs', 'panels', 'horizontal', 'sections'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="3" x2="9" y2="9"></line></svg>'
  }),
  fromModule(hotspots, {
    description: 'Place interactive click indicators over custom images to reveal explanatory tooltips and annotations.',
    keywords: ['image map', 'tooltip', 'annotations', 'clickable points'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line><line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line></svg>'
  }),
  fromModule(buttonList, {
    description: 'Curated list of customized buttons directing learners to external resources or course milestones.',
    keywords: ['links', 'buttons', 'resources', 'navigation'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect><line x1="3" y1="12" x2="21" y2="12"></line></svg>'
  }),
  fromModule(menuList, {
    description: 'Expandable sub-lesson links or glossary panels designed to sit natively inside your custom Rise blocks.',
    keywords: ['menu', 'drawer', 'glossary', 'sub-lesson'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>'
  }),
  fromModule(multipleChoice, {
    description: 'Self-correcting interactive knowledge check card. Supports feedback answers and custom status.',
    keywords: ['quiz', 'knowledge check', 'single answer', 'assessment'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 12l2 2 4-4"></path></svg>'
  }),
  fromModule(multipleSelect, {
    description: 'Select-all-that-apply knowledge check where more than one answer option can be correct.',
    keywords: ['quiz', 'select all', 'checkbox', 'assessment'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><path d="M5 6.5l1 1 2-2"></path><rect x="14" y="3" width="7" height="7" rx="1"></rect><path d="M16 6.5l1 1 2-2"></path><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>'
  }),
  fromModule(sortingActivity, {
    description: 'Let learners sort concept cards into category columns with instant matching indicator flags.',
    keywords: ['drag and drop', 'categorize', 'sorting', 'matching'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>'
  }),
  fromModule(fillBlank, {
    description: 'Interactive sentence checks. Great for verification of terminology, syntax, or statements.',
    keywords: ['cloze', 'fill in the blank', 'terminology', 'sentence'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="18" x2="19" y2="18"></line><line x1="5" y1="6" x2="19" y2="6"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
  }),
  fromModule(verticalTimeline, {
    description: 'Elegant step indicators moving vertically. Designed with micro-animations on scroll/click.',
    keywords: ['timeline', 'steps', 'vertical', 'milestones'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><circle cx="12" cy="5" r="3"></circle><circle cx="12" cy="12" r="3"></circle><circle cx="12" cy="19" r="3"></circle></svg>'
  }),
  fromModule(horizontalTimeline, {
    description: 'Interactive slider card demonstrating chronological milestones, histories, or developmental processes.',
    keywords: ['timeline', 'journey map', 'history', 'slider'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><circle cx="5" cy="12" r="3"></circle><circle cx="12" cy="12" r="3"></circle><circle cx="19" cy="12" r="3"></circle></svg>'
  }),
  fromModule(processFlow, {
    description: 'Process block that hides future steps until the learner clicks "Next Step" to progress.',
    keywords: ['process', 'steps', 'next step', 'workflow'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>'
  }),
  fromModule(scenario, {
    description: 'Interactive mini-simulation where learner selections route to customized response dialogue paths.',
    keywords: ['branching scenario', 'simulation', 'decision', 'dialogue'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>'
  }),
  fromModule(profileCards, {
    description: 'Two-column interactive biography grids. Great for team intros, characters, or subject-matter experts.',
    keywords: ['team', 'bio', 'profile', 'people grid'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>'
  }),
  fromModule(infoGrid, {
    description: 'A flexible cards layout with beautiful SVG icons, description headers, and rounded card styling.',
    keywords: ['info cards', 'icons', 'grid layout', 'features'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>'
  }),
  fromModule(pricingComparison, {
    description: 'Interactive table matrix cards highlighting differences in programs, paths, or pricing packages.',
    keywords: ['pricing', 'comparison table', 'plans', 'matrix'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>'
  }),
  fromModule(audioPlayer, {
    description: 'Minimalist customized audio player block showing transcription texts and timeline seek bars.',
    keywords: ['audio', 'podcast', 'transcript', 'player'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>'
  }),
  fromModule(videoFrame, {
    description: 'Sleek video player frame featuring custom overlay buttons and chapters list overlays.',
    keywords: ['video', 'embed', 'captions', 'player'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><polygon points="10 8 16 11.5 10 15 10 8"></polygon></svg>'
  }),
  fromModule(imageGallery, {
    description: 'Responsive photo gallery with beautiful modal popups and image detail descriptions.',
    keywords: ['gallery', 'photos', 'modal', 'grid'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'
  }),
  fromModule(aiGenerator, {
    description: 'Generate complete multi-decision branching scenario blocks powered by AI within seconds.',
    keywords: ['ai', 'scenario generator', 'branching', 'automated'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline><polyline points="7.5 19.79 12 17.19 16.5 19.79"></polyline><polyline points="7.5 12 12 14.6 16.5 12"></polyline></svg>',
    status: 'experimental'
  }),
  fromModule(aiQuizMaker, {
    description: 'Prompt an assessment topic and generate comprehensive mock quiz question structures instantly.',
    keywords: ['ai', 'quiz generator', 'assessment', 'automated'],
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
    status: 'experimental'
  })
];

const STATUSES = ['production', 'beta', 'experimental'];

export function validateRegistry(registry, categories = CATEGORIES) {
  if (!Array.isArray(registry) || !registry.length) throw new Error('Component registry must be a non-empty array.');
  const categoryIds = new Set(categories.map(category => category.id));
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

export function searchComponents(registry, query) {
  if (!query) return registry;
  const needle = query.toLowerCase();
  return registry.filter(entry =>
    entry.name.toLowerCase().includes(needle) ||
    entry.description.toLowerCase().includes(needle) ||
    entry.keywords.some(keyword => keyword.toLowerCase().includes(needle)));
}

export function getDefaultConfig(entry) {
  return structuredClone({ ...entry.defaultDesign, ...entry.defaultBehaviour, ...entry.defaultContent });
}
