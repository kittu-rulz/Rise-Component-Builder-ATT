/**
 * AT&T Rise Post-Publish Tools — Runtime Asset Loader
 * Provides the learner runtime JS and CSS payloads for iframe preview and ZIP injection.
 */

let cachedRuntimeJS = null;
let cachedRuntimeCSS = null;

export async function getRuntimeAssets() {
  if (cachedRuntimeJS && cachedRuntimeCSS) {
    return { runtimeJS: cachedRuntimeJS, runtimeCSS: cachedRuntimeCSS };
  }

  // 1. Try Node.js fs if running in test environment
  if (typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.versions && globalThis.process.versions.node) {
    try {
      const { readFile } = await import('node:fs/promises');
      const { join, dirname } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const currentDir = dirname(fileURLToPath(import.meta.url));

      cachedRuntimeJS = await readFile(join(currentDir, 'runtime', 'rcb-ppt-runtime.js'), 'utf8');
      cachedRuntimeCSS = await readFile(join(currentDir, 'runtime', 'rcb-ppt-styles.css'), 'utf8');
      return { runtimeJS: cachedRuntimeJS, runtimeCSS: cachedRuntimeCSS };
    } catch {
      // Fallback to fetch
    }
  }

  // 2. Try browser fetch
  if (typeof fetch === 'function') {
    try {
      const jsUrl = new URL('./runtime/rcb-ppt-runtime.js', import.meta.url);
      const cssUrl = new URL('./runtime/rcb-ppt-styles.css', import.meta.url);

      const [jsResp, cssResp] = await Promise.all([
        fetch(jsUrl),
        fetch(cssUrl)
      ]);

      if (jsResp.ok && cssResp.ok) {
        cachedRuntimeJS = await jsResp.text();
        cachedRuntimeCSS = await cssResp.text();
        return { runtimeJS: cachedRuntimeJS, runtimeCSS: cachedRuntimeCSS };
      }
    } catch {
      // Fallback to minimal placeholder
    }
  }

  // 3. Fallback safe stub
  cachedRuntimeJS = cachedRuntimeJS || '/* RCB PPT Runtime */';
  cachedRuntimeCSS = cachedRuntimeCSS || '/* RCB PPT Styles */';
  return { runtimeJS: cachedRuntimeJS, runtimeCSS: cachedRuntimeCSS };
}
