/**
 * Playwright E2E Configuration
 *
 * Performance Optimizations:
 * - Local dev: single 'chromium-headless-shell' project, no video/trace/screenshot
 * - Workers: 50% CPU cores locally, 1 in CI for stability
 * - Parallel: fullyParallel enabled for better local performance
 * - Storage State: TTL-based caching to avoid redundant logins
 * - Navigation: Using 'load' instead of 'networkidle' for faster page loads
 * - Network: Blocking unnecessary external requests (fonts, analytics)
 *
 * Sharding (CI):
 * - Default: 4 shards distributed across workers
 * - Control shard: SHARD=1/4 pnpm test:e2e --shard=1/4
 * - Each CI runner: SHARD=1/4, SHARD=2/4, SHARD=3/4, SHARD=4/4
 *
 * Network Blocking:
 * - globalSetup.ts launches a browser and applies route blocking globally
 * - Blocked: fonts.googleapis.com, google-analytics.com, facebook.net, etc.
 *
 * Rollback / Feature Flag:
 * - E2E_SKIP_NEW_TESTS=true: skip all tests except auth.spec (minimal set)
 */
import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import _os from 'os'
import * as dotenv from 'dotenv'

// Load .env.e2e BEFORE evaluating process.env.BASE_URL
// Playwright's envFile is loaded after config, causing invalid baseURL
// Config is in tests/e2e/, so .env.e2e is in the same directory
const CONFIG_DIR = path.resolve(__dirname)
dotenv.config({ path: path.join(CONFIG_DIR, '.env.e2e') })

// BASE_URL for E2E tests - uses localhost in development
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

const isCI = process.env.CI === 'true'
// SHARD=current/total (ex: 1/4, 2/4). Default in CI: 4 shards.
const shardMatch = process.env.SHARD?.match(/^(\d+)\/(\d+)$/)
const shardCurrent = shardMatch ? Number(shardMatch[1]) : 1
const shardTotal = shardMatch ? Number(shardMatch[2]) : isCI ? 4 : 1
// Rollback: skip new tests, run only auth.spec
const _skipNewTests = process.env.E2E_SKIP_NEW_TESTS === 'true'

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests'),
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Use 1 worker locally to avoid IndexedDB conflicts between workers
  // IndexedDB is shared between browser contexts and causes conflicts
  workers: isCI ? 1 : 1,
  shard: isCI && !shardMatch ? { current: 1, total: 4 } : { current: shardCurrent, total: shardTotal },
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'global-teardown.ts'),
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],
  envFile: '.env.e2e',
  use: {
    baseURL: BASE_URL,
    // Performance: use 'load' instead of 'networkidle' for faster navigation
    // networkidle waits for all network connections to be idle (fonts, analytics, etc.)
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
    // Optimize browser context creation
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
    // ─── Local fast feedback ───────────────────────────────────────────────
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
          ],
        },
      },
      testMatch: /.*\.spec\.ts/,
      timeout: 120_000,
    },

    // ─── CI-only cross-browser / cross-device matrix ───────────────────────
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
  webServer: {
    command: 'pnpm dev',
    cwd: path.resolve(__dirname, '..'),
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
  outputDir: 'test-results',
})
