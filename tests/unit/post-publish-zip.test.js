import { describe, expect, it } from 'vitest';
import { createZip, isSafeZipPath, readZip } from '../../js/zip.js';
import { detectRisePackage, MANIFEST_FILENAME } from '../../js/post-publish/package-detector.js';

describe('Post-Publish ZIP Utilities and Package Detector', () => {
  describe('isSafeZipPath', () => {
    it('allows safe relative filenames and directory paths', () => {
      expect(isSafeZipPath('index.html')).toBe(true);
      expect(isSafeZipPath('assets/images/logo.png')).toBe(true);
      expect(isSafeZipPath('scormcontent/lib/main.bundle.js')).toBe(true);
    });

    it('rejects path traversal (Zip Slip) attempts with ..', () => {
      expect(isSafeZipPath('../secret.txt')).toBe(false);
      expect(isSafeZipPath('assets/../../etc/passwd')).toBe(false);
      expect(isSafeZipPath('./config.json')).toBe(false);
    });

    it('rejects root-prefixed and drive-prefixed paths', () => {
      expect(isSafeZipPath('/var/www/index.html')).toBe(false);
      expect(isSafeZipPath('C:/Windows/System32/calc.exe')).toBe(false);
    });
  });

  describe('readZip and createZip round-trip', () => {
    it('creates and reads back entries reliably with STORE method', async () => {
      const originalEntries = [
        { path: 'index.html', data: '<!DOCTYPE html><html><head><title>Course</title></head><body><h1>Hello</h1></body></html>' },
        { path: 'assets/style.css', data: 'body { margin: 0; }' }
      ];

      const blob = createZip(originalEntries);
      expect(blob.size).toBeGreaterThan(0);

      const readEntries = await readZip(blob);
      expect(readEntries.length).toBe(2);
      expect(readEntries[0].path).toBe('index.html');
      expect(new TextDecoder().decode(readEntries[0].data)).toContain('<h1>Hello</h1>');
      expect(readEntries[1].path).toBe('assets/style.css');
      expect(new TextDecoder().decode(readEntries[1].data)).toBe('body { margin: 0; }');
    });
  });

  describe('detectRisePackage', () => {
    it('detects a standard Rise Web export package', async () => {
      const entries = [
        { path: 'index.html', data: '<!DOCTYPE html><html><body>Rise Course</body></html>' },
        { path: 'lib/rise/main.bundle.js', data: 'console.log("rise");' },
        { path: 'assets/logo.png', data: new Uint8Array([1, 2, 3]) }
      ];
      const blob = createZip(entries);
      const detection = await detectRisePackage(blob);

      expect(detection.valid).toBe(true);
      expect(detection.packageType).toBe('web');
      expect(detection.launchHtmlPath).toBe('index.html');
      expect(detection.isPreviouslyEnhanced).toBe(false);
    });

    it('detects a Rise SCORM 1.2 package', async () => {
      const entries = [
        { path: 'imsmanifest.xml', data: '<manifest identifier="course_1"><resources><resource href="index_lms.html" /></resources></manifest>' },
        { path: 'index_lms.html', data: '<!DOCTYPE html><html><body>SCORM Launch</body></html>' },
        { path: 'scormdriver/scormdriver.js', data: 'var scorm = {};' }
      ];
      const blob = createZip(entries);
      const detection = await detectRisePackage(blob);

      expect(detection.valid).toBe(true);
      expect(detection.packageType).toBe('scorm12');
      expect(detection.launchHtmlPath).toBe('index_lms.html');
      expect(detection.isPreviouslyEnhanced).toBe(false);
    });

    it('detects previously enhanced packages and reads previous configuration', async () => {
      const manifest = {
        enhancement: 'Rise Post-Publish Tools',
        version: '1.0.0',
        config: {
          settings: { launcherLabel: 'Course Resources & Help' }
        }
      };

      const entries = [
        { path: 'index.html', data: '<!DOCTYPE html><html><body>Rise Course</body></html>' },
        { path: MANIFEST_FILENAME, data: JSON.stringify(manifest) }
      ];
      const blob = createZip(entries);
      const detection = await detectRisePackage(blob);

      expect(detection.valid).toBe(true);
      expect(detection.isPreviouslyEnhanced).toBe(true);
      expect(detection.previousConfig.settings.launcherLabel).toBe('Course Resources & Help');
    });

    it('returns invalid status for non-Rise archives', async () => {
      const entries = [
        { path: 'notes.txt', data: 'Not a rise package' }
      ];
      const blob = createZip(entries);
      const detection = await detectRisePackage(blob);

      expect(detection.valid).toBe(false);
      expect(detection.packageType).toBe('unknown');
    });
  });
});
