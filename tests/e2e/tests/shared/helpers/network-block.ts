/**
 * Helper para bloquear requests externos durante testes E2E.
 * Reduz flakiness e melhora performance dos testes.
 */
import { Page, Route } from '@playwright/test'

/**
 * Recursos externos a bloquear durante os testes.
 */
export const BLOCKED_PATTERNS: RegExp[] = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /google-analytics\.com/,
  /googleadservices\.com/,
  /facebook\.net/,
  /connect\.facebook\.net/,
  /\.hotjar\.com/,
  /\.intercom\.io/,
]

/**
 * Configura interceptação para bloquear requests externos.
 *
 * @param page Página do Playwright
 */
export async function setupNetworkBlocking(page: Page): Promise<void> {
  for (const pattern of BLOCKED_PATTERNS) {
    await page.route(pattern, async (route: Route) => {
      await route.abort()
    })
  }
}
