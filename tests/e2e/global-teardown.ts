import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Global teardown for E2E tests.
 * Runs AFTER all tests complete to clean up test data.
 *
 * This is called only once after all workers finish,
 * unlike afterAll which runs after each test file.
 */
const globalTeardown = async () => {
  console.log('========================================')
  console.log('🧹 E2E Global Teardown')
  console.log('========================================\n')

  try {
    console.log('🧹 Executando cleanup final...')
    const { stdout, stderr } = await execAsync('pnpm test:e2e:cleanup', {
      cwd: process.cwd(),
      timeout: 120_000,
    })
    if (stdout) console.log(stdout)
    if (stderr) console.warn(stderr)
    console.log('✅ Cleanup concluído\n')
  } catch (error) {
    console.error('⚠️ Cleanup falhou:', error)
    // Don't fail the build if cleanup fails
  }

  console.log('========================================')
  console.log('✅ Global Teardown Complete')
  console.log('========================================\n')
}

export default globalTeardown