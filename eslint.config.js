import js from '@eslint/js';
import globals from 'globals';

/**
 * Flat ESLint config. Scope for this phase: catch real defects (undefined
 * globals, unreachable code, duplicate keys, etc.) without forcing a
 * repo-wide style rewrite. See docs/TESTING-STRATEGY.md.
 */
export default [
  js.configs.recommended,
  {
    ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'node_modules/**']
  },
  {
    files: ['app.js', 'js/**/*.js', 'components/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off'
    }
  },
  {
    files: ['build.mjs', 'vitest.config.js', 'playwright.config.js', 'eslint.config.js', 'tests/e2e/server.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node }
    }
  },
  {
    files: ['tests/unit/**/*.js', 'tests/*.test.mjs', 'tests/fixtures/**/*.js', 'tests/fixtures/**/*.mjs', 'tests/setup/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['tests/e2e/*.spec.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  }
];
