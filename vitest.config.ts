import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./apps/web/tests/setup-vitest.ts'],
    include: [
      'apps/web/tests/unit/**/*.test.{ts,tsx}',
      'apps/web/tests/integration/**/*.test.{ts,tsx}',
      'apps/api/tests/**/*.test.{ts,tsx}',
    ],
    exclude: ['apps/web/tests/unit/**/*.loading.test.tsx'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Limiares de cobertura — AGENTS.md: mínimo 80%
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        perFile: false,
      },
      // Incluir código fonte de ambas as apps
      include: ['apps/web/src/**/*', 'apps/api/src/**/*'],
      exclude: [
        '**/*.d.ts',
        '**/*.stories.tsx',
        '**/node_modules/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        'apps/web/src/app/**', // Next.js App Router
        'apps/web/src/presentation/**', // Componentes React
        'apps/web/src/infrastructure/**', // Implementações (frameworks)
        'apps/web/src/hooks/**', // React hooks
        'apps/web/public/**',
        'apps/api/src/presentation/**', // Controllers NestJS
        'apps/api/src/infrastructure/**', // Repositories Prisma
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
});
