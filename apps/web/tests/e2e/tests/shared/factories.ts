/**
 * Data Factories for E2E Tests
 *
 * Provides factory functions for creating test data via API.
 * These are faster than using the UI and provide better control over
 * specific data states needed for testing.
 *
 * Usage:
 * ```typescript
 * test('should test order with specific status', async ({ api, seedData }) => {
 *   const order = await createOrder(api, {
 *     restaurantId: seedData.restaurant.id,
 *     tableId: seedData.table.id,
 *     status: 'pending_payment'
 *   })
 * })
 * ```
 */

import type { APIRequestContext } from '@playwright/test'
import { generateUUID } from './helpers/orderUtils'

// ============================================
// Types
// ============================================

export interface OrderStatus {
  status: 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  paymentStatus: 'pending' | 'paid' | 'failed'
}

export interface CreateOrderOptions {
  restaurantId: string
  tableId: string
  customerId?: string
  status?: OrderStatus['status']
  paymentStatus?: OrderStatus['paymentStatus']
  items: Array<{
    productId: string
    quantity: number
    unitPrice: number
  }>
}

export interface CreatedOrder {
  id: string
  status: string
  total: number
}

// ============================================
// Order Factory
// ============================================

/**
 * Creates a test order via API.
 * Faster than going through the UI checkout flow.
 */
export async function createOrder(
  api: APIRequestContext,
  options: CreateOrderOptions
): Promise<CreatedOrder> {
  const idempotencyKey = generateUUID()

  const payload = {
    customer_id: options.customerId,
    table_id: options.tableId,
    payment_method: 'pix',
    payment_status: options.paymentStatus ?? 'pending',
    status: options.status ?? 'pending_payment',
    idempotency_key: idempotencyKey,
    items: options.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
  }

  const response = await api.post('/api/orders', { data: payload })

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(
      `Failed to create order: ${response.status()} ${response.statusText()} - ${errorText}`
    )
  }

  const result = await response.json()
  return {
    id: result.id,
    status: result.status,
    total: result.total ?? result.totalAmount ?? 0,
  }
}

/**
 * Creates multiple orders in parallel for batch testing.
 */
export async function createOrdersBatch(
  api: APIRequestContext,
  options: CreateOrderOptions[]
): Promise<CreatedOrder[]> {
  return Promise.all(options.map((opt) => createOrder(api, opt)))
}

// ============================================
// Product Factory
// ============================================

export interface CreateProductOptions {
  name: string
  price: number
  categoryId: string
  restaurantId: string
  available?: boolean
  description?: string
}

/**
 * Creates a test product via direct database access.
 * Note: This requires service role key access.
 */
export async function createProduct(
  adminApi: APIRequestContext,
  supabaseUrl: string,
  serviceRoleKey: string,
  options: CreateProductOptions
): Promise<{ id: string }> {
  const response = await adminApi.post(`${supabaseUrl}/rest/v1/products`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    data: {
      name: options.name,
      description: options.description ?? `Test product: ${options.name}`,
      price: options.price,
      category_id: options.categoryId,
      restaurant_id: options.restaurantId,
      available: options.available ?? true,
      sort_order: 0,
      dietary_labels: [],
    },
  })

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(
      `Failed to create product: ${response.status()} - ${errorText}`
    )
  }

  const result = await response.json()
  return { id: result.id }
}

// ============================================
// Category Factory
// ============================================

export interface CreateCategoryOptions {
  name: string
  restaurantId: string
  active?: boolean
  sortOrder?: number
}

/**
 * Creates a test category.
 */
export async function createCategory(
  adminApi: APIRequestContext,
  supabaseUrl: string,
  serviceRoleKey: string,
  options: CreateCategoryOptions
): Promise<{ id: string }> {
  const response = await adminApi.post(`${supabaseUrl}/rest/v1/categories`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    data: {
      name: options.name,
      restaurant_id: options.restaurantId,
      active: options.active ?? true,
      sort_order: options.sortOrder ?? 0,
    },
  })

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(
      `Failed to create category: ${response.status()} - ${errorText}`
    )
  }

  const result = await response.json()
  return { id: result.id }
}

// ============================================
// Table Factory
// ============================================

export interface CreateTableOptions {
  number: number
  restaurantId: string
  capacity?: number
  qrCode?: string
}

/**
 * Creates a test table.
 */
export async function createTable(
  adminApi: APIRequestContext,
  supabaseUrl: string,
  serviceRoleKey: string,
  options: CreateTableOptions
): Promise<{ id: string; qrCode: string }> {
  const qrCode = options.qrCode ?? `E2E-TABLE-${options.number.toString().padStart(3, '0')}`

  const response = await adminApi.post(`${supabaseUrl}/rest/v1/tables`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    data: {
      number: options.number,
      name: `Mesa ${options.number}`,
      capacity: options.capacity ?? 4,
      qr_code: qrCode,
      restaurant_id: options.restaurantId,
      active: true,
    },
  })

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(
      `Failed to create table: ${response.status()} - ${errorText}`
    )
  }

  const result = await response.json()
  return { id: result.id, qrCode: result.qr_code }
}

// ============================================
// User Factory
// ============================================

export interface CreateUserOptions {
  email: string
  password?: string
  role?: 'customer' | 'admin' | 'waiter'
}

/**
 * Creates a test user via Supabase Admin API.
 */
export async function createUser(
  adminApi: APIRequestContext,
  supabaseUrl: string,
  serviceRoleKey: string,
  options: CreateUserOptions
): Promise<{ id: string }> {
  const response = await adminApi.post(`${supabaseUrl}/auth/v1/admin/users`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    data: {
      email: options.email,
      password: options.password ?? 'E2ETestPassword123!',
      email_confirm: true,
    },
  })

  if (!response.ok()) {
    const errorText = await response.text()
    throw new Error(
      `Failed to create user: ${response.status()} - ${errorText}`
    )
  }

  const result = await response.json()
  return { id: result.id }
}

// ============================================
// Cleanup Helpers
// ============================================

/**
 * Deletes a user by email.
 */
export async function deleteUserByEmail(
  adminApi: APIRequestContext,
  supabaseUrl: string,
  serviceRoleKey: string,
  email: string
): Promise<void> {
  // First, get the user list to find the user ID
  const listResponse = await adminApi.get(
    `${supabaseUrl}/auth/v1/admin/users`,
    {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    }
  )

  if (!listResponse.ok()) {
    return
  }

  const { users } = await listResponse.json()
  const user = users?.find((u: { email: string }) => u.email === email)

  if (!user) {
    return
  }

  await adminApi.delete(
    `${supabaseUrl}/auth/v1/admin/users/${user.id}`,
    {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    }
  )
}

/**
 * Deletes an order by ID.
 */
export async function deleteOrder(
  adminApi: APIRequestContext,
  supabaseUrl: string,
  serviceRoleKey: string,
  orderId: string
): Promise<void> {
  await adminApi.delete(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
  })
}

/**
 * Updates order status.
 */
export async function updateOrderStatus(
  adminApi: APIRequestContext,
  supabaseUrl: string,
  serviceRoleKey: string,
  orderId: string,
  status: OrderStatus['status']
): Promise<void> {
  await adminApi.patch(
    `${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=minimal'
      },
      data: { status },
    }
  )
}