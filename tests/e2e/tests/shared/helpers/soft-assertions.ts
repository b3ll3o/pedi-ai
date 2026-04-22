import { test as base } from '@playwright/test'

/**
 * Helper de soft assertions para testes E2E com Playwright.
 *
 * Coleta todas as falhas de assertion ao invés de parar no primeiro erro.
 * Útil para validar múltiplas condições em um único fluxo de teste.
 *
 * @example
 * import { softExpect } from '../shared/helpers/soft-assertions'
 *
 * await softExpect(page.locator('.titulo')).toHaveText('Esperado')
 * await softExpect(page.locator('.subtitulo')).toHaveText('Outro')
 * // Se ambos falharem, o relatório mostra ambos os erros
 */
export const softExpect = base.expect.configure({ soft: true })
