#!/usr/bin/env node
/**
 * Production Zip Packager for Rise Component Builder.
 * 
 * Assembles the production build (via scripts/stamp-cache-busting.mjs and build.mjs)
 * and generates a clean ZIP archive containing only the files and folders required
 * for the tool to function 100% on any production web server.
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createZip, readZip } from '../js/zip.js';
import { execSync } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(root, '..');
const distDir = join(projectRoot, 'dist');
const zipFile = join(projectRoot, 'rise-component-builder-production.zip');

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  console.log('--- Step 1: Running production build and verification ---');
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });

  console.log('\n--- Step 2: Collecting production assets from dist/ ---');
  const filePaths = await collectFiles(distDir);
  console.log(`Found ${filePaths.length} production files.`);

  const zipEntries = [];
  for (const filePath of filePaths) {
    const relPath = relative(distDir, filePath).replace(/\\/g, '/');
    const data = await readFile(filePath);
    zipEntries.push({ path: relPath, data });
  }

  // Sort entries for deterministic output
  zipEntries.sort((a, b) => a.path.localeCompare(b.path));

  console.log('\n--- Step 3: Generating ZIP archive ---');
  const zipBlob = createZip(zipEntries);
  const zipBuffer = Buffer.from(await zipBlob.arrayBuffer());

  await writeFile(zipFile, zipBuffer);
  const stats = await stat(zipFile);
  console.log(`ZIP created successfully at:\n  ${zipFile}\n  Size: ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bytes)`);

  console.log('\n--- Step 4: Verifying ZIP archive integrity ---');
  const readEntries = await readZip(zipBlob);
  console.log(`Verified ${readEntries.length} entries inside the ZIP archive.`);

  // Verify critical root entry files
  const requiredRootFiles = ['index.html', 'app.js', 'styles.css', 'fonts.css'];
  for (const req of requiredRootFiles) {
    const found = readEntries.some(e => e.path === req);
    if (!found) throw new Error(`Missing critical root file in ZIP: ${req}`);
  }

  // Verify design stylesheets
  const requiredDesignFiles = [
    'design/att-tokens.css',
    'design/landing.css',
    'design/dashboard.css',
    'design/post-publish.css',
    'design/project-overview.css'
  ];
  for (const req of requiredDesignFiles) {
    const found = readEntries.some(e => e.path === req);
    if (!found) throw new Error(`Missing required design file in ZIP: ${req}`);
  }

  // Verify all 21 components
  const componentEntries = readEntries.filter(e => e.path.startsWith('components/'));
  if (componentEntries.length < 21) {
    throw new Error(`Expected at least 21 components, found ${componentEntries.length}`);
  }

  // Verify js directory
  const jsEntries = readEntries.filter(e => e.path.startsWith('js/'));
  if (jsEntries.length < 30) {
    throw new Error(`Expected JS modules, found ${jsEntries.length}`);
  }

  console.log('\n[PASS] All verification checks passed! The ZIP archive is ready for production server deployment.');
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exitCode = 1;
});
