import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Global setup for E2E tests.
 *
 * Responsabilidades:
 * 1. Validar DATABASE_URL
 * 2. Executar seed com cache (criado pelo seed.ts)
 *
 * Shard isolation:
 * - Cada shard usa seu próprio arquivo de resultado: .seed-result-shard-N.json
 * - Cada shard tem dados de teste isolados (emails diferentes, restaurant ID diferente)
 * - Em modo shard, não há lock file — cada shard seed a si mesmo sem conflito
 *
 * Banco de dados E2E:
 * - O banco E2E (pedi_ai_e2e) é resetado pelo workflow e2e-vps.yml antes dos testes
 * - Este global-setup apenas executa o seed se o cache não for válido
 */

const SHARD_MATCH = process.env.SHARD?.match(/^(\d+)\/(\d+)$/);
const SHARD_NUM = SHARD_MATCH ? Number(SHARD_MATCH[1]) : 0;

/** Determina o arquivo de resultado do seed com base no SHARD atual. */
function getSeedResultPath(): string {
  const base = path.join(__dirname, 'scripts');
  return SHARD_NUM > 0
    ? path.join(base, `.seed-result-shard-${SHARD_NUM}.json`)
    : path.join(base, '.seed-result.json');
}

/** Verifica se o cache de seed existe e é válido. */
function isSeedCacheValid(seedPath: string): boolean {
  try {
    if (!fs.existsSync(seedPath)) return false;
    const result = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    return Boolean(result.restaurant?.id && result.users?.customer?.id);
  } catch {
    return false;
  }
}

/** Executa o seed e loga o resultado. */
async function runSeed(): Promise<void> {
  console.log('🌱 Executando seed E2E...');
  const { stdout, stderr } = await execAsync('pnpm test:e2e:seed', {
    cwd: path.join(__dirname, '..'),
    timeout: 180_000,
    env: { ...process.env },
  });
  if (stdout) console.log(stdout);
  if (stderr) console.warn(stderr);
  console.log('✅ Seed concluído.\n');
}

const globalSetup = async () => {
  console.log('========================================');
  console.log('🚀 E2E Global Setup');
  console.log('========================================\n');

  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL não configurada. Pulando seed E2E.');
    console.log('Defina DATABASE_URL no .env.e2e para executar os testes.\n');
    return;
  }

  const seedPath = getSeedResultPath();
  const shardLabel = SHARD_NUM > 0 ? `Shard ${SHARD_NUM}` : 'local';
  console.log(`   SHARD: ${shardLabel}`);
  console.log(`   Seed result: ${path.basename(seedPath)}\n`);

  // Reset do banco já é feito pelo workflow e2e-vps.yml antes de iniciar os testes
  // Aqui apenas verificamos se o cache é válido e rodamos o seed
  const shouldRunSeed = !isSeedCacheValid(seedPath);

  if (shouldRunSeed) {
    try {
      await runSeed();
    } catch (error) {
      console.error('❌ Seed falhou:', error);
      throw error;
    }
  } else {
    console.log('✅ Cache de seed válido, pulando seed.\n');
  }

  console.log('========================================');
  console.log('✅ Global Setup Completo');
  console.log('========================================\n');
};

export default globalSetup;
