/**
 * Snapshot Testing Utilities for E2E Tests
 *
 * Provides helpers for visual and content snapshot testing.
 * Uses Playwright's built-in toMatchSnapshot for content snapshots.
 *
 * Usage:
 * ```typescript
 * import { snapshotMatchers } from './snapshot-utils'
 *
 * expect.extend(snapshotMatchers)
 *
 * test('menu page matches snapshot', async ({ page }) => {
 *   await page.goto('/menu')
 *   await expect(page).toMatchMenuSnapshot()
 * })
 * ```
 */

import { type Page, type Locator, expect } from '@playwright/test'

// ============================================
// Snapshot Paths
// ============================================

const SNAPSHOT_DIR = '__snapshots__'

/**
 * Get snapshot path for a specific test.
 */
export function getSnapshotPath(testName: string, snapshotName: string): string {
  return `${SNAPSHOT_DIR}/${testName}/${snapshotName}`
}

// ============================================
// Custom Snapshot Matchers
// ============================================

interface _SnapshotMatchers {
  toMatchMenuSnapshot(): Promise<void>
  toMatchCheckoutSnapshot(): Promise<void>
  toMatchOrderSnapshot(): Promise<void>
  toMatchAdminDashboardSnapshot(): Promise<void>
  toMatchAccessibilitySnapshot(): Promise<void>
}

/**
 * Custom matchers for common page snapshots.
 */
export const _snapshotMatchers = {
  async toMatchMenuSnapshot(this: { page: Page }, ..._args: unknown[]): Promise<void> {
    const page = (this as { page?: Page }).page
    if (!page) throw new Error('Page not available')

    await expect(page).toMatchSnapshot('menu-page.html', {
      timeout: 30000,
    })
  },

  async toMatchCheckoutSnapshot(this: { page: Page }, ..._args: unknown[]): Promise<void> {
    const page = (this as { page?: Page }).page
    if (!page) throw new Error('Page not available')

    await expect(page).toMatchSnapshot('checkout-page.html', {
      timeout: 30000,
    })
  },

  async toMatchOrderSnapshot(this: { page: Page }, ..._args: unknown[]): Promise<void> {
    const page = (this as { page?: Page }).page
    if (!page) throw new Error('Page not available')

    await expect(page).toMatchSnapshot('order-page.html', {
      timeout: 30000,
    })
  },

  async toMatchAdminDashboardSnapshot(this: { page: Page }, ..._args: unknown[]): Promise<void> {
    const page = (this as { page?: Page }).page
    if (!page) throw new Error('Page not available')

    await expect(page).toMatchSnapshot('admin-dashboard.html', {
      timeout: 30000,
    })
  },

  async toMatchAccessibilitySnapshot(this: { page: Page }, ..._args: unknown[]): Promise<void> {
    const page = (this as { page?: Page }).page
    if (!page) throw new Error('Page not available')

    // Capture accessibility tree as snapshot
    const _snapshot = await page.accessibility.snapshot()
    await expect(page).toMatchSnapshot('accessibility-tree.json', {
      timeout: 30000,
    })
  },
}

// ============================================
// Snapshot Utilities
// ============================================

/**
 * Capture full HTML of a page.
 */
export async function captureHTML(page: Page): Promise<string> {
  const html = await page.content()
  // Remove dynamic content that changes between runs
  return html
    .replace(/<script>[\s\S]*?<\/script>/gi, '<script>/* removed */</script>')
    .replace(/data-testid="[^"]*"/g, (match) => match) // Keep testids
    .replace(/\s{2,}/g, ' ') // Normalize whitespace
}

/**
 * Capture page structure as JSON.
 */
export async function captureStructure(page: Page): Promise<Record<string, unknown>> {
  const html = await page.content()

  return {
    url: page.url(),
    title: await page.title(),
    hasMenu: html.includes('menu-category-card'),
    hasProducts: html.includes('menu-product-card'),
    hasCart: html.includes('cart'),
    testids: extractTestids(html),
  }
}

/**
 * Extract all data-testid values from HTML.
 */
function extractTestids(html: string): string[] {
  const regex = /data-testid="([^"]*)"/g
  const testids: string[] = []
  let match

  while ((match = regex.exec(html)) !== null) {
    testids.push(match[1])
  }

  return testids.sort()
}

/**
 * Compare two page structures and return differences.
 */
export function compareStructures(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const differences: string[] = []

  for (const key of Object.keys(before)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      differences.push(`${key}: changed`)
    }
  }

  for (const key of Object.keys(after)) {
    if (!(key in before)) {
      differences.push(`${key}: added`)
    }
  }

  return differences
}

// ============================================
// Component Snapshots
// ============================================

/**
 * Capture product card structure.
 */
export async function captureProductCard(
  locator: Locator
): Promise<Record<string, string | number>> {
  const name = await locator.locator('[data-testid^="menu-product-card-"]').textContent()
  const price = await locator.locator('[data-testid="product-price"]').textContent()

  return {
    name: name?.trim() || '',
    price: price?.trim() || '',
  }
}

/**
 * Capture order status badge.
 */
export async function captureOrderStatus(
  locator: Locator
): Promise<{ status: string; badge: string }> {
  const status = await locator.textContent()

  return {
    status: status?.trim() || '',
    badge: status?.trim() || '',
  }
}

/**
 * Capture cart summary.
 */
export async function captureCartSummary(
  page: Page
): Promise<{
  itemCount: number
  subtotal: string
  tax: string
  total: string
}> {
  const itemCount = await page.locator('[data-testid="cart-item"]').count()
  const subtotal = await page.locator('[data-testid="cart-subtotal"]').textContent()
  const tax = await page.locator('[data-testid="cart-tax"]').textContent()
  const total = await page.locator('[data-testid="cart-total"]').textContent()

  return {
    itemCount,
    subtotal: subtotal?.trim() || '',
    tax: tax?.trim() || '',
    total: total?.trim() || '',
  }
}

// ============================================
// A11y Snapshots
// ============================================

/**
 * Capture accessibility snapshot and check for issues.
 */
export async function captureA11ySnapshot(
  page: Page
): Promise<{
  tree: unknown
  violations: string[]
}> {
  const _snapshot = await page.accessibility.snapshot()
  const violations: string[] = []

  // Check for common a11y issues
  const html = await page.content()

  // Missing alt on images
  const imgWithoutAlt = (html.match(/<img(?!.*alt=)[^>]*>/gi) || []).length
  if (imgWithoutAlt > 0) {
    violations.push(`${imgWithoutAlt} images without alt text`)
  }

  // Buttons without accessible names
  const buttonsWithoutName = (html.match(/<button(?!.*(aria-label|text))[^-]*>[\s]*<\/button>/gi) || []).length
  if (buttonsWithoutName > 0) {
    violations.push(`${buttonsWithoutName} buttons without accessible names`)
  }

  return {
    tree: snapshot,
    violations,
  }
}

// ============================================
// Export expect matchers
// ============================================

expect.extend(snapshotMatchers)

declare module '@playwright/test' {
  interface Matchers<R> {
    toMatchMenuSnapshot(): Promise<R>
    toMatchCheckoutSnapshot(): Promise<R>
    toMatchOrderSnapshot(): Promise<R>
    toMatchAdminDashboardSnapshot(): Promise<R>
    toMatchAccessibilitySnapshot(): Promise<R>
  }
}
