/**
 * Helpers de API para testes E2E.
 *
 * Funções auxiliares para ler dados do seed e interagir com a API Admin.
 * Re-exporta funções de criação/limpeza de seed.ts e cleanup.ts.
 *
 * @module support/api
 */

import * as path from 'path'
import * as fs from 'fs'
import type { APIRequestContext } from '@playwright/test'

// Re-exportar funções de criação do seed
export {
  createAdminClient,
  createTestUser,
  createTestCategory,
  createTestProduct,
  createTestTable,
} from '../scripts/seed'

// Re-exportar funções de cleanup
export {
  createAdminClient as createCleanupAdminClient,
  deleteTestUserByEmail,
  deleteTestUserById,
  deleteTestRestaurantByName,
} from '../scripts/cleanup'

import { createAdminClient } from '../scripts/seed'
import { deleteTestUserByEmail, deleteTestRestaurantByName } from '../scripts/cleanup'

const SEED_RESULT_PATH = path.join(__dirname, '..', 'scripts', '.seed-result.json')

// ============================================
// Tipos
// ============================================

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
 * Dados de uma categoria para criação.
 */
export interface CreateCategoryData {
  name: string
  restaurantId?: string
}

/**
 * Dados de um produto para criação.
 */
export interface CreateProductData {
  name: string
  price: number
  categoryId: string
  description?: string
  available?: boolean
}

/**
 * Dados de uma mesa para criação.
 */
export interface CreateTableData {
  code: string
  number?: number
  capacity?: number
}

// ============================================
// Funções de leitura do Seed
// ============================================

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
 * Obtém categorias do seed.
 */
export function getSeedCategories(): Array<{ id: string; name: string }> {
  const seed = readSeedResult()
  return seed.categories
}

/**
 * Obtém o restaurant ID do seed.
 */
export function getSeedRestaurantId(): string {
  const seed = readSeedResult()
  return seed.restaurant.id
}

// ============================================
// Wrapper Admin API (via Supabase Direct)
// ============================================

/**
 * Cria um pedido via API Admin (diretamente no banco).
 * Útil para setup de testes que precisam de pedidos pré-existentes.
 */
export async function createOrderAdmin(
  tableId: string,
  customerId: string,
  items: Array<{ productId: string; quantity: number }>,
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' = 'pending'
): Promise<string> {
  const admin = createAdminClient()
  const restaurantId = getSeedRestaurantId()

  // Criar o pedido
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      table_id: tableId,
      customer_id: customerId,
      restaurant_id: restaurantId,
      status,
      total_amount: 0, // Será calculado pelos items
    })
    .select()
    .single()

  if (orderError) {
    throw new Error(`Erro ao criar pedido: ${orderError.message}`)
  }

  // Criar os items do pedido
  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: 0, // Será buscado do produto
    notes: null,
  }))

  const { error: itemsError } = await admin.from('order_items').insert(orderItems)

  if (itemsError) {
    throw new Error(`Erro ao criar items do pedido: ${itemsError.message}`)
  }

  // Atualizar total do pedido
  const { data: updatedOrder } = await admin
    .from('orders')
    .select('total_amount')
    .eq('id', order.id)
    .single()

  const _totalAmount = updatedOrder?.total_amount || 0

  return order.id
}

/**
 * Atualiza o status de um pedido via API Admin.
 */
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (error) {
    throw new Error(`Erro ao atualizar status do pedido: ${error.message}`)
  }
}

/**
 * Deleta um pedido e seus items via API Admin.
 */
export async function deleteOrderAdmin(orderId: string): Promise<void> {
  const admin = createAdminClient()

  // Deletar items primeiro (se não houver cascade)
  await admin.from('order_items').delete().eq('order_id', orderId)

  // Deletar histórico de status
  await admin.from('order_status_history').delete().eq('order_id', orderId)

  // Deletar o pedido
  const { error } = await admin.from('orders').delete().eq('id', orderId)

  if (error) {
    throw new Error(`Erro ao deletar pedido: ${error.message}`)
  }
}

/**
 * Cria um usuário via API Admin (sem necessidade de email confirmation).
 */
export async function createUserAdmin(
  email: string,
  password: string,
  role: 'customer' | 'admin' | 'waiter' = 'customer'
): Promise<string> {
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    throw new Error(`Erro ao criar usuário ${role}: ${error.message}`)
  }

  return data.user.id
}

/**
 * Deleta todos os dados de teste (usuarios e restaurant).
 * Wrapper combinado para cleanup completo.
 */
export async function cleanupAllTestData(): Promise<void> {
  // Deletar restaurant (cascade deleta tudo relacionado)
  await deleteTestRestaurantByName()

  // Deletar usuários específicos
  const seed = readSeedResult()
  await deleteTestUserByEmail(seed.users.customer.email)
  await deleteTestUserByEmail(seed.users.admin.email)
  await deleteTestUserByEmail(seed.users.waiter.email)
}

// ============================================
// Wrapper API Request (via HTTP)
// ============================================

/**
 * Cria um pedido via API HTTP.
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

/**
 * Obtém um pedido via API HTTP.
 */
export async function getOrder(
  api: APIRequestContext,
  orderId: string
): Promise<{ id: string; status: string; total_amount: number }> {
  const response = await api.get(`/api/orders/${orderId}`)

  if (!response.ok()) {
    throw new Error(`Erro ao obter pedido: ${response.status()} ${response.statusText()}`)
  }

  return response.json()
}

/**
 * Cancela um pedido via API HTTP.
 */
export async function cancelOrder(api: APIRequestContext, orderId: string): Promise<void> {
  const response = await api.post(`/api/orders/${orderId}/cancel`)

  if (!response.ok()) {
    throw new Error(`Erro ao cancelar pedido: ${response.status()} ${response.statusText()}`)
  }
}
