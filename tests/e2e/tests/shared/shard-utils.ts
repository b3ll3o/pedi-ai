/**
 * Shard-Aware Seed Data
 *
 * Provides isolated test data per shard to avoid conflicts
 * when running tests in parallel.
 *
 * Each shard gets:
 * - Unique users (customer, admin, waiter) with shard-specific emails
 * - Unique restaurant with shard prefix
 * - Isolated data that won't conflict with other shards
 *
 * Usage:
 * ```typescript
 * import { getShardData } from './shard-seed'
 *
 * test('isolated test', async ({ seedData }) => {
 *   const data = getShardData(seedData)
 *   // data.email includes shard identifier
 * })
 * ```
 */

import * as path from 'path'
import * as fs from 'fs'

// Shard info from environment
const SHARD = process.env.SHARD || '1/4'
const [shardCurrent, shardTotal] = SHARD.split('/').map(Number)

// Seed result file path
const SEED_RESULT_PATH = path.join(__dirname, '..', 'scripts', '.seed-result.json')

/**
 * Shard configuration for isolated data.
 */
export interface ShardConfig {
  current: number
  total: number
  prefix: string
  emailSuffix: string
}

/**
 * Get shard configuration based on environment.
 */
export function getShardConfig(): ShardConfig {
  return {
    current: shardCurrent,
    total: shardTotal,
    prefix: `sh${shardCurrent}`,
    emailSuffix: `+sh${shardCurrent}@pedi-ai.test`,
  }
}

/**
 * Load and adapt seed data with shard-specific modifications.
 */
export interface ShardSeedData {
  restaurant: { id: string; name: string }
  customer: { email: string; password: string; id: string }
  admin: { email: string; password: string; id: string }
  waiter: { email: string; password: string; id: string }
  table: { id: string; code: string }
  categories: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; price: number }>
}

/**
 * Get shard-specific seed data.
 * Adds shard identifier to emails to ensure uniqueness across shards.
 */
export function getShardData(baseData: ShardSeedData): ShardSeedData {
  const config = getShardConfig()

  return {
    ...baseData,
    // Keep original IDs but prefix names for clarity
    restaurant: {
      id: baseData.restaurant.id,
      name: `[Shard${config.current}] ${baseData.restaurant.name}`,
    },
    // Emails already include shard suffix in seed
    customer: {
      ...baseData.customer,
      email: baseData.customer.email.replace('@pedi-ai.test', config.emailSuffix),
    },
    admin: {
      ...baseData.admin,
      email: baseData.admin.email.replace('@pedi-ai.test', config.emailSuffix),
    },
    waiter: {
      ...baseData.waiter,
      email: baseData.waiter.email.replace('@pedi-ai.test', config.emailSuffix),
    },
  }
}

/**
 * Check if seed data is compatible with current shard.
 */
export function isSeedCompatibleWithShard(): boolean {
  if (!fs.existsSync(SEED_RESULT_PATH)) {
    return false
  }

  try {
    const data = JSON.parse(fs.readFileSync(SEED_RESULT_PATH, 'utf-8'))
    const config = getShardConfig()

    // Check if seed data includes shard marker
    // Seeds created with shard suffix will have '+sh' in emails
    const customerEmail = data.users?.customer?.email || ''
    const hasShardMarker = customerEmail.includes('+sh')

    return hasShardMarker
  } catch {
    return false
  }
}

/**
 * Get or create shard-compatible seed data.
 */
export async function ensureShardCompatibleSeed(): Promise<ShardSeedData> {
  if (isSeedCompatibleWithShard()) {
    const raw = JSON.parse(fs.readFileSync(SEED_RESULT_PATH, 'utf-8'))
    return adaptRawSeed(raw)
  }

  // Need to re-seed with shard-specific data
  // This should be triggered via global setup
  console.log('⚠️ Seed not shard-compatible, re-running seed...')
  const { seed } = await import('../scripts/seed')
  await seed()

  const raw = JSON.parse(fs.readFileSync(SEED_RESULT_PATH, 'utf-8'))
  return adaptRawSeed(raw)
}

/**
 * Adapt raw seed format to ShardSeedData.
 */
function adaptRawSeed(raw: {
  restaurant: { id: string; name: string }
  users: {
    customer: { id: string; email: string; password: string }
    admin: { id: string; email: string; password: string }
    waiter: { id: string; email: string; password: string }
  }
  tables: Array<{ id: string; qr_code: string }>
  categories: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; price: number }>
}): ShardSeedData {
  return {
    restaurant: raw.restaurant,
    customer: {
      id: raw.users.customer.id,
      email: raw.users.customer.email,
      password: raw.users.customer.password,
    },
    admin: {
      id: raw.users.admin.id,
      email: raw.users.admin.email,
      password: raw.users.admin.password,
    },
    waiter: {
      id: raw.users.waiter.id,
      email: raw.users.waiter.email,
      password: raw.users.waiter.password,
    },
    table: {
      id: raw.tables[0]?.id ?? '',
      code: raw.tables[0]?.qr_code ?? '',
    },
    categories: raw.categories,
    products: raw.products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
    })),
  }
}

/**
 * Generate shard-specific table code.
 */
export function getShardTableCode(tableNumber: number): string {
  const config = getShardConfig()
  return `E2E-SH${config.current}-T${tableNumber.toString().padStart(3, '0')}`
}

/**
 * Generate shard-specific order idempotency key.
 */
export function getShardIdempotencyKey(baseKey: string): string {
  const config = getShardConfig()
  return `sh${config.current}-${baseKey}`
}
