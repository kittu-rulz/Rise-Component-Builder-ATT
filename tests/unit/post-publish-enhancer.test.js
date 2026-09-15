import { describe, expect, test } from 'vitest';
import { detectRisePackage } from '../../js/post-publish/package-detector.js';
import { enhanceRisePackage } from '../../js/post-publish/zip-enhancer.js';
import { createDefaultPostPublishConfig } from '../../js/post-publish/schema.js';
import { createZip, readZip } from '../../js/zip.js';

describe('Rise Package Detection', () => {
  test('detects standard Rise Web export structure', async () => {
    const files = [
      { path: 'index.html', data: new TextEncoder().encode('<!DOCTYPE html><html><head></head><body><h1>Rise Course</h1></body></html>') },
      { path: 'lib/main.bundle.js', data: new TextEncoder().encode('console.log("rise");') }
    ];
    const zipBlob = await createZip(files);

    const info = await detectRisePackage(zipBlob);
    expect(info.valid).toBe(true);
    expect(info.packageType).toBe('web');
    expect(info.launchHtmlPath).toBe('index.html');
    expect(info.isPreviouslyEnhanced).toBe(false);
  });

  test('detects SCORM 2004 / 1.2 package structure', async () => {
    const files = [
      { path: 'imsmanifest.xml', data: new TextEncoder().encode('<manifest></manifest>') },
      { path: 'scormcontent/index.html', data: new TextEncoder().encode('<!DOCTYPE html><html><head></head><body><h1>SCORM Course</h1></body></html>') }
    ];
    const zipBlob = await createZip(files);

    const info = await detectRisePackage(zipBlob);
    expect(info.valid).toBe(true);
    expect(info.packageType).toMatch(/^scorm/);
    expect(info.launchHtmlPath).toBe('scormcontent/index.html');
  });

  test('detects previously enhanced package manifest and version', async () => {
    const manifestJson = JSON.stringify({
      schemaVersion: 1,
      enhancement: 'Rise Post-Publish Tools',
      enhancedAt: '2026-09-11T12:00:00Z',
      builderVersion: '2.5.0',
      config: createDefaultPostPublishConfig()
    });

    const files = [
      { path: 'index.html', data: new TextEncoder().encode('<!DOCTYPE html><html><head></head><body><!-- RCB-POST-PUBLISH-TOOLS:START --><h1>Rise Course</h1><!-- RCB-POST-PUBLISH-TOOLS:END --></body></html>') },
      { path: 'rcb-ppt-manifest.json', data: new TextEncoder().encode(manifestJson) }
    ];
    const zipBlob = await createZip(files);

    const info = await detectRisePackage(zipBlob);
    expect(info.isPreviouslyEnhanced).toBe(true);
    expect(info.previousConfig).not.toBeNull();
  });
});

describe('Rise Package Enhancement Pipeline', () => {
  test('injects persistent course tools runtime and assets idempotently', async () => {
    const rawHtml = '<!DOCTYPE html><html><head><title>Course</title></head><body><div id="app"></div></body></html>';
    const sourceFiles = [
      { path: 'index.html', data: new TextEncoder().encode(rawHtml) },
      { path: 'assets/image.png', data: new Uint8Array([1, 2, 3, 4]) }
    ];

    const sourceZipBlob = await createZip(sourceFiles);

    const config = createDefaultPostPublishConfig();
    config.glossary.entries.push({
      id: 'term-test-1',
      term: 'Bandwidth',
      definition: 'Data transfer capacity'
    });

    const result = await enhanceRisePackage(sourceZipBlob, config);

    expect(result.success).toBe(true);
    expect(result.enhancedBlob).toBeInstanceOf(Blob);

    // Verify injected contents in the produced ZIP
    const parsedFiles = await readZip(result.enhancedBlob);
    const fileMap = Object.fromEntries(parsedFiles.map(f => [f.path, f.data]));

    // Check launch HTML contains injection tags
    const updatedHtml = new TextDecoder().decode(fileMap['index.html']);
    expect(updatedHtml).toContain('<!-- RCB-POST-PUBLISH-TOOLS:START -->');
    expect(updatedHtml).toContain('rcb-ppt-styles.css');
    expect(updatedHtml).toContain('rcb-ppt-runtime.js');
    expect(updatedHtml).toContain('<!-- RCB-POST-PUBLISH-TOOLS:END -->');

    // Check runtime assets exist
    expect(fileMap['assets/rcb-ppt/rcb-ppt-styles.css']).toBeDefined();
    expect(fileMap['assets/rcb-ppt/rcb-ppt-runtime.js']).toBeDefined();
    expect(fileMap['rcb-ppt-manifest.json']).toBeDefined();

    // Check manifest data
    const manifestData = JSON.parse(new TextDecoder().decode(fileMap['rcb-ppt-manifest.json']));
    expect(manifestData.config.glossary.entries.length).toBe(3); // 2 default + 1 added

    // Verify idempotency: re-enhancing the produced ZIP produces only one set of tags
    const secondPassResult = await enhanceRisePackage(result.enhancedBlob, config);
    expect(secondPassResult.success).toBe(true);
    const secondParsedFiles = await readZip(secondPassResult.enhancedBlob);
    const secondFileMap = Object.fromEntries(secondParsedFiles.map(f => [f.path, f.data]));

    const secondHtml = new TextDecoder().decode(secondFileMap['index.html']);
    const startTagCount = (secondHtml.match(/<!-- RCB-POST-PUBLISH-TOOLS:START -->/g) || []).length;
    const endTagCount = (secondHtml.match(/<!-- RCB-POST-PUBLISH-TOOLS:END -->/g) || []).length;
    expect(startTagCount).toBe(1);
    expect(endTagCount).toBe(1);
  });
});
