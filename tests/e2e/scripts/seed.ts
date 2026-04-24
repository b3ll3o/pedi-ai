/**
 * Script de seed para testes E2E.
 *
 * Cria dados de teste no Supabase cloud:
 * - Usuários (customer, admin, waiter)
 * - Restaurant de teste
 * - Categories de teste
 * - Products de teste
 * - Tables de teste
 *
 * Uso: pnpm test:e2e:seed
 * Requer: SUPABASE_SERVICE_ROLE_KEY no .env.local
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar .env.local explicitamente
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================
// Configuração
// ============================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente ausentes:')
  if (!SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_SERVICE_ROLE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nAdicione SUPABASE_SERVICE_ROLE_KEY ao .env.local')
  process.exit(1)
}

// Prefixo para identificar dados de teste (idempotência)
const SEED_PREFIX = 'e2e+'
const TEST_PASSWORD = 'E2ETestPassword123!'
const RESTAURANT_NAME = 'Restaurant E2E Test'

// ============================================
// Tipos
// ============================================

interface SeedResult {
  users: {
    customer: TestUser
    admin: TestUser
    waiter: TestUser
  }
  restaurant: {
    id: string
    name: string
  }
  categories: Array<{
    id: string
    name: string
  }>
  products: Array<{
    id: string
    name: string
    price: number
    category_id: string
  }>
  tables: Array<{
    id: string
    number: number
    qr_code: string
  }>
  modifierGroups?: {
    tamanhoId: string
    extrasId: string
  }
  comboId?: string
}

interface TestUser {
  id: string
  email: string
  password: string
}

// ============================================
// Cliente Supabase Admin
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

async function getOrCreateTestRestaurantId(admin: SupabaseClient): Promise<string> {
  if (cachedRestaurantId) return cachedRestaurantId

  const { data } = await admin
    .from('restaurants')
    .select('id')
    .eq('name', RESTAURANT_NAME)
    .maybeSingle()

  if (data) {
    cachedRestaurantId = data.id as string
    return cachedRestaurantId
  }

  const { data: newRestaurant } = await admin
    .from('restaurants')
    .insert({
      name: RESTAURANT_NAME,
      description: 'Restaurant de testes E2E',
      settings: {
        currency: 'BRL',
        timezone: 'America/Sao_Paulo',
        tax_rate: 0.1,
      },
    })
    .select()
    .single()

  cachedRestaurantId = newRestaurant!.id as string
  return cachedRestaurantId
}

// ============================================
// Funções de Modifier Groups (Requirement 2.1.x)
// ============================================

/**
 * Cria modifier groups de teste.
 * @param admin Cliente Supabase admin
 * @param restaurantId ID do restaurant
 * @returns Array com os IDs dos modifier groups criados
 */
export async function createModifierGroups(
  admin: SupabaseClient,
  restaurantId: string
): Promise<{ tamanhoId: string; extrasId: string }> {
  console.log('🏷️  Criando modifier groups de teste...')

  const modifierGroupsData = [
    {
      name: 'Tamanho',
      required: true,
      min_selections: 1,
      max_selections: 1,
    },
    {
      name: 'Extras',
      required: false,
      min_selections: 0,
      max_selections: 3,
    },
  ]

  const { data, error } = await admin
    .from('modifier_groups')
    .insert(
      modifierGroupsData.map((mg) => ({
        ...mg,
        restaurant_id: restaurantId,
      }))
    )
    .select()

  if (error) {
    throw new Error(`Erro ao criar modifier groups: ${error.message}`)
  }

  const tamanhoId = data.find((mg) => mg.name === 'Tamanho')?.id
  const extrasId = data.find((mg) => mg.name === 'Extras')?.id

  console.log(`   Tamanho: ${tamanhoId} (required=true)`)
  console.log(`   Extras: ${extrasId} (required=false)\n`)

  return { tamanhoId: tamanhoId!, extrasId: extrasId! }
}

/**
 * Cria modifier values para os modifier groups.
 * @param admin Cliente Supabase admin
 * @param modifierGroupIds IDs dos modifier groups
 */
export async function createModifierValues(
  admin: SupabaseClient,
  modifierGroupIds: { tamanhoId: string; extrasId: string }
): Promise<void> {
  console.log('🏷️  Criando modifier values de teste...')

  const modifierValuesData = [
    // Tamanho (Pequeno, Médio, Grande)
    { modifier_group_id: modifierGroupIds.tamanhoId, name: 'Pequeno', price_adjustment: 0 },
    { modifier_group_id: modifierGroupIds.tamanhoId, name: 'Médio', price_adjustment: 3 },
    { modifier_group_id: modifierGroupIds.tamanhoId, name: 'Grande', price_adjustment: 6 },
    // Extras (Bacon, Queijo Extra, Cebola)
    { modifier_group_id: modifierGroupIds.extrasId, name: 'Bacon', price_adjustment: 5 },
    { modifier_group_id: modifierGroupIds.extrasId, name: 'Queijo Extra', price_adjustment: 3 },
    { modifier_group_id: modifierGroupIds.extrasId, name: 'Cebola', price_adjustment: 2 },
  ]

  const { error } = await admin.from('modifier_values').insert(modifierValuesData)

  if (error) {
    throw new Error(`Erro ao criar modifier values: ${error.message}`)
  }

  console.log('   Tamanho: Pequeno (R$ 0), Médio (R$ +3), Grande (R$ +6)')
  console.log('   Extras: Bacon (R$ +5), Queijo Extra (R$ +3), Cebola (R$ +2)\n')
}

/**
 * Associa modifier groups a produtos existentes.
 *
 * A tabela junction 'product_modifier_groups' é necessária para linking
 * entre produtos e modifier groups. Se não existir, a função registra
 * um aviso e retorna sem causar erro (graceful degradation).
 *
 * @param admin Cliente Supabase admin
 * @param productIds Mapa de produtos por nome
 */
export async function associateModifierGroupsToProducts(
  admin: SupabaseClient,
  productIds: { picanhaId: string; tamanhoId: string; extrasId: string }
): Promise<void> {
  console.log('🔗 Associando modifier groups a produtos...')

  try {
    const productModifierGroupsData = [
      { product_id: productIds.picanhaId, modifier_group_id: productIds.tamanhoId },
    ]

    const { error } = await admin
      .from('product_modifier_groups')
      .insert(productModifierGroupsData)

    // Código 42P01 = table does not exist (PostgreSQL)
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.log('   ⚠️  Tabela product_modifier_groups não existe.')
      console.log('   ⚠️  Associação de modifier groups ignorada.\n')
      return
    }

    if (error) {
      throw new Error(`Erro ao associar modifier groups: ${error.message}`)
    }

    console.log(`   Picanha → Tamanho (obrigatório)\n`)
  } catch (_err) {
    // Qualquer erro = tabela não existe ou conexão falha
    console.log('   ⚠️  Não foi possível associar modifier groups.')
    console.log('   ⚠️  Associação de modifier groups ignorada.\n')
  }
}

// ============================================
// Funções de Combos (Requirement 2.2.x)
// ============================================

/**
 * Cria combos de teste.
 * @param admin Cliente Supabase admin
 * @param restaurantId ID do restaurant
 * @param productIds IDs dos produtos (picanhaId, cocaColaId)
 * @returns ID do combo criado
 */
export async function createCombos(
  admin: SupabaseClient,
  restaurantId: string,
  productIds: { picanhaId: string; cocaColaId: string }
): Promise<string> {
  console.log('🎁 Criando combos de teste...')

  // Combo Picanha: Picanha + Coca-Cola com bundle_price mais barato
  // Picanha 45.99 + Coca-Cola 5.99 = 51.98 → Combo R$ 45 (desconto de ~R$ 7)
  const combosData = [
    {
      name: 'Combo Picanha',
      description: 'Picanha 300g + Coca-Cola',
      bundle_price: 45.0,
      available: true,
    },
  ]

  const { data: combosDataResult, error: combosError } = await admin
    .from('combos')
    .insert(
      combosData.map((c) => ({
        ...c,
        restaurant_id: restaurantId,
      }))
    )
    .select()

  if (combosError) {
    throw new Error(`Erro ao criar combos: ${combosError.message}`)
  }

  const comboId = combosDataResult[0].id
  console.log(`   Combo: ${combosDataResult[0].name} - R$ ${combosDataResult[0].bundle_price.toFixed(2)} (${comboId})`)

  // Criar combo_items
  const comboItemsData = [
    { combo_id: comboId, product_id: productIds.picanhaId, quantity: 1 },
    { combo_id: comboId, product_id: productIds.cocaColaId, quantity: 1 },
  ]

  const { error: comboItemsError } = await admin.from('combo_items').insert(comboItemsData)

  if (comboItemsError) {
    throw new Error(`Erro ao criar combo_items: ${comboItemsError.message}`)
  }

  console.log(`   Itens: Picanha 300g (1x) + Coca-Cola (1x)\n`)

  return comboId
}

// ============================================
// Funções exportadas para uso individual (Requirements 2.2-2.3)
// ============================================

export interface CreateUserOptions {
  email: string
  password: string
  role?: 'customer' | 'admin' | 'waiter'
}

/**
 * Cria um usuário de teste via Supabase Admin API.
 * @param email Email do usuário
 * @param password Senha do usuário
 * @param role Papel do usuário (customer, admin, waiter) - usado apenas para logging
 * @returns ID do usuário criado
 */
export async function createTestUser(
  email: string,
  password: string,
  role: string = 'customer'
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
 * Cria uma categoria de teste via Supabase Admin API.
 * @param name Nome da categoria
 * @returns Objeto com id e name da categoria criada
 */
export async function createTestCategory(name: string): Promise<{ id: string; name: string }> {
  const admin = createAdminClient()
  const restaurantId = await getOrCreateTestRestaurantId(admin)

  const { data, error } = await admin
    .from('categories')
    .insert({
      name,
      restaurant_id: restaurantId,
      active: true,
      sort_order: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar categoria: ${error.message}`)
  }

  return { id: data.id, name: data.name }
}

/**
 * Cria um produto de teste via Supabase Admin API.
 * @param name Nome do produto
 * @param price Preço do produto
 * @param categoryId ID da categoria associada
 * @returns ID do produto criado
 */
export async function createTestProduct(
  name: string,
  price: number,
  categoryId: string
): Promise<string> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('products')
    .insert({
      name,
      description: `Produto de teste: ${name}`,
      price,
      category_id: categoryId,
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
 * Cria uma mesa de teste via Supabase Admin API.
 * @param code Código QR da mesa (usado como qr_code)
 * @param number Número da mesa (opcional, extraído do code se não fornecido)
 * @param capacity Capacidade da mesa (padrão: 4)
 * @returns Objeto com id, number e qr_code da mesa criada
 */
export async function createTestTable(
  code: string,
  number?: number,
  capacity: number = 4
): Promise<{ id: string; number: number; qr_code: string }> {
  const admin = createAdminClient()
  const restaurantId = await getOrCreateTestRestaurantId(admin)

  const tableNumber = number ?? (parseInt(code.replace(/\D/g, ''), 10) || Math.floor(Math.random() * 100))

  const { data, error } = await admin
    .from('tables')
    .insert({
      number: tableNumber,
      capacity,
      name: `Mesa ${tableNumber}`,
      qr_code: code,
      restaurant_id: restaurantId,
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
  }
}

// ============================================
// Funções de Cleanup
// ============================================

async function cleanupExistingTestData(admin: SupabaseClient): Promise<void> {
  console.log('🧹 Limpando dados de teste existentes...')

  // 1. Buscar usuários de teste pelo email
  const testEmails = [
    `${SEED_PREFIX}customer@pedi-ai.test`,
    `${SEED_PREFIX}admin@pedi-ai.test`,
    `${SEED_PREFIX}waiter@pedi-ai.test`,
  ]

  // Buscar usuários existentes
  const { data: existingUsers } = await admin.auth.admin.listUsers()

  for (const user of existingUsers?.users || []) {
    if (user.email && testEmails.includes(user.email)) {
      console.log(`   Deletando usuário: ${user.email}`)
      await admin.auth.admin.deleteUser(user.id)
    }
  }

  // 2. Deletar restaurant de teste (cascade deleta tables, categories, products, etc)
  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id')
    .eq('name', RESTAURANT_NAME)
    .maybeSingle()

  if (restaurants) {
    console.log(`   Deletando restaurant: ${RESTAURANT_NAME}`)
    await admin.from('restaurants').delete().eq('id', restaurants.id)
  }

  console.log('✅ Cleanup concluído\n')
}

// ============================================
// Funções de criação
// ============================================

async function createUsers(admin: SupabaseClient): Promise<SeedResult['users']> {
  console.log('👥 Criando usuários de teste...')

  const users: SeedResult['users'] = {
    customer: {
      id: '',
      email: `${SEED_PREFIX}customer@pedi-ai.test`,
      password: TEST_PASSWORD,
    },
    admin: {
      id: '',
      email: `${SEED_PREFIX}admin@pedi-ai.test`,
      password: TEST_PASSWORD,
    },
    waiter: {
      id: '',
      email: `${SEED_PREFIX}waiter@pedi-ai.test`,
      password: TEST_PASSWORD,
    },
  }

  for (const [role, user] of Object.entries(users)) {
    console.log(`   Criando ${role}: ${user.email}`)
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    })

    if (error) {
      throw new Error(`Erro ao criar usuário ${role}: ${error.message}`)
    }

    user.id = data.user.id
  }

  console.log('✅ Usuários criados\n')
  return users
}

async function createRestaurant(admin: SupabaseClient): Promise<{ id: string; name: string }> {
  console.log('🏪 Criando restaurant de teste...')

  // Use fixed UUID to match hardcoded ID in MenuPageClient
  const DEMO_RESTAURANT_ID = '00000000-0000-0000-0000-000000000001'

  const { data, error } = await admin
    .from('restaurants')
    .upsert({
      id: DEMO_RESTAURANT_ID,
      name: RESTAURANT_NAME,
      description: 'Restaurant de testes E2E',
      settings: {
        currency: 'BRL',
        timezone: 'America/Sao_Paulo',
        tax_rate: 0.1,
      },
    }, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    throw new Error(`Erro ao criar restaurant: ${error.message}`)
  }

  console.log(`   Restaurant criado: ${data.id}\n`)
  return { id: data.id, name: data.name }
}

async function createCategories(
  admin: SupabaseClient,
  restaurantId: string
): Promise<Array<{ id: string; name: string }>> {
  console.log('📂 Criando categorias de teste...')

  const categoriesData = [
    { name: 'Bebidas', sort_order: 1 },
    { name: 'Pratos Principais', sort_order: 2 },
    { name: 'Sobremesas', sort_order: 3 },
  ]

  const { data, error } = await admin
    .from('categories')
    .insert(
      categoriesData.map((c) => ({
        ...c,
        restaurant_id: restaurantId,
        active: true,
      }))
    )
    .select()

  if (error) {
    throw new Error(`Erro ao criar categorias: ${error.message}`)
  }

  for (const cat of data) {
    console.log(`   Categoria: ${cat.name} (${cat.id})`)
  }

  console.log('')
  return data.map((c) => ({ id: c.id, name: c.name }))
}

async function createProducts(
  admin: SupabaseClient,
  categories: Array<{ id: string; name: string }>
): Promise<SeedResult['products']> {
  console.log('🍽️  Criando produtos de teste...')

  const productsData = [
    // Bebidas
    { name: 'Coca-Cola', price: 5.99, category_idx: 0, dietary_labels: [] },
    { name: 'Suco de Laranja', price: 7.99, category_idx: 0, dietary_labels: ['natural'] },
    { name: 'Água Mineral', price: 3.99, category_idx: 0, dietary_labels: [] },
    // Pratos Principais
    { name: 'Picanha 300g', price: 45.99, category_idx: 1, dietary_labels: ['carne'] },
    { name: 'Salmão Grelhado', price: 38.99, category_idx: 1, dietary_labels: ['peixe'] },
    { name: 'Salada Caesar', price: 22.99, category_idx: 1, dietary_labels: ['vegetariano'] },
    // Sobremesas
    { name: 'Tiramisu', price: 15.99, category_idx: 2, dietary_labels: [] },
    { name: 'Pudim', price: 12.99, category_idx: 2, dietary_labels: [] },
    { name: 'Sorvete', price: 9.99, category_idx: 2, dietary_labels: [] },
  ]

  const productsToInsert = productsData.map((p) => ({
    name: p.name,
    description: `Descrição do produto ${p.name}`,
    price: p.price,
    category_id: categories[p.category_idx].id,
    dietary_labels: p.dietary_labels,
    available: true,
    sort_order: 0,
  }))

  const { data, error } = await admin.from('products').insert(productsToInsert).select()

  if (error) {
    throw new Error(`Erro ao criar produtos: ${error.message}`)
  }

  const products = data.map((p) => ({
    id: p.id,
    name: p.name,
    price: parseFloat(p.price),
    category_id: p.category_id,
  }))

  for (const prod of products) {
    console.log(`   Produto: ${prod.name} - R$ ${prod.price.toFixed(2)} (${prod.id})`)
  }

  console.log('')
  return products
}

async function createTables(
  admin: SupabaseClient,
  restaurantId: string
): Promise<SeedResult['tables']> {
  console.log('🪑 Criando mesas de teste...')

  const tablesData = [
    { number: 1, capacity: 4, name: 'Mesa 1' },
    { number: 2, capacity: 4, name: 'Mesa 2' },
    { number: 3, capacity: 6, name: 'Mesa 3' },
    { number: 4, capacity: 2, name: 'Mesa 4 (VIP)' },
  ]

  const { data, error } = await admin
    .from('tables')
    .insert(
      tablesData.map((t) => ({
        ...t,
        restaurant_id: restaurantId,
        qr_code: `E2E-TABLE-${t.number.toString().padStart(3, '0')}`,
        active: true,
      }))
    )
    .select()

  if (error) {
    throw new Error(`Erro ao criar mesas: ${error.message}`)
  }

  const tables = data.map((t) => ({
    id: t.id,
    number: t.number,
    qr_code: t.qr_code,
  }))

  for (const table of tables) {
    console.log(`   Mesa ${table.number}: ${table.qr_code} (${table.id})`)
  }

  console.log('')
  return tables
}

async function createUserProfiles(
  admin: SupabaseClient,
  users: SeedResult['users'],
  restaurantId: string
): Promise<void> {
  console.log('👤 Criando perfis de usuário...')

  const profilesData = [
    {
      user_id: users.customer.id,
      email: users.customer.email,
      name: 'Cliente Teste',
      role: 'staff' as const,
    },
    {
      user_id: users.admin.id,
      email: users.admin.email,
      name: 'Admin Teste',
      role: 'owner' as const,
    },
    {
      user_id: users.waiter.id,
      email: users.waiter.email,
      name: 'Garçom Teste',
      role: 'staff' as const,
    },
  ]

  const { error } = await admin.from('users_profiles').insert(
    profilesData.map((p) => ({
      ...p,
      restaurant_id: restaurantId,
    }))
  )

  if (error) {
    throw new Error(`Erro ao criar perfis: ${error.message}`)
  }

  console.log('   Perfis criados para customer, admin e waiter\n')
}

// ============================================
// Função principal
// ============================================

export async function seed(): Promise<SeedResult> {
  console.log('========================================')
  console.log('🚀 SEED E2E - Iniciando...')
  console.log('========================================\n')

  const admin = createAdminClient()

  // Cleanup primeiro (idempotência)
  await cleanupExistingTestData(admin)

  // Criar dados
  const users = await createUsers(admin)
  const restaurant = await createRestaurant(admin)
  await createUserProfiles(admin, users, restaurant.id)
  const categories = await createCategories(admin, restaurant.id)
  const products = await createProducts(admin, categories)
  const tables = await createTables(admin, restaurant.id)

  // Requirement 2.1.x: Criar modifier groups e values
  const modifierGroups = await createModifierGroups(admin, restaurant.id)
  await createModifierValues(admin, modifierGroups)

  // Mapear IDs dos produtos para associações
  const picanhaProduct = products.find((p) => p.name === 'Picanha 300g')
  const cocaColaProduct = products.find((p) => p.name === 'Coca-Cola')

  if (picanhaProduct) {
    await associateModifierGroupsToProducts(admin, {
      picanhaId: picanhaProduct.id,
      tamanhoId: modifierGroups.tamanhoId,
      extrasId: modifierGroups.extrasId,
    })
  }

  // Requirement 2.2.x: Criar combos
  let comboId: string | undefined
  if (picanhaProduct && cocaColaProduct) {
    comboId = await createCombos(admin, restaurant.id, {
      picanhaId: picanhaProduct.id,
      cocaColaId: cocaColaProduct.id,
    })
  }

  const result: SeedResult = {
    users,
    restaurant,
    categories,
    products,
    tables,
    modifierGroups,
    comboId,
  }

  //输出结果
  console.log('========================================')
  console.log('✅ SEED E2E - Concluído com sucesso!')
  console.log('========================================')
  console.log('\n📋 Credenciais de teste:')
  console.log(`   Customer: ${users.customer.email} / ${TEST_PASSWORD}`)
  console.log(`   Admin: ${users.admin.email} / ${TEST_PASSWORD}`)
  console.log(`   Garçom: ${users.waiter.email} / ${TEST_PASSWORD}`)
  console.log(`\n📍 Restaurant ID: ${restaurant.id}`)
  console.log(`📍 Restaurant Name: ${restaurant.name}`)
  if (picanhaProduct) {
    console.log(`\n🏷️  Modifier Groups:`)
    console.log(`   Tamanho (required): ${modifierGroups.tamanhoId}`)
    console.log(`   Extras (optional): ${modifierGroups.extrasId}`)
  }
  if (comboId) {
    console.log(`\n🎁 Combo Picanha: ${comboId}`)
  }
  console.log('\n💾 Dados salvos em: tests/e2e/scripts/.seed-result.json')

  // Salvar resultado em arquivo para uso pelos testes
  const fs = await import('fs')
  const path = await import('path')
  const resultPath = path.join(__dirname, '.seed-result.json')
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2))

  return result
}

// Executar
seed().catch((error) => {
  console.error('❌ Erro no seed:', error.message)
  process.exit(1)
})
