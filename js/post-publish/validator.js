/**
 * Validates a Post-Publish Tools configuration for pre-export QA.
 * @param {any} config
 * @returns {{
 *   valid: boolean,
 *   errors: string[],
 *   warnings: string[],
 *   passed: string[]
 * }}
 */
export function validatePostPublishConfig(config) {
  const errors = [];
  const warnings = [];
  const passed = [];

  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: ['Configuration object is missing or malformed.'],
      warnings: [],
      passed: []
    };
  }

  const settings = config.settings || {};
  const enabled = settings.enabledTools || {};

  // 1. Tool Selection
  if (!enabled.glossary && !enabled.resources && !enabled.help) {
    errors.push('At least one tool (Glossary, Resources, or Help & Support) must be enabled before export.');
  } else {
    passed.push('At least one persistent tool is enabled.');
  }

  // 2. Launcher Settings
  if (!settings.launcherLabel || settings.launcherLabel.trim().length === 0) {
    errors.push('Launcher button label cannot be empty.');
  } else if (settings.launcherLabel.length > 40) {
    warnings.push(`Launcher label is ${settings.launcherLabel.length} characters (recommended: 30 or fewer for mobile screens).`);
  } else {
    passed.push(`Launcher label "${settings.launcherLabel}" is valid.`);
  }

  // 3. Glossary Validation
  if (enabled.glossary) {
    const entries = config.glossary?.entries || [];
    if (entries.length === 0) {
      errors.push('Glossary is enabled, but contains 0 terms. Add at least one term or disable Glossary.');
    } else {
      let missingFieldsCount = 0;
      const termNames = new Map();

      entries.forEach((e, idx) => {
        const termName = (e.term || '').trim();
        if (!termName || !e.definition || e.definition.trim().length === 0) {
          missingFieldsCount++;
        }
        if (termName) {
          const lower = termName.toLowerCase();
          termNames.set(lower, (termNames.get(lower) || 0) + 1);
        }
        if (e.resourceUrl && !e.resourceLabel) {
          warnings.push(`Glossary term "${termName || idx + 1}" has a related resource URL, but no link label.`);
        }
      });

      if (missingFieldsCount > 0) {
        errors.push(`Glossary has ${missingFieldsCount} term(s) with missing term names or definitions.`);
      } else {
        passed.push(`All ${entries.length} glossary terms have valid names and definitions.`);
      }

      // Check duplicate terms
      const duplicates = Array.from(termNames.entries()).filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        warnings.push(`Duplicate glossary terms found: ${duplicates.map(([name]) => `"${name}"`).join(', ')}.`);
      }
    }
  }

  // 4. Resources Validation
  if (enabled.resources) {
    const items = config.resources?.items || [];
    if (items.length === 0) {
      errors.push('Resources tool is enabled, but contains 0 items. Add at least one resource or disable Resources.');
    } else {
      let missingSourceCount = 0;
      items.forEach((item, idx) => {
        if (!item.title || item.title.trim().length === 0) {
          errors.push(`Resource #${idx + 1} is missing a title.`);
        }
        if (item.sourceType === 'upload') {
          if (!item.fileRef || !item.fileRef.mediaId) {
            missingSourceCount++;
          }
        } else {
          if (!item.url || item.url.trim().length === 0) {
            missingSourceCount++;
          } else if (!/^https?:\/\//i.test(item.url) && !item.url.startsWith('/')) {
            warnings.push(`Resource "${item.title || idx + 1}" URL should begin with https://.`);
          }
        }
      });

      if (missingSourceCount > 0) {
        errors.push(`Resources has ${missingSourceCount} item(s) without a valid URL or uploaded file.`);
      } else {
        passed.push(`All ${items.length} resource items have valid source targets.`);
      }
    }
  }

  // 5. Help & Support Validation
  if (enabled.help) {
    const help = config.help || {};
    const hasEmail = Boolean(help.supportEmail && help.supportEmail.includes('@'));
    const hasPhone = Boolean(help.supportPhone && help.supportPhone.trim().length > 0);
    const hasPortal = Boolean(help.supportPortalUrl && help.supportPortalUrl.trim().length > 0);
    const hasFaqs = Array.isArray(help.faqItems) && help.faqItems.length > 0;
    const hasIntro = Boolean(help.intro && help.intro.trim().length > 0);

    if (!hasEmail && !hasPhone && !hasPortal && !hasFaqs && !hasIntro) {
      errors.push('Help & Support is enabled, but contains no contact channels, FAQs, or intro message.');
    } else {
      passed.push('Help & Support has valid contact channels / troubleshooting content.');
    }

    if (help.supportEmail && !help.supportEmail.includes('@')) {
      warnings.push(`Support email "${help.supportEmail}" does not appear to be a valid email address.`);
    }
    if (help.supportPortalUrl && !help.supportPortalLabel) {
      warnings.push('Support portal URL is provided, but portal button label is empty.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    passed
  };
}
