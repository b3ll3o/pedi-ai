import { chromium } from '@playwright/test'
import { enableDemoMode } from './support/demo-mode'

export default async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Enable demo mode globally
  await enableDemoMode(page)

  await browser.close()
}
