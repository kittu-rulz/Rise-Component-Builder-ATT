import { applyThemeToConfig, DEFAULT_THEME_ID, getBuiltInTheme } from './themes.js';

const initialTheme = getBuiltInTheme(DEFAULT_THEME_ID);

const initialConfig = applyThemeToConfig({
  blockTitle: 'INTERACTIVE ACCORDION',
  blockHeadline: 'Explore the Core Dimensions',
  blockDesc: 'Click on the headers below to discover detailed insights.',
  blockHeadingLevel: 'h2',
  colorPrimary: '#2563EB',
  colorAccent: '#F59E0B',
  colorBg: '#FFFFFF',
  colorText: '#1F2937',
  borderRadius: '12',
  shadowDepth: 'soft',
  borderOutline: true,
  accordionMulti: true,
  accordionAnimation: true,
  iconStyle: 'chevron',
  trackCompletion: false,
  completionMsg: 'Activity Complete!',
  items: [
    { title: 'Understanding User Intent', content: 'Instructional design begins by identifying the core learning objectives and alignment with business outcomes.' },
    { title: 'Designing for Engagement', content: 'Modern eLearning relies on micro-interactions, clean visual layouts, and bite-sized chunks of information.' },
    { title: 'SCORM and Tracking Analytics', content: 'Export clean standard elements to trace course completion, custom interaction states, and score cards.' }
  ]
}, initialTheme);

export const appState = {
  currentProjectId: null,
  currentProjectName: '',
  uiTheme: 'light',
  activeThemeId: initialTheme.id,
  activeTheme: initialTheme,
  componentOverrides: {},
  activeCategory: 'interactive',
  searchQuery: '',
  selectedComponent: null,
  favorites: new Set(),
  settings: {
    defaultFont: 'Lato',
    exportFormat: 'web',
    autosave: true,
    aiEnabled: false,
    mediaLimitsMb: { image: 10, audio: 30, video: 100, svg: 2 }
  },
  config: structuredClone(initialConfig)
};

export function resetConfig() {
  appState.config = structuredClone(initialConfig);
  return appState.config;
}
