import { Page, Route } from '@playwright/test'

/**
 * Mock data for PIX payment
 */
const MOCK_PIX_DATA = {
  qr_code: '00020101021226880014br.gov.bcb.pix2565pix.here.com/v2/1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678903040004',
  expires_at: new Date(Date.now() + 3600000).toISOString(),
}

/**
 * Mock data for credit card payment
 */
const MOCK_CARD_DATA = {
  clientSecret: 'demo_secret_' + Math.random().toString(36).substring(7),
  paymentIntentId: 'pi_mock_' + Math.random().toString(36).substring(7),
}

/**
 * Set up payment mocks for a page
 */
export function mockPaymentHandlers(page: Page) {
  // Mock all Stripe API calls
  page.route(/\/api\/stripe\/.*/, async (route: Route) => {
    const url = route.request().url()

    if (url.includes('create-pix-qrcode') || url.includes('pix')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PIX_DATA),
      })
      return
    }

    if (url.includes('create-payment-intent') || url.includes('card')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CARD_DATA),
      })
      return
    }

    if (url.includes('webhook')) {
      // Simulate confirmation after 2s (mimics real Stripe webhook processing)
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ received: true }),
      })
      return
    }

    // Continue with real request for other routes
    await route.continue()
  })

  // Mock order status endpoint to always return 'confirmed'
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
 * This makes the app use mock payments instead of real Stripe
 */
export async function enableDemoMode(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    // Set demo mode in localStorage
    localStorage.setItem('DEMO_PAYMENT_MODE', 'true')
  })
}
