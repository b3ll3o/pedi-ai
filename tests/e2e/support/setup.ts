/**
 * Support setup para testes E2E.
 *
 * Verifica que o seed foi executado antes dos testes.
 * O seed deve ser executado manualmente via: pnpm test:e2e:seed
 *
 * @module support/setup
 */

import * as path from 'path'
import * as fs from 'fs'

const SEED_RESULT_PATH = path.join(__dirname, '..', 'scripts', '.seed-result.json')

/**
 * Verifica se o arquivo de resultado do seed existe.
 */
function checkSeedResult(): void {
  if (!fs.existsSync(SEED_RESULT_PATH)) {
    throw new Error(
      `Arquivo de seed não encontrado: ${SEED_RESULT_PATH}\n` +
      `Execute 'pnpm test:e2e:seed' antes de rodar os testes.`
    )
  }

  try {
    const data = JSON.parse(fs.readFileSync(SEED_RESULT_PATH, 'utf-8'))

    // Validações básicas
    if (!data.restaurant?.id) throw new Error('Seed result: restaurant.id ausente')
    if (!data.users?.customer?.id) throw new Error('Seed result: users.customer.id ausente')
    if (!data.users?.admin?.id) throw new Error('Seed result: users.admin.id ausente')
    if (!data.users?.waiter?.id) throw new Error('Seed result: users.waiter.id ausente')

    console.log(`✅ Seed verificado: ${data.restaurant.name}`)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Seed result inválido (JSON mal formado): ${SEED_RESULT_PATH}`)
    }
    throw error
  }
}

export default async (): Promise<void> => {
  console.log('🔍 Verificando seed E2E...')
  checkSeedResult()
}
