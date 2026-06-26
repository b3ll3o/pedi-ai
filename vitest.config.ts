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
      // Incluir código fonte — apenas lógica de negócio (DDD layers + libs)
      // NOTA: cobertura da api é feita em `apps/api/vitest.config.ts` (threshold 70%
      // enquanto dura a migração DDD — ver `docs/guides/DDD_MIGRACAO_API.md`).
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
        // Cobertura da api fica a cargo de `apps/api/vitest.config.ts`
        'apps/api/src/**',
        'apps/api/src/app.module.ts',
        'apps/api/src/main.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      // Mock do pacote `server-only` em testes: o pacote não está instalado
      // (é um marker do Next.js para erros de build em client components).
      // Apontamos para um stub local que exporta vazio.
      'server-only': path.resolve(__dirname, './apps/web/tests/__mocks__/server-only.ts'),
    },
  },
});
