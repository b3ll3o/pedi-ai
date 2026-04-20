import { test as base, Page, Browser } from '@playwright/test'
import { createTestData, cleanupTestData, SeedData } from '../helpers/api'

export interface Fixtures {
  guest: Page
  authenticated: Page
  admin: Page
  waiter: Page
  seedData: SeedData
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
    // Customer authentication via Supabase
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', seedData.customer.email)
    await page.fill('[data-testid="password-input"]', seedData.customer.password)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/menu')
    await use(page)
  },

  admin: async ({ page, seedData }, use) => {
    // Admin login
    await page.goto('/admin/login')
    await page.fill('[data-testid="email-input"]', seedData.admin.email)
    await page.fill('[data-testid="password-input"]', seedData.admin.password)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/admin/dashboard')
    await use(page)
  },

  waiter: async ({ page, seedData }, use) => {
    // Waiter login
    await page.goto('/admin/login')
    await page.fill('[data-testid="email-input"]', seedData.waiter.email)
    await page.fill('[data-testid="password-input"]', seedData.waiter.password)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/admin/dashboard')
    await use(page)
  },
})

export { expect } from '@playwright/test'
