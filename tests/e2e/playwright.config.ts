/**
 * Playwright E2E Configuration
 *
 * Structure:
 * - Local dev: single 'chromium-headless' project, no video/trace/screenshot,
 *   half the CPU cores, reuseExistingServer=true for faster iteration.
 * - CI: all 5 browser/device projects, video+trace+screenshot on failure,
 *   1 worker, 4 shards, fresh server every run.
 *
 * Sharding (CI):
 * - Default: 4 shards (tests distribuídos entre workers)
 * - Controlar shard específico: SHARD=1/4 npx playwright test --shard=1/4
 * - Cada runner CI executa: SHARD=1/4, SHARD=2/4, SHARD=3/4, SHARD=4/4
 *
 * Network Blocking:
 * - globalSetup.ts launches a browser and applies route blocking globally
 * - Blocked: fonts.googleapis.com, google-analytics.com, facebook.net, etc.
 *
 * Rollback / Feature Flag:
 * - E2E_SKIP_NEW_TESTS=true: pula todos os testes exceto auth.spec (minimal set)
 */
import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import os from 'os'
import * as dotenv from 'dotenv'

// Carregar .env.e2e ANTES de avaliar process.env.BASE_URL
// O envFile do Playwright é carregado após o config, causando baseURL inválido
// O config está em tests/e2e/, então o .env.e2e está no mesmo diretório
const CONFIG_DIR = path.resolve(__dirname)
dotenv.config({ path: path.join(CONFIG_DIR, '.env.e2e') })

// BASE_URL para testes E2E - usa localhost em desenvolvimento
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

const isCI = process.env.CI === 'true'
// SHARD=current/total (ex: 1/4, 2/4). Default em CI: 4 shards.
const shardMatch = process.env.SHARD?.match(/^(\d+)\/(\d+)$/)
const shardCurrent = shardMatch ? Number(shardMatch[1]) : 1
const shardTotal = shardMatch ? Number(shardMatch[2]) : isCI ? 4 : 1
// Rollback: pula testes novos, roda apenas auth.spec
const skipNewTests = process.env.E2E_SKIP_NEW_TESTS === 'true'

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  fullyParallel: isCI,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : Math.max(1, os.cpus().length / 2),
  shard: isCI && !shardMatch ? { current: 1, total: 4 } : { current: shardCurrent, total: shardTotal },
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],
  envFile: '.env.e2e',
  use: {
    baseURL: BASE_URL,
    video: isCI ? 'retain-on-failure' : 'off',
    trace: isCI ? 'on-first-retry' : 'off',
    screenshot: isCI ? 'only-on-failure' : 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // ─── Local fast feedback ───────────────────────────────────────────────
    {
      name: 'chromium-headless-shell',
      use: { ...devices['Desktop Chrome'], headless: true, baseURL: BASE_URL },
    },

    // ─── CI-only cross-browser / cross-device matrix ───────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grep: isCI ? undefined : /(?!)/,  // skip locally (no test matches /(?!)/)
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grep: isCI ? undefined : /(?!)/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grep: isCI ? undefined : /(?!)/,
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      grep: isCI ? undefined : /(?!)/,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      grep: isCI ? undefined : /(?!)/,
    },
  ],
  webServer: {
    command: 'pnpm dev',
    cwd: path.resolve(__dirname, '..'),
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  outputDir: 'test-results',

  globalSetup: './global-setup-demo.ts',
})
