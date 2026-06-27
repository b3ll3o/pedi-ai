/**
 * @spec(RF-ADM-FF-07, design.md §7)
 *
 * Seed das 8 flags legadas vindas de env-vars do Next.js.
 *
 * Cada entrada mapeia:
 *   - `key` (snake_case canônico no DB) →
 *     `envVar` (legado do front) →
 *     `defaultValue` (boolean derivado do env-var)
 *
 * Idempotente: roda N vezes, mesmo resultado (upsert).
 *
 * Para rodar: `pnpm tsx prisma/seed-feature-flags.ts` ou via `db:seed`.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface LegacyFlag {
  key: string;
  description: string;
  envVar: string;
  defaultValue: boolean;
}

const LEGACY_FLAGS: LegacyFlag[] = [
  {
    key: 'offline_enabled',
    description: 'Habilita modo offline-first no app',
    envVar: 'NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED',
    defaultValue: process.env.NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED === 'true',
  },
  {
    key: 'pix_enabled',
    description: 'Habilita pagamentos via PIX',
    envVar: 'NEXT_PUBLIC_FEATURE_PIX_ENABLED',
    defaultValue: process.env.NEXT_PUBLIC_FEATURE_PIX_ENABLED === 'true',
  },
  {
    key: 'waiter_mode_enabled',
    description: 'Habilita modo chamada de garçom',
    envVar: 'NEXT_PUBLIC_FEATURE_WAITER_MODE',
    defaultValue: process.env.NEXT_PUBLIC_FEATURE_WAITER_MODE === 'true',
  },
  {
    key: 'qr_code_enabled',
    description: 'Habilita QR codes de mesa',
    envVar: 'NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED',
    defaultValue: process.env.NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED === 'true',
  },
  {
    key: 'combos_enabled',
    description: 'Habilita sistema de combos',
    envVar: 'NEXT_PUBLIC_FEATURE_COMBOS_ENABLED',
    defaultValue: process.env.NEXT_PUBLIC_FEATURE_COMBOS_ENABLED === 'true',
  },
  {
    key: 'analytics_enabled',
    description: 'Habilita dashboard de analytics',
    envVar: 'NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED',
    defaultValue: process.env.NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED === 'true',
  },
  {
    key: 'cashback_enabled',
    description: 'Habilita sistema de cashback (planejado)',
    envVar: 'NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED',
    defaultValue: process.env.NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED === 'true',
  },
  {
    key: 'multi_restaurant_enabled',
    description: 'Habilita multi-restaurante para o mesmo usuário',
    envVar: 'NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT',
    defaultValue: process.env.NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT === 'true',
  },
];

async function main() {
  console.log('[seed-feature-flags] Iniciando seed das 8 flags legadas…');

  for (const flag of LEGACY_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        // mantém `enabled` e `description` se já existirem
        defaultValue: flag.defaultValue,
      },
      create: {
        key: flag.key,
        description: flag.description,
        valueType: 'BOOLEAN',
        defaultValue: flag.defaultValue,
        enabled: true,
        updatedBy: 'seed',
      },
    });
    console.log(
      `  ✓ ${flag.key.padEnd(28)} (env=${flag.envVar}) → defaultValue=${flag.defaultValue}`
    );
  }

  console.log('[seed-feature-flags] Concluído.');
}

main()
  .catch((err) => {
    console.error('[seed-feature-flags] Falha:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
