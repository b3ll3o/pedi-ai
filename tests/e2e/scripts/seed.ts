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
}

interface TestUser {
  id: string
  email: string
  password: string
}

// ============================================
// Cliente Supabase Admin
// ============================================

function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
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

  const { data, error } = await admin
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

async function seed(): Promise<SeedResult> {
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

  const result: SeedResult = {
    users,
    restaurant,
    categories,
    products,
    tables,
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
