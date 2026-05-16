import { chromium, type BrowserContext } from '@playwright/test'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

/**
 * URLs to block in E2E tests to improve performance.
 * These are third-party resources that aren't needed for tests.
 */
const BLOCKED_URLS = [
  // Google Fonts
  '**/fonts.googleapis.com/**',
  '**/fonts.gstatic.com/**',
  // Analytics
  '**/google-analytics.com/**',
  '**/googletagmanager.com/**',
  '**/gtag/**',
  '**/analytics/**',
  // Facebook
  '**/facebook.net/**',
  '**/fbcdn.net/**',
  '**/connect.facebook.net/**',
  // Hotjar / Session Recording
  '**/hotjar.com/**',
  '**/static.hotjar.com/**',
  // Intercom / Customer Support
  '**/intercom.io/**',
  '**/widget.intercom.io/**',
  // Drift
  '**/driftt.com/**',
  // StatusPage
  '**/statuspage.io/**',
  // Other third-party scripts
  '**/segment.com/**',
  '**/segment.io/**',
  '**/mixpanel.com/**',
  '**/amplitude.com/**',
  '**/optimizely.com/**',
  '**/crazyegg.com/**',
  '**/fullstory.com/**',
]

/**
 * Creates a context with network blocking enabled.
 */
export async function createBlockedContext(
  browser: import('@playwright/test').Browser,
  options?: Parameters<import('@playwright/test').Browser['newPage']>[0]
): Promise<BrowserContext> {
  const context = await browser.newContext(options)

  for (const pattern of BLOCKED_URLS) {
    await context.route(pattern, (route) => {
      route.abort()
    })
  }

  return context
}

/**
 * Global setup for E2E tests.
 */
const globalSetup = async () => {
  console.log('========================================')
  console.log('🚀 E2E Global Setup')
  console.log('========================================\n')

  // 1. Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.log('⚠️ E2E secrets not configured. Skipping E2E tests.')
    console.log('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in GitHub Actions secrets to enable E2E tests.\n')
    return
  }

  // 2. Run seed to ensure test data exists
  // Skip seed if already done (cache valid) - check seed result file directly
  const seedResultPath = path.join(__dirname, 'scripts', '.seed-result.json')
  let seedValid = false
  try {
    if (fs.existsSync(seedResultPath)) {
      const result = JSON.parse(fs.readFileSync(seedResultPath, 'utf-8'))
      if (result.restaurant?.id && result.users?.customer?.id) {
        console.log('✅ Seed cache valid, skipping seed execution')
        seedValid = true
      }
    }
  } catch {
    // File doesn't exist or invalid JSON
  }

  if (!seedValid) {
    console.log('🌱 Running E2E seed...')
    try {
      const { stdout, stderr } = await execAsync('pnpm test:e2e:seed', {
        cwd: path.join(__dirname, '..'),
        timeout: 180_000,
      })
      if (stdout) console.log(stdout)
      if (stderr) console.warn(stderr)
      console.log('✅ Seed completed successfully\n')
    } catch (error) {
      console.error('❌ Seed failed:', error)
      throw error
    }
  }

  // 3. Pre-warm browser with network blocking
  console.log('🔰 Pre-warming browser with network blocking...')
  try {
    const browser = await chromium.launch()
    const context = await createBlockedContext(browser)
    const page = await context.newPage()
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    } catch {
      // Ignore if server isn't running yet
    }

    await context.close()
    await browser.close()
    console.log('✅ Browser pre-warmed\n')
  } catch (error) {
    console.warn('⚠️ Browser pre-warm failed:', error)
  }

  // 4. Save blocked URLs for workers
  const cacheDir = path.join(process.cwd(), '.playwright')
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  fs.writeFileSync(
    path.join(cacheDir, '.network-blocked.json'),
    JSON.stringify(BLOCKED_URLS)
  )

  console.log('========================================')
  console.log('✅ Global Setup Complete')
  console.log('========================================\n')
}

export default globalSetup