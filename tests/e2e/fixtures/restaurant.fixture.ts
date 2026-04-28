/**
 * Fixture de restaurante para testes E2E.
 *
 * Fornece funções para criar e limpar restaurantes de teste.
 * Usa Supabase Admin API (service role key).
 *
 * @module fixtures/restaurant.fixture
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Carregar .env.e2e explicitamente
dotenv.config({ path: path.join(process.cwd(), 'tests/e2e', '.env.e2e') })

// ============================================
// Configuração
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Variáveis de ambiente ausentes:\n' +
    `  - NEXT_PUBLIC_SUPABASE_URL: ${!SUPABASE_URL ? 'ausente' : 'ok'}\n` +
    `  - SUPABASE_SERVICE_ROLE_KEY: ${!SUPABASE_SERVICE_ROLE_KEY ? 'ausente' : 'ok'}\n`
  )
}

// Nome fixo do restaurante de teste (idempotência)
export const TEST_RESTAURANT_NAME = 'Restaurant E2E Test'

// ============================================
// Tipos
// ============================================

export interface TestRestaurant {
  id: string
  name: string
  description?: string
}

export interface TestCategory {
  id: string
  name: string
  restaurant_id: string
}

export interface TestProduct {
  id: string
  name: string
  price: number
  category_id: string
  restaurant_id: string
}

export interface TestTable {
  id: string
  number: number
  qr_code: string
  restaurant_id: string
}

// ============================================
// Cliente Admin
// ============================================

export function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Cache do restaurant de teste para reutilização
let cachedRestaurantId: string | null = null

// ============================================
// Funções de criação e limpeza
// ============================================

/**
 * Obtém ou cria um restaurante de teste.
 * Usa ID fixo para garantir idempotência (compatível com seed.ts).
 *
 * @param name Nome do restaurante (default: TEST_RESTAURANT_NAME)
 * @returns Dados do restaurante criado/obtido
 */
export async function getOrCreateTestRestaurant(
  name: string = TEST_RESTAURANT_NAME
): Promise<TestRestaurant> {
  const admin = createAdminClient()

  if (cachedRestaurantId) {
    const { data } = await admin
      .from('restaurants')
      .select('id, name')
      .eq('id', cachedRestaurantId)
      .maybeSingle()

    if (data) {
      return { id: data.id, name: data.name }
    }
  }

  // Buscar existente
  const { data: existing } = await admin
    .from('restaurants')
    .select('id, name')
    .eq('name', name)
    .maybeSingle()

  if (existing) {
    cachedRestaurantId = existing.id as string
    return { id: existing.id, name: existing.name }
  }

  // Criar novo - usa ID fixo para compatibilidade com seed.ts
  const DEMO_RESTAURANT_ID = '00000000-0000-0000-0000-000000000001'

  const { data: newRestaurant, error } = await admin
    .from('restaurants')
    .upsert({
      id: DEMO_RESTAURANT_ID,
      name,
      description: 'Restaurante de testes E2E',
      settings: {
        currency: 'BRL',
        timezone: 'America/Sao_Paulo',
        tax_rate: 0.1,
      },
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar restaurante: ${error.message}`)
  }

  cachedRestaurantId = newRestaurant.id as string
  return { id: newRestaurant.id, name: newRestaurant.name }
}

/**
 * Deleta um restaurante de teste pelo nome.
 * O cascade deleta tables, categories, products, etc.
 *
 * @param name Nome do restaurante (default: TEST_RESTAURANT_NAME)
 * @returns true se deletado com sucesso, false se não encontrado
 */
export async function deleteTestRestaurant(
  name: string = TEST_RESTAURANT_NAME
): Promise<boolean> {
  const admin = createAdminClient()

  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (!restaurants) {
    return false
  }

  const { error } = await admin
    .from('restaurants')
    .delete()
    .eq('id', restaurants.id)

  if (!error) {
    cachedRestaurantId = null
  }

  return !error
}

/**
 * Cria uma categoria de teste.
 *
 * @param name Nome da categoria
 * @param restaurantId ID do restaurante (opcional, usa getOrCreateTestRestaurant se não fornecido)
 * @returns Dados da categoria criada
 */
export async function createTestCategory(
  name: string,
  restaurantId?: string
): Promise<TestCategory> {
  const admin = createAdminClient()
  const restaurant = restaurantId || (await getOrCreateTestRestaurant())

  const { data, error } = await admin
    .from('categories')
    .insert({
      name,
      restaurant_id: typeof restaurant === 'string' ? restaurant : restaurant.id,
      active: true,
      sort_order: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar categoria: ${error.message}`)
  }

  return {
    id: data.id,
    name: data.name,
    restaurant_id: data.restaurant_id,
  }
}

/**
 * Cria um produto de teste.
 *
 * @param name Nome do produto
 * @param price Preço do produto
 * @param categoryId ID da categoria
 * @param restaurantId ID do restaurante (opcional)
 * @returns ID do produto criado
 */
export async function createTestProduct(
  name: string,
  price: number,
  categoryId: string,
  restaurantId?: string
): Promise<string> {
  const admin = createAdminClient()
  const restaurant = restaurantId || (await getOrCreateTestRestaurant())
  const restaurantIdStr = typeof restaurant === 'string' ? restaurant : restaurant.id

  const { data, error } = await admin
    .from('products')
    .insert({
      name,
      description: `Produto de teste: ${name}`,
      price,
      category_id: categoryId,
      restaurant_id: restaurantIdStr,
      available: true,
      sort_order: 0,
      dietary_labels: [],
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar produto: ${error.message}`)
  }

  return data.id
}

/**
 * Cria uma mesa de teste.
 *
 * @param code Código QR da mesa
 * @param number Número da mesa (extraído do code se não fornecido)
 * @param capacity Capacidade (default: 4)
 * @param restaurantId ID do restaurante (opcional)
 * @returns Dados da mesa criada
 */
export async function createTestTable(
  code: string,
  number?: number,
  capacity: number = 4,
  restaurantId?: string
): Promise<TestTable> {
  const admin = createAdminClient()
  const restaurant = restaurantId || (await getOrCreateTestRestaurant())
  const restaurantIdStr = typeof restaurant === 'string' ? restaurant : restaurant.id

  const tableNumber = number ?? (parseInt(code.replace(/\D/g, ''), 10) || Math.floor(Math.random() * 100))

  const { data, error } = await admin
    .from('tables')
    .insert({
      number: tableNumber,
      capacity,
      name: `Mesa ${tableNumber}`,
      qr_code: code,
      restaurant_id: restaurantIdStr,
      active: true,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar mesa: ${error.message}`)
  }

  return {
    id: data.id,
    number: data.number,
    qr_code: data.qr_code,
    restaurant_id: data.restaurant_id,
  }
}

/**
 * Deleta todas as mesas de um restaurante.
 *
 * @param restaurantId ID do restaurante
 * @returns número de mesas deletadas
 */
export async function deleteTablesByRestaurant(restaurantId: string): Promise<number> {
  const admin = createAdminClient()

  const { data: tables, error: selectError } = await admin
    .from('tables')
    .select('id')
    .eq('restaurant_id', restaurantId)

  if (selectError) {
    throw new Error(`Erro ao buscar mesas: ${selectError.message}`)
  }

  if (!tables || tables.length === 0) {
    return 0
  }

  const { error: deleteError } = await admin
    .from('tables')
    .delete()
    .eq('restaurant_id', restaurantId)

  if (deleteError) {
    throw new Error(`Erro ao deletar mesas: ${deleteError.message}`)
  }

  return tables.length
}

/**
 * Fixture de restaurante.
 *
 * @example
 * ```typescript
 * test('meu teste', async ({ restaurant }) => {
 *   const { id, name } = await restaurant.getOrCreate()
 *   // ... teste ...
 * })
 * ```
 */
export const restaurantFixture = {
  getOrCreate: getOrCreateTestRestaurant,
  delete: deleteTestRestaurant,
  createCategory: createTestCategory,
  createProduct: createTestProduct,
  createTable: createTestTable,
  deleteTables: deleteTablesByRestaurant,
  createAdminClient,
  TEST_RESTAURANT_NAME,
}

export default restaurantFixture
