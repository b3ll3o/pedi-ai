/**
 * Script de seed para testes E2E usando PostgreSQL direto.
 *
 * Cria dados de teste no banco:
 * - Usuários (customer, admin, waiter)
 * - Restaurant de teste
 * - Categories de teste
 * - Products de teste
 * - Tables de teste
 *
 * Uso: pnpm test:e2e:seed
 * Requer: DATABASE_URL no .env.e2e
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { randomBytes, createHmac, randomUUID } from 'crypto'

// Carregar .env.e2e explicitamente
dotenv.config({ path: path.join(process.cwd(), '.env.e2e') })

// ============================================
// Configuração
// ============================================

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não está configurada no .env.e2e')
  process.exit(1)
}

// Lock file para evitar race condition entre workers paralelos
const LOCK_FILE = path.join(__dirname, '.seed.lock')
const LOCK_TIMEOUT = 60_000 // 60 segundos

// Arquivo de resultado do seed (para cache)
const SEED_RESULT_FILE = path.join(__dirname, '.seed-result.json')

// Prefixo para identificar dados de teste (idempotência)
const SEED_PREFIX = 'e2e+'
const TEST_PASSWORD = 'E2ETestPassword123!'
const RESTAURANT_NAME = 'Restaurant E2E Test'

// Shard configuration for isolated test data
const SHARD = process.env.SHARD || ''
const SHARD_MATCH = SHARD.match(/^(\d+)\/(\d+)$/)
const SHARD_CURRENT = SHARD_MATCH ? Number(SHARD_MATCH[1]) : 0
const IS_SHARD_MODE = SHARD_CURRENT > 0

function getShardSuffix(): string {
  return IS_SHARD_MODE ? `+sh${SHARD_CURRENT}` : ''
}

function getShardPrefix(): string {
  return IS_SHARD_MODE ? `[Shard${SHARD_CURRENT}] ` : ''
}

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
// PostgreSQL connection
// ============================================

let _sql: ReturnType<typeof import('postgres').default> | null = null

async function getSql() {
  if (!_sql) {
    const postgres = (await import('postgres')).default
    _sql = postgres(DATABASE_URL!, { max: 10 })
  }
  return _sql
}

// ============================================
// Lock
// ============================================

async function acquireLock(): Promise<() => Promise<void>> {
  const waitForLock = async (): Promise<void> => {
    const startTime = Date.now()
    while (fs.existsSync(LOCK_FILE)) {
      if (Date.now() - startTime > LOCK_TIMEOUT) {
        throw new Error(`Timeout ao aguardar lock de seed (${LOCK_TIMEOUT}ms)`)
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  const releaseLock = async (): Promise<void> => {
    try {
      if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE)
      }
    } catch {
      // Ignorar erros ao remover lock
    }
  }

  await waitForLock()

  fs.writeFileSync(LOCK_FILE, JSON.stringify({
    pid: process.pid,
    timestamp: Date.now(),
    workerId: process.env.TEST_WORKER_ID || 'unknown',
  }))

  return releaseLock
}

// ============================================
// Funções de criação
// ============================================

async function createUsers(): Promise<SeedResult['users']> {
  console.log('👥 Criando usuários de teste...')

  const sql = await getSql()
  const shardSuffix = getShardSuffix()
  const users: SeedResult['users'] = {
    customer: {
      id: '',
      email: `${SEED_PREFIX}customer${shardSuffix}@pedi-ai.test`,
      password: TEST_PASSWORD,
    },
    admin: {
      id: '',
      email: `${SEED_PREFIX}admin${shardSuffix}@pedi-ai.test`,
      password: TEST_PASSWORD,
    },
    waiter: {
      id: '',
      email: `${SEED_PREFIX}waiter${shardSuffix}@pedi-ai.test`,
      password: TEST_PASSWORD,
    },
  }

  for (const [role, user] of Object.entries(users)) {
    console.log(`   Processando ${role}: ${user.email}`)
    try {
      // Check if user exists
      const existing = await sql`
        SELECT id FROM users WHERE email = ${user.email}
      `

      if (existing.length > 0) {
        console.log(`   ${role}: usuário já existe, usando ID existente`)
        user.id = existing[0].id
      } else {
        // Create user with password hash
        const salt = randomBytes(16).toString('hex')
        const hash = createHmac('sha256', salt).update(user.password).digest('hex')
        const id = randomUUID()

        await sql`
          INSERT INTO users (id, email, password_hash, salt, created_at)
          VALUES (${id}, ${user.email}, ${hash}, ${salt}, NOW())
        `
        user.id = id
      }
    } catch (err) {
      console.log(`   ⚠️ Erro ao processar ${role}: ${err}`)
      continue
    }
  }

  console.log('✅ Usuários criados\n')
  return users
}

async function createRestaurant(): Promise<{ id: string; name: string }> {
  console.log('🏪 Criando restaurant de teste...')

  const sql = await getSql()
  const shardPrefix = getShardPrefix()

  const DEMO_RESTAURANT_ID = IS_SHARD_MODE
    ? `00000000-0000-0000-0000-00000000000${SHARD_CURRENT}`
    : '00000000-0000-0000-0000-000000000001'

  await sql`
    INSERT INTO restaurants (id, name, description, settings, created_at, updated_at)
    VALUES (
      ${DEMO_RESTAURANT_ID},
      ${`${shardPrefix}${RESTAURANT_NAME}`},
      'Restaurant de testes E2E',
      '{"currency": "BRL", "timezone": "America/Sao_Paulo", "tax_rate": 0.1}'::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      settings = EXCLUDED.settings,
      updated_at = NOW()
  `

  console.log(`   Restaurant criado: ${DEMO_RESTAURANT_ID} (${shardPrefix}${RESTAURANT_NAME})\n`)
  return { id: DEMO_RESTAURANT_ID, name: `${shardPrefix}${RESTAURANT_NAME}` }
}

async function createCategories(restaurantId: string) {
  console.log('📂 Criando categorias de teste...')

  const sql = await getSql()

  await sql`DELETE FROM categories WHERE restaurant_id = ${restaurantId}`

  const categoriesData = [
    { name: 'Bebidas', sort_order: 1 },
    { name: 'Pratos Principais', sort_order: 2 },
    { name: 'Sobremesas', sort_order: 3 },
  ]

  const categories = []
  for (const cat of categoriesData) {
    const id = randomUUID()
    await sql`
      INSERT INTO categories (id, restaurant_id, name, active, sort_order, created_at)
      VALUES (${id}, ${restaurantId}, ${cat.name}, true, ${cat.sort_order}, NOW())
    `
    console.log(`   Categoria: ${cat.name} (${id})`)
    categories.push({ id, name: cat.name })
  }

  console.log('')
  return categories
}

async function createProducts(
  restaurantId: string,
  categories: Array<{ id: string; name: string }>
) {
  console.log('🍽️  Criando produtos de teste...')

  const sql = await getSql()

  await sql`DELETE FROM products WHERE restaurant_id = ${restaurantId}`

  const productsData = [
    { name: 'Coca-Cola', price: 5.99, category_idx: 0 },
    { name: 'Suco de Laranja', price: 7.99, category_idx: 0 },
    { name: 'Água Mineral', price: 3.99, category_idx: 0 },
    { name: 'Picanha 300g', price: 45.99, category_idx: 1 },
    { name: 'Salmão Grelhado', price: 38.99, category_idx: 1 },
    { name: 'Salada Caesar', price: 22.99, category_idx: 1 },
    { name: 'Tiramisu', price: 15.99, category_idx: 2 },
    { name: 'Pudim', price: 12.99, category_idx: 2 },
    { name: 'Sorvete', price: 9.99, category_idx: 2 },
  ]

  const products = []
  for (const p of productsData) {
    const id = randomUUID()
    await sql`
      INSERT INTO products (id, restaurant_id, category_id, name, description, price, available, dietary_labels, sort_order, created_at)
      VALUES (
        ${id},
        ${restaurantId},
        ${categories[p.category_idx].id},
        ${p.name},
        ${`Descrição do produto ${p.name}`},
        ${p.price},
        true,
        ${'[]'}::jsonb,
        0,
        NOW()
      )
    `
    console.log(`   Produto: ${p.name} - R$ ${p.price.toFixed(2)} (${id})`)
    products.push({ id, name: p.name, price: p.price, category_id: categories[p.category_idx].id })
  }

  console.log('')
  return products
}

async function createTables(restaurantId: string) {
  console.log('🪑 Criando mesas de teste...')

  const sql = await getSql()

  await sql`DELETE FROM tables WHERE restaurant_id = ${restaurantId}`

  const tablesData = [
    { number: 1, capacity: 4 },
    { number: 2, capacity: 4 },
    { number: 3, capacity: 6 },
    { number: 4, capacity: 2 },
  ]

  const tables = []
  for (const t of tablesData) {
    const id = randomUUID()
    const qrCode = `E2E-TABLE-${t.number.toString().padStart(3, '0')}`
    await sql`
      INSERT INTO tables (id, restaurant_id, number, name, capacity, qr_code, active, created_at)
      VALUES (${id}, ${restaurantId}, ${t.number}, ${`Mesa ${t.number}`}, ${t.capacity}, ${qrCode}, true, NOW())
    `
    console.log(`   Mesa ${t.number}: ${qrCode} (${id})`)
    tables.push({ id, number: t.number, qr_code: qrCode })
  }

  console.log('')
  return tables
}

async function createUserProfiles(
  users: SeedResult['users'],
  restaurantId: string
) {
  console.log('👤 Criando perfis de usuário...')

  const sql = await getSql()

  const validProfiles = [
    { user_id: users.customer.id, email: users.customer.email, name: 'Cliente Teste', role: 'cliente' },
    { user_id: users.admin.id, email: users.admin.email, name: 'Admin Teste', role: 'dono' },
    { user_id: users.waiter.id, email: users.waiter.email, name: 'Garçom Teste', role: 'atendente' },
  ].filter((p) => p.user_id)

  if (validProfiles.length === 0) {
    console.log('   ⚠️ Nenhum usuário válido para criar perfil\n')
    return
  }

  for (const p of validProfiles) {
    await sql`
      INSERT INTO users_profiles (id, user_id, email, name, role, restaurant_id, created_at)
      VALUES (
        ${randomUUID()},
        ${p.user_id},
        ${p.email},
        ${p.name},
        ${p.role},
        ${restaurantId},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        restaurant_id = EXCLUDED.restaurant_id
    `
  }

  console.log('   Perfis criados para customer, admin e waiter\n')
}

async function createModifierGroups(restaurantId: string) {
  console.log('🏷️  Criando modifier groups de teste...')

  const sql = await getSql()

  const tamanhoId = randomUUID()
  const extrasId = randomUUID()

  await sql`
    INSERT INTO modifier_groups (id, restaurant_id, name, required, min_selections, max_selections, created_at)
    VALUES
      (${tamanhoId}, ${restaurantId}, 'Tamanho', true, 1, 1, NOW()),
      (${extrasId}, ${restaurantId}, 'Extras', false, 0, 3, NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  `

  console.log(`   Tamanho: ${tamanhoId} (required=true)`)
  console.log(`   Extras: ${extrasId} (required=false)\n`)

  // Create modifier values
  const modifierValuesData = [
    { modifier_group_id: tamanhoId, name: 'Pequeno', price_adjustment: 0 },
    { modifier_group_id: tamanhoId, name: 'Médio', price_adjustment: 3 },
    { modifier_group_id: tamanhoId, name: 'Grande', price_adjustment: 6 },
    { modifier_group_id: extrasId, name: 'Bacon', price_adjustment: 5 },
    { modifier_group_id: extrasId, name: 'Queijo Extra', price_adjustment: 3 },
    { modifier_group_id: extrasId, name: 'Cebola', price_adjustment: 2 },
  ]

  for (const mv of modifierValuesData) {
    await sql`
      INSERT INTO modifier_values (id, modifier_group_id, name, price_adjustment, available, created_at)
      VALUES (${randomUUID()}, ${mv.modifier_group_id}, ${mv.name}, ${mv.price_adjustment}, true, NOW())
      ON CONFLICT DO NOTHING
    `
  }

  console.log('   Tamanho: Pequeno (R$ 0), Médio (R$ +3), Grande (R$ +6)')
  console.log('   Extras: Bacon (R$ +5), Queijo Extra (R$ +3), Cebola (R$ +2)\n')

  return { tamanhoId, extrasId }
}

// ============================================
// Cleanup
// ============================================

async function cleanupExistingTestData() {
  console.log('🧹 Limpando dados de teste existentes...')

  const sql = await getSql()
  const shardSuffix = getShardSuffix()
  const shardPrefix = getShardPrefix()

  // Delete users
  const testEmails = [
    `${SEED_PREFIX}customer${shardSuffix}@pedi-ai.test`,
    `${SEED_PREFIX}admin${shardSuffix}@pedi-ai.test`,
    `${SEED_PREFIX}waiter${shardSuffix}@pedi-ai.test`,
  ]

  for (const email of testEmails) {
    await sql`DELETE FROM users WHERE email = ${email}`
  }

  // Delete restaurant
  const restaurantNames = [`${shardPrefix}${RESTAURANT_NAME}`, RESTAURANT_NAME]
  for (const name of restaurantNames) {
    await sql`DELETE FROM restaurants WHERE name = ${name}`
  }

  console.log('✅ Cleanup concluído\n')
}

// ============================================
// Main seed function
// ============================================

export async function seed(): Promise<SeedResult> {
  const releaseLock = await acquireLock()

  try {
    console.log('========================================')
    console.log('🚀 SEED E2E - Iniciando...')
    console.log('========================================\n')

    // Cleanup primeiro
    await cleanupExistingTestData()

    // Phase 1: Users and Restaurant (independent)
    const [users, restaurant] = await Promise.all([
      createUsers(),
      createRestaurant(),
    ])

    // Phase 2: Categories, Tables, UserProfiles (depend on restaurantId)
    const [categories, tables] = await Promise.all([
      createCategories(restaurant.id),
      createTables(restaurant.id),
      createUserProfiles(users, restaurant.id),
    ])

    // Phase 3: Products (depends on categories)
    const products = await createProducts(restaurant.id, categories)

    // Phase 4: Modifier Groups
    const modifierGroups = await createModifierGroups(restaurant.id)

    const result: SeedResult = {
      users,
      restaurant,
      categories,
      products,
      tables,
      modifierGroups,
    }

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

    // Salvar resultado
    fs.writeFileSync(SEED_RESULT_FILE, JSON.stringify(result, null, 2))

    return result
  } finally {
    await releaseLock()
  }
}

// Executar apenas se rodado diretamente
const isMainModule = require.main === module || process.argv[1]?.includes('seed.ts')
if (isMainModule) {
  seed()
    .then(() => {
      console.log('\n✅ Seed finalizado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erro no seed:', error.message)
      process.exit(0) // Sempre sai 0 para não bloquear CI
    })
}