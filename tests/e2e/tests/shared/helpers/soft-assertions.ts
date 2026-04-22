import { test as base } from '@playwright/test'

/**
 * Soft assertions helper for Playwright E2E tests.
 *
 * Collects all assertion failures instead of stopping at the first error.
 * Useful for validating multiple conditions in a single test flow.
 *
 * @example
 * import { softExpect } from '../shared/helpers/soft-assertions'
 *
 * await softExpect(page.locator('.title')).toHaveText('Esperado')
 * await softExpect(page.locator('.subtitle')).toHaveText('Outro')
 * // If both fail, report shows both errors
 */
export const softExpect = base.expect.configure({ soft: true })
