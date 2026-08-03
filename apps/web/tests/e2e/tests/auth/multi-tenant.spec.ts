/**
 * E2E — Isolamento multi-tenant no endpoint `GET /products/:id` (P0-01)
 *
 * @see PLANO_AUDITORIA_2026-07-29.md §P0-01 (validação esperada)
 * @see docs/superpowers/plans/2026-07-29-auditoria-tranche-a-p0.md (Task 5)
 *
 * Cobertura: garante que um usuário autenticado em restaurante A NÃO
 * consegue ler dados de produto do restaurante B via `GET /products/:id`.
 *
 * **Por que este spec existe:**
 *  - BOLA (Broken Object Level Authorization — OWASP API #1) era
 *    explorável pré-P0-01: `GET /products/:id` era público e qualquer
 *    cliente com um UUID de produto de outro tenant lia nome/preço.
 *  - Após P0-01, a rota exige JWT (`@Roles(atendente, gerente, dono)`)
 *    e filtra por `req.user.restaurantId` (defesa em profundidade via
 *    `RestaurantScopedRepository`).
 *  - Este spec é o canário HTTP ponta-a-ponta: se alguém remover o
 *    `@Roles` ou regredir a query para `findUnique({ where: { id } })`
 *    sem filtro de tenant, o teste falha.
 *
 * **Setup necessário (CI):**
 *  - `pnpm test:e2e:seed` populou a base com o restaurante principal e
 *    usuários `cliente`/`atendente`/`gerente`/`dono` (todos com
 *    `restaurantId = <rest-seed>`).
 *  - Este spec cria UM segundo restaurante + 1 categoria + 1 produto
 *    via SQL direto, executa o cenário cross-tenant, e faz cleanup.
 *  - API rodando em `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`).
 *
 * **Por que SQL direto e não seed:**
 *  - O seed principal (P0-07 em progresso) só cria UM restaurante.
 *  - Adicionar segundo restaurante no seed.ts exigiria coordenação
 *    com a task P0-07; este spec é auto-contido para validar P0-01
 *    sem dependência cross-task.
 */
import { randomUUID } from 'crypto';

import * as dotenv from 'dotenv';
import * as path from 'path';

import { test, expect } from '../shared/fixtures';

// Carrega DATABASE_URL do .env.e2e (mesmo padrão do seed.ts).
// Resolve relativo a este arquivo: tests/e2e/tests/auth/multi-tenant.spec.ts
// → tests/e2e/.env.e2e (3 níveis acima).
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env.e2e') });

const SECOND_RESTAURANT_NAME = `e2e-multi-tenant-restaurant-${randomUUID()}`;
const SECOND_CATEGORY_NAME = `e2e-multi-tenant-category-${randomUUID()}`;
const SECOND_PRODUCT_NAME = `e2e-multi-tenant-product-${randomUUID()}`;

/**
 * Cria um segundo restaurante + categoria + produto via SQL direto.
 *
 * Retorna IDs para uso no teste. Cleanup deve ser feito em
 * `afterAll`/`afterEach` via `cleanupSecondTenant`.
 *
 * Skipa o teste (não falha) se `DATABASE_URL` não estiver configurada —
 * útil em CI sem DB de teste disponível.
 */
async function createSecondTenant(): Promise<{
  restaurantId: string;
  categoryId: string;
  productId: string;
} | null> {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL não definida — teste cross-tenant pulado.');
    return null;
  }

  // postgres() não reconhece `?schema=public` que vem no DATABASE_URL.
  const sanitized = DATABASE_URL.includes('?')
    ? DATABASE_URL.slice(0, DATABASE_URL.indexOf('?'))
    : DATABASE_URL;

  const postgres = (await import('postgres')).default;
  const sql = postgres(sanitized, { max: 5 });

  try {
    const restaurantId = randomUUID();
    const categoryId = randomUUID();
    const productId = randomUUID();

    await sql`
      INSERT INTO "Restaurant" (id, name, description, settings, "createdAt", "updatedAt")
      VALUES (
        ${restaurantId},
        ${SECOND_RESTAURANT_NAME},
        ${'Restaurant secundário para teste cross-tenant (P0-01)'},
        ${'{"currency": "BRL"}'},
        NOW(),
        NOW()
      )
    `;

    await sql`
      INSERT INTO "Category" (id, "restaurantId", name, active, "sortOrder", "createdAt", "updatedAt")
      VALUES (
        ${categoryId},
        ${restaurantId},
        ${SECOND_CATEGORY_NAME},
        true,
        0,
        NOW(),
        NOW()
      )
    `;

    await sql`
      INSERT INTO "Product" (id, "restaurantId", "categoryId", name, price, available, "dietaryLabels", "sortOrder", "createdAt", "updatedAt")
      VALUES (
        ${productId},
        ${restaurantId},
        ${categoryId},
        ${SECOND_PRODUCT_NAME},
        ${99.99},
        true,
        ${'[]'},
        0,
        NOW(),
        NOW()
      )
    `;

    return { restaurantId, categoryId, productId };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Remove o segundo tenant criado por `createSecondTenant`.
 * Idempotente — não falha se nada existir.
 */
async function cleanupSecondTenant(): Promise<void> {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) return;

  const sanitized = DATABASE_URL.includes('?')
    ? DATABASE_URL.slice(0, DATABASE_URL.indexOf('?'))
    : DATABASE_URL;

  const postgres = (await import('postgres')).default;
  const sql = postgres(sanitized, { max: 5 });

  try {
    // FK: Product → Category → Restaurant. Delete em ordem.
    await sql`DELETE FROM "Product" WHERE name = ${SECOND_PRODUCT_NAME}`;
    await sql`DELETE FROM "Category" WHERE name = ${SECOND_CATEGORY_NAME}`;
    await sql`DELETE FROM "Restaurant" WHERE name = ${SECOND_RESTAURANT_NAME}`;
  } catch (err) {
    console.warn(`⚠️  cleanupSecondTenant falhou: ${(err as Error).message}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

test.describe('Isolamento multi-tenant — GET /products/:id (P0-01)', () => {
  // Antes de cada teste: garante isolamento limpando cookies do
  // context (login pode ter sido feito por teste anterior).
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // Auditoria P0-01 (2026-07-29): antes, cada teste chamava
  // `test.skip(!tenantB, ...)` no corpo, mas isso não pula as fixtures
  // `beforeEach`/`afterAll` — o cleanup e o seed do contexto ainda
  // rodavam. Movido para `test.beforeAll` que chama `test.skip()`
  // antes das fixtures serem executadas: se `DATABASE_URL` não estiver
  // configurada, o describe inteiro é pulado ANTES de qualquer fixture.
  test.beforeAll(({}) => {
    if (!process.env.DATABASE_URL) {
      test.skip(true, 'DATABASE_URL não configurada — pulando suite cross-tenant');
    }
  });

  // Cleanup do segundo tenant após TODOS os testes do describe.
  // Roda mesmo se algum teste falhar no meio (try/finally).
  test.afterAll(async () => {
    await cleanupSecondTenant();
  });

  test(
    'atendente de restaurante A NÃO consegue ler produto de restaurante B (404 cross-tenant)',
    { tag: ['@RNF-SEC-MT-01', '@multi-tenant', '@BOLA'] },
    async ({ page, seedData }) => {
      // Setup: cria tenant B direto no DB.
      const tenantB = await createSecondTenant();

      // Login como atendente (role allowed em GET /products/:id).
      // atendente pertence ao restaurante seedData.restaurant.id (tenant A).
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: {
          email: seedData.waiter.email,
          password: seedData.waiter.password,
        },
      });
      expect(loginResp.status()).toBeLessThan(400);

      // Tenta ler produto do tenant B com JWT do tenant A.
      // Esperado: 404 (filtro de tenant exclui cross-tenant — sem
      // revelar se o produto existe em outro tenant).
      const resp = await page.request.get(`/api/v1/products/${tenantB!.productId}`);

      expect(resp.status()).toBe(404);
    }
  );

  test(
    'gerente de restaurante A NÃO consegue ler produto de restaurante B (404 cross-tenant)',
    { tag: ['@RNF-SEC-MT-01', '@multi-tenant', '@BOLA'] },
    async ({ page, seedData }) => {
      const tenantB = await createSecondTenant();

      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: {
          email: seedData.manager.email,
          password: seedData.manager.password,
        },
      });
      expect(loginResp.status()).toBeLessThan(400);

      const resp = await page.request.get(`/api/v1/products/${tenantB!.productId}`);

      expect(resp.status()).toBe(404);
    }
  );

  test(
    'dono de restaurante A NÃO consegue ler produto de restaurante B (404 cross-tenant)',
    { tag: ['@RNF-SEC-MT-01', '@multi-tenant', '@BOLA'] },
    async ({ page, seedData }) => {
      const tenantB = await createSecondTenant();

      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: {
          email: seedData.admin.email,
          password: seedData.admin.password,
        },
      });
      expect(loginResp.status()).toBeLessThan(400);

      const resp = await page.request.get(`/api/v1/products/${tenantB!.productId}`);

      expect(resp.status()).toBe(404);
    }
  );

  test(
    'sem token retorna 401 (rota deixou de ser @Public)',
    { tag: ['@RNF-SEC-MT-01', '@multi-tenant'] },
    async ({ page, seedData }) => {
      // Sem login: rota autenticada exige JWT (foi removida de @Public).
      // Esperado: 401 (não 200 com dados leakados).
      // Usa um UUID qualquer — sem token não importa o ID.
      const someProductId = randomUUID();
      const resp = await page.request.get(`/api/v1/products/${someProductId}`);

      expect(resp.status()).toBe(401);
      // Garante que NÃO vazou dados do produto (response não é JSON de produto).
      const body = await resp.text();
      expect(body).not.toContain(seedData.restaurant.name);
    }
  );
});
