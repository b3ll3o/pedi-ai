/**
 * Order Service
 * Handles order creation with idempotency key generation.
 */

import { useTableStore } from '@/stores/tableStore'
import type { CartItem } from '@/stores/cartStore'
import type { orders, order_items } from '@/lib/supabase/types'
import { queueOrderForSync } from '@/lib/offline/sync'

// ── Types ────────────────────────────────────────────────────

export interface Order {
  id: string
  restaurant_id: string
  table_id: string | null
  customer_id: string | null
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  subtotal: number
  tax: number
  total: number
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'other' | null
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
  created_at: string
  updated_at: string
  items?: order_items[]
}

interface CreateOrderParams {
  cart: CartItem[]
  customerId: string
  tableId: string | null
  paymentMethod: 'pix' | 'card'
  restaurantId?: string
}

// ── Idempotency Key Generation ─────────────────────────────────

/**
 * Generate an idempotency key from cart items and restaurant ID.
 * Format: ${restaurantId}:${hash}:${timestamp}
 *
 * The hash is computed from sorted cart items (productId + quantity + modifiers)
 * to ensure the same cart always produces the same hash.
 * Timestamp prevents collisions from rapid successive submissions.
 */
export async function generateIdempotencyKey(
  cartItems: CartItem[],
  restaurantId?: string
): Promise<string> {
  const restId = restaurantId ?? useTableStore.getState().restaurantId ?? 'unknown'
  const timestamp = Date.now()

  // Create a synchronous hash for the key format
  const sortedItems = [...cartItems].sort((a, b) => a.productId.localeCompare(b.productId))
  const hashInput = sortedItems
    .map((item) => {
      const modifiersHash = item.modifiers
        .slice()
        .sort((a, b) => a.modifier_id.localeCompare(b.modifier_id))
        .map((mod) => `${mod.modifier_id}:${mod.price_adjustment}`)
        .join('|')
      return `${item.productId}:${item.quantity}:${modifiersHash}`
    })
    .join('||')

  // Use SubtleCrypto for SHA-256
  const encoder = new TextEncoder()
  const data = encoder.encode(hashInput)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return `${restId}:${hash}:${timestamp}`
}

// ── Price Calculation ──────────────────────────────────────────

const TAX_RATE = 0.1 // 10% tax

/**
 * Calculate subtotal from cart items.
 * Mirrors the logic in cartStore.getTotalPrice.
 */
function calculateSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => {
    if (item.comboId && item.bundlePrice !== undefined) {
      // Combo item: use bundlePrice × quantity (modifiers included in bundle)
      return sum + item.bundlePrice * item.quantity
    }
    // Regular item: unitPrice + sum(modifierPriceAdjustments) × quantity
    const modifierTotal = item.modifiers.reduce(
      (mSum, mod) => mSum + mod.price_adjustment,
      0
    )
    return sum + (item.unitPrice + modifierTotal) * item.quantity
  }, 0)
}

// ── Order Creation ────────────────────────────────────────────

/**
 * Maps payment method from simplified ('pix' | 'card') to database format.
 */
function mapPaymentMethod(method: 'pix' | 'card'): 'pix' | 'credit_card' | 'debit_card' {
  switch (method) {
    case 'pix':
      return 'pix'
    case 'card':
      return 'credit_card' // Default to credit_card; could be extended to support both
    default:
      return 'pix'
  }
}

/**
 * Create an order from the cart.
 * Uses idempotency key to prevent duplicate orders from rapid submissions.
 */
export async function createOrderFromCart({
  cart,
  customerId,
  tableId,
  paymentMethod,
  restaurantId,
}: CreateOrderParams): Promise<Order> {
  if (cart.length === 0) {
    throw new Error('Cannot create order from empty cart')
  }

  const restId = restaurantId ?? useTableStore.getState().restaurantId
  if (!restId) {
    throw new Error('Restaurant ID is required to create an order')
  }

  const subtotal = calculateSubtotal(cart)
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const total = Math.round((subtotal + tax) * 100) / 100

  const idempotencyKey = await generateIdempotencyKey(cart, restId)

  // Build order payload
  const orderPayload: Omit<orders, 'id' | 'created_at' | 'updated_at'> = {
    restaurant_id: restId,
    table_id: tableId,
    customer_id: customerId || null,
    status: 'pending',
    subtotal,
    tax,
    total,
    payment_method: mapPaymentMethod(paymentMethod),
    payment_status: 'pending',
    idempotency_key: idempotencyKey,
  }

  // Build order items payload
  const itemsPayload: Omit<order_items, 'id' | 'order_id' | 'created_at'>[] = cart.map(
    (item) => ({
      order_id: '', // Will be filled by API
      product_id: item.productId,
      combo_id: item.comboId || null,
      quantity: item.quantity,
      unit_price: item.comboId && item.bundlePrice !== undefined
        ? item.bundlePrice
        : item.unitPrice,
      total_price: item.comboId && item.bundlePrice !== undefined
        ? item.bundlePrice * item.quantity
        : (item.unitPrice + item.modifiers.reduce((s, m) => s + m.price_adjustment, 0)) * item.quantity,
      notes: item.notes || null,
    })
  )

  // Call the orders API
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ order: orderPayload, items: itemsPayload }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(error.error || 'Falha ao criar pedido')
    }

    const createdOrder: Order = await response.json()
    return createdOrder
  } catch {
    // Offline ou erro de rede → enfileirar para sincronização
    await queueOrderForSync({ order: orderPayload, items: itemsPayload })

    // Retornar pedido simulado com status pending para UI
    // O status real será 'pending' quando for sincronizado
    const offlineOrder: Order = {
      id: `offline-${Date.now()}`,
      restaurant_id: restId,
      table_id: tableId,
      customer_id: customerId || null,
      status: 'pending',
      subtotal,
      tax,
      total,
      payment_method: mapPaymentMethod(paymentMethod),
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: itemsPayload as order_items[],
    }
    return offlineOrder
  }
}
