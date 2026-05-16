import { test as base, Page, APIRequestContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import {
  createTestOrder,
  OrderCreationResult,
  generateUUID,
  CreateTestOrderParams,
} from '../helpers/orderUtils'

// Path to seed result - uses process.cwd() for consistent path (same as seed.ts)
const SEED_RESULT_PATH = path.join(__dirname, '..', '..', '..', 'scripts', '.seed-result.json')

/**
 * User role types.
 */
export type UserRole = 'customer' | 'admin' | 'waiter'

/**
 * Extended fixtures with authentication and seed data.
 */
export interface Fixtures {
  guest: Page
  authenticated: Page
  admin: Page
  waiter: Page
  cleanPage: Page
  seedData: SeedData
  api: APIRequestContext
}

/**
 * Seed data for tests.
 */
export interface SeedData {
  restaurant: { id: string; name: string }
  customer: { email: string; password: string; id: string }
  admin: { email: string; password: string; id: string }
  waiter: { email: string; password: string; id: string }
  table: { id: string; code: string }
  categories: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; price: number }>
}

/**
 * In-memory cache for seed data to avoid repeated file reads.
 * Key: worker index
 */
const seedDataCache = new Map<number, SeedData>()

/** TTL of 10 minutes for session cache (reduced from 1 hour for fresher data) */
const STORAGE_TTL_MS = 10 * 60 * 1000

/** Auth storage directory */
const STORAGE_DIR = '.playwright/.auth'

interface StorageMeta {
  createdAt: number
  email: string
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function _generateEmail(): string {
  return `test-${generateId()}@pedi-ai.test`
}

/**
 * Ensures storage directory exists.
 */
function ensureStorageDir(): void {
  const dir = path.join(process.cwd(), STORAGE_DIR)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Returns storage state file path for an email.
 */
function getStoragePath(email: string): string {
  ensureStorageDir()
  const safeName = email.replace(/[^a-zA-Z0-9]/g, '_')
  return path.join(process.cwd(), STORAGE_DIR, `${safeName}.json`)
}

/**
 * Returns storage metadata file path for an email.
 */
function getMetaPath(email: string): string {
  ensureStorageDir()
  const safeName = email.replace(/[^a-zA-Z0-9]/g, '_')
  return path.join(process.cwd(), STORAGE_DIR, `${safeName}.meta.json`)
}

/**
 * Loads existing storage state if valid (not expired).
 */
async function _loadStorageState(email: string, page: Page): Promise<boolean> {
  const storagePath = getStoragePath(email)
  if (!isStorageValid(email) || !fs.existsSync(storagePath)) {
    return false
  }

  try {
    await page.context().addCookies([])
    const storageState = JSON.parse(fs.readFileSync(storagePath, 'utf-8'))
    if (storageState.cookies && storageState.cookies.length > 0) {
      // Use storage state to restore session
      return true
    }
  } catch {
    // Invalid storage state
  }
  return false
}

/**
 * Checks if storage state is valid (exists and not expired).
 */
function isStorageValid(email: string): boolean {
  const metaPath = getMetaPath(email)
  if (!fs.existsSync(metaPath)) return false

  try {
    const meta: StorageMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    const now = Date.now()
    return (now - meta.createdAt) < STORAGE_TTL_MS
  } catch {
    return false
  }
}

/**
 * Saves storage metadata (creation timestamp).
 */
function _writeStorageMeta(email: string): void {
  const meta: StorageMeta = { createdAt: Date.now(), email }
  fs.writeFileSync(getMetaPath(email), JSON.stringify(meta))
}

/**
 * Reads seed data from `.seed-result.json`.
 * Seed must be executed via `pnpm test:e2e:seed` before tests.
 */
async function loadSeedData(): Promise<SeedData> {
  if (!fs.existsSync(SEED_RESULT_PATH)) {
    throw new Error(
      `Seed result not found: ${SEED_RESULT_PATH}\n` +
      `Run 'pnpm test:e2e:seed' before running tests.`
    )
  }

  const raw = JSON.parse(fs.readFileSync(SEED_RESULT_PATH, 'utf-8'))

  return {
    restaurant: raw.restaurant,
    customer: {
      id: raw.users.customer.id,
      email: raw.users.customer.email,
      password: raw.users.customer.password,
    },
    admin: {
      id: raw.users.admin.id,
      email: raw.users.admin.email,
      password: raw.users.admin.password,
    },
    waiter: {
      id: raw.users.waiter.id,
      email: raw.users.waiter.email,
      password: raw.users.waiter.password,
    },
    table: {
      id: raw.tables[0]?.id ?? raw.table?.id ?? '',
      code: raw.tables[0]?.qr_code ?? raw.table?.code ?? '',
    },
    categories: raw.categories,
    products: raw.products.map((p: { id: string; name: string; price: number }) => ({
      id: p.id,
      name: p.name,
      price: p.price,
    })),
  }
}

/**
 * Clears all client-side state: cookies, localStorage, sessionStorage, and IndexedDB.
 * This ensures each test starts with a clean slate.
 */
async function clearClientState(page: Page): Promise<void> {
  // First, close all other pages in the context to release IndexedDB connections
  try {
    const pages = page.context().pages()
    for (const p of pages) {
      if (p !== page) {
        await p.close().catch(() => {})
      }
    }
  } catch {
    // Could not close other pages
  }

  try {
    await page.context().clearCookies()
  } catch {
    // Cookies clear failed, continue
  }

  try {
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        // localStorage/sessionStorage not accessible
      }
    })
  } catch {
    // evaluate failed, continue
  }

  // Wait a bit to let any pending IndexedDB operations complete
  await page.waitForTimeout(100).catch(() => {})

  try {
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('pedi')
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
        req.onblocked = () => {
          // Force close by creating a new connection
          setTimeout(() => resolve(), 100)
        }
      })
    })
  } catch {
    // IndexedDB cleanup failed, continue anyway
  }
}

/**
 * Performs login and saves storage state.
 * Auth caching disabled by default to avoid stale session issues in full suite.
 * Each test gets fresh authentication.
 */
async function performLogin(
  page: Page,
  email: string,
  password: string,
  loginUrl: string,
  expectedUrl: RegExp,
): Promise<void> {
  // Clear state before login to ensure clean slate
  await clearClientState(page)

  // Fresh login each time to avoid stale session issues
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', password)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL(expectedUrl, { timeout: 45_000 })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _AnyPage = any

export const test = base.extend<Fixtures, { reuse: boolean }>({
  reuse: [true, { scope: 'worker', option: true }],

  // Fresh browser context for each test to avoid state pollution
  freshPage: async ({ browser }, fixtureUse) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    })
    const page = await context.newPage()
    try {
      await fixtureUse(page)
    } finally {
      await context.close()
    }
  },

  seedData: async ({ browser: _browser }, fixtureUse) => {
    // Get worker index for cache key
    const workerIndex = process.env.TEST_WORKER_INDEX ? parseInt(process.env.TEST_WORKER_INDEX) : 0

    // Check in-memory cache first
    if (seedDataCache.has(workerIndex)) {
      await fixtureUse(seedDataCache.get(workerIndex)!)
      return
    }

    // Seed may not have been executed by globalSetup (e.g., first run or pending cleanup)
    if (!fs.existsSync(SEED_RESULT_PATH)) {
      console.log('⏳ Seed not found, running automatic seed...')
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)
      try {
        const { stdout, stderr } = await execAsync('pnpm test:e2e:seed', {
          cwd: path.join(__dirname, '..', '..', '..', '..', '..'),
          timeout: 180_000,
        })
        if (stdout) console.log(stdout)
        if (stderr) console.warn(stderr)
        console.log('✅ Automatic seed completed')
      } catch (error) {
        console.error('❌ Failed to run automatic seed:', error)
        throw error
      }
    }

    try {
      const data = await loadSeedData()

      // Cache in memory for faster subsequent access
      seedDataCache.set(workerIndex, data)

      await fixtureUse(data)
    } catch (error) {
      console.error('❌ Failed to load seed data:', error)
      throw error
    }
  },

  guest: async ({ page }, fixtureUse) => {
    // Performance: use goto with 'load' instead of default 'networkidle'
    await page.goto('/menu', { waitUntil: 'domcontentloaded' })
    await fixtureUse(page)
  },

  authenticated: async ({ page, seedData }, fixtureUse) => {
    const email = seedData.customer.email
    const password = seedData.customer.password

    // Try cached storage first, fall back to fresh login
    await performLogin(page, email, password, '/login', /\/menu/)
    await fixtureUse(page)
  },

  admin: async ({ page, seedData }, fixtureUse) => {
    const email = seedData.admin.email
    const password = seedData.admin.password

    await performLogin(page, email, password, '/admin/login', /\/admin\/dashboard/)
    await fixtureUse(page)
  },

  waiter: async ({ page, seedData }, fixtureUse) => {
    const email = seedData.waiter.email
    const password = seedData.waiter.password

    await performLogin(page, email, password, '/admin/login', /\/admin\/dashboard/)
    await fixtureUse(page)
  },

  cleanPage: async ({ page }, fixtureUse) => {
    await page.goto('about:blank')
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    try {
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          const req = indexedDB.deleteDatabase('pedi')
          req.onsuccess = () => resolve(undefined)
          req.onerror = () => reject(req.error)
          req.onblocked = () => reject(new Error('IndexedDB blocked'))
        })
      })
    } catch {
      // IndexedDB cleanup failed, continue anyway
    }
    await fixtureUse(page)
  },

  api: async ({ request }, fixtureUse) => {
    // Provide API request context for direct API calls (faster than UI for setup)
    await fixtureUse(request)
  },
})

export { expect } from '@playwright/test'
export {
  createTestOrder,
  OrderCreationResult,
  generateUUID,
  CreateTestOrderParams,
}
export { clearClientState }