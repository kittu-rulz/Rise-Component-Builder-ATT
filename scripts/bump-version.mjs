#!/usr/bin/env node
/**
 * Automatically bumps the build timestamp in package.json and js/version.js
 * to the current local timestamp, then re-stamps index.html and dist/.
 *
 * Usage:
 *   node scripts/bump-version.mjs           # Bumps timestamp to now (YYYYMMDD.HHmm)
 *   node scripts/bump-version.mjs 2.3.0     # Bumps semver to 2.3.0 with current timestamp
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = join(root, 'package.json');
const versionJsPath = join(root, 'js', 'version.js');

function formatTimestamp(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}${month}${day}.${hours}${minutes}`;
}

async function runCommand(cmd, args) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [join(root, ...args)], { cwd: root });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}

async function main() {
  const customSemver = process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : null;

  // Read package.json
  const pkgRaw = await readFile(packageJsonPath, 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const currentFullVersion = pkg.version || '2.2.0';
  const baseSemver = customSemver || currentFullVersion.split('+')[0];

  const timestamp = formatTimestamp();
  const newFullVersion = `${baseSemver}+${timestamp}`;

  // Update package.json
  pkg.version = newFullVersion;
  await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated package.json version to ${newFullVersion}`);

  // Update js/version.js
  let versionJs = await readFile(versionJsPath, 'utf8');
  versionJs = versionJs.replace(
    /export const APP_VERSION = ['"][^'"]+['"];/,
    `export const APP_VERSION = '${newFullVersion}';`
  );
  await writeFile(versionJsPath, versionJs);
  console.log(`Updated js/version.js APP_VERSION to ${newFullVersion}`);

  // Re-stamp index.html and rebuild dist/
  await runCommand('node', ['scripts/stamp-cache-busting.mjs']);
  await runCommand('node', ['build.mjs']);
  console.log(`Successfully restamped index.html and rebuilt dist/ with version ${newFullVersion}`);
}

main().catch(err => {
  console.error(err.message);
  process.exitCode = 1;
});
