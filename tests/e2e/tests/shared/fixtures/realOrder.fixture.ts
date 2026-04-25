/**
 * Fixture para criar pedido real via API em testes E2E.
 *
 * @module tests/shared/fixtures/realOrder.fixture
 */

import { APIRequestContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import {
  createTestOrder,
  generateUUID,
  OrderCreationResult,
  CreateTestOrderParams,
} from '../helpers/orderUtils'
import { test as authBase } from './index'

// Caminho para o resultado do seed
// Usa process.cwd() para garantir caminho consistente (same as seed.ts)
const SEED_RESULT_PATH = path.join(__dirname, '..', '..', '..', 'scripts', '.seed-result.json')

/**
 * Dados do pedido retornados pelo fixture.
 */
export interface RealOrderResult {
  orderId: string
  status: OrderCreationResult['status']
  total: number
  items: OrderCreationResult['items']
}

/**
 * Dados de seed carregados do arquivo.
 */
interface SeedData {
  restaurant: { id: string; name: string }
  tables: Array<{ id: string; number: number; qr_code: string }>
  products: Array<{ id: string; name: string; price: number }>
}

/**
 * Carrega dados de seed do arquivo `.seed-result.json`.
 */
function loadSeedData(): SeedData {
  if (!fs.existsSync(SEED_RESULT_PATH)) {
    throw new Error(
      `Seed result não encontrado: ${SEED_RESULT_PATH}\n` +
        `Execute 'pnpm test:e2e:seed' antes de rodar os testes.`
    )
  }

  return JSON.parse(fs.readFileSync(SEED_RESULT_PATH, 'utf-8'))
}

/**
 * Fixture que cria um pedido real via API.
 *
 * Usa seed data para obter restaurantId, tableId e products.
 * Gera UUID único por sessão de teste para idempotency.
 *
 * @example
 * ```typescript
 * test('meu teste', async ({ realOrder }) => {
 *   const { orderId, status, total, items } = realOrder
 *   expect(orderId).toBeDefined()
 * })
 * ```
 */
export const realOrderFixture = authBase.extend<{ realOrder: RealOrderResult }>({
  realOrder: async ({ request }: { request: APIRequestContext }, fixtureUse) => {
    const seed = loadSeedData()
    const _sessionId = generateUUID()

    // Obtém restaurantId e tableId do seed
    const restaurantId = seed.restaurant.id
    const tableId = seed.tables[0]?.id

    if (!restaurantId || !tableId) {
      throw new Error('Seed data inválida: restaurantId ou tableId não encontrados')
    }

    // Usa produtos do seed para criar itens do pedido
    const products = seed.products
    const items: CreateTestOrderParams['items'] = products.slice(0, 2).map((product) => ({
      productId: product.id,
      quantity: 1,
    }))

    // Cria pedido real via API
    const order = await createTestOrder(request, {
      restaurantId,
      tableId,
      items,
    })

    const result: RealOrderResult = {
      orderId: order.id,
      status: order.status,
      total: order.total,
      items: order.items,
    }

    await fixtureUse(result)
  },
})
