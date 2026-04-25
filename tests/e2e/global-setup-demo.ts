import { chromium } from '@playwright/test'
import { enableDemoMode } from './support/demo-mode'
import { mockPaymentHandlers } from './support/mock-payment'

const globalSetup = async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Enable demo mode globally
  await enableDemoMode(page)

  // Register payment mock handlers on the page
  // These routes will intercept Stripe API calls during tests
  mockPaymentHandlers(page)

  // Cleanup function called as globalTeardown after all tests
  return async () => {
    await browser.close()
  }
}

export default globalSetup
