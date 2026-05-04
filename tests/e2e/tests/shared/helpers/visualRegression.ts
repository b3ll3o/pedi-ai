/**
 * Visual Regression Testing Utilities
 *
 * Provides helpers for capturing and comparing screenshots.
 * Uses Playwright's built-in screenshot capabilities.
 *
 * Usage:
 * ```typescript
 * import { visualRegression } from './visualRegression'
 *
 * test('menu looks correct', async ({ page }) => {
 *   await page.goto('/menu')
 *   await visualRegression.assertScreenshot(page, 'menu-page')
 * })
 * ```
 */

import { type Page, type Locator, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// ============================================
// Configuration
// ============================================

const SCREENSHOT_DIR = '__screenshots__'
const UPDATE_MODE = process.env.UPDATE_SCREENSHOTS === 'true'

interface VisualRegressionConfig {
  directory: string
  fullPage: boolean
  animations: 'disabled' | 'enabled'
  updateMissing: boolean
}

const defaultConfig: VisualRegressionConfig = {
  directory: SCREENSHOT_DIR,
  fullPage: true,
  animations: 'disabled',
  updateMissing: true,
}

// ============================================
// Screenshot Capture
// ============================================

/**
 * Capture screenshot of a page or element.
 */
export async function captureScreenshot(
  pageOrLocator: Page | Locator,
  name: string,
  options?: {
    fullPage?: boolean
    animations?: 'disabled' | 'enabled'
  }
): Promise<Buffer> {
  const isPage = 'goto' in pageOrLocator

  const screenshotOptions = {
    fullPage: options?.fullPage ?? true,
    animations: options?.animations ?? 'disabled',
  }

  if (isPage) {
    return await (pageOrLocator as Page).screenshot(screenshotOptions)
  } else {
    return await (pageOrLocator as Locator).screenshot(screenshotOptions)
  }
}

/**
 * Save screenshot to disk.
 */
export async function saveScreenshot(
  pageOrLocator: Page | Locator,
  screenshotPath: string,
  options?: {
    fullPage?: boolean
    animations?: 'disabled' | 'enabled'
  }
): Promise<void> {
  const buffer = await captureScreenshot(pageOrLocator, screenshotPath, options)

  // Ensure directory exists
  const dir = path.dirname(screenshotPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(screenshotPath, buffer)
}

// ============================================
// Visual Regression Assertions
// ============================================

/**
 * Visual regression helper with assertion methods.
 */
export const visualRegression = {
  /**
   * Assert page matches expected screenshot.
   * If screenshot doesn't exist and UPDATE_MODE=true, it will be created.
   */
  async assertScreenshot(
    page: Page,
    name: string,
    options?: {
      fullPage?: boolean
      threshold?: number
      animations?: 'disabled' | 'enabled'
    }
  ): Promise<void> {
    const config = { ...defaultConfig, ...options }
    const screenshotPath = getScreenshotPath(name)

    // Create screenshots directory if needed
    const dir = path.dirname(screenshotPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Capture current screenshot
    const buffer = await page.screenshot({
      fullPage: config.fullPage,
      animations: config.animations,
    })

    // If in update mode or screenshot doesn't exist, save it
    if (UPDATE_MODE || !fs.existsSync(screenshotPath)) {
      fs.writeFileSync(screenshotPath, buffer)
      if (UPDATE_MODE) {
        console.log(`📸 Screenshot updated: ${screenshotPath}`)
      }
      return
    }

    // Compare with existing screenshot
    const expected = fs.readFileSync(screenshotPath)
    const diff = compareImages(buffer, expected)

    if (diff > (options?.threshold ?? 0.01)) {
      // Save diff for debugging
      const diffPath = getScreenshotPath(`${name}-diff`)
      fs.writeFileSync(diffPath, buffer)

      throw new Error(
        `Visual regression detected for "${name}". ` +
        `Difference: ${(diff * 100).toFixed(2)}%. ` +
        `Diff saved to: ${diffPath}`
      )
    }
  },

  /**
   * Assert element matches expected screenshot.
   */
  async assertElementScreenshot(
    locator: Locator,
    name: string,
    options?: {
      threshold?: number
    }
  ): Promise<void> {
    const screenshotPath = getScreenshotPath(name)

    // Ensure directory exists
    const dir = path.dirname(screenshotPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Capture current screenshot
    const buffer = await locator.screenshot()

    // If in update mode or screenshot doesn't exist, save it
    if (UPDATE_MODE || !fs.existsSync(screenshotPath)) {
      fs.writeFileSync(screenshotPath, buffer)
      if (UPDATE_MODE) {
        console.log(`📸 Element screenshot updated: ${screenshotPath}`)
      }
      return
    }

    // Compare with existing screenshot
    const expected = fs.readFileSync(screenshotPath)
    const diff = compareImages(buffer, expected)

    if (diff > (options?.threshold ?? 0.01)) {
      throw new Error(
        `Visual regression detected for element "${name}". ` +
        `Difference: ${(diff * 100).toFixed(2)}%`
      )
    }
  },

  /**
   * Capture and save screenshot (without assertion).
   */
  async capture(
    page: Page,
    name: string,
    options?: {
      fullPage?: boolean
      animations?: 'disabled' | 'enabled'
    }
  ): Promise<string> {
    const screenshotPath = getScreenshotPath(name)
    const buffer = await page.screenshot({
      fullPage: options?.fullPage ?? true,
      animations: options?.animations ?? 'disabled',
    })

    // Ensure directory exists
    const dir = path.dirname(screenshotPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(screenshotPath, buffer)
    return screenshotPath
  },

  /**
   * Compare two screenshots and return difference percentage.
   */
  compare(screenshot1: Buffer, screenshot2: Buffer): number {
    return compareImages(screenshot1, screenshot2)
  },
}

// ============================================
// Image Comparison
// ============================================

/**
 * Compare two image buffers and return difference ratio (0-1).
 * Uses pixel-by-pixel comparison.
 */
function compareImages(img1: Buffer, img2: Buffer): number {
  if (img1.length !== img2.length) {
    return Math.abs(img1.length - img2.length) / Math.max(img1.length, img2.length)
  }

  let diffPixels = 0
  const totalPixels = img1.length

  for (let i = 0; i < img1.length; i++) {
    if (img1[i] !== img2[i]) {
      diffPixels++
    }
  }

  return diffPixels / totalPixels
}

/**
 * Get screenshot path for a given name.
 */
function getScreenshotPath(name: string): string {
  return path.join(SCREENSHOT_DIR, `${name}.png`)
}

// ============================================
// Page-Level Helpers
// ============================================

/**
 * Capture multiple viewport sizes for responsive testing.
 */
export async function captureResponsiveScreenshots(
  page: Page,
  name: string,
  viewports: Array<{ width: number; height: number }>
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    const path = await visualRegression.capture(page, `${name}-${viewport.width}x${viewport.height}`)
    results[`${viewport.width}x${viewport.height}`] = path
  }

  return results
}

/**
 * Capture critical UI elements on a page.
 */
export async function captureUICriticalElements(
  page: Page,
  testId: string
): Promise<void> {
  const elements = await page.locator(`[data-testid="${testId}"]`).all()

  for (let i = 0; i < elements.length; i++) {
    const isVisible = await elements[i].isVisible().catch(() => false)
    if (isVisible) {
      await visualRegression.assertElementScreenshot(
        elements[i],
        `${testId}-${i}`
      )
    }
  }
}

// ============================================
// CI/CD Integration
// ============================================

/**
 * Upload screenshots to artifact storage (for CI).
 */
export async function uploadScreenshotsToArtifacts(
  artifactName: string
): Promise<void> {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    return
  }

  // This would be implemented based on CI artifact storage
  // e.g., GitHub Actions artifacts, S3, etc.
  console.log(`📦 Uploading screenshots to ${artifactName}...`)
}

/**
 * Get list of failed screenshots from last run.
 */
export function getFailedScreenshots(): string[] {
  const diffDir = SCREENSHOT_DIR

  if (!fs.existsSync(diffDir)) {
    return []
  }

  return fs.readdirSync(diffDir)
    .filter(f => f.includes('-diff'))
    .map(f => path.join(diffDir, f))
}

// ============================================
// Export types
// ============================================

export type { VisualRegressionConfig }
