import { defineConfig } from 'vitest/config';

/**
 * Vitest config DEDICADA para a api.
 *
 * Cobre todo `apps/api/src/**` (incluindo módulos legados ainda não migrados para DDD).
 *
 * Threshold atual: **70%** (intermediário durante migração DDD).
 * Meta final: 80% — ver `.openspec/specs/<bc>/tasks.md` § Fase 2 (Migração DDD da api).
 * Referência: `docs/guides/DDD_MIGRACAO_API.md`.
 *
 * Rodar com:
 *   pnpm --filter @pedi-ai/api test
 *   pnpm --filter @pedi-ai/api test:cov
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.spec.ts', '**/*.test.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Threshold 70% — intermediário enquanto módulos legados não migram para DDD.
      // Aumentar para 80% quando `apps/api/src/domain/**` estiver populado.
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
        perFile: false,
      },
      include: ['apps/api/src/**/*.ts'],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/codemap.md',
        // Entrypoints — não testáveis por unidade
        'apps/api/src/main.ts',
        'apps/api/src/app.module.ts',
      ],
    },
  },
});
