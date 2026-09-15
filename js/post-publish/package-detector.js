// @ts-nocheck
import { readZip } from '../zip.js';

export const MANIFEST_FILENAME = 'rcb-ppt-manifest.json';
export const ENHANCEMENT_SIGNATURE = '<!-- RCB-POST-PUBLISH-TOOLS:START -->';

/**
 * Inspects an uploaded ZIP file and returns package metadata.
 * @param {Blob|File} zipBlob
 * @returns {Promise<{
 *   valid: boolean,
 *   packageType: 'web'|'scorm12'|'scorm2004'|'unknown',
 *   launchHtmlPath: string,
 *   isPreviouslyEnhanced: boolean,
 *   previousConfig: any|null,
 *   entries: { path: string, data: Uint8Array, isDirectory: boolean }[],
 *   error?: string
 * }>}
 */
export async function detectRisePackage(zipBlob) {
  try {
    const entries = await readZip(zipBlob);
    const entryPaths = new Set(entries.map(e => e.path.replace(/\\/g, '/')));

    // Check for previous enhancement manifest
    let isPreviouslyEnhanced = false;
    let previousConfig = null;

    const manifestEntry = entries.find(e => e.path.endsWith(MANIFEST_FILENAME));
    if (manifestEntry) {
      try {
        const text = new TextDecoder().decode(manifestEntry.data);
        const parsed = JSON.parse(text);
        if (parsed && parsed.enhancement === 'Rise Post-Publish Tools') {
          isPreviouslyEnhanced = true;
          previousConfig = parsed.config || null;
        }
      } catch {
        // Ignore JSON parse errors in malformed manifests
      }
    }

    // Detect package structure
    let packageType = 'unknown';
    let launchHtmlPath = '';

    const hasManifest = entryPaths.has('imsmanifest.xml');
    const hasIndexHtml = entryPaths.has('index.html');
    const hasIndexLms = entryPaths.has('index_lms.html') || entryPaths.has('scormcontent/index.html');
    const hasScormDriver = Array.from(entryPaths).some(p => p.startsWith('scormdriver/') || p.includes('scormdriver.js'));
    const hasRiseLib = Array.from(entryPaths).some(p => p.includes('lib/rise') || p.includes('lib/main.') || p.includes('scormcontent/'));

    // Helper to find the best launch HTML entry
    function findLaunchHtmlPath() {
      // 1. For SCORM packages, prefer scormcontent/index.html if present
      const scormContent = entries.find(e => {
        const p = e.path.replace(/\\/g, '/').toLowerCase();
        return p === 'scormcontent/index.html' || p.endsWith('/scormcontent/index.html');
      });
      if (scormContent) return scormContent.path;

      // 2. Direct root index.html or index.htm
      const rootIndex = entries.find(e => {
        const p = e.path.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
        return p === 'index.html' || p === 'index.htm';
      });
      if (rootIndex) return rootIndex.path;

      // 3. index_lms.html
      const lmsIndex = entries.find(e => {
        const p = e.path.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
        return p === 'index_lms.html' || p.endsWith('/index_lms.html');
      });
      if (lmsIndex) return lmsIndex.path;

      // 4. Any index.html in any subdirectory
      const subIndex = entries.find(e => {
        const p = e.path.replace(/\\/g, '/').toLowerCase();
        return p.endsWith('/index.html') || p.endsWith('/index.htm');
      });
      if (subIndex) return subIndex.path;

      // 5. Any .html at root
      const anyRootHtml = entries.find(e => {
        const p = e.path.replace(/\\/g, '/').replace(/^\.\//, '');
        return !p.includes('/') && (p.endsWith('.html') || p.endsWith('.htm'));
      });
      if (anyRootHtml) return anyRootHtml.path;

      return '';
    }

    launchHtmlPath = findLaunchHtmlPath();

    if (hasManifest && (hasIndexLms || hasScormDriver || launchHtmlPath.includes('scormcontent/'))) {
      const manifestEntry = entries.find(e => e.path.replace(/\\/g, '/').endsWith('imsmanifest.xml'));
      let manifestText = '';
      if (manifestEntry) {
        manifestText = new TextDecoder().decode(manifestEntry.data);
      }
      const is2004 = manifestText.includes('CAM 1.3') || manifestText.includes('2004') || manifestText.includes('adlcp:scormType');
      packageType = is2004 ? 'scorm2004' : 'scorm12';
    } else if (launchHtmlPath || hasRiseLib || hasIndexHtml) {
      packageType = 'web';
    }

    if (!launchHtmlPath) {
      return {
        valid: false,
        packageType: 'unknown',
        launchHtmlPath: '',
        isPreviouslyEnhanced: false,
        previousConfig: null,
        entries,
        error: 'The uploaded file does not appear to be a supported Rise 360 web or LMS export (could not find index.html or imsmanifest.xml).'
      };
    }

    return {
      valid: true,
      packageType,
      launchHtmlPath,
      isPreviouslyEnhanced,
      previousConfig,
      entries
    };
  } catch (err) {
    return {
      valid: false,
      packageType: 'unknown',
      launchHtmlPath: '',
      isPreviouslyEnhanced: false,
      previousConfig: null,
      entries: [],
      error: `Failed to inspect package: ${err.message}`
    };
  }
}
