/**
 * Playwright Config — Production Smoke Tests
 *
 * **DIFERENÇAS do config local:**
 * - ❌ NÃO usa global-setup (não cria seed)
 * - ❌ NÃO usa global-teardown (não limpa dados)
 * - ❌ NÃO inicia webServer (assume URL pública já rodando)
 * - ✅ Aponta para BASE_URL de produção via env var
 * - ✅ Roda só smoke tests (rápido, < 1 min)
 * - ✅ Fail-fast em produção (não permite `--update-snapshots`)
 *
 * **Uso:**
 * ```bash
 * # Após deploy em produção
 * BASE_URL=https://pedi.ai pnpm test:e2e:prod:smoke
 *
 * # Em staging
 * BASE_URL=https://staging.pedi.ai pnpm test:e2e:prod:smoke
 * ```
 *
 * @see apps/web/tests/e2e/tests/production/
 */

import * as os from 'os';
import * as path from 'path';

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

const CONFIG_DIR = path.resolve(__dirname);
dotenv.config({ path: path.join(CONFIG_DIR, '.env.prod-e2e') });

const BASE_URL = process.env.BASE_URL || 'https://pedi.ai';
const API_URL = process.env.API_URL || `${BASE_URL.replace('pedi.ai', 'api.pedi.ai')}`;

if (!process.env.BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    '[playwright:prod] BASE_URL não configurada. Usando default https://pedi.ai. ' +
      'Configure via env var BASE_URL=https://staging.pedi.ai'
  );
}

const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests', 'production'),
  // Smoke tests: 100% sequencial (não paralelo) pra evitar rate limit / side effects
  fullyParallel: false,
  workers: 1,
  // Em produção: 0 retries (queremos saber IMEDIATAMENTE se algo quebrou)
  retries: 0,
  forbidOnly: true, // NUNCA permite .only() em prod
  timeout: 60_000, // Aumentado (latência de rede real)
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-prod', open: 'never' }],
    ['json', { outputFile: 'playwright-results-prod.json' }],
    ['github'], // Anota no PR se rodando em GH Actions
  ],
  use: {
    baseURL: BASE_URL,
    // API_URL exposta para testes (via process.env no test context)
    extraHTTPHeaders: {
      'x-e2e-prod': 'true', // Marker pra analytics/debugging
    },
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    // Trace só em falhas (não em sucessos, pra economizar espaço)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Não bloquear em JS/CSS errors em prod (podem ser de extensões, etc)
    // IMPORTANTE: desabilitar em testes que validam erros!
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});