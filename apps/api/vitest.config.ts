import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        perFile: false,
      },
      include: ['apps/api/src/**/*'],
      exclude: [
        'apps/api/src/**/*.d.ts',
        'apps/api/src/main.ts',
        'node_modules/**',
        '**/*.md',
      ],
    },
  },
});