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
 * Tudo mais (pré-aquecimento do browser, cache de rede) foi removido.
 */

/** Determina o arquivo de resultado do seed com base no SHARD atual. */
function getSeedResultPath(): string {
  const shard = process.env.SHARD ?? '';
  const match = shard.match(/^(\d+)\/(\d+)$/);
  const shardNum = match ? Number(match[1]) : 0;
  const base = path.join(__dirname, 'scripts');
  return shardNum > 0
    ? path.join(base, `.seed-result-shard-${shardNum}.json`)
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
  const shardLabel = seedPath.includes('shard-')
    ? `Shard ${path.basename(seedPath).match(/\d+/)?.[0]}`
    : 'local';
  console.log(`   SHARD: ${shardLabel}`);
  console.log(`   Seed result: ${path.basename(seedPath)}\n`);

  if (isSeedCacheValid(seedPath)) {
    console.log('✅ Seed cache válido, pulando seed.');
  } else {
    try {
      await runSeed();
    } catch (error) {
      console.error('❌ Seed falhou:', error);
      throw error;
    }
  }

  console.log('========================================');
  console.log('✅ Global Setup Completo');
  console.log('========================================\n');
};

export default globalSetup;
