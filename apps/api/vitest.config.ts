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
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
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