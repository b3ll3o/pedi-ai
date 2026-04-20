import { test as base, Page } from '@playwright/test'

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

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function generateEmail(): string {
  return `test-${generateId()}@pedi-ai.test`
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
 * Realiza login genérico.
 */
async function login(
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
    await login(page, seedData.customer.email, seedData.customer.password, '/login', /\/menu/)
    await use(page)
  },

  admin: async ({ page, seedData }, use) => {
    await login(page, seedData.admin.email, seedData.admin.password, '/admin/login', /\/admin\/dashboard/)
    await use(page)
  },

  waiter: async ({ page, seedData }, use) => {
    await login(page, seedData.waiter.email, seedData.waiter.password, '/admin/login', /\/admin\/dashboard/)
    await use(page)
  },
})

export { expect } from '@playwright/test'
