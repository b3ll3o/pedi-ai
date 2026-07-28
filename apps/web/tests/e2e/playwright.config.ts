/**
 * Playwright E2E Configuration
 *
 * Sharding: CI controls sharding via SHARD env var (1/4, 2/4, 3/4, 4/4).
 * The matrix in e2e.yml creates 4 parallel jobs, each running 1/4 of specs.
 * DO NOT add 'shard' config here — it would cause double-sharding.
 *
 * Network Blocking: globalSetup.ts launches a browser and applies route blocking.
 * Blocked: fonts.googleapis.com, google-analytics.com, facebook.net, etc.
 *
 * webServer: Playwright starts 'pnpm dev' automatically (unless port 3000 is already in use).
 * In CI, ensure port 3000 is not in use before running — docker-compose manages the stack.
 */
import * as os from 'os';
import * as path from 'path';

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load .env.e2e BEFORE evaluating process.env.BASE_URL
// Playwright's envFile is loaded after config, causing invalid baseURL
// Config is in tests/e2e/, so .env.e2e is in the same directory
const CONFIG_DIR = path.resolve(__dirname);
dotenv.config({ path: path.join(CONFIG_DIR, '.env.e2e') });

// BASE_URL for E2E tests
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const isCI = process.env.CI === 'true';

// SHARD=current/total (ex: 1/4, 2/4). Used in CI matrix.
// If not set, Playwright runs all specs (no sharding).
const shardMatch = process.env.SHARD?.match(/^(\d+)\/(\d+)$/);

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // Local: 75% of CPU cores. CI: 1 worker (DB is shared between shards).
  workers: isCI ? 1 : Math.max(1, Math.floor(os.cpus().length * 0.75)),
  // NOTE: do NOT add 'shard' config here — CI matrix controls sharding via SHARD env var.
  // Adding it here would cause double-sharding (CI job × Playwright internal).
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'global-teardown.ts'),
  reporter: [
    ['html', { outputFolder: `playwright-report-shard-${shardMatch ? shardMatch[1] : 'all'}` }],
    ['json', { outputFile: `playwright-results-shard-${shardMatch ? shardMatch[1] : 'all'}.json` }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    // Expose API_URL to tests via process.env
    // (E2E tests can read it directly from process.env)
    // Ensure NEXT_PUBLIC_ vars are available in test context
    // NOTE: API runs on port 3001 (NestJS), not 3000 (Next.js)
    // Override via .env.e2e: NEXT_PUBLIC_API_URL=http://localhost:3001
    // Performance: use 'load' instead of 'networkidle'
    navigationTimeout: 30_000,
    // 10s é suficiente para elementos pós-hidratação em testes E2E bem
    // comportados. Elementos que demoram mais indicam regressão no app
    // e devem falhar rápido para isolar o problema no log em vez de
    // consumir todo o orçamento do job (~80 testes × 30s = 40+min).
    actionTimeout: 10_000,
    contextOptions: {
      reducedMotion: 'reduce',
      viewport: { width: 1280, height: 720 },
    },
    // Capture only on failure to save resources
    video: isCI ? 'retain-on-failure' : 'off',
    trace: isCI ? 'on-first-retry' : 'off',
    screenshot: isCI ? 'only-on-failure' : 'off',
  },
  projects: [
    // ─── Fast local feedback & CI ─────────────────────────────────────────
    {
      name: 'chromium-headless-shell',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        baseURL: BASE_URL,
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
          ],
        },
      },
      testMatch: /.*\.spec\.ts/,
      timeout: 120_000,
    },

    // ─── CI-only: cross-browser matrix ────────────────────────────────────
    // These run ONLY in CI (grep filters them out locally via /(?!)/)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      grep: isCI ? undefined : /(?!)/,
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
  // Playwright starts this automatically if port 3000 is not in use.
  // In CI with docker-compose: set NEXT_PUBLIC_API_URL and ensure
  // docker-compose.dev.yml starts the web service.
  webServer: {
    command: 'pnpm dev',
    cwd: path.resolve(__dirname, '..'),
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  outputDir: `test-results-shard-${shardMatch ? shardMatch[1] : 'all'}`,
});
