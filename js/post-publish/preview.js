import { getRuntimeAssets } from './runtime-assets.js';

/**
 * Generates the full HTML content for the Post-Publish Tools simulator preview iframe.
 * @param {any} config
 * @returns {Promise<string>}
 */
export async function generateSimulatorPreviewHTML(config) {
  const { runtimeJS, runtimeCSS } = await getRuntimeAssets();
  const safeConfigJSON = JSON.stringify(config);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rise Course Tools Simulator Preview</title>
  <style>
    /* Rise Simulator Mockup Styles */
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      color: #1E293B;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Mock Rise Header */
    .mock-rise-header {
      background-color: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .mock-rise-course-title {
      font-size: 15px;
      font-weight: 700;
      color: #00388F;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mock-rise-nav-crumbs {
      font-size: 13px;
      color: #64748B;
    }

    /* Mock Rise Course Canvas */
    .mock-rise-canvas {
      flex: 1;
      max-width: 840px;
      width: 100%;
      margin: 0 auto;
      padding: 40px 24px 120px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .mock-rise-hero {
      background: linear-gradient(135deg, #00388F 0%, #0057B8 100%);
      color: #FFFFFF;
      padding: 36px 32px;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0, 56, 143, 0.15);
    }

    .mock-rise-hero h1 {
      margin: 0 0 8px;
      font-size: 26px;
      font-weight: 800;
    }

    .mock-rise-hero p {
      margin: 0;
      font-size: 15px;
      opacity: 0.9;
      line-height: 1.5;
    }

    .mock-rise-lesson-block {
      background-color: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 28px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .mock-rise-lesson-block h2 {
      margin: 0 0 12px;
      font-size: 20px;
      font-weight: 700;
      color: #0F172A;
    }

    .mock-rise-lesson-block p {
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
      margin: 0 0 16px;
    }

    .mock-rise-lesson-block p:last-child {
      margin-bottom: 0;
    }

    /* Injected Learner Runtime Styles */
    ${runtimeCSS}
  </style>
</head>
<body>

  <!-- Mock Rise Top Header -->
  <header class="mock-rise-header">
    <div class="mock-rise-course-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      <span>DEMO — sample course page, not your uploaded course</span>
    </div>
    <div class="mock-rise-nav-crumbs">Lesson 2 of 6</div>
  </header>

  <!-- Mock Rise Course Body -->
  <main class="mock-rise-canvas">
    <section class="mock-rise-hero">
      <h1>Module 2: Network Infrastructure & Standards</h1>
      <p>Explore operational procedures, standards compliance, and technical guidelines.</p>
    </section>

    <article class="mock-rise-lesson-block">
      <h2>Operational Procedures</h2>
      <p>Field operations require adherence to standard protocols. Use the persistent <strong>Course Tools</strong> launcher (located at the bottom of the screen) at any time to access the course glossary, reference resources, or contact technical support.</p>
      <p>This preview demonstrates how the persistent overlay behaves when interacting with the course content, including responsive drawer slide-out, search, filtering, and troubleshooting FAQ accordions.</p>
    </article>
  </main>

  <!-- Injected Post-Publish Config and Runtime Script -->
  <script>
    window.__RCB_POST_PUBLISH_CONFIG__ = ${safeConfigJSON};
    ${runtimeJS}
  </script>
</body>
</html>`;
}
