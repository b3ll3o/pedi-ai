import { test as base, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { createTestOrder, OrderCreationResult, generateUUID, CreateTestOrderParams } from '../helpers/orderUtils'

// Caminho para o resultado do seed
// Usa process.cwd() para garantir caminho consistente (same as seed.ts)
const SEED_RESULT_PATH = path.join(__dirname, '..', '..', '..', 'scripts', '.seed-result.json')

/**
 * Tipo para roles de usuário.
 */
export type UserRole = 'customer' | 'admin' | 'waiter'

/**
 * Fixture extendido com métodos de autenticação e seed data.
 */
export interface Fixtures {
  guest: Page
  authenticated: Page
  admin: Page
  waiter: Page
  cleanPage: Page
  seedData: SeedData
}

/**
 * Dados de seed para testes.
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

/** TTL de 1 hora para cache de sessão */
const STORAGE_TTL_MS = 60 * 60 * 1000

/** Diretório para armazenar state de autenticação */
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
 * Garante que o diretório de storage existe.
 */
function ensureStorageDir(): void {
  const dir = path.join(process.cwd(), STORAGE_DIR)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Retorna path do arquivo de storage state para um email.
 */
function getStoragePath(email: string): string {
  ensureStorageDir()
  const safeName = email.replace(/[^a-zA-Z0-9]/g, '_')
  return path.join(process.cwd(), STORAGE_DIR, `${safeName}.json`)
}

/**
 * Retorna path do arquivo de metadata do storage.
 */
function getMetaPath(email: string): string {
  ensureStorageDir()
  const safeName = email.replace(/[^a-zA-Z0-9]/g, '_')
  return path.join(process.cwd(), STORAGE_DIR, `${safeName}.meta.json`)
}

/**
 * Verifica se o storage state é válido (existe e não expirou).
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
 * Salva metadata do storage (timestamp de criação).
 */
function writeStorageMeta(email: string): void {
  const meta: StorageMeta = { createdAt: Date.now(), email }
  fs.writeFileSync(getMetaPath(email), JSON.stringify(meta))
}

/**
 * Garante que o seed foi executado.
 * Se `.seed-result.json` não existe, executa o seed automaticamente.
 */
async function ensureSeedExists(): Promise<void> {
  if (fs.existsSync(SEED_RESULT_PATH)) return

  console.log('⏳ Seed não encontrado, executando seed automaticamente...')
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)

  try {
    const { stdout, stderr } = await execAsync('pnpm test:e2e:seed', {
      cwd: path.join(__dirname, '..', '..', '..', '..', '..'),
      timeout: 120_000,
    })
    if (stdout) console.log(stdout)
    if (stderr) console.warn(stderr)
    console.log('✅ Seed automático concluído')
  } catch (error) {
    console.error('❌ Falha ao executar seed automático:', error)
    throw error
  }
}

/**
 * Lê dados de seed do arquivo `.seed-result.json`.
 * O seed deve ser executado via `pnpm test:e2e:seed` antes dos testes.
 */
async function loadSeedData(): Promise<SeedData> {
  if (!fs.existsSync(SEED_RESULT_PATH)) {
    throw new Error(
      `Seed result não encontrado: ${SEED_RESULT_PATH}\n` +
      `Execute 'pnpm test:e2e:seed' antes de rodar os testes.`
    )
  }

  const raw = JSON.parse(fs.readFileSync(SEED_RESULT_PATH, 'utf-8'))

  // Adapta formato do seed para formato interno do fixture
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
 * Realiza login genérico e salva storage state.
 */
async function performLogin(
  page: Page,
  email: string,
  password: string,
  loginUrl: string,
  expectedUrl: RegExp,
): Promise<void> {
  await page.goto(loginUrl)
  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', password)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL(expectedUrl)

  // Salva storage state após login
  const storagePath = getStoragePath(email)
  await page.context().storageState({ path: storagePath })
  writeStorageMeta(email)
}

/**
 * Carrega storage state salvo (se válido).
 */
async function loadStorageState(page: Page, email: string, destinationUrl: string): Promise<void> {
  const storagePath = getStoragePath(email)
  await page.context().storageState({ path: storagePath })
  await page.goto(destinationUrl)
}

export const test = base.extend<Fixtures, { reuse: boolean }>({
  reuse: [true, { scope: 'worker', option: true }],
  seedData: async ({ browser: _browser }, fixtureUse) => {
    // Seed pode não ter sido executado por globalSetup (ex: primeiro run ou cleanup pendente)
    // Verifica e executa seed se necessário
    if (!fs.existsSync(SEED_RESULT_PATH)) {
      console.log('⏳ Seed não encontrado, executando seed automaticamente...')
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
        console.log('✅ Seed automático concluído')
      } catch (error) {
        console.error('❌ Falha ao executar seed automático:', error)
        throw error
      }
    }
    const data = await loadSeedData()
    await fixtureUse(data)
  },

  guest: async ({ page }, fixtureUse) => {
    await page.goto('/menu')
    await fixtureUse(page)
  },

  authenticated: async ({ page, seedData }, fixtureUse) => {
    const email = seedData.customer.email
    const password = seedData.customer.password

    // Always perform fresh login to ensure valid session cookie
    // Storage state reuse can cause stale Supabase session cookies leading to redirect loops
    await performLogin(page, email, password, '/login', /\/menu/)
    await fixtureUse(page)
  },

  admin: async ({ page, seedData }, fixtureUse) => {
    const email = seedData.admin.email
    const password = seedData.admin.password

    // Always perform fresh login to ensure valid session cookie
    // Storage state reuse can cause 401 errors due to stale Supabase session cookies
    await performLogin(page, email, password, '/admin/login', /\/admin\/dashboard/)
    await fixtureUse(page)
  },

  waiter: async ({ page, seedData }, fixtureUse) => {
    const email = seedData.waiter.email
    const password = seedData.waiter.password

    // Always perform fresh login to ensure valid session cookie
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
})

export { expect } from '@playwright/test'
export { createTestOrder, OrderCreationResult, generateUUID, CreateTestOrderParams }