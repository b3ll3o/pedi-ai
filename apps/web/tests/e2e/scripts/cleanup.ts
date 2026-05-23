/**
 * Script de cleanup para testes E2E usando PostgreSQL.
 *
 * Limpa dados de teste criados pelo seed:
 * - Usuários de teste (customer, admin, waiter)
 * - Restaurant de teste (cascade deleta tables, categories, products, etc)
 *
 * Uso: pnpm test:e2e:cleanup
 * Requer: DATABASE_URL no .env.e2e
 */

import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';

// Carregar .env.e2e explicitamente
dotenv.config({ path: path.join(process.cwd(), '.env.e2e') });

// ============================================
// Configuração
// ============================================

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não está configurada no .env.e2e');
  process.exit(1);
}

// Deve ser o mesmo do seed.ts
const SEED_PREFIX = 'e2e+';
const RESTAURANT_NAME = 'Restaurant E2E Test';

// Lock file (same as seed.ts)
const LOCK_FILE = path.join(__dirname, '.cleanup.lock');
const LOCK_TIMEOUT = 60_000; // 60 segundos

// Shard configuration (same as seed.ts)
const SHARD = process.env.SHARD || '';
const SHARD_MATCH = SHARD.match(/^(\d+)\/(\d+)$/);
const SHARD_CURRENT = SHARD_MATCH ? Number(SHARD_MATCH[1]) : 0;
const IS_SHARD_MODE = SHARD_CURRENT > 0;

function getShardSuffix(): string {
  return IS_SHARD_MODE ? `+sh${SHARD_CURRENT}` : '';
}

function getShardPrefix(): string {
  return IS_SHARD_MODE ? `[Shard${SHARD_CURRENT}] ` : '';
}

// ============================================
// PostgreSQL connection
// ============================================

let _sql: ReturnType<typeof import('postgres').default> | null = null;

async function getSql() {
  if (!_sql) {
    const postgres = (await import('postgres')).default;
    _sql = postgres(DATABASE_URL!, { max: 10 });
  }
  return _sql;
}

// ============================================
// Lock
// ============================================

async function acquireLock(): Promise<() => Promise<void>> {
  const waitForLock = async (): Promise<void> => {
    const startTime = Date.now();
    while (fs.existsSync(LOCK_FILE)) {
      if (Date.now() - startTime > LOCK_TIMEOUT) {
        throw new Error(`Timeout ao aguardar lock de cleanup (${LOCK_TIMEOUT}ms)`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const releaseLock = async (): Promise<void> => {
    try {
      if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE);
      }
    } catch {
      // Ignorar erros ao remover lock
    }
  };

  await waitForLock();

  fs.writeFileSync(
    LOCK_FILE,
    JSON.stringify({
      pid: process.pid,
      timestamp: Date.now(),
      workerId: process.env.TEST_WORKER_ID || 'unknown',
    })
  );

  return releaseLock;
}

// ============================================
// Funções de cleanup exportadas
// ============================================

export async function deleteTestUserByEmail(email: string): Promise<boolean> {
  const sql = await getSql();
  const result = await sql`DELETE FROM users WHERE email = ${email}`;
  return result.count > 0;
}

export async function deleteTestUserById(userId: string): Promise<boolean> {
  const sql = await getSql();
  const result = await sql`DELETE FROM users WHERE id = ${userId}`;
  return result.count > 0;
}

export async function deleteTestRestaurantByName(
  restaurantName: string = RESTAURANT_NAME
): Promise<boolean> {
  const sql = await getSql();
  const shardPrefix = getShardPrefix();
  const fullName = IS_SHARD_MODE ? `${shardPrefix}${restaurantName}` : restaurantName;

  const result = await sql`
    DELETE FROM restaurants WHERE name = ${fullName}
  `;
  return result.count > 0;
}

// ============================================
// Funções internas de cleanup
// ============================================

async function deleteTestUsers(): Promise<number> {
  console.log('👥 Deletando usuários de teste...');

  const sql = await getSql();
  const shardSuffix = getShardSuffix();

  const testEmails = [
    `${SEED_PREFIX}customer${shardSuffix}@pedi-ai.test`,
    `${SEED_PREFIX}admin${shardSuffix}@pedi-ai.test`,
    `${SEED_PREFIX}waiter${shardSuffix}@pedi-ai.test`,
  ];

  let deletedCount = 0;

  for (const email of testEmails) {
    const result = await sql`DELETE FROM users WHERE email = ${email}`;
    if (result.count > 0) {
      console.log(`   Deletado: ${email}`);
      deletedCount += result.count;
    }
  }

  console.log(`   ${deletedCount} usuário(s) deletado(s)\n`);
  return deletedCount;
}

async function deleteTestRestaurant(): Promise<boolean> {
  console.log('🏪 Deletando restaurant de teste...');

  const sql = await getSql();
  const shardPrefix = getShardPrefix();
  const fullName = IS_SHARD_MODE ? `${shardPrefix}${RESTAURANT_NAME}` : RESTAURANT_NAME;

  // Find restaurant first
  const restaurants = await sql`
    SELECT id FROM restaurants WHERE name = ${fullName}
  `;

  if (restaurants.length === 0) {
    console.log('   Nenhum restaurant de teste encontrado\n');
    return false;
  }

  const restaurantId = restaurants[0].id;

  // Delete orders first (manually since there might be FK constraints)
  await sql`DELETE FROM orders WHERE restaurant_id = ${restaurantId}`;

  // Delete restaurant (cascade should handle related tables)
  const result = await sql`
    DELETE FROM restaurants WHERE id = ${restaurantId}
  `;

  if (result.count > 0) {
    console.log(`   Restaurant deletado: ${fullName} (${restaurantId})\n`);
    return true;
  }

  return false;
}

async function deleteSeedResultFile(): Promise<void> {
  const resultPath = path.join(__dirname, '.seed-result.json');
  try {
    if (fs.existsSync(resultPath)) {
      fs.unlinkSync(resultPath);
      console.log('📄 Arquivo .seed-result.json removido\n');
    }
  } catch {
    // Ignorar erros ao remover arquivo
  }
}

// ============================================
// Função principal
// ============================================

export async function cleanup(): Promise<void> {
  const releaseLock = await acquireLock();

  try {
    console.log('========================================');
    console.log('🧹 CLEANUP E2E - Iniciando...');
    console.log('========================================\n');

    // 1. Deletar restaurant primeiro (cascade cuida dos dados relacionados)
    const restaurantDeleted = await deleteTestRestaurant();

    // 2. Deletar usuários (profiles são deletados em cascade pelo banco)
    const usersDeleted = await deleteTestUsers();

    // 3. Remover arquivo de resultado do seed
    await deleteSeedResultFile();

    console.log('========================================');
    console.log('✅ CLEANUP E2E - Concluído com sucesso!');
    console.log('========================================');
    console.log(`   Restaurant deletado: ${restaurantDeleted ? 'Sim' : 'Não encontrado'}`);
    console.log(`   Usuários deletados: ${usersDeleted}`);
  } catch (error) {
    console.error('❌ Erro no cleanup:', error);
    process.exit(1);
  } finally {
    await releaseLock();
  }
}

// Executar
const isMainModule = require.main === module || process.argv[1]?.includes('cleanup.ts');
if (isMainModule) {
  cleanup()
    .then(() => {
      console.log('\n✅ Cleanup finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro no cleanup:', error.message);
      process.exit(1);
    });
}
