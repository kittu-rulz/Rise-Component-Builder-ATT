import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{js,mjs}'],
    exclude: ['tests/e2e/**'],
    setupFiles: ['tests/setup/vitest.setup.js'],
    environment: 'node',
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      include: [
        'js/state.js', 'js/storage.js', 'js/themes.js', 'js/utilities.js',
        'components/*.js',
        'js/component-registry.js', 'js/editor-schemas.js', 'js/catalog.js',
        'js/validation.js', 'js/validation-utils.js', 'js/field-validation.js',
        'js/completion.js', 'js/compatibility.js',
        'js/export.js', 'js/export-shell.js', 'js/zip.js', 'js/project-package.js',
        'js/media.js', 'js/media-storage.js'
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
        '**/js/validation.js': { statements: 85, branches: 75, functions: 85, lines: 85 },
        '**/js/validation-utils.js': { statements: 85, branches: 75, functions: 85, lines: 85 },
        '**/js/field-validation.js': { statements: 85, branches: 75, functions: 85, lines: 85 },
        '**/js/component-registry.js': { statements: 85, branches: 75, functions: 85, lines: 85 },
        '**/js/editor-schemas.js': { statements: 85, branches: 70, functions: 85, lines: 85 },
        '**/js/export.js': { statements: 80, branches: 70, functions: 80, lines: 80 },
        '**/js/export-shell.js': { statements: 80, branches: 70, functions: 80, lines: 80 },
        '**/js/zip.js': { statements: 85, branches: 75, functions: 85, lines: 85 },
        '**/js/utilities.js': { statements: 85, branches: 70, functions: 85, lines: 85 }
      }
    }
  }
});
