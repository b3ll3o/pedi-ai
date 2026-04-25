/**
 * Global Setup - Playwright E2E
 *
 * Aplica network blocking para todos os testes.
 * Blocked: fonts.googleapis.com, google-analytics.com, facebook.net, etc.
 *
 * @returns Função de cleanup para globalTeardown
 */
import { chromium } from '@playwright/test'
import { setupNetworkBlocking } from './tests/shared/helpers/network-block'

const globalSetup = async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Aplica blocking via helper (mesma lógica dos testes)
  await setupNetworkBlocking(page)

  // Mantém browser vivo - Playwright fecha automaticamente
  // A função retornada é chamada como cleanup
  return async () => {
    await browser.close()
  }
}

export default globalSetup
