import { sanitizeRichText, sanitizeURL } from '../utilities.js';

export const POST_PUBLISH_SCHEMA_VERSION = 1;

// Reserved/example hosts that can never be a real destination for learners.
const PLACEHOLDER_HOSTS = /(^|\.)(example\.(com|org|net)|example|invalid|test|localhost)$/i;

/** True when the URL points at a reserved example/placeholder host (example.com, *.example.com, …). */
export function isPlaceholderUrl(value) {
  try {
    const host = new URL(String(value || '').trim()).hostname;
    return PLACEHOLDER_HOSTS.test(host);
  } catch {
    return false;
  }
}

/** True when the email's domain is a reserved example/placeholder domain. */
export function isPlaceholderEmail(value) {
  const at = String(value || '').trim().lastIndexOf('@');
  return at !== -1 && PLACEHOLDER_HOSTS.test(String(value).trim().slice(at + 1));
}

/**
 * The starter config ships example content so the tools are not empty on first open. That
 * content must never reach learners by accident, so this lists every place the current
 * config still carries an unchanged seed value. Compared against the seed itself (not a
 * flag) so editing a value clears it without any UI having to remember to.
 * @returns {{ tool: 'glossary'|'resources'|'help', what: string }[]}
 */
export function findSampleContent(config) {
  const seed = createDefaultPostPublishConfig();
  /** @type {{ tool: 'glossary'|'resources'|'help', what: string }[]} */
  const found = [];
  const enabled = config?.settings?.enabledTools || {};
  if (enabled.glossary) {
    const seedTerms = new Set(seed.glossary.entries.map(e => `${e.term}|${e.definition}`));
    for (const e of config.glossary?.entries || []) {
      if (seedTerms.has(`${(e.term || '').trim()}|${e.definition}`) || seed.glossary.entries.some(s => s.term === (e.term || '').trim())) {
        found.push({ tool: 'glossary', what: `Glossary term “${e.term}” is the sample term that ships with the tool` });
      }
    }
  }
  if (enabled.resources) {
    const seedRes = seed.resources.items;
    for (const item of config.resources?.items || []) {
      if (seedRes.some(s => s.title === (item.title || '').trim() && s.url === item.url)) {
        found.push({ tool: 'resources', what: `Resource “${item.title}” is the sample resource that ships with the tool` });
      }
    }
  }
  if (enabled.help) {
    const h = config.help || {};
    const sh = seed.help;
    for (const key of ['supportEmail', 'supportPhone', 'supportPortalUrl', 'supportHours', 'responseTime', 'department']) {
      if (h[key] && h[key] === sh[key]) found.push({ tool: 'help', what: `Help & Support ${key} is still the sample value “${h[key]}”` });
    }
    for (const faq of h.faqItems || []) {
      if (sh.faqItems.some(s => s.question === (faq.question || '').trim())) {
        found.push({ tool: 'help', what: `FAQ “${faq.question}” is a sample FAQ that ships with the tool` });
      }
    }
  }
  return found;
}

/**
 * Creates a clean default Post-Publish Tools configuration.
 */
export function createDefaultPostPublishConfig() {
  return {
    schemaVersion: POST_PUBLISH_SCHEMA_VERSION,
    id: `ppt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: 'Rise Course Tools Enhancement',
    // Shared Launcher & Presentation Settings
    settings: {
      launcherLabel: 'Course Tools',
      launcherStyle: 'icon-label', // 'icon-label' | 'icon-only'
      launcherPosition: 'bottom-right', // 'bottom-right' | 'bottom-left'
      launcherTheme: 'default', // 'default' (AT&T Blue) | 'navy' | 'cobalt' | 'cyan'
      surfaceTheme: 'light', // 'light' | 'dark'
      defaultOpenTool: 'glossary', // 'glossary' | 'resources' | 'help'
      desktopOffsetBottom: 24,
      desktopOffsetSide: 24,
      displayOnCoverPage: true,
      sampleContentAcknowledged: false,
      enabledTools: {
        glossary: true,
        resources: true,
        help: true
      }
    },
    // Tool 1: Persistent Glossary
    glossary: {
      title: 'Glossary',
      description: 'Search key terms, definitions, and acronyms used throughout this course.',
      entries: [
        {
          id: 'gloss-1',
          term: 'Single Page Application (SPA)',
          definition: '<p>A web application or website that interacts with the user by dynamically rewriting the current web page rather than loading entire new pages from a server.</p>',
          abbreviation: 'SPA',
          aliases: 'client-side routing, dynamic routing',
          category: 'Architecture',
          resourceUrl: '',
          resourceLabel: ''
        },
        {
          id: 'gloss-2',
          term: 'SCORM',
          definition: '<p><strong>Sharable Content Object Reference Model</strong>: A set of technical standards for eLearning software products that defines how online learning content and Learning Management Systems (LMS) communicate.</p>',
          abbreviation: 'SCORM',
          aliases: 'LMS tracking, SCORM 1.2, SCORM 2004',
          category: 'Standards',
          resourceUrl: '',
          resourceLabel: ''
        }
      ]
    },
    // Tool 2: Persistent Resources
    resources: {
      title: 'Course Resources',
      description: 'Access reference documents, job aids, and downloadable guides.',
      items: [
        {
          id: 'res-1',
          title: 'Quick Reference Field Guide',
          description: 'Essential checklist and operational guidelines for quick review.',
          type: 'document', // 'document' | 'link' | 'video' | 'audio' | 'tool' | 'other'
          sourceType: 'url', // 'url' | 'upload'
          url: 'https://example.com/field-guide.pdf',
          fileRef: null, // { mediaId, name, mimeType, size }
          category: 'Guides',
          featured: true,
          actionLabel: 'Open PDF',
          openBehavior: 'new-tab' // 'new-tab' | 'download'
        }
      ]
    },
    // Tool 3: Help & Support
    help: {
      title: 'Help & Support',
      intro: '<p>Need assistance or experiencing technical difficulties? Use the contact details or troubleshooting guide below.</p>',
      supportEmail: 'training-support@example.com',
      supportPhone: '1-800-555-0199',
      supportPortalUrl: 'https://helpdesk.example.com',
      supportPortalLabel: 'Open Support Portal',
      supportHours: 'Monday – Friday, 8:00 AM – 5:00 PM EST',
      responseTime: 'Inquiries are typically answered within 2–4 business hours.',
      department: 'Enterprise Learning & Development',
      faqItems: [
        {
          id: 'faq-1',
          question: 'How do I resume my course from another device?',
          answer: '<p>Your progress is automatically saved to your Learning Management System (LMS). Simply log in to the LMS from your other device and relaunch the course.</p>'
        },
        {
          id: 'faq-2',
          question: 'Audio or video is not playing. What should I check?',
          answer: '<p>Check that your browser audio permissions are enabled and your device volume is turned up. If using a corporate VPN, ensure media streaming is allowed.</p>'
        }
      ]
    }
  };
}

/**
 * Normalizes and sanitizes a post-publish configuration.
 * @param {any} config
 * @returns {any}
 */
export function normalizePostPublishConfig(config) {
  if (!config || typeof config !== 'object') {
    return createDefaultPostPublishConfig();
  }

  const defaults = createDefaultPostPublishConfig();
  const settings = config.settings || {};
  const glossary = config.glossary || {};
  const resources = config.resources || {};
  const help = config.help || {};

  const safeSettings = {
    launcherLabel: String(settings.launcherLabel || defaults.settings.launcherLabel).slice(0, 40),
    launcherStyle: ['icon-label', 'icon-only'].includes(settings.launcherStyle) ? settings.launcherStyle : defaults.settings.launcherStyle,
    launcherPosition: ['bottom-right', 'bottom-left'].includes(settings.launcherPosition) ? settings.launcherPosition : defaults.settings.launcherPosition,
    launcherTheme: ['default', 'navy', 'cobalt', 'cyan'].includes(settings.launcherTheme) ? settings.launcherTheme : defaults.settings.launcherTheme,
    surfaceTheme: ['light', 'dark'].includes(settings.surfaceTheme) ? settings.surfaceTheme : defaults.settings.surfaceTheme,
    defaultOpenTool: ['glossary', 'resources', 'help'].includes(settings.defaultOpenTool) ? settings.defaultOpenTool : defaults.settings.defaultOpenTool,
    desktopOffsetBottom: Math.max(8, Math.min(120, Number(settings.desktopOffsetBottom) || 24)),
    desktopOffsetSide: Math.max(8, Math.min(120, Number(settings.desktopOffsetSide) || 24)),
    displayOnCoverPage: settings.displayOnCoverPage !== false,
    // The author has explicitly accepted that sample content remains in this export.
    sampleContentAcknowledged: settings.sampleContentAcknowledged === true,
    enabledTools: {
      glossary: Boolean(settings.enabledTools?.glossary ?? defaults.settings.enabledTools.glossary),
      resources: Boolean(settings.enabledTools?.resources ?? defaults.settings.enabledTools.resources),
      help: Boolean(settings.enabledTools?.help ?? defaults.settings.enabledTools.help)
    }
  };

  // Ensure at least one tool is enabled if all were false
  if (!safeSettings.enabledTools.glossary && !safeSettings.enabledTools.resources && !safeSettings.enabledTools.help) {
    safeSettings.enabledTools.glossary = true;
  }

  const safeGlossaryEntries = (Array.isArray(glossary.entries) ? glossary.entries : defaults.glossary.entries).map((e, idx) => ({
    id: String(e.id || `gloss-${idx + 1}`),
    term: String(e.term || '').trim(),
    definition: sanitizeRichText(e.definition || ''),
    abbreviation: String(e.abbreviation || '').trim(),
    aliases: String(e.aliases || '').trim(),
    category: String(e.category || '').trim(),
    resourceUrl: sanitizeURL(e.resourceUrl || '', { allowRelative: true }),
    resourceLabel: String(e.resourceLabel || '').trim()
  }));

  const safeResourceItems = (Array.isArray(resources.items) ? resources.items : defaults.resources.items).map((item, idx) => ({
    id: String(item.id || `res-${idx + 1}`),
    title: String(item.title || '').trim(),
    description: String(item.description || '').trim(),
    type: ['document', 'link', 'video', 'audio', 'tool', 'other'].includes(item.type) ? item.type : 'document',
    sourceType: item.sourceType === 'upload' ? 'upload' : 'url',
    url: sanitizeURL(item.url || '', { allowRelative: true }),
    fileRef: item.fileRef && typeof item.fileRef === 'object' ? {
      mediaId: String(item.fileRef.mediaId || ''),
      name: String(item.fileRef.name || ''),
      mimeType: String(item.fileRef.mimeType || ''),
      size: Number(item.fileRef.size) || 0
    } : null,
    category: String(item.category || '').trim(),
    featured: Boolean(item.featured),
    actionLabel: String(item.actionLabel || '').trim(),
    openBehavior: item.openBehavior === 'download' ? 'download' : 'new-tab'
  }));

  const safeFaqItems = (Array.isArray(help.faqItems) ? help.faqItems : defaults.help.faqItems).map((faq, idx) => ({
    id: String(faq.id || `faq-${idx + 1}`),
    question: String(faq.question || '').trim(),
    answer: sanitizeRichText(faq.answer || '')
  }));

  return {
    schemaVersion: POST_PUBLISH_SCHEMA_VERSION,
    id: String(config.id || defaults.id),
    title: String(config.title || defaults.title),
    settings: safeSettings,
    glossary: {
      title: String(glossary.title || defaults.glossary.title),
      description: String(glossary.description || defaults.glossary.description),
      entries: safeGlossaryEntries
    },
    resources: {
      title: String(resources.title || defaults.resources.title),
      description: String(resources.description || defaults.resources.description),
      items: safeResourceItems
    },
    help: {
      title: String(help.title || defaults.help.title),
      intro: sanitizeRichText(help.intro || defaults.help.intro),
      supportEmail: String(help.supportEmail || '').trim(),
      supportPhone: String(help.supportPhone || '').trim(),
      supportPortalUrl: sanitizeURL(help.supportPortalUrl || '', { allowRelative: false }),
      supportPortalLabel: String(help.supportPortalLabel || '').trim(),
      supportHours: String(help.supportHours || '').trim(),
      responseTime: String(help.responseTime || '').trim(),
      department: String(help.department || '').trim(),
      faqItems: safeFaqItems
    }
  };
}
