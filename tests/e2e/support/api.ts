/**
 * Helpers de API para testes E2E.
 *
 * Funções auxiliares para ler dados do seed e interagir com a API.
 *
 * @module support/api
 */

import * as path from 'path'
import * as fs from 'fs'
import type { APIRequestContext } from '@playwright/test'

const SEED_RESULT_PATH = path.join(__dirname, '..', 'scripts', '.seed-result.json')

/**
 * Resultado do seed.
 */
export interface SeedResult {
  restaurant: { id: string; name: string }
  users: {
    customer: { id: string; email: string; password: string }
    admin: { id: string; email: string; password: string }
    waiter: { id: string; email: string; password: string }
  }
  categories: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; price: number; category_id: string }>
  tables: Array<{ id: string; number: number; qr_code: string }>
}

/**
 * Lê o resultado do seed.
 * Lança erro se o arquivo não existir (deve ser executado antes dos testes).
 */
export function readSeedResult(): SeedResult {
  if (!fs.existsSync(SEED_RESULT_PATH)) {
    throw new Error(
      `Seed result não encontrado: ${SEED_RESULT_PATH}\n` +
      `Execute 'pnpm test:e2e:seed' primeiro.`
    )
  }

  const data = fs.readFileSync(SEED_RESULT_PATH, 'utf-8')
  return JSON.parse(data) as SeedResult
}

/**
 * Obtém as credenciais de um usuário do seed.
 */
export function getSeedUser(role: 'customer' | 'admin' | 'waiter'): { email: string; password: string } {
  const seed = readSeedResult()
  const user = seed.users[role]
  return { email: user.email, password: user.password }
}

/**
 * Obtém uma mesa do seed.
 */
export function getSeedTable(index = 0): { id: string; number: number; qr_code: string } {
  const seed = readSeedResult()
  return seed.tables[index]
}

/**
 * Obtém produtos do seed.
 */
export function getSeedProducts(): Array<{ id: string; name: string; price: number }> {
  const seed = readSeedResult()
  return seed.products
}

/**
 * Cria um pedido via API.
 */
export async function createOrder(
  api: APIRequestContext,
  tableId: string,
  customerId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<string> {
  const response = await api.post('/api/orders', {
    data: { tableId, customerId, items },
  })

  if (!response.ok()) {
    throw new Error(`Erro ao criar pedido: ${response.status()} ${response.statusText()}`)
  }

  const result = await response.json()
  return result.id
}
