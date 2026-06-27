/**
 * Vitest config for packages/feature-flags.
 * Ambiente jsdom — Provider/hooks requerem DOM (useEffect, useContext).
 */
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
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
      exclude: ['**/*.d.ts', '**/*.md', 'node_modules/**', '**/*.test.ts', '**/*.test.tsx'],
    },
  },
  resolve: {
    alias: {
      '@pedi-ai/feature-flags': path.resolve(__dirname, './src'),
    },
  },
});
