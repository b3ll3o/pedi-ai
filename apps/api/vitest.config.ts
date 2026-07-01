import { defineConfig } from 'vitest/config';

/**
 * Vitest config DEDICADA para a api.
 *
 * Cobre todo `apps/api/src/**` (incluindo módulos legados ainda não migrados para DDD).
 *
 * Threshold atual: **80%** (mínimo de cobertura após bater 70% intermediário).
 * Próximo alvo: aumentar para 90% com a migração DDD completa.
 * Ver `.openspec/specs/<bc>/tasks.md` § Fase 2 (Migração DDD da api).
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
      // Threshold 80% — mínimo contratual após migração DDD de módulos
      // legados. Aumentar para 90% quando feature flags / realtime / payments
      // atingirem cobertura unitária.
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
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
