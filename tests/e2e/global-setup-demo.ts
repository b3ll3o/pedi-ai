import { seed } from './scripts/seed'

/**
 * Global setup for E2E tests.
 * Runs seed to create test data before all tests.
 *
 * Note: We don't create a browser here because:
 * 1. It slows down test initialization
 * 2. Can cause "Cannot navigate to invalid URL" errors
 * 3. Each test worker should manage its own browser context
 */
const globalSetup = async () => {
  console.log('🌱 Executando seed E2E via globalSetup...')
  await seed()
  console.log('✅ Seed concluído\n')
}

export default globalSetup
