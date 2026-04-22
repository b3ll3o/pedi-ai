import { Page } from '@playwright/test'

/**
 * Demo mode configuration for E2E tests
 * When enabled, the app uses mock payment data instead of real Stripe calls
 */
export async function enableDemoMode(page: Page) {
  await page.addInitScript(() => {
    // Override fetch to return mock payment data
    const originalFetch = window.fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (url.includes('/api/stripe/create-pix-qrcode')) {
        return new Response(JSON.stringify({
          qr_code: '00020101021226880014br.gov.bcb.pix2565pix.mock.com/v2/mock123',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/api/stripe/create-payment-intent')) {
        return new Response(JSON.stringify({
          client_secret: 'pi_mock_secret_demo',
          payment_intent_id: 'pi_mock_demo',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return originalFetch(input, init)
    }
  })
}

/**
 * Clean up demo mode
 */
export async function disableDemoMode(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('DEMO_PAYMENT_MODE')
  })
}
