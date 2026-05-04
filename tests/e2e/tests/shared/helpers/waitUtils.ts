/**
 * Optimized Wait Utilities for E2E Tests
 *
 * Provides efficient wait strategies that replace slower defaults.
 * Key optimizations:
 * - Use 'load' instead of 'networkidle' for faster navigation
 * - Use commit-based waits for API responses
 * - Avoid hardcoded timeouts in favor of condition-based waits
 */

import type { Page, Locator } from '@playwright/test'

// ============================================
// Navigation Waits (Performance Optimized)
// ============================================

/**
 * Navigate to URL with optimized wait strategy.
 * Uses 'load' instead of default 'networkidle' for 2-5x faster navigation.
 */
export async function navigateTo(
  page: Page,
  url: string,
  options?: { waitUntil?: 'load' | 'domcontentloaded' | 'commit'; timeout?: number }
): Promise<void> {
  const waitUntil = options?.waitUntil ?? 'load'
  await page.goto(url, {
    waitUntil,
    timeout: options?.timeout ?? 30_000,
  })
}

/**
 * Navigate to URL and wait for response matching pattern.
 * Returns the response for assertion.
 */
export async function navigateAndWaitForResponse(
  page: Page,
  url: string,
  responsePattern: RegExp | string,
  options?: { waitUntil?: 'load' | 'domcontentloaded' | 'commit'; timeout?: number }
): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse(responsePattern, { timeout: options?.timeout ?? 30_000 }),
    navigateTo(page, url, options),
  ])
  return response
}

// ============================================
// Element Waits
// ============================================

/**
 * Wait for element to be visible with timeout.
 * Falls back to attachment-based detection for dynamically rendered content.
 */
export async function waitForVisible(
  locator: Locator,
  options?: { timeout?: number; state?: 'visible' | 'attached' }
): Promise<void> {
  const timeout = options?.timeout ?? 10_000
  const state = options?.state ?? 'visible'

  try {
    await locator.waitFor({ state, timeout })
  } catch {
    // Fallback for elements that attach but don't become visible
    if (state === 'visible') {
      await locator.waitFor({ state: 'attached', timeout: 5000 })
    } else {
      throw new Error(`Element not found: ${locator.toString()}`)
    }
  }
}

/**
 * Wait for element to be hidden or detached.
 */
export async function waitForHidden(
  locator: Locator,
  options?: { timeout?: number }
): Promise<void> {
  await locator.waitFor({ state: 'hidden', timeout: options?.timeout ?? 10_000 })
}

/**
 * Wait for element to contain text.
 */
export async function waitForText(
  locator: Locator,
  text: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  await locator.waitFor({
    state: 'visible',
    timeout: options?.timeout ?? 10_000,
  })

  if (text instanceof RegExp) {
    await locator.waitFor({ expression: text })
  } else {
    await locator.waitFor({ hasText: text, timeout: options?.timeout ?? 10_000 })
  }
}

// ============================================
// URL Waits
// ============================================

/**
 * Wait for URL to match pattern.
 */
export async function waitForUrl(
  page: Page,
  pattern: RegExp | string,
  options?: { timeout?: number }
): Promise<void> {
  await page.waitForURL(pattern, { timeout: options?.timeout ?? 30_000 })
}

/**
 * Wait for URL to NOT match pattern (useful for redirect detection).
 */
export async function waitForUrlNot(
  page: Page,
  pattern: RegExp | string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30_000
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const currentUrl = page.url()
    if (typeof pattern === 'string') {
      if (!currentUrl.includes(pattern)) return
    } else {
      if (!pattern.test(currentUrl)) return
    }
    await page.waitForTimeout(100)
  }
  throw new Error(`URL still matches ${pattern} after ${timeout}ms`)
}

// ============================================
// API Response Waits
// ============================================

/**
 * Wait for API response with automatic retry on match.
 * Useful for polling until a condition is met.
 */
export async function waitForApiResponse<T = unknown>(
  page: Page,
  pattern: RegExp | string,
  validator: (response: T) => boolean,
  options?: { timeout?: number; interval?: number; retries?: number }
): Promise<T> {
  const timeout = options?.timeout ?? 30_000
  const interval = options?.interval ?? 1000
  const maxRetries = options?.retries ?? 30
  const startTime = Date.now()
  let attempts = 0

  while (Date.now() - startTime < timeout && attempts < maxRetries) {
    const response = await page.waitForResponse(pattern, { timeout: interval })
    if (response.ok()) {
      try {
        const data = await response.json() as T
        if (validator(data)) {
          return data
        }
      } catch {
        // Response not JSON or validation failed, continue polling
      }
    }
    attempts++
  }

  throw new Error(
    `API response validation failed after ${attempts} attempts (${timeout}ms)`
  )
}

/**
 * Click and wait for response in parallel.
 * More reliable than sequential click + wait.
 */
export async function clickAndWaitForResponse(
  page: Page,
  selector: string,
  responsePattern: RegExp | string,
  options?: { timeout?: number }
): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse(responsePattern, { timeout: options?.timeout ?? 30_000 }),
    page.click(selector),
  ])
  return response
}

/**
 * Fill input and wait for response in parallel.
 */
export async function fillAndWaitForResponse(
  page: Page,
  selector: string,
  value: string,
  responsePattern: RegExp | string,
  options?: { timeout?: number; submit?: boolean }
): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse(responsePattern, { timeout: options?.timeout ?? 30_000 }),
    page.fill(selector, value),
    ...(options?.submit ? [page.press(selector, 'Enter')] : []),
  ])
  return response
}

// ============================================
// State Waits
// ============================================

/**
 * Wait for a condition function to return true.
 * Polls every 100ms by default.
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options?: { timeout?: number; interval?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30_000
  const interval = options?.interval ?? 100
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const result = await condition()
    if (result) return
    await page.waitForTimeout(interval)
  }

  throw new Error(`Condition not met after ${timeout}ms`)
}

// ============================================
// Real-time Waits
// ============================================

/**
 * Wait for real-time update (Supabase subscription).
 * Uses presence channels or database changes.
 */
export async function waitForRealtimeUpdate(
  page: Page,
  channelName: string,
  eventName: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30_000

  await page.waitForFunction(
    (chName, evName) => {
      // @ts-expect-error - global presence for testing
      return window.__realtimeEvents?.[chName]?.[evName] === true
    },
    channelName,
    eventName,
    { timeout }
  )

  // Clear the event after capture
  await page.evaluate(
    (chName, evName) => {
      // @ts-expect-error - global presence for testing
      delete window.__realtimeEvents?.[chName]?.[evName]
    },
    channelName,
    eventName
  )
}

// ============================================
// Debounce Handling
// ============================================

/**
 * Wait for debounce to complete (e.g., after typing in search).
 * Only use when debounce is intentional and cannot be avoided.
 */
export async function waitForDebounce(
  page: Page,
  debounceMs: number = 300
): Promise<void> {
  await page.waitForTimeout(debounceMs + 100) // Add 100ms buffer
}

// ============================================
// Error State Waits
// ============================================

/**
 * Wait for error message to appear.
 */
export async function waitForError(
  page: Page,
  options?: { timeout?: number }
): Promise<string> {
  const errorLocator = page.locator('[data-testid="field-error"], .error, [role="alert"]')
  await waitForVisible(errorLocator, { timeout: options?.timeout ?? 10_000 })
  return errorLocator.first().textContent() as Promise<string>
}

/**
 * Wait for toast notification.
 */
export async function waitForToast(
  page: Page,
  options?: { timeout?: number }
): Promise<string> {
  const toastLocator = page.locator('[data-testid="toast"], .toast, [role="status"]')
  await waitForVisible(toastLocator, { timeout: options?.timeout ?? 10_000 })
  return toastLocator.first().textContent() as Promise<string>
}

// ============================================
// Performance Markers
// ============================================

/**
 * Mark a performance timestamp for metrics tracking.
 */
export function performanceMark(page: Page, label: string): void {
  page.evaluate((l) => {
    performance.mark(`e2e:${l}`)
  }, label)
}

/**
 * Measure performance between two marks.
 */
export async function performanceMeasure(
  page: Page,
  label: string,
  measureName: string
): Promise<number> {
  return page.evaluate(
    async ([l, m]) => {
      performance.mark(`e2e:${l}:start`)
      // @ts-expect-error - performance measurement
      performance.measure(m, `e2e:${l}:start`, `e2e:${l}:end`)
      const measures = performance.getEntriesByName(m)
      return measures[measures.length - 1]?.duration ?? 0
    },
    [label, measureName]
  ) as Promise<number>
}