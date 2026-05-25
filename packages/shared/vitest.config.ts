/**
 * Vitest config for packages/shared.
 * Pure TypeScript - no browser deps, usar ambiente node.
 */
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        perFile: false,
      },
      include: ['src/**/*'],
      exclude: ['**/*.d.ts', '**/*.md', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@pedi-ai/shared': path.resolve(__dirname, './src'),
    },
  },
});
