/**
 * Helpers para criação de pedidos em testes E2E.
 *
 * @module tests/shared/helpers/orderUtils
 */

import type { APIRequestContext } from '@playwright/test'

// ============================================
// Tipos
// ============================================

/**
 * Item de pedido para criação.
 */
export interface OrderItemInput {
  productId: string
  quantity: number
  modifiers?: Array<{ name: string; price?: number }>
}

/**
 * Item de pedido no resultado.
 */
export interface OrderItem {
  id: string
  productId: string
  quantity: number
  modifiers?: Array<{ name: string; price: number }>
  unitPrice: number
  totalPrice: number
}

/**
 * Parâmetros para criação de pedido.
 */
export interface CreateTestOrderParams {
  restaurantId: string
  tableId: string
  customerId?: string
  items: OrderItemInput[]
}

/**
 * Resultado da criação de pedido.
 */
export interface OrderCreationResult {
  id: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  total: number
  items: OrderItem[]
}

// ============================================
// Utilitários
// ============================================

/**
 * Gera um UUID v4 para identificadores únicos de sessão.
 * Usado para idempotency keys e outros identificadores.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================
// Funções de Criação de Pedido
// ============================================

/**
 * Cria um pedido real via API HTTP com idempotency key.
 *
 * @param api - Contexto da API do Playwright
 * @param params - Parâmetros do pedido (restaurantId, tableId, items)
 * @returns Resultado completo do pedido criado
 * @throws Erro se a criação falhar
 */
export async function createTestOrder(
  api: APIRequestContext,
  params: CreateTestOrderParams
): Promise<OrderCreationResult> {
  const idempotencyKey = generateUUID()

  const payload: Record<string, unknown> = {
    restaurantId: params.restaurantId,
    tableId: params.tableId,
    items: params.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      ...(item.modifiers && { modifiers: item.modifiers }),
    })),
  }

  if (params.customerId) {
    payload.customerId = params.customerId
  }

  const response = await api.post('/api/orders', {
    data: payload,
    headers: {
      'X-Idempotency-Key': idempotencyKey,
    },
  })

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(
      `Erro ao criar pedido: ${response.status()} ${response.statusText()} - ${errorText}`
    )
  }

  const result = await response.json()

  return {
    id: result.id,
    status: result.status,
    total: result.total ?? result.totalAmount ?? 0,
    items: result.items ?? [],
  }
}
