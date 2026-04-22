/**
 * Setup hooks para testes E2E com Playwright.
 *
 * beforeAll: Executa seed para criar dados de teste
 * afterAll: Executa cleanup para remover dados de teste
 *
 * @module support/setup
 */

import { seed } from '../scripts/seed'
import { cleanup } from '../scripts/cleanup'

/**
 * Hook executado antes de todos os testes.
 * popula o banco com dados de teste.
 */
export async function beforeAll(): Promise<void> {
  console.log('🌱 Executando seed E2E...')
  await seed()
  console.log('✅ Seed concluído\n')
}

/**
 * Hook executado após todos os testes.
 * Remove dados de teste do banco.
 */
export async function afterAll(): Promise<void> {
  console.log('🧹 Executando cleanup E2E...')
  await cleanup()
  console.log('✅ Cleanup concluído\n')
}
