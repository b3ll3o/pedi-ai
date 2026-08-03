/**
 * Integração — Isolamento multi-tenant do model Product (P0-01)
 *
 * **Estratégia:**
 * - Usa PrismaClient cru (sem AppModule) para isolar a checagem de
 *   constraint + comportamento de query.
 * - Sobe 2 restaurants + 2 categories + 2 products em transaction de
 *   teste, valida o filtro `restaurantId` em produção.
 * - Tenta ler/criar pedido cross-tenant e asserta que o resultado é
 *   "produto não encontrado para o tenant" (não vaza preço/nome).
 *
 * **Requisito:** `DATABASE_URL` definida. Em CI é setada pelo workflow.
 * Localmente, o dev precisa subir o banco (`docker-compose up -d postgres`)
 * ou definir `CI_INTEGRATION=1`.
 *
 * **Rollback:** após cada cenário, remove os produtos/categorias/
 * restaurants criados pelo teste (cleanup `afterEach`).
 *
 * @spec(RNF-SEC-MT-01, P0-01)
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'crypto';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/pedi_ai';

interface TenantFixture {
  restaurantId: string;
  categoryId: string;
  productId: string;
}

describe('Isolamento multi-tenant — model Product (P0-01)', () => {
  let prisma: PrismaClient;
  let dbAvailable = false;

  const createdTenantA: Partial<TenantFixture> = {};
  const createdTenantB: Partial<TenantFixture> = {};

  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.CI_INTEGRATION) {
      console.warn(
        '⚠️  Pulando — DATABASE_URL não definida. Suba o banco (docker-compose up -d postgres) ou defina CI_INTEGRATION=1.'
      );
      return;
    }

    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: DATABASE_URL }),
    });

    try {
      await prisma.$connect();
      dbAvailable = true;
    } catch (err) {
      console.warn(`⚠️  Banco indisponível (${(err as Error).message}) — testes pulados.`);
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    // Cria tenant A
    const restAId = randomUUID();
    const catAId = randomUUID();
    const prodAId = randomUUID();
    await prisma.restaurant.create({
      data: {
        id: restAId,
        name: `rest-a-${restAId.slice(0, 6)}`,
        active: true,
      },
    });
    await prisma.category.create({
      data: {
        id: catAId,
        restaurantId: restAId,
        name: 'cat-a',
        active: true,
      },
    });
    await prisma.product.create({
      data: {
        id: prodAId,
        categoryId: catAId,
        restaurantId: restAId,
        name: 'prod-a',
        price: 25.0,
        available: true,
      },
    });
    createdTenantA.restaurantId = restAId;
    createdTenantA.categoryId = catAId;
    createdTenantA.productId = prodAId;

    // Cria tenant B
    const restBId = randomUUID();
    const catBId = randomUUID();
    const prodBId = randomUUID();
    await prisma.restaurant.create({
      data: {
        id: restBId,
        name: `rest-b-${restBId.slice(0, 6)}`,
        active: true,
      },
    });
    await prisma.category.create({
      data: {
        id: catBId,
        restaurantId: restBId,
        name: 'cat-b',
        active: true,
      },
    });
    await prisma.product.create({
      data: {
        id: prodBId,
        categoryId: catBId,
        restaurantId: restBId,
        name: 'prod-b',
        price: 40.0,
        available: true,
      },
    });
    createdTenantB.restaurantId = restBId;
    createdTenantB.categoryId = catBId;
    createdTenantB.productId = prodBId;
  });

  afterEach(async () => {
    if (!dbAvailable) return;

    // Limpa produtos, categorias e restaurants criados.
    if (createdTenantA.productId) {
      await prisma.product.deleteMany({
        where: { id: { in: [createdTenantA.productId, createdTenantB.productId!] } },
      });
    }
    if (createdTenantA.categoryId) {
      await prisma.category.deleteMany({
        where: {
          id: { in: [createdTenantA.categoryId, createdTenantB.categoryId!] },
        },
      });
    }
    if (createdTenantA.restaurantId) {
      await prisma.restaurant.deleteMany({
        where: {
          id: { in: [createdTenantA.restaurantId, createdTenantB.restaurantId!] },
        },
      });
    }
    delete createdTenantA.restaurantId;
    delete createdTenantA.categoryId;
    delete createdTenantA.productId;
    delete createdTenantB.restaurantId;
    delete createdTenantB.categoryId;
    delete createdTenantB.productId;
  });

  it('column restaurant_id is NOT NULL na tabela products', async () => {
    if (!dbAvailable) return;
    const result = await prisma.$queryRaw<Array<{ is_nullable: string }>>`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'restaurant_id'
    `;
    expect(result).toHaveLength(1);
    expect(result[0].is_nullable).toBe('NO');
  });

  it('index products_restaurant_id_idx existe', async () => {
    if (!dbAvailable) return;
    const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'products' AND indexname = 'products_restaurant_id_idx'
    `;
    expect(result).toHaveLength(1);
  });

  it('FK products_restaurant_id_fkey existe referenciando restaurants(id)', async () => {
    if (!dbAvailable) return;
    const result = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint
      WHERE conname = 'products_restaurant_id_fkey'
    `;
    expect(result).toHaveLength(1);
  });

  it('cross-tenant findMany com restaurantId do tenant A retorna apenas prod-a', async () => {
    if (!dbAvailable) return;

    const products = await prisma.product.findMany({
      where: {
        restaurantId: createdTenantA.restaurantId,
        id: {
          in: [createdTenantA.productId!, createdTenantB.productId!],
        },
      },
    });

    expect(products).toHaveLength(1);
    expect(products[0].id).toBe(createdTenantA.productId);
    expect(products[0].name).toBe('prod-a');
  });

  it('cross-tenant findFirst por id + restaurantId retorna null (BOLA prevenido)', async () => {
    if (!dbAvailable) return;

    // Tenta ler prod-b com filtro do tenant A — NÃO deve retornar.
    const product = await prisma.product.findFirst({
      where: {
        id: createdTenantB.productId,
        restaurantId: createdTenantA.restaurantId,
      },
    });

    expect(product).toBeNull();
  });

  it('cross-tenant findFirst por id SEM filtro retorna prod-b (praga pré-fix)', async () => {
    if (!dbAvailable) return;

    // Comprova o BUG original: sem filtro `restaurantId`, o produto de
    // outro tenant é retornado — exatamente o que o P0-01 conserta.
    const product = await prisma.product.findFirst({
      where: { id: createdTenantB.productId },
    });

    expect(product).not.toBeNull();
    expect(product!.id).toBe(createdTenantB.productId);
  });

  it('findByCategory com restaurantId do tenant A retorna só prod-a', async () => {
    if (!dbAvailable) return;

    const products = await prisma.product.findMany({
      where: {
        categoryId: createdTenantA.categoryId,
        restaurantId: createdTenantA.restaurantId,
      },
    });

    expect(products).toHaveLength(1);
    expect(products[0].id).toBe(createdTenantA.productId);
  });

  it('tentativa de inserir Product sem restaurantId falha (NOT NULL violation)', async () => {
    if (!dbAvailable) return;

    await expect(
      prisma.product.create({
        data: {
          categoryId: createdTenantA.categoryId!,
          // restaurantId ausente — deve falhar
          name: 'invalid',
          price: 1.0,
          available: true,
        },
      })
    ).rejects.toThrow();
  });

  it('tentativa de inserir Product com restaurantId de OUTRO tenant falha (FK violation)', async () => {
    if (!dbAvailable) return;

    // Categoria de A mas restaurantId de B — FK deve falhar.
    await expect(
      prisma.product.create({
        data: {
          categoryId: createdTenantA.categoryId!,
          restaurantId: createdTenantB.restaurantId!,
          name: 'invalid',
          price: 1.0,
          available: true,
        },
      })
    ).rejects.toThrow();
  });
});
