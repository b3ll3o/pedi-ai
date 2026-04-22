import { test as base, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Dados de usuários de teste para autenticação E2E.
 * Em produção, usar variáveis de ambiente ou seed data.
 */
export const TEST_USERS = {
  customer: { email: 'customer@test.com', password: 'CustomerPassword123!' },
  admin: { email: 'admin@test.com', password: 'AdminPassword123!' },
  waiter: { email: 'waiter@test.com', password: 'WaiterPassword123!' },
} as const

/**
 * Tipo para roles de usuário.
 */
export type UserRole = keyof typeof TEST_USERS

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
  customer: { email: string; password: string; id: string }
  admin: { email: string; password: string; id: string; resetToken: string }
  waiter: { email: string; password: string; id: string }
  table: { id: string; code: string }
  categories: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; price: number }>
}

/** TTL de 30 minutos para cache de sessão */
const STORAGE_TTL_MS = 30 * 60 * 1000

/** Diretório para armazenar state de autenticação */
const STORAGE_DIR = '.playwright/.auth'

interface StorageMeta {
  createdAt: number
  email: string
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function generateEmail(): string {
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

async function createTestData(): Promise<SeedData> {
  const customer = {
    email: generateEmail(),
    password: 'TestPassword123!',
    id: generateId(),
  }

  const admin = {
    email: generateEmail(),
    password: 'AdminPassword123!',
    id: generateId(),
    resetToken: `reset-token-${generateId()}`,
  }

  const waiter = {
    email: generateEmail(),
    password: 'WaiterPassword123!',
    id: generateId(),
  }

  const table = {
    id: generateId(),
    code: `TABLE-${generateId().substring(0, 6).toUpperCase()}`,
  }

  const categories = [
    { id: generateId(), name: 'Bebidas' },
    { id: generateId(), name: 'Pratos Principais' },
    { id: generateId(), name: 'Sobremesas' },
  ]

  const products = [
    { id: generateId(), name: 'Coca-Cola', price: 5.99 },
    { id: generateId(), name: 'Picanha', price: 45.99 },
    { id: generateId(), name: 'Tiramisu', price: 15.99 },
  ]

  return { customer, admin, waiter, table, categories, products }
}

async function cleanupTestData(_data: SeedData): Promise<void> {
  // Cleanup é tratado por soft delete do Supabase ou TTL
  // Em produção, implementar cleanup adequado
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

export const test = base.extend<Fixtures>({
  seedData: async ({ browser }, use) => {
    const data = await createTestData()
    await use(data)
    await cleanupTestData(data)
  },

  guest: async ({ page }, use) => {
    await page.goto('/')
    await use(page)
  },

  authenticated: async ({ page, seedData }, use) => {
    const email = seedData.customer.email
    const password = seedData.customer.password

    if (isStorageValid(email)) {
      await loadStorageState(page, email, '/menu')
    } else {
      await performLogin(page, email, password, '/login', /\/menu/)
    }
    await use(page)
  },

  admin: async ({ page, seedData }, use) => {
    const email = seedData.admin.email
    const password = seedData.admin.password

    if (isStorageValid(email)) {
      await loadStorageState(page, email, '/admin/dashboard')
    } else {
      await performLogin(page, email, password, '/admin/login', /\/admin\/dashboard/)
    }
    await use(page)
  },

  waiter: async ({ page, seedData }, use) => {
    const email = seedData.waiter.email
    const password = seedData.waiter.password

    if (isStorageValid(email)) {
      await loadStorageState(page, email, '/admin/dashboard')
    } else {
      await performLogin(page, email, password, '/admin/login', /\/admin\/dashboard/)
    }
    await use(page)
  },

  cleanPage: async ({ page }, use) => {
    await page.goto('about:blank')
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await use(page)
  },
})

export { expect } from '@playwright/test'