/**
 * Setup hooks para testes E2E com Playwright.
 *
 * beforeAll: Executa seed para criar dados de teste
 * afterEach: Limpa estado do browser após cada teste
 *
 * @module support/setup
 */

import { seed } from '../scripts/seed'

/**
 * Hook executado antes de todos os testes.
 * Popula o banco com dados de teste.
 */
export async function beforeAll(): Promise<void> {
  console.log('🌱 Executando seed E2E...')
  await seed()
  console.log('✅ Seed concluído\n')
}

/**
 * Hook executado após cada teste.
 * Limpa apenas estado do browser (cookies, localStorage).
 * NÃO remove dados do banco - isso é feito pelo globalTeardown.
 */
export async function afterEach(): Promise<void> {
  // Não limpa dados do banco aqui!
  // Cada teste deve criar seus próprios dados ou usar o seed.
  // O cleanup do banco é feito pelo globalTeardown após todos os testes.
}
