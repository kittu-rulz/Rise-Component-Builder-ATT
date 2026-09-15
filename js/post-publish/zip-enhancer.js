// @ts-nocheck
import { createZip } from '../zip.js';
import { detectRisePackage, ENHANCEMENT_SIGNATURE, MANIFEST_FILENAME } from './package-detector.js';
import { normalizePostPublishConfig } from './schema.js';
import { getMediaRecord } from '../media-storage.js';
import { getRuntimeAssets } from './runtime-assets.js';

/**
 * Injects Post-Publish Course Tools into an uploaded Rise package ZIP and generates an enhanced ZIP.
 * @param {Blob|File} uploadedZip
 * @param {any} rawConfig
 * @returns {Promise<{
 *   success: boolean,
 *   enhancedBlob: Blob|null,
 *   downloadFilename: string,
 *   report: string,
 *   error?: string
 * }>}
 */
export async function enhanceRisePackage(uploadedZip, rawConfig) {
  try {
    const detection = await detectRisePackage(uploadedZip);
    if (!detection.valid) {
      return {
        success: false,
        enhancedBlob: null,
        downloadFilename: '',
        report: '',
        error: detection.error || 'Invalid Rise package structure.'
      };
    }

    const config = normalizePostPublishConfig(rawConfig);
    const entries = detection.entries;
    const launchPath = detection.launchHtmlPath;

    // Find launch HTML entry (robust against path separators)
    const launchIndex = entries.findIndex(e => e.path === launchPath || e.path.replace(/\\/g, '/') === launchPath.replace(/\\/g, '/'));
    if (launchIndex === -1) {
      return {
        success: false,
        enhancedBlob: null,
        downloadFilename: '',
        report: '',
        error: `Could not locate launch HTML document at "${launchPath}".`
      };
    }

    const normalizedLaunchPath = launchPath.replace(/\\/g, '/');
    const lastSlash = normalizedLaunchPath.lastIndexOf('/');
    const baseDir = lastSlash !== -1 ? normalizedLaunchPath.slice(0, lastSlash + 1) : '';

    let launchHtml = new TextDecoder().decode(entries[launchIndex].data);

    // Remove any previous injection to ensure idempotency
    const startIdx = launchHtml.indexOf(ENHANCEMENT_SIGNATURE);
    if (startIdx !== -1) {
      const endTag = '<!-- RCB-POST-PUBLISH-TOOLS:END -->';
      const endIdx = launchHtml.indexOf(endTag);
      if (endIdx !== -1) {
        launchHtml = launchHtml.slice(0, startIdx) + launchHtml.slice(endIdx + endTag.length);
      }
    }

    // Prepare injection snippet
    const injectionSnippet = `
${ENHANCEMENT_SIGNATURE}
<link rel="stylesheet" href="assets/rcb-ppt/rcb-ppt-styles.css">
<script src="assets/rcb-ppt/rcb-ppt-config.js"></script>
<script src="assets/rcb-ppt/rcb-ppt-runtime.js"></script>
<!-- RCB-POST-PUBLISH-TOOLS:END -->
`;

    if (launchHtml.includes('</body>')) {
      launchHtml = launchHtml.replace('</body>', `${injectionSnippet}</body>`);
    } else {
      launchHtml += injectionSnippet;
    }

    // Update launch HTML in entries
    entries[launchIndex].data = new TextEncoder().encode(launchHtml);

    // Remove old assets/rcb-ppt/ files if updating existing package
    const filteredEntries = entries.filter(e => {
      const p = e.path.replace(/\\/g, '/');
      return !p.includes('assets/rcb-ppt/') && !p.endsWith(MANIFEST_FILENAME) && !p.endsWith('rcb-ppt-enhancement-report.txt');
    });

    const { runtimeJS, runtimeCSS } = await getRuntimeAssets();

    // Add Runtime CSS and JS
    filteredEntries.push({
      path: `${baseDir}assets/rcb-ppt/rcb-ppt-styles.css`,
      data: new TextEncoder().encode(runtimeCSS)
    });
    filteredEntries.push({
      path: `${baseDir}assets/rcb-ppt/rcb-ppt-runtime.js`,
      data: new TextEncoder().encode(runtimeJS)
    });

    // Add Config JS
    const configJS = `window.__RCB_POST_PUBLISH_CONFIG__ = ${JSON.stringify(config, null, 2)};`;
    filteredEntries.push({
      path: `${baseDir}assets/rcb-ppt/rcb-ppt-config.js`,
      data: new TextEncoder().encode(configJS)
    });

    // Package local resource files into assets/rcb-ppt/resources/
    const packagedFilesList = [];
    if (config.resources && Array.isArray(config.resources.items)) {
      for (const item of config.resources.items) {
        if (item.sourceType === 'upload' && item.fileRef && item.fileRef.mediaId) {
          try {
            const record = await getMediaRecord(item.fileRef.mediaId);
            const blob = record?.blob;
            if (blob) {
              const buffer = await blob.arrayBuffer();
              const safePath = `${baseDir}assets/rcb-ppt/resources/${item.fileRef.name}`;
              filteredEntries.push({
                path: safePath,
                data: new Uint8Array(buffer)
              });
              packagedFilesList.push(`${item.fileRef.name} (${item.title})`);
            }
          } catch {
            // Missing media will fallback to URL
          }
        }
      }
    }

    // Add Manifest JSON for future reload / idempotency
    const manifest = {
      enhancement: 'Rise Post-Publish Tools',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      packageType: detection.packageType,
      launchHtmlPath: launchPath,
      config
    };
    filteredEntries.push({
      path: MANIFEST_FILENAME,
      data: new TextEncoder().encode(JSON.stringify(manifest, null, 2))
    });
    if (baseDir) {
      filteredEntries.push({
        path: `${baseDir}${MANIFEST_FILENAME}`,
        data: new TextEncoder().encode(JSON.stringify(manifest, null, 2))
      });
    }

    // Add Human-Readable Enhancement Report
    const reportText = `================================================================================
AT&T RISE POST-PUBLISH TOOLS — ENHANCEMENT SUMMARY
================================================================================
Enhancement: Rise Post-Publish Tools
Version: 1.0.0
Build Timestamp: ${new Date().toISOString()}
Detected Package Type: ${detection.packageType.toUpperCase()}
Launch File Modified: ${launchPath}

ENABLED TOOLS:
- Persistent Glossary: ${config.settings.enabledTools.glossary ? `YES (${config.glossary.entries.length} terms)` : 'NO'}
- Persistent Resources: ${config.settings.enabledTools.resources ? `YES (${config.resources.items.length} items)` : 'NO'}
- Help & Support: ${config.settings.enabledTools.help ? `YES (${config.help.faqItems.length} FAQs)` : 'NO'}

LAUNCHER CONFIGURATION:
- Label: "${config.settings.launcherLabel}"
- Position: ${config.settings.launcherPosition}
- Style: ${config.settings.launcherStyle}
- Theme: ${config.settings.launcherTheme} (${config.settings.surfaceTheme} surface)

PACKAGED RESOURCE FILES:
${packagedFilesList.length > 0 ? packagedFilesList.map(f => `  • ${f}`).join('\n') : '  (None - all resources are external URLs)'}

IMPORTANT NOTICE:
These post-publish tools are applied to your exported Rise course package.
If you make changes to the course and republish from Rise 360 in the future,
simply apply these tools again to the new exported ZIP package.
================================================================================
`;
    filteredEntries.push({
      path: 'rcb-ppt-enhancement-report.txt',
      data: new TextEncoder().encode(reportText)
    });

    // Create Enhanced ZIP
    const enhancedBlob = createZip(filteredEntries);

    const originalName = uploadedZip.name ? uploadedZip.name.replace(/\.zip$/i, '') : 'rise-course';
    const downloadFilename = `${originalName}-post-publish-tools.zip`;

    return {
      success: true,
      enhancedBlob,
      downloadFilename,
      report: reportText
    };
  } catch (err) {
    return {
      success: false,
      enhancedBlob: null,
      downloadFilename: '',
      report: '',
      error: `Package enhancement failed: ${err.message}`
    };
  }
}
