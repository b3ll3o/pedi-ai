import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./apps/web/tests/setup-vitest.ts'],
    include: [
      'apps/web/tests/unit/**/*.test.{ts,tsx}',
      'apps/web/tests/integration/**/*.test.{ts,tsx}',
      'apps/api/tests/**/*.test.{ts,tsx}',
      'apps/api/tests/**/*.spec.ts',
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
      // Incluir código fonte de ambas as apps — apenas lógica de negócio (DDD layers + libs)
      include: [
        'apps/web/src/domain/**/*',
        'apps/web/src/application/**/*',
        'apps/web/src/lib/**/*',
        'apps/api/src/domain/**/*',
        'apps/api/src/application/**/*',
        'packages/shared/src/**/*',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.stories.tsx',
        '**/node_modules/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/codemap.md',
        'apps/web/src/app/**', // Next.js App Router (presentation)
        'apps/web/src/presentation/**', // Componentes React
        'apps/web/src/infrastructure/**', // Implementações (frameworks, adapters)
        'apps/web/src/hooks/**', // React hooks
        'apps/web/src/public/**', // Arquivos estáticos
        'apps/web/src/lib/sw/**', // Service Worker
        'apps/api/src/presentation/**', // Controllers NestJS
        'apps/api/src/infrastructure/**', // Repositories Prisma
        // Old NestJS modules — não são DDD, excluímos da cobertura
        'apps/api/src/auth/**',
        'apps/api/src/categories/**',
        'apps/api/src/common/**',
        'apps/api/src/health/**',
        'apps/api/src/orders/**',
        'apps/api/src/payments/**',
        'apps/api/src/products/**',
        'apps/api/src/realtime/**',
        'apps/api/src/restaurants/**',
        'apps/api/src/users/**',
        'apps/api/src/app.module.ts',
        'apps/api/src/main.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
});
