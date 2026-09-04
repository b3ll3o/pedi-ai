/**
 * Script de seed para testes E2E usando PostgreSQL direto.
 *
 * Cria dados de teste no banco:
 * - Usuários (customer, admin, waiter, manager)
 * - Restaurant de teste
 * - Categories de teste
 * - Products de teste
 * - Tables de teste
 *
 * IMPORTANTE: nomes de tabela aqui DEVEM bater com o `model X` do
 * schema Prisma (apps/api/prisma/schema.prisma). Por padrão, Prisma usa
 * o nome do model PascalCase como nome de tabela (a menos que exista
 * `@@map(...)` explícito). Verifique `apps/api/prisma/schema.prisma`
 * antes de adicionar novos `INSERT`s aqui.
 *
 * Uso: pnpm test:e2e:seed
 * Requer: DATABASE_URL no .env.e2e
 */

import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Carregar .env.e2e explicitamente (resolve relativo ao script, não ao cwd)
dotenv.config({ path: path.join(__dirname, '..', '.env.e2e') });

// ============================================
// Configuração
// ============================================

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não está configurada no .env.e2e');
  process.exit(1);
}

// Lock file para evitar race condition entre workers paralelos
const LOCK_FILE = path.join(__dirname, '.seed.lock');
const LOCK_TIMEOUT = 60_000; // 60 segundos

// Shard configuration for isolated test data
const SHARD = process.env.SHARD || '';
const SHARD_MATCH = SHARD.match(/^(\d+)\/(\d+)$/);
const SHARD_CURRENT = SHARD_MATCH ? Number(SHARD_MATCH[1]) : 0;
const IS_SHARD_MODE = SHARD_CURRENT > 0;

// Arquivo de resultado do seed (para cache).
// Em modo shard, cada shard escreve em seu próprio arquivo para evitar conflito.
// Nome: .seed-result.json (sem shard) ou .seed-result-shard-N.json (com shard)
const SEED_RESULT_FILE = IS_SHARD_MODE
  ? path.join(__dirname, `.seed-result-shard-${SHARD_CURRENT}.json`)
  : path.join(__dirname, '.seed-result.json');

// Prefixo para identificar dados de teste (idempotência)
const SEED_PREFIX = 'e2e+';
const TEST_PASSWORD = 'E2ETestPassword123!';
const RESTAURANT_NAME = 'Restaurant E2E Test';

/**
 * Total (sentinela) do pedido do tenant B.
 *
 * Valor absurdamente alto e único no seed para que qualquer vazamento
 * cross-tenant em agregações (`/analytics/overview` → `revenue`) seja
 * detectável por comparação numérica direta. Se o faturamento do tenant A
 * chegar perto desse valor, o filtro por tenant vazou.
 */
const TENANT_B_ORDER_TOTAL = 9999.99;

function getShardSuffix(): string {
  return IS_SHARD_MODE ? `+sh${SHARD_CURRENT}` : '';
}

function getShardPrefix(): string {
  return IS_SHARD_MODE ? `[Shard${SHARD_CURRENT}] ` : '';
}

// ============================================
// Tipos
// ============================================

interface SeedResult {
  users: {
    customer: TestUser;
    admin: TestUser;
    waiter: TestUser;
    manager: TestUser;
  };
  restaurant: {
    id: string;
    name: string;
  };
  /**
   * Tenant B — restaurante "vizinho" usado pelos testes BOLA
   * (`tests/security/multitenant.spec.ts`).
   *
   * **Precisa ter dados reais.** Um tenant B vazio torna qualquer
   * asserção de isolamento infalsificável: iterar um array vazio passa
   * até numa implementação que vaze tudo. Por isso o seed cria pelo
   * menos 1 categoria, 1 produto, 1 mesa e 1 pedido em B, e expõe os
   * IDs aqui para que os testes possam afirmar
   * "este ID conhecido de B NUNCA aparece nas respostas de A".
   */
  restaurantB: {
    id: string;
    name: string;
    categoryId: string;
    productId: string;
    productName: string;
    tableId: string;
    orderId: string;
    orderTotal: number;
  };
  categories: Array<{
    id: string;
    name: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    price: number;
    category_id: string;
  }>;
  tables: Array<{
    id: string;
    number: number;
    qr_code: string;
  }>;
  /** Pedidos do tenant A (usados para asserções positivas de listagem). */
  orders: Array<{
    id: string;
    status: string;
    total: number;
  }>;
  modifierGroups?: {
    tamanhoId: string;
    extrasId: string;
  };
  comboId?: string;
}

interface TestUser {
  id: string;
  email: string;
  password: string;
}

// ============================================
// PostgreSQL connection
// ============================================

let _sql: ReturnType<typeof import('postgres').default> | null = null;
/**
 * Promise única de inicialização do pool.
 *
 * `getSql()` é chamado concorrentemente pelas fases do seed
 * (`Promise.all([createUsers(), createRestaurant(), ...])`). Sem o
 * memo da *promise* (e não só do resultado), cada chamador via `_sql`
 * ainda `null` e criava seu próprio pool de 10 conexões — até 3 pools
 * (30 conexões) por execução, vazando conexões até o fim do processo.
 */
let _sqlInit: Promise<ReturnType<typeof import('postgres').default>> | null = null;

// O DATABASE_URL configurado no GHA inclui `?schema=public` (convenção Prisma),
// mas o cliente `postgres` não reconhece esse parâmetro e falha com
// "unrecognized configuration parameter 'schema'". Descartamos o que vier
// depois do `?` na URL antes de passar para o cliente.
function sanitizeDatabaseUrl(url: string): string {
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

async function getSql() {
  if (_sql) return _sql;
  if (!_sqlInit) {
    _sqlInit = (async () => {
      const postgres = (await import('postgres')).default;
      _sql = postgres(sanitizeDatabaseUrl(DATABASE_URL!), { max: 10 });
      return _sql;
    })();
  }
  return _sqlInit;
}

// ============================================
// Lock
// ============================================

async function acquireLock(): Promise<() => Promise<void>> {
  const waitForLock = async (): Promise<void> => {
    const startTime = Date.now();
    while (fs.existsSync(LOCK_FILE)) {
      if (Date.now() - startTime > LOCK_TIMEOUT) {
        throw new Error(`Timeout ao aguardar lock de seed (${LOCK_TIMEOUT}ms)`);
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
// Funções de criação
// ============================================
// IMPORTANTE: nomes de tabela seguem o model PascalCase do schema Prisma
// (apps/api/prisma/schema.prisma). O model `UsersProfile` foi consolidado
// em uma única tabela após a migração Supabase→Prisma — não há tabela
// `users` separada.

async function createUsers(): Promise<SeedResult['users']> {
  console.log('👥 Criando usuários de teste...');

  const sql = await getSql();
  const shardSuffix = getShardSuffix();
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
    manager: {
      id: '',
      email: `${SEED_PREFIX}manager${shardSuffix}@pedi-ai.test`,
      password: TEST_PASSWORD,
    },
  };

  // bcrypt com cost 4 (mínimo aceitável para testes — acelera o seed
  // sem comprometer a verificação via auth.service.ts que usa cost 12).
  // auth.service.ts usa `bcrypt.compare` puro, que aceita qualquer hash
  // bcrypt válido independente do cost.
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);

  const roleFor = (role: string): string => {
    switch (role) {
      case 'customer':
        return 'cliente';
      case 'admin':
        return 'dono';
      case 'waiter':
        return 'atendente';
      case 'manager':
        return 'gerente';
      default:
        return 'cliente';
    }
  };

  for (const [role, user] of Object.entries(users)) {
    console.log(`   Processando ${role}: ${user.email}`);
    try {
      const existing = await sql`
        SELECT id FROM "UsersProfile" WHERE email = ${user.email}
      `;

      if (existing.length > 0) {
        console.log(`   ${role}: usuário já existe, usando ID existente`);
        user.id = existing[0].id;
        // Atualiza passwordHash para garantir que o seed seja idempotente
        // mesmo após rotação de credenciais em CI.
        await sql`
          UPDATE "UsersProfile"
          SET "passwordHash" = ${passwordHash}
          WHERE id = ${user.id}
        `;
      } else {
        const id = randomUUID();
        await sql`
          INSERT INTO "UsersProfile" (id, email, name, role, "passwordHash", "createdAt")
          VALUES (${id}, ${user.email}, ${`Usuário ${role}`}, ${roleFor(role)}::"UserRole", ${passwordHash}, NOW())
        `;
        user.id = id;
      }
    } catch (err) {
      console.log(`   ⚠️ Erro ao processar ${role}: ${err}`);
      throw err;
    }
  }

  console.log('✅ Usuários criados\n');
  return users;
}

async function createRestaurant(): Promise<{ id: string; name: string }> {
  console.log('🏪 Criando restaurant de teste...');

  const sql = await getSql();
  const shardPrefix = getShardPrefix();

  const DEMO_RESTAURANT_ID = IS_SHARD_MODE
    ? `00000000-0000-0000-0000-00000000000${SHARD_CURRENT}`
    : '00000000-0000-0000-0000-000000000001';

  await sql`
    INSERT INTO "Restaurant" (id, name, description, settings, "createdAt", "updatedAt")
    VALUES (
      ${DEMO_RESTAURANT_ID},
      ${`${shardPrefix}${RESTAURANT_NAME}`},
      ${'Restaurant de testes E2E'},
      ${'{"currency": "BRL", "timezone": "America/Sao_Paulo", "tax_rate": 0.1}'},
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      settings = EXCLUDED.settings,
      "updatedAt" = NOW()
  `;

  console.log(`   Restaurant criado: ${DEMO_RESTAURANT_ID} (${shardPrefix}${RESTAURANT_NAME})\n`);
  return { id: DEMO_RESTAURANT_ID, name: `${shardPrefix}${RESTAURANT_NAME}` };
}

/**
 * Cria um segundo restaurante para testes de BOLA (multi-tenant).
 * Tem ID distinto para validar isolamento entre tenants.
 *
 * NOTA: este restaurant NÃO é vinculado ao MESMO admin do seed. O token
 * do admin (do tenant A) deve ser rejeitado ao tentar acessar dados
 * deste tenant — é exatamente o que os testes BOLA validam.
 *
 * Os dados internos de B (categoria, produto, mesa, pedido) são criados
 * por `seedTenantB`, chamado depois que o restaurante existe.
 */
async function createRestaurantB(): Promise<{ id: string; name: string }> {
  console.log('🏪 Criando segundo restaurant (B) para testes BOLA...');

  const sql = await getSql();
  const shardPrefix = getShardPrefix();

  const DEMO_RESTAURANT_B_ID = IS_SHARD_MODE
    ? `00000000-0000-0000-0000-00000000001${SHARD_CURRENT}`
    : '00000000-0000-0000-0000-000000000002';

  await sql`
    INSERT INTO "Restaurant" (id, name, description, settings, "createdAt", "updatedAt")
    VALUES (
      ${DEMO_RESTAURANT_B_ID},
      ${`${shardPrefix}Restaurant E2E Test B`},
      ${'Restaurant B de testes E2E (BOLA)'},
      ${'{"currency": "BRL", "timezone": "America/Sao_Paulo", "tax_rate": 0.1}'},
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      settings = EXCLUDED.settings,
      "updatedAt" = NOW()
  `;

  console.log(`   Restaurant B criado: ${DEMO_RESTAURANT_B_ID}\n`);
  return { id: DEMO_RESTAURANT_B_ID, name: `${shardPrefix}Restaurant E2E Test B` };
}

async function createCategories(restaurantId: string) {
  console.log('📂 Criando categorias de teste...');

  const sql = await getSql();

  await sql`DELETE FROM "Category" WHERE "restaurantId" = ${restaurantId}`;

  const categoriesData = [
    { name: 'Bebidas', sortOrder: 1 },
    { name: 'Pratos Principais', sortOrder: 2 },
    { name: 'Sobremesas', sortOrder: 3 },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const id = randomUUID();
    await sql`
      INSERT INTO "Category" (id, "restaurantId", name, active, "sortOrder", "createdAt", "updatedAt")
      VALUES (${id}, ${restaurantId}, ${cat.name}, true, ${cat.sortOrder}, NOW(), NOW())
    `;
    console.log(`   Categoria: ${cat.name} (${id})`);
    categories.push({ id, name: cat.name });
  }

  console.log('');
  return categories;
}

async function createProducts(
  restaurantId: string,
  categories: Array<{ id: string; name: string }>
) {
  console.log('🍽️  Criando produtos de teste...');

  const sql = await getSql();

  await sql`DELETE FROM "Product" WHERE "categoryId" IN (SELECT id FROM "Category" WHERE "restaurantId" = ${restaurantId})`;

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
  ];

  const products = [];
  for (const p of productsData) {
    const id = randomUUID();
    // `restaurantId` é coluna autoritativa do tenant desde a auditoria
    // P0-01 (migration `20260729120000_add_product_restaurant_id`). Sem
    // ela no INSERT, o seed quebra com NOT NULL violation — e, antes
    // disso, o `prisma db push` do CI já criava a coluna, então toda
    // rota escopada por tenant (`scopedRepository`) devolvia 500.
    await sql`
      INSERT INTO "Product" (id, "restaurantId", "categoryId", name, description, price, available, "dietaryLabels", "sortOrder", "createdAt", "updatedAt")
      VALUES (
        ${id},
        ${restaurantId},
        ${categories[p.category_idx].id},
        ${p.name},
        ${`Descrição do produto ${p.name}`},
        ${p.price},
        true,
        ${'[]'},
        0,
        NOW(),
        NOW()
      )
    `;
    console.log(`   Produto: ${p.name} - R$ ${p.price.toFixed(2)} (${id})`);
    products.push({ id, name: p.name, price: p.price, category_id: categories[p.category_idx].id });
  }

  console.log('');
  return products;
}

async function createTables(restaurantId: string) {
  console.log('🪑 Criando mesas de teste...');

  const sql = await getSql();

  await sql`DELETE FROM "Table" WHERE "restaurantId" = ${restaurantId}`;

  const tablesData = [
    { number: 1, capacity: 4 },
    { number: 2, capacity: 4 },
    { number: 3, capacity: 6 },
    { number: 4, capacity: 2 },
  ];

  const tables = [];
  for (const t of tablesData) {
    const id = randomUUID();
    const qrCode = `E2E-TABLE-${t.number.toString().padStart(3, '0')}`;
    await sql`
      INSERT INTO "Table" (id, "restaurantId", number, name, capacity, "qrCode", active, "createdAt", "updatedAt")
      VALUES (${id}, ${restaurantId}, ${t.number}, ${`Mesa ${t.number}`}, ${t.capacity}, ${qrCode}, true, NOW(), NOW())
    `;
    console.log(`   Mesa ${t.number}: ${qrCode} (${id})`);
    tables.push({ id, number: t.number, qr_code: qrCode });
  }

  console.log('');
  return tables;
}

/**
 * Cria pedidos do tenant A.
 *
 * Necessário para que os testes de isolamento sejam **falsificáveis**:
 * asserções do tipo "todo pedido retornado pertence ao tenant A" passam
 * trivialmente quando a listagem vem vazia. Com pedidos reais em A (e em
 * B, ver `seedTenantB`), a mesma asserção só passa se o filtro por tenant
 * realmente funcionar.
 */
async function createOrders(
  restaurantId: string,
  tableId: string,
  products: Array<{ id: string; price: number }>
): Promise<SeedResult['orders']> {
  console.log('🧾 Criando pedidos de teste (tenant A)...');

  const sql = await getSql();

  const ordersData = [
    { status: 'paid', paymentStatus: 'paid', subtotal: 45.99 },
    { status: 'pending_payment', paymentStatus: 'pending', subtotal: 12.99 },
  ];

  const orders: SeedResult['orders'] = [];
  for (const o of ordersData) {
    const id = randomUUID();
    const tax = Number((o.subtotal * 0.1).toFixed(2));
    const total = Number((o.subtotal + tax).toFixed(2));
    await sql`
      INSERT INTO "Order" (
        id, "restaurantId", "tableId", status, version, subtotal, tax, total,
        "paymentMethod", "paymentStatus", "createdAt", "updatedAt"
      )
      VALUES (
        ${id}, ${restaurantId}, ${tableId}, ${o.status}::"OrderStatus", 0,
        ${o.subtotal}, ${tax}, ${total},
        ${'pix'}::"PaymentMethod", ${o.paymentStatus}::"PaymentStatus", NOW(), NOW()
      )
    `;
    if (products[0]) {
      await sql`
        INSERT INTO "OrderItem" (id, "orderId", "productId", quantity, "unitPrice", "totalPrice", "createdAt")
        VALUES (${randomUUID()}, ${id}, ${products[0].id}, 1, ${products[0].price}, ${products[0].price}, NOW())
      `;
    }
    console.log(`   Pedido ${o.status}: R$ ${total.toFixed(2)} (${id})`);
    orders.push({ id, status: o.status, total });
  }

  console.log('');
  return orders;
}

/**
 * Popula o tenant B com dados reais (1 categoria, 1 produto, 1 mesa,
 * 1 pedido pago).
 *
 * **Por que isso importa (BOLA):** os testes de
 * `tests/security/multitenant.spec.ts` afirmam que IDs conhecidos do
 * tenant B nunca aparecem nas respostas do tenant A e que mutações
 * cross-tenant (PATCH/DELETE em recursos de B com token de A) são
 * rejeitadas. Sem linhas reais em B, esses testes validavam apenas o
 * caminho "not found" — passavam com qualquer implementação.
 */
async function seedTenantB(restaurantId: string): Promise<{
  categoryId: string;
  productId: string;
  productName: string;
  tableId: string;
  orderId: string;
  orderTotal: number;
}> {
  console.log('🧪 Populando tenant B (dados reais para testes BOLA)...');

  const sql = await getSql();

  const categoryId = randomUUID();
  await sql`
    INSERT INTO "Category" (id, "restaurantId", name, active, "sortOrder", "createdAt", "updatedAt")
    VALUES (${categoryId}, ${restaurantId}, ${'Bebidas (Tenant B)'}, true, 1, NOW(), NOW())
  `;

  const productId = randomUUID();
  const productName = 'Produto Exclusivo do Tenant B';
  await sql`
    INSERT INTO "Product" (id, "restaurantId", "categoryId", name, description, price, available, "dietaryLabels", "sortOrder", "createdAt", "updatedAt")
    VALUES (
      ${productId}, ${restaurantId}, ${categoryId}, ${productName},
      ${'Produto que NUNCA pode ser lido/alterado/deletado pelo tenant A'},
      ${77.77}, true, ${'[]'}, 0, NOW(), NOW()
    )
  `;

  const tableId = randomUUID();
  await sql`
    INSERT INTO "Table" (id, "restaurantId", number, name, capacity, "qrCode", active, "createdAt", "updatedAt")
    VALUES (${tableId}, ${restaurantId}, 1, ${'Mesa 1 (Tenant B)'}, 4, ${'E2E-TABLE-B-001'}, true, NOW(), NOW())
  `;

  const orderId = randomUUID();
  const subtotal = Number((TENANT_B_ORDER_TOTAL / 1.1).toFixed(2));
  const tax = Number((TENANT_B_ORDER_TOTAL - subtotal).toFixed(2));
  await sql`
    INSERT INTO "Order" (
      id, "restaurantId", "tableId", status, version, subtotal, tax, total,
      "paymentMethod", "paymentStatus", "createdAt", "updatedAt"
    )
    VALUES (
      ${orderId}, ${restaurantId}, ${tableId}, ${'paid'}::"OrderStatus", 0,
      ${subtotal}, ${tax}, ${TENANT_B_ORDER_TOTAL},
      ${'pix'}::"PaymentMethod", ${'paid'}::"PaymentStatus", NOW(), NOW()
    )
  `;
  await sql`
    INSERT INTO "OrderItem" (id, "orderId", "productId", quantity, "unitPrice", "totalPrice", "createdAt")
    VALUES (${randomUUID()}, ${orderId}, ${productId}, 1, ${77.77}, ${77.77}, NOW())
  `;

  console.log(`   Categoria B: ${categoryId}`);
  console.log(`   Produto B: ${productName} (${productId})`);
  console.log(`   Mesa B: ${tableId}`);
  console.log(`   Pedido B: R$ ${TENANT_B_ORDER_TOTAL} (${orderId})\n`);

  return {
    categoryId,
    productId,
    productName,
    tableId,
    orderId,
    orderTotal: TENANT_B_ORDER_TOTAL,
  };
}

async function linkUserProfiles(users: SeedResult['users'], restaurantId: string) {
  console.log('🔗 Vinculando perfis de usuário ao restaurant...');

  const sql = await getSql();

  const profileUpdates = [
    { id: users.customer.id, role: 'cliente' },
    { id: users.admin.id, role: 'dono' },
    { id: users.waiter.id, role: 'atendente' },
    { id: users.manager.id, role: 'gerente' },
  ];

  for (const p of profileUpdates) {
    if (!p.id) continue;
    // Atualiza role e restaurantId do UsersProfile já criado em createUsers()
    await sql`
      UPDATE "UsersProfile"
      SET role = ${p.role}::"UserRole",
          "restaurantId" = ${restaurantId}
      WHERE id = ${p.id}
    `;
  }

  console.log('   Perfis vinculados ao restaurant\n');
}

async function createModifierGroups(restaurantId: string) {
  console.log('🏷️  Criando modifier groups de teste...');

  const sql = await getSql();

  const tamanhoId = randomUUID();
  const extrasId = randomUUID();

  await sql`
    INSERT INTO "ModifierGroup" (id, "restaurantId", name, required, "minSelections", "maxSelections", "createdAt")
    VALUES
      (${tamanhoId}, ${restaurantId}, 'Tamanho', true, 1, 1, NOW()),
      (${extrasId}, ${restaurantId}, 'Extras', false, 0, 3, NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  `;

  console.log(`   Tamanho: ${tamanhoId} (required=true)`);
  console.log(`   Extras: ${extrasId} (required=false)\n`);

  // Create modifier values
  const modifierValuesData = [
    { modifierGroupId: tamanhoId, name: 'Pequeno', priceAdjustment: 0 },
    { modifierGroupId: tamanhoId, name: 'Médio', priceAdjustment: 3 },
    { modifierGroupId: tamanhoId, name: 'Grande', priceAdjustment: 6 },
    { modifierGroupId: extrasId, name: 'Bacon', priceAdjustment: 5 },
    { modifierGroupId: extrasId, name: 'Queijo Extra', priceAdjustment: 3 },
    { modifierGroupId: extrasId, name: 'Cebola', priceAdjustment: 2 },
  ];

  for (const mv of modifierValuesData) {
    await sql`
      INSERT INTO "ModifierValue" (id, "modifierGroupId", name, "priceAdjustment", available, "createdAt")
      VALUES (${randomUUID()}, ${mv.modifierGroupId}, ${mv.name}, ${mv.priceAdjustment}, true, NOW())
      ON CONFLICT DO NOTHING
    `;
  }

  console.log('   Tamanho: Pequeno (R$ 0), Médio (R$ +3), Grande (R$ +6)');
  console.log('   Extras: Bacon (R$ +5), Queijo Extra (R$ +3), Cebola (R$ +2)\n');

  return { tamanhoId, extrasId };
}

// ============================================
// Limpeza
// ============================================

async function cleanupExistingTestData() {
  console.log('🧹 Limpando dados de teste existentes...');

  const sql = await getSql();
  const shardSuffix = getShardSuffix();
  const shardPrefix = getShardPrefix();

  // Delete users (UsersProfile consolidado)
  const testEmails = [
    `${SEED_PREFIX}customer${shardSuffix}@pedi-ai.test`,
    `${SEED_PREFIX}admin${shardSuffix}@pedi-ai.test`,
    `${SEED_PREFIX}waiter${shardSuffix}@pedi-ai.test`,
    `${SEED_PREFIX}manager${shardSuffix}@pedi-ai.test`,
  ];

  for (const email of testEmails) {
    await sql`DELETE FROM "UsersProfile" WHERE email = ${email}`;
  }

  // Delete restaurant (ordem importa por causa das FKs: depende de Restaurant → Table, Category, Product, ModifierGroup, Order, etc.)
  const restaurantNames = [
    `${shardPrefix}${RESTAURANT_NAME}`,
    RESTAURANT_NAME,
    `${shardPrefix}Restaurant E2E Test B`,
    'Restaurant E2E Test B',
  ];
  for (const name of restaurantNames) {
    // Buscar IDs primeiro
    const restaurantIds = await sql<{ id: string }[]>`
      SELECT id FROM "Restaurant" WHERE name = ${name}
    `;
    for (const { id: rid } of restaurantIds) {
      await sql`DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "restaurantId" = ${rid})`;
      await sql`DELETE FROM "OrderStatusHistory" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "restaurantId" = ${rid})`;
      await sql`DELETE FROM "Order" WHERE "restaurantId" = ${rid}`;
      await sql`DELETE FROM "PaymentIntent" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "restaurantId" = ${rid})`;
      await sql`DELETE FROM "Combo" WHERE "restaurantId" = ${rid}`;
      await sql`DELETE FROM "Product" WHERE "categoryId" IN (SELECT id FROM "Category" WHERE "restaurantId" = ${rid})`;
      await sql`DELETE FROM "Category" WHERE "restaurantId" = ${rid}`;
      await sql`DELETE FROM "ModifierValue" WHERE "modifierGroupId" IN (SELECT id FROM "ModifierGroup" WHERE "restaurantId" = ${rid})`;
      await sql`DELETE FROM "ModifierGroup" WHERE "restaurantId" = ${rid}`;
      await sql`DELETE FROM "Table" WHERE "restaurantId" = ${rid}`;
      await sql`DELETE FROM "Restaurant" WHERE id = ${rid}`;
    }
  }

  console.log('✅ Limpeza concluída\n');
}

// ============================================
// Main seed function
// ============================================

export async function seed(): Promise<SeedResult> {
  const releaseLock = await acquireLock();

  try {
    console.log('========================================');
    console.log('🚀 SEED E2E - Iniciando...');
    console.log('========================================\n');

    // Limpeza primeiro
    await cleanupExistingTestData();

    // Phase 1: Users and Restaurants (independent)
    const [users, restaurant, restaurantBRow] = await Promise.all([
      createUsers(),
      createRestaurant(),
      createRestaurantB(),
    ]);

    // Phase 2: Categories, Tables, Profile linkage (depend on restaurantId)
    const [categories, tables] = await Promise.all([
      createCategories(restaurant.id),
      createTables(restaurant.id),
      linkUserProfiles(users, restaurant.id),
    ]);

    // Phase 3: Products (depends on categories)
    const products = await createProducts(restaurant.id, categories);

    // Phase 4: Modifier Groups
    const modifierGroups = await createModifierGroups(restaurant.id);

    // Phase 5: Pedidos do tenant A + dados reais do tenant B.
    // Ambos alimentam os testes BOLA: sem linhas nos dois tenants, as
    // asserções de isolamento seriam infalsificáveis (array vazio passa).
    const [orders, tenantB] = await Promise.all([
      createOrders(restaurant.id, tables[0].id, products),
      seedTenantB(restaurantBRow.id),
    ]);

    const result: SeedResult = {
      users,
      restaurant,
      restaurantB: { ...restaurantBRow, ...tenantB },
      categories,
      products,
      tables,
      orders,
      modifierGroups,
    };

    console.log('========================================');
    console.log('✅ SEED E2E - Concluído com sucesso!');
    console.log('========================================');
    console.log('\n📋 Credenciais de teste:');
    console.log(`   Customer: ${users.customer.email} / ${TEST_PASSWORD}`);
    console.log(`   Admin: ${users.admin.email} / ${TEST_PASSWORD}`);
    console.log(`   Garçom: ${users.waiter.email} / ${TEST_PASSWORD}`);
    console.log(`   Manager: ${users.manager.email} / ${TEST_PASSWORD}`);
    console.log(`\n📍 Restaurant ID: ${restaurant.id}`);
    console.log(`📍 Restaurant Name: ${restaurant.name}`);
    console.log('\n💾 Dados salvos em: tests/e2e/scripts/.seed-result.json');

    // Salvar resultado
    fs.writeFileSync(SEED_RESULT_FILE, JSON.stringify(result, null, 2));

    return result;
  } finally {
    await releaseLock();
  }
}

// Executar apenas se rodado diretamente
const isMainModule = require.main === module || process.argv[1]?.includes('seed.ts');
if (isMainModule) {
  seed()
    .then(() => {
      console.log('\n✅ Seed finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro no seed:', error.message);
      process.exit(1);
    });
}
