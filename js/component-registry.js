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
import * as interactiveVideo from '../components/interactive-video.js';

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
    icon: '<svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><rect x="3" y="6" width="2" height="2"/><rect x="8" y="6" width="21" height="2"/><rect x="8" y="24.1" width="21" height="2"/><rect x="8" y="15" width="21" height="2"/><rect x="3" y="15" width="2" height="2"/><rect x="3" y="24" width="2" height="2"/></svg>'
  }),
  fromModule(flipCards, {
    description: 'Interactive double-sided cards that flip on click. Great for definitions, vocabulary, and card drills.',
    keywords: ['flashcards', 'vocabulary', 'definitions', '3d', 'double-sided'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><rect x="25" y="44" width="60" height="8" fill="#009FDB"/><g><path d="M84 35 26 35C22.7 35 20 37.7 20 41L20 76C20 79.3 22.7 82 26 82L84 82C87.3 82 90 79.3 90 76L90 41C90 37.7 87.3 35 84 35ZM88 76C88 78.2 86.2 80 84 80L26 80C23.8 80 22 78.2 22 76L22 41C22 38.8 23.8 37 26 37L84 37C86.2 37 88 38.8 88 41L88 76Z"/><path d="M8.7 32.9C9.2 32 10.1 31.3 11.1 31L64.7 15.2C65.7 14.9 66.8 15 67.7 15.5 68.6 16 69.3 16.9 69.6 17.9L73.9 32.4 75.8 31.8 71.5 17.3C71 15.8 70 14.5 68.6 13.7 67.2 12.9 65.6 12.8 64 13.2L10.6 29.1C9 29.5 7.8 30.5 7 31.9 6.2 33.3 6.1 34.9 6.5 36.5L15 65.3 16.9 64.7 8.4 35.9C8.1 34.9 8.2 33.8 8.7 32.9Z"/><rect x="28" y="70" width="18" height="2"/><rect x="28" y="64" width="10" height="2"/></g></g></svg>'
  }),
  fromModule(tabs, {
    description: 'Clean tabbed layout switching content panels horizontally. Perfect for organizing multi-step topics.',
    keywords: ['tabs', 'panels', 'horizontal', 'sections'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><rect x="13" y="43" width="14" height="2" fill="#009FDB"/><path d="M74 40.2 58 49 58 42C58 38.7 55.3 36 52 36L12 36C8.7 36 6 38.7 6 42L6 74C6 77.3 8.7 80 12 80L52 80C55.3 80 58 77.3 58 74L58 67 74 75.8 74 40.2ZM56 74C56 76.2 54.2 78 52 78L12 78C9.8 78 8 76.2 8 74L8 42C8 39.8 9.8 38 12 38L52 38C54.2 38 56 39.8 56 42L56 74ZM72 72.5 58 64.8 58 51.2 72 43.5 72 72.5Z"/><rect x="29" y="23" width="14" height="2" fill="#009FDB"/><path d="M74 29 74 22C74 18.7 71.3 16 68 16L28 16C24.7 16 22 18.7 22 22L22 33 24 33 24 22C24 19.8 25.8 18 28 18L68 18C70.2 18 72 19.8 72 22L72 37 74 37 74 31.2 88 23.5 88 52.4 78 46.9 77 48.7 90 55.9 90 20.2 74 29Z"/></g></svg>'
  }),
  fromModule(hotspots, {
    description: 'Place interactive click indicators over custom images to reveal explanatory tooltips and annotations.',
    keywords: ['image map', 'tooltip', 'annotations', 'clickable points'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><g><path d="M48 52C40.8 52 35 46.2 35 39 35 31.8 40.8 26 48 26 55.2 26 61 31.8 61 39 61 46.2 55.2 52 48 52ZM48 28C41.9 28 37 32.9 37 39 37 45.1 41.9 50 48 50 54.1 50 59 45.1 59 39 59 32.9 54.1 28 48 28Z" fill="#009FDB"/></g><g><path d="M48 86.6 47.3 85.9C47.2 85.8 40.6 79.2 34 69.9 25.1 57.4 20.6 46.3 20.6 37 20.6 22 32.9 9.8 48 9.8 63.1 9.8 75.4 22 75.4 37.1 75.4 46.4 70.9 57.4 62 70 55.4 79.3 48.7 85.9 48.7 86L48 86.6ZM48 11.8C34 11.8 22.6 23.1 22.6 37.1 22.6 56.3 43.9 79.5 48 83.8 52.2 79.4 73.4 56.3 73.4 37.1 73.4 23.1 62 11.8 48 11.8Z"/></g></g></svg>'
  }),
  fromModule(buttonList, {
    description: 'Curated list of customized buttons directing learners to external resources or course milestones.',
    keywords: ['links', 'buttons', 'resources', 'navigation'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><g><path d="M51.8 62.2C47 62.2 42.5 60.3 39.1 56.9 35.7 53.5 33.8 49 33.8 44.2L35.8 44.2C35.8 48.5 37.5 52.5 40.5 55.5 46.7 61.7 56.9 61.7 63.1 55.5L78 40.6C84.2 34.4 84.2 24.2 78 18 71.8 11.8 61.6 11.8 55.4 18L41.6 31.7 40.2 30.3 54 16.6C57.4 13.2 61.9 11.3 66.7 11.3 71.5 11.3 76 13.2 79.4 16.6 86.4 23.6 86.4 35 79.4 42L64.5 56.9C61.1 60.3 56.6 62.2 51.8 62.2Z" fill="#009FDB"/></g><g><path d="M29.3 84.7C24.5 84.7 20 82.8 16.6 79.4 9.6 72.4 9.6 61 16.6 54L31.4 39.2C34.8 35.8 39.3 33.9 44.1 33.9 48.9 33.9 53.4 35.8 56.8 39.2 60.2 42.6 62.1 47.1 62.1 51.9L60.1 51.9C60.1 47.6 58.4 43.6 55.4 40.6 49.2 34.4 39 34.4 32.8 40.6L18 55.4C11.8 61.6 11.8 71.8 18 78 24.2 84.2 34.4 84.2 40.6 78L55 63.6 56.4 65 42 79.4C38.6 82.8 34.1 84.7 29.3 84.7Z"/></g></g></svg>'
  }),
  fromModule(menuList, {
    description: 'Expandable sub-lesson links or glossary panels designed to sit natively inside your custom Rise blocks.',
    keywords: ['menu', 'drawer', 'glossary', 'sub-lesson'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><g><path d="M48 86C27 86 10 69 10 48 10 27 27 10 48 10 69 10 86 27 86 48 86 69 69 86 48 86ZM48 12C28.1 12 12 28.1 12 48 12 67.9 28.1 84 48 84 67.9 84 84 67.9 84 48 84 28.1 67.9 12 48 12Z"/></g><g><rect x="28" y="34" width="40" height="2" fill="#009FDB"/></g><g><rect x="28" y="60" width="40" height="2" fill="#009FDB"/></g><g><rect x="28" y="47" width="40" height="2" fill="#009FDB"/></g></g></svg>'
  }),
  fromModule(multipleChoice, {
    description: 'Self-correcting interactive knowledge check card. Supports feedback answers and custom status.',
    keywords: ['quiz', 'knowledge check', 'single answer', 'assessment'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><g><g><path d="M48 86C27 86 10 69 10 48 10 27 27 10 48 10 69 10 86 27 86 48 86 69 69 86 48 86ZM48 12C28.1 12 12 28.1 12 48 12 67.9 28.1 84 48 84 67.9 84 84 67.9 84 48 84 28.1 67.9 12 48 12Z"/></g></g><g><g><path d="M48 86C27 86 10 69 10 48 10 27 27 10 48 10 69 10 86 27 86 48 86 69 69 86 48 86ZM48 12C28.1 12 12 28.1 12 48 12 67.9 28.1 84 48 84 67.9 84 84 67.9 84 48 84 28.1 67.9 12 48 12Z"/></g></g><g><path d="M42 61.4 29.3 48.7 30.7 47.3 42 58.6 65.3 35.3 66.7 36.7Z" fill="#009FDB"/></g></g></svg>'
  }),
  fromModule(multipleSelect, {
    description: 'Select-all-that-apply knowledge check where more than one answer option can be correct.',
    keywords: ['quiz', 'select all', 'checkbox', 'assessment'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><g><rect x="30" y="43" width="4" height="4" fill="#009FDB"/><rect x="30" y="56" width="4" height="4" fill="#009FDB"/><rect x="30" y="69" width="4" height="4" fill="#009FDB"/></g><g><rect x="37" y="44" width="29" height="2"/><rect x="37" y="57" width="29" height="2"/><rect x="37" y="70" width="29" height="2"/><path d="M56.4 10 24 10C20.7 10 18 12.7 18 16L18 80C18 83.3 20.7 86 24 86L72 86C75.3 86 78 83.3 78 80L78 31.6 56.4 10ZM57 13.4 74.6 31 61 31C58.8 31 57 29.2 57 27L57 13.4ZM72 84 24 84C21.8 84 20 82.2 20 80L20 16C20 13.8 21.8 12 24 12L55 12 55 27C55 30.3 57.7 33 61 33L76 33 76 80C76 82.2 74.2 84 72 84Z"/></g></g></svg>'
  }),
  fromModule(sortingActivity, {
    description: 'Let learners sort concept cards into category columns with instant matching indicator flags.',
    keywords: ['drag and drop', 'categorize', 'sorting', 'matching'],
    icon: '<svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><path d="M9.6 19.6C8.3 21.2 6.5 22 4.7 22L1 22 1 24 4.7 24C7.1 24 9.4 22.9 11.1 20.9L12.6 19.1 11.1 17.8 9.6 19.6Z"/><path d="M23.9 18.8 27.1 22 23.3 22C21.5 22 19.7 21.2 18.4 19.6L15.3 16 18.4 12.4C19.7 10.9 21.5 10 23.3 10L27.1 10 23.9 13.2 25.3 14.6 31 9 25.3 3.3 23.9 4.7 27.1 8 23.3 8C20.9 8 18.6 9.1 16.9 11.1L14 14.5 11.1 11.1C9.4 9.1 7.1 8 4.7 8L1 8 1 10 4.7 10C6.5 10 8.3 10.8 9.6 12.4L16.9 20.9C18.6 22.9 20.9 24 23.3 24L27.1 24 23.9 27.2 25.3 28.6 31 23 25.3 17.3 23.9 18.8Z"/></g></svg>'
  }),
  fromModule(fillBlank, {
    description: 'Interactive sentence checks. Great for verification of terminology, syntax, or statements.',
    keywords: ['cloze', 'fill in the blank', 'terminology', 'sentence'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><path d="M67.2 61.2 52 56.5 52 44C52 41.8 50.2 40 48 40 45.8 40 44 41.8 44 44L44 65.1 40.9 62C39.5 60.6 38 59.9 36.5 59.9L36.5 59.9C34.9 59.9 33.3 60.7 31.9 62.2L31.3 62.8 44 83.3 44 90 70 90 70 65C70 63.2 68.9 61.7 67.2 61.2ZM33.8 63C35.7 61.4 37.6 61.5 39.5 63.4L46 70 46 44C46 42.9 46.9 42 48 42 49.1 42 50 42.9 50 44L50 58 66.6 63.1C67.4 63.4 68 64.1 68 65L68 82 45.5 82 33.8 63ZM46 88 46 84 68 84 68 88 46 88Z"/><rect x="47" y="18" width="2" height="15" fill="#009FDB"/><rect x="47" y="35" width="2" height="2" fill="#009FDB"/><path d="M48 6C35.3 6 25 16.3 25 29 25 38.8 31.2 47.5 40.4 50.7L41.1 48.8C32.7 45.9 27 37.9 27 29 27 17.4 36.4 8 48 8 59.6 8 69 17.4 69 29 69 37.9 63.3 45.9 54.9 48.8L55.6 50.7C64.8 47.5 71 38.8 71 29 71 16.3 60.7 6 48 6Z" fill="#009FDB"/></g></svg>'
  }),
  fromModule(verticalTimeline, {
    description: 'Elegant step indicators moving vertically. Designed with micro-animations on scroll/click.',
    keywords: ['timeline', 'steps', 'vertical', 'milestones'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><g><path d="M57.3 58.3 47 48 47 30 49 30 49 47.2 58.7 56.9Z" fill="#009FDB"/></g><path d="M48 10C33.6 10 20.4 18.2 14 31.1L14 19 12 19 12 34 27 34 27 32 15.8 32C21.8 19.8 34.3 12 48 12 67.9 12 84 28.1 84 48 84 67.9 67.9 84 48 84 28.1 84 12 67.9 12 48L10 48C10 69 27 86 48 86 69 86 86 69 86 48 86 27 69 10 48 10Z"/></g></svg>'
  }),
  fromModule(horizontalTimeline, {
    description: 'Interactive slider card demonstrating chronological milestones, histories, or developmental processes.',
    keywords: ['timeline', 'journey map', 'history', 'slider'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><path d="M69 32 69 34 80.59 34 58 56.59 43 41.59 20.29 64.29 21.71 65.71 43 44.41 58 59.41 82 35.41 82 47 84 47 84 32Z" fill="#009FDB"/><g><path d="M86 86 16 86C12.69 86 10 83.31 10 80L10 10 12 10 12 80C12 82.21 13.79 84 16 84L86 84 86 86Z"/></g></g></svg>'
  }),
  fromModule(processFlow, {
    description: 'Process block that hides future steps until the learner clicks "Next Step" to progress.',
    keywords: ['process', 'steps', 'next step', 'workflow'],
    icon: '<svg width="24" height="24" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M62.01 32.17C62.01 39.24 56.25 45 49.18 45L46.01 45 46.01 43 49.18 43C55.15 43 60.01 38.14 60.01 32.17 60.01 27.73 57.34 23.79 53.22 22.13L52.69 21.92 52.6 21.36C51.88 16.73 47.95 13.37 43.27 13.37 41.89 13.37 40.55 13.67 39.28 14.26L38.34 14.7 37.93 13.75C35.74 8.63 30.73 5.32 25.16 5.32 17.51 5.32 11.28 11.55 11.28 19.2 11.28 19.76 11.32 20.35 11.42 21.07L11.52 21.84 10.8 22.13C6.67 23.79 4 27.73 4 32.18 4.01 38.15 8.86 43 14.83 43L18 43 18 45 14.83 45C7.76 45 2.01 39.25 2.01 32.17 2.01 27.16 4.87 22.69 9.36 20.57 9.31 20.08 9.29 19.63 9.29 19.19 9.29 10.43 16.41 3.31 25.17 3.31 31.2 3.31 36.67 6.71 39.36 12.05 40.62 11.59 41.93 11.35 43.27 11.35 48.76 11.35 53.39 15.16 54.48 20.48 59.07 22.58 62.01 27.1 62.01 32.17ZM31.96 35.44 33.42 36.81 37 32.98 37 60 39 60 39 32.85 42.98 36.83 44.39 35.42 37.98 29 31.96 35.44ZM27 56.2 27 29.01 25 29.01 25 56.2 21.2 52.4 19.79 53.81 26 60.03 32.21 53.82 30.8 52.4 27 56.2Z"/></svg>'
  }),
  fromModule(scenario, {
    description: 'Interactive mini-simulation where learner selections route to customized response dialogue paths.',
    keywords: ['branching scenario', 'simulation', 'decision', 'dialogue'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><path d="M23 87.6 23 72 15 72C11.7 72 9 69.3 9 66L9 18C9 14.7 11.7 12 15 12L81 12C84.3 12 87 14.7 87 18L87 66C87 69.3 84.3 72 81 72L41.7 72 23 87.6ZM15 14C12.8 14 11 15.8 11 18L11 66C11 68.2 12.8 70 15 70L25 70 25 83.4 41 70 81 70C83.2 70 85 68.2 85 66L85 18C85 15.8 83.2 14 81 14L15 14Z"/><path d="M60.7 30.7 59.3 29.3 48 40.6 36.7 29.3 35.3 30.7 46.6 42 35.3 53.3 36.7 54.7 48 43.4 59.3 54.7 60.7 53.3 49.4 42Z" fill="#009FDB"/></g></svg>'
  }),
  fromModule(profileCards, {
    description: 'Two-column interactive biography grids. Great for team intros, characters, or subject-matter experts.',
    keywords: ['team', 'bio', 'profile', 'people grid'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><path d="M53.2 56.4C56.8 54.5 59.2 50.8 59.2 46.5 59.2 40.3 54.2 35.3 48 35.3 41.8 35.3 36.8 40.3 36.8 46.5 36.8 50.8 39.2 54.6 42.8 56.4 34.8 58.6 29 65.7 29 74.1L29 78 31 78 31 74.1C31 65 38.6 57.6 48 57.6 57.4 57.6 65 65 65 74.1L65 78 67 78 67 74.1C67 65.7 61.1 58.6 53.2 56.4ZM38.8 46.4C38.8 41.3 42.9 37.2 48 37.2 53.1 37.2 57.2 41.3 57.2 46.4 57.2 51.5 53.1 55.6 48 55.6 42.9 55.6 38.8 51.5 38.8 46.4Z" fill="#009FDB"/><g><path d="M36.2 28.4C36.2 22.2 31.2 17.2 25 17.2 18.8 17.2 13.8 22.2 13.8 28.4 13.8 32.7 16.2 36.5 19.8 38.3 11.9 40.6 6 47.7 6 56.1L6 60 8 60 8 56.1C8 47 15.6 39.6 25 39.6 28.4 39.6 31.7 40.6 34.5 42.4L35.6 40.7C33.9 39.6 32.1 38.8 30.2 38.3 33.7 36.5 36.2 32.7 36.2 28.4ZM25 37.6C19.9 37.6 15.8 33.5 15.8 28.4 15.8 23.3 19.9 19.2 25 19.2 30.1 19.2 34.2 23.3 34.2 28.4 34.2 33.5 30.1 37.6 25 37.6Z"/><path d="M76.2 38.4C79.8 36.5 82.2 32.8 82.2 28.5 82.2 22.3 77.2 17.3 71 17.3 64.8 17.3 59.8 22.3 59.8 28.5 59.8 32.8 62.2 36.6 65.8 38.4 63.9 38.9 62.1 39.7 60.4 40.8L61.5 42.5C64.3 40.7 67.6 39.7 71 39.7 80.4 39.7 88 47.1 88 56.2L88 60 90 60 90 56.1C90 47.7 84.1 40.6 76.2 38.4ZM61.8 28.4C61.8 23.3 65.9 19.2 71 19.2 76.1 19.2 80.2 23.3 80.2 28.4 80.2 33.5 76.1 37.6 71 37.6 65.9 37.6 61.8 33.5 61.8 28.4Z"/></g></g></svg>'
  }),
  fromModule(infoGrid, {
    description: 'A flexible cards layout with beautiful SVG icons, description headers, and rounded card styling.',
    keywords: ['info cards', 'icons', 'grid layout', 'features'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><g><path d="M42 42 11 42 11 17C11 13.7 13.7 11 17 11L42 11 42 42ZM13 40 40 40 40 13 17 13C14.8 13 13 14.8 13 17L13 40Z"/></g><g><path d="M85 42 54 42 54 11 79 11C82.3 11 85 13.7 85 17L85 42ZM56 40 83 40 83 17C83 14.8 81.2 13 79 13L56 13 56 40Z" fill="#009FDB"/></g><g><path d="M42 85 17 85C13.7 85 11 82.3 11 79L11 54 42 54 42 85ZM13 56 13 79C13 81.2 14.8 83 17 83L40 83 40 56 13 56Z"/></g><g><path d="M79 85 54 85 54 54 85 54 85 79C85 82.3 82.3 85 79 85ZM56 83 79 83C81.2 83 83 81.2 83 79L83 56 56 56 56 83Z"/></g></g></svg>'
  }),
  fromModule(pricingComparison, {
    description: 'Interactive table matrix cards highlighting differences in programs, paths, or pricing packages.',
    keywords: ['pricing', 'comparison table', 'plans', 'matrix'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><path d="M84 41 81.8 41C80.8 34.8 75.5 30 69 30L27 30C20.5 30 15.1 34.8 14.2 41L12 41C8.7 41 6 43.7 6 47L6 49C6 52.3 8.7 55 12 55L14.2 55C15.2 61.2 20.5 66 27 66L35.5 66C38 66 40.3 64.4 41.2 62L43.8 54.6C44.4 53 45.9 51.9 47.6 51.9L48.6 51.9C50.3 51.9 51.8 53 52.4 54.6L55 62C55.8 64.2 58.3 66 60.7 66L69 66C75.5 66 80.9 61.2 81.8 55L84 55C87.3 55 90 52.3 90 49L90 47C90 43.7 87.3 41 84 41ZM12 53C9.8 53 8 51.2 8 49L8 47C8 44.8 9.8 43 12 43L14 43 14 53 12 53ZM80 53C80 59.1 75.1 64 69 64L60.5 64C59 64 57.2 62.8 56.7 61.3L54.1 54C53.2 51.6 51 50 48.4 50L47.4 50C44.9 50 42.6 51.6 41.7 54L39.1 61.4C38.5 63 37 64.1 35.3 64.1L27 64.1C20.9 64.1 16 59.2 16 53.1L16 43C16 36.9 20.9 32 27 32L69 32C75.1 32 80 36.9 80 43L80 53ZM88 49C88 51.2 86.2 53 84 53L82 53 82 43 84 43C86.2 43 88 44.8 88 47L88 49Z"/><path d="M21 50 19 50 19 43.5C19 38.8 22.8 35 27.5 35L31 35 31 37 27.5 37C23.9 37 21 39.9 21 43.5L21 50Z" fill="#009FDB"/></g></svg>'
  }),
  fromModule(audioPlayer, {
    description: 'Minimalist customized audio player block showing transcription texts and timeline seek bars.',
    keywords: ['audio', 'podcast', 'transcript', 'player'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><path d="M48 10C27 10 10 27 10 48L10 80C10 83.3 12.7 86 16 86L23 86C26.3 86 29 83.3 29 80L29 61C29 57.7 26.3 55 23 55L12 55 12 48C12 28.1 28.1 12 48 12 67.9 12 84 28.1 84 48L84 55 73 55C69.7 55 67 57.7 67 61L67 80C67 83.3 69.7 86 73 86L80 86C83.3 86 86 83.3 86 80L86 48C86 27 69 10 48 10ZM27 61 27 80C27 82.2 25.2 84 23 84L16 84C13.8 84 12 82.2 12 80L12 57 23 57C25.2 57 27 58.8 27 61ZM84 80C84 82.2 82.2 84 80 84L73 84C70.8 84 69 82.2 69 80L69 61C69 58.8 70.8 57 73 57L84 57 84 80Z"/><g><rect x="22" y="60" width="2" height="21" fill="#009FDB"/></g><g><rect x="72" y="60" width="2" height="21" fill="#009FDB"/></g></g></svg>'
  }),
  fromModule(videoFrame, {
    description: 'Sleek video player frame featuring custom overlay buttons and chapters list overlays.',
    keywords: ['video', 'embed', 'captions', 'player'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><g><path d="M27.6 77.9 19.4 74.4 24.3 68.4 17.3 66 22.3 59.9 15.3 57.5 21.2 50.4 22.8 51.6 18.7 56.6 25.7 59 20.7 65.1 27.7 67.5 22.6 73.6 28.4 76.1Z" fill="#009FDB"/></g><g><path d="M76.8 44.6 75.2 43.4 79.3 38.4 72.3 36 77.3 29.9 70.3 27.5 75.4 21.4 69.6 18.9 70.4 17.1 78.6 20.6 73.7 26.6 80.7 29 75.7 35.1 82.7 37.5Z" fill="#009FDB"/></g><g><path d="M39.9 83.8C39 83.8 38 83.5 37.2 83 36.1 82.3 35.3 81.2 35.1 79.9L23.5 24.6C23.2 23.3 23.5 22 24.2 20.9 24.9 19.8 26 19 27.3 18.8L58 12.4C60.7 11.8 63.3 13.6 63.8 16.2L75.3 71.5C75.9 74.2 74.1 76.8 71.5 77.3L40.8 83.7C40.5 83.8 40.2 83.8 39.9 83.8ZM59.1 14.3C58.9 14.3 58.7 14.3 58.5 14.4L27.8 20.8C26.2 21.1 25.2 22.7 25.5 24.3L37 79.5C37.2 80.3 37.6 80.9 38.3 81.3 39 81.7 39.7 81.9 40.5 81.7L71.2 75.3C72.8 75 73.8 73.4 73.5 71.8L62 16.6C61.7 15.2 60.5 14.3 59.1 14.3Z"/></g><g><rect x="37.8" y="20.9" width="12.6" height="2" transform="matrix(0.9791 -0.2032 0.2032 0.9791 -3.5352 9.4062)"/></g></g></svg>'
  }),
  fromModule(imageGallery, {
    description: 'Responsive photo gallery with beautiful modal popups and image detail descriptions.',
    keywords: ['gallery', 'photos', 'modal', 'grid'],
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><path d="M73 28 12 28C8.7 28 6 30.7 6 34L6 74C6 77.3 8.7 80 12 80L73 80C76.3 80 79 77.3 79 74L79 34C79 30.7 76.3 28 73 28ZM41.9 78 16.8 78 29.3 63.5 41.9 78ZM39.7 72.5 53 57.1 71.2 78 44.5 78 39.7 72.5ZM77 74C77 76 75.6 77.6 73.7 77.9L73.8 77.8 53 54 38.4 71 29.3 60.4 14.1 78 12 78C9.8 78 8 76.2 8 74L8 34C8 31.8 9.8 30 12 30L73 30C75.2 30 77 31.8 77 34L77 74Z"/><path d="M84 17 16 17 16 19 84 19C86.2 19 88 20.8 88 23L88 71 90 71 90 23C90 19.7 87.3 17 84 17Z"/><path d="M28 36.7C24.3 36.7 21.3 39.7 21.3 43.4 21.3 47.1 24.3 50.1 28 50.1 31.7 50.1 34.7 47.1 34.7 43.4 34.7 39.7 31.7 36.7 28 36.7ZM28 48C25.4 48 23.3 45.9 23.3 43.3 23.3 40.7 25.4 38.6 28 38.6 30.6 38.6 32.7 40.7 32.7 43.3 32.7 45.9 30.6 48 28 48Z" fill="#009FDB"/></g></svg>'
  }),
  fromModule(interactiveVideo, {
    description: 'Video with timestamp-based information and multiple-choice markers. Pauses at each marker, records learner progress, and resumes on your terms.',
    keywords: ['video', 'interactive video', 'markers', 'timeline', 'knowledge check', 'pause'],
    status: 'beta',
    icon: '<svg width="24" height="24" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><path d="M84 20 12 20C8.7 20 6 22.7 6 26L6 62C6 65.3 8.7 68 12 68L84 68C87.3 68 90 65.3 90 62L90 26C90 22.7 87.3 20 84 20ZM88 62C88 64.2 86.2 66 84 66L12 66C9.8 66 8 64.2 8 62L8 26C8 23.8 9.8 22 12 22L84 22C86.2 22 88 23.8 88 26L88 62Z"/><path d="M40 32 40 56 62 44Z" fill="#009FDB"/><rect x="10" y="76" width="76" height="2"/><circle cx="30" cy="77" r="3" fill="#009FDB"/><circle cx="58" cy="77" r="3"/></g></svg>'
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
