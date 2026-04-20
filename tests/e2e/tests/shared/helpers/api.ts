import { APIRequestContext } from '@playwright/test'

export interface SeedData {
  customer: { email: string; password: string; id: string }
  admin: { email: string; password: string; id: string; resetToken: string }
  waiter: { email: string; password: string; id: string }
  table: { id: string; code: string }
  categories: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; price: number }>
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function generateEmail(): string {
  return `test-${generateId()}@pedi-ai.test`
}

export async function createTestData(): Promise<SeedData> {
  // Generate test user credentials
  const customer = {
    email: generateEmail(),
    password: 'TestPassword123!',
    id: generateId(),
  }

  const admin = {
    email: generateEmail(),
    password: 'AdminPassword123!',
    id: generateId(),
    resetToken: `reset-token-${generateId()}`,
  }

  const waiter = {
    email: generateEmail(),
    password: 'WaiterPassword123!',
    id: generateId(),
  }

  const table = {
    id: generateId(),
    code: `TABLE-${generateId().substring(0, 6).toUpperCase()}`,
  }

  // Create test categories
  const categories = [
    { id: generateId(), name: 'Bebidas' },
    { id: generateId(), name: 'Pratos Principais' },
    { id: generateId(), name: 'Sobremesas' },
  ]

  // Create test products
  const products = [
    { id: generateId(), name: 'Coca-Cola', price: 5.99 },
    { id: generateId(), name: 'Picanha', price: 45.99 },
    { id: generateId(), name: 'Tiramisu', price: 15.99 },
  ]

  return { customer, admin, waiter, table, categories, products }
}

export async function cleanupTestData(data: SeedData): Promise<void> {
  // Cleanup is handled by Supabase soft delete or TTL
  // In production, implement proper cleanup
}

export async function seedMenuData(api: APIRequestContext, data: SeedData): Promise<void> {
  // Seed categories
  for (const category of data.categories) {
    await api.post('/api/admin/categories', {
      data: { name: category.name, id: category.id },
    })
  }

  // Seed products
  for (const product of data.products) {
    await api.post('/api/admin/products', {
      data: {
        name: product.name,
        price: product.price,
        categoryId: data.categories[0].id,
      },
    })
  }
}

export async function createTestOrder(
  api: APIRequestContext,
  data: SeedData,
  items: Array<{ productId: string; quantity: number }>
): Promise<string> {
  const response = await api.post('/api/orders', {
    data: {
      tableId: data.table.id,
      items,
      customerId: data.customer.id,
    },
  })
  return response.json().then((r: { id: string }) => r.id)
}
