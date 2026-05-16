import { Page, Route } from '@playwright/test'

/**
 * Mock data for PIX payment
 */
const MOCK_PIX_DATA = {
  qr_code: '00020101021226880014br.gov.bcb.pix2565pix.here.com/v2/1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678903040004',
  expires_at: new Date(Date.now() + 3600000).toISOString(),
}

/**
 * Set up payment mocks for a page
 */
export function mockPaymentHandlers(page: Page) {
  page.route(/\/api\/payments\/pix\/.*/, async (route: Route) => {
    const url = route.request().url()

    if (url.includes('create')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PIX_DATA),
      })
      return
    }

    await route.continue()
  })

  page.route(/\/api\/orders\/.*\/status/, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'confirmed', confirmed_at: new Date().toISOString() }),
    })
  })
}

/**
 * Set up demo mode for Next.js app
 * This makes the app use mock payments instead of real MercadoPago
 */
export async function enableDemoMode(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('DEMO_PAYMENT_MODE', 'true')
  })
}
