import { defineConfig } from 'vitest/config';

/**
 * Vitest config DEDICADA para a api.
 *
 * Cobre todo `apps/api/src/**` (incluindo módulos legados ainda não migrados para DDD).
 *
 * Threshold atual: **70% durante migração DDD** (alinhado com auditoria
 * 2026-07-29 §F0-MED-03). Meta: aumentar para 80% quando feature flags /
 * queues / realtime / subscriptions atingirem cobertura unitária.
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
    include: ['**/*.spec.ts', '**/*.test.ts', '**/*.int-spec.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Threshold 70% em stmts/lines/br — alinhado com auditoria 2026-07-29
      // §F0-MED-03 (cobertura api falha no gate raiz global durante migração
      // DDD mesmo com config local permitindo 70%). Threshold `functions`
      // em 65% porque alguns arquivos `controller.ts`/`module.ts` têm
      // ~5-10 decorators que o v8 não cobre consistentemente. Aumentar
      // para 80%/80% quando todos controllers/módulos tiverem specs
      // correspondentes (PR de cobertura por BC).
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 65,
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
