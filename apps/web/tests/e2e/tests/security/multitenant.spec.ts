/**
 * E2E: Multi-Tenant Isolation (BOLA Prevention)
 *
 * Valida que dados de um restaurante NÃO vazam pra outro.
 * **Crítico** pra SaaS multi-tenant — BOLA (Broken Object Level
 * Authorization) é a #1 vulnerability em APIs (OWASP API Top 10 2023).
 *
 * **Cenários cobertos:**
 * - Admin do restaurante A não vê/editar dados do restaurante B
 * - Token de um restaurante não funciona em rotas de outro
 * - Cross-tenant data leak em listagens
 * - Tentativa de acessar IDOR (trocar UUID na URL)
 *
 * Tags: @security @multitenant @bola @critical
 *
 * @see OWASP API #1 — Broken Object Level Authorization
 *
 * **Por que chamamos NestJS direto (`localhost:3001`) em vez do proxy
 * do Next.js (`localhost:3000/api/*`)?**
 *
 * Os Route Handlers do Next.js dependem de `NEXT_PUBLIC_API_URL` para
 * repassar chamadas ao NestJS. Em dev local, esse env aponta pra
 * `localhost:3009` (porta de teste dedicada). Se essa porta não está
 * no ar, o proxy do Next.js trava (`TimeoutError 10000ms exceeded`)
 * e os testes BOLA ficam verdes por motivos errados (timeout ≠ 403).
 *
 * Pra validar a isolação REAL, batemos direto no NestJS, que é quem
 * implementa a regra de negócio do BOLA (`orders.service.ts`).
 *
 * **Cobertura REAL (auditoria P0-01):** o seed cria dados em ambos os
 * tenants (`seedTenantB` em `scripts/seed.ts`). Estes testes
 * ASSERTem que IDs conhecidos do tenant B NUNCA aparecem em respostas
 * autenticadas como tenant A, e que mutações cross-tenant sobre o
 * tenant B falham com 403 + (verificação no DB) nenhuma linha afetada.
 */

import { request } from '@playwright/test';
import postgres from 'postgres';

import { test, expect } from '../shared/fixtures';

/**
 * Base URL da API NestJS para os testes BOLA. Usa a env var dedicada
 * `E2E_API_URL` (definida em `apps/web/tests/e2e/.env.e2e`). NÃO usa
 * `NEXT_PUBLIC_API_URL` — esse aponta para `:3009` em dev local e
 * nunca para o NestJS real (`:3001`), conforme documentado no header.
 */
const E2E_API_URL = process.env.E2E_API_URL || 'http://localhost:3001';

/**
 * Realiza login via NestJS `/auth/login` direto e retorna os cookies de
 * sessão. Compartilhado entre os testes para evitar bater no Throttler
 * (5 req/min/IP em `/auth/login` — testes paralelos causariam 429).
 *
 * O backend define cookies HttpOnly `pedi_ai_access` /
 * `pedi_ai_refresh` via `cookie-helper.ts`. O `jwt.strategy.ts` extrai
 * o token do cookie **primeiro**; o header `Authorization: Bearer`
 * é apenas fallback (auditoria P0-01). Por isso injetamos SÓ o
 * cookie — o header seria decorativo.
 */
async function loginAndGetCookies(seedData: {
  admin: { email: string; password: string };
}): Promise<Array<{ name: string; value: string; domain: string; path: string }>> {
  const ctx = await request.newContext();
  try {
    const resp = await ctx.post(`${E2E_API_URL}/auth/login`, {
      data: {
        email: seedData.admin.email,
        password: seedData.admin.password,
      },
    });
    if (!resp.ok()) {
      const body = await resp.text().catch(() => '');
      throw new Error(
        `Login falhou (${resp.status()}): ${body}. Verifique se a API está ` +
          `rodando em ${E2E_API_URL} e se \`pnpm test:e2e:seed\` foi executado.`
      );
    }
    const raw = await ctx.storageState();
    return raw.cookies
      .filter((c) => c.name === 'pedi_ai_access' || c.name === 'pedi_ai_refresh')
      .map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain || 'localhost',
        path: c.path || '/',
      }));
  } finally {
    await ctx.dispose();
  }
}

/**
 * Injeta os cookies de autenticação no BrowserContext da page. Usado
 * em cada teste para reaproveitar o login único do `beforeAll`.
 */
async function injectAuthCookies(
  page: import('@playwright/test').Page,
  cookies: Array<{ name: string; value: string; domain: string; path: string }>
): Promise<void> {
  if (cookies.length === 0) {
    throw new Error('Nenhum cookie de auth para injetar — beforeAll falhou?');
  }
  await page.context().addCookies(cookies);
}

/**
 * Helpers de DB. Usados para ASSERTIR que mutações cross-tenant
 * falharam (nenhuma linha criada/alterada/deletada no tenant B).
 *
 * Requer `DATABASE_URL` — em CI ela é exportada via `$GITHUB_ENV`
 * (ver `.github/workflows/e2e.yml`). Local: `.env.e2e` precisa ter
 * a URL real do Postgres de dev (a placeholder causa erro claro).
 */
let _sql: ReturnType<typeof postgres> | null = null;
function getSql(): ReturnType<typeof postgres> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url || url.includes('user:password@')) {
    throw new Error(
      `DATABASE_URL ausente ou com placeholder (${url ?? 'undefined'}). ` +
        `Defina em \`apps/web/tests/e2e/.env.e2e\` com a URL real do Postgres ` +
        `de dev (ex.: postgresql://pedi_ai:pedi_ai@localhost:5432/pedi_ai).`
    );
  }
  _sql = postgres(url, { max: 5 });
  return _sql;
}
async function closeSql(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 1 });
    _sql = null;
  }
}

test.describe('Multi-Tenant Isolation @security @multitenant @bola @critical', () => {
  // ─── SETUP: login único para evitar Throttler (5 req/min/IP) ──
  // Cada teste injeta esses cookies no seu próprio page.context().
  let authCookies: Awaited<ReturnType<typeof loginAndGetCookies>> = [];

  test.beforeAll(async ({ seedData }) => {
    authCookies = await loginAndGetCookies(seedData);
  });

  test.afterAll(async () => {
    await closeSql();
  });

  // ─── ISOLAMENTO DE LISTAGENS ──────────────────────────────────

  test(
    'admin do Restaurante A NÃO deve ver pedidos do Restaurante B em /orders',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);

      // /orders SEM query param — pega pedidos do tenant do JWT.
      // Auditoria P0-01: o DTO rejeita `restaurantId` na query com
      // 400 (impossível trocar de tenant pela URL). Caso a validação
      // seja removida, o service usa o JWT (BOLA fix) e filtra por
      // tenant — 200 só com pedidos do tenant A.
      const response = await page.request.get(`${E2E_API_URL}/orders`);

      // Asserção dura: /orders SEMPRE responde 200 quando autenticado
      // (papel gerente/dono). Aceitar 400/403/404 era infalsificável
      // (IMPORTANT #6 do bug scan) — estreitamos para 200 + assertions
      // positivas (não-vazio + IDs do tenant B ausentes + sentinel).
      expect(response.status()).toBe(200);
      const body = await response.json();
      const orders: Array<{ id: string; restaurantId?: string; restaurant_id?: string; total?: number }> = Array.isArray(body)
        ? body
        : (body.data ?? body.orders ?? []);

      // Positivo: lista não-vazia (seed cria ≥ 2 pedidos no tenant A).
      expect(orders.length).toBeGreaterThan(0);

      // Positivo: TODOS os pedidos pertencem ao tenant A.
      for (const order of orders) {
        expect(order.restaurantId ?? order.restaurant_id).toBe(seedData.restaurant.id);
      }

      // Negativo: ID conhecido do tenant B NÃO aparece (CRITICAL #1).
      const ids = new Set(orders.map((o) => o.id));
      expect(ids.has(seedData.restaurantB.orderId)).toBe(false);

      // Negativo: total sentinela do tenant B NÃO vaza no faturamento
      // do tenant A — se algum dia chegar perto, o filtro por tenant
      // vazou.
      const totalRespondido = orders.reduce(
        (acc, o) => acc + (typeof o.total === 'number' ? o.total : 0),
        0
      );
      // sentinela é 9999.99; total do tenant A é ~58.98. Margem ampla.
      expect(totalRespondido).toBeLessThan(seedData.restaurantB.orderTotal);
    }
  );

  test(
    'IDOR: tentar acessar pedido REAL do Restaurante B via UUID deve ser 403/404',
    { tag: ['@security', '@idor', '@critical'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);

      // Tenta ler um pedido que existe (seed em tenant B), mas com
      // token do tenant A. Esperado: 403/404. Em NENHUM caso pode
      // retornar 200 com os dados do B.
      const response = await page.request.get(
        `${E2E_API_URL}/orders/${seedData.restaurantB.orderId}`
      );
      expect([403, 404]).toContain(response.status());

      if (response.status() === 200) {
        // Se 200 vazou, garantir que os dados NÃO são do tenant B.
        const order = await response.json();
        expect(order.restaurantId ?? order.restaurant_id).toBe(seedData.restaurant.id);
      }
    }
  );

  test(
    'categoria REAL do Restaurante B NÃO deve aparecer em /categories',
    { tag: ['@security', '@bola'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);

      const response = await page.request.get(`${E2E_API_URL}/categories`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      const cats: Array<{ id: string; restaurantId?: string; restaurant_id?: string }> = Array.isArray(body)
        ? body
        : (body.data ?? []);

      // Positivo: categorias do tenant A estão lá.
      const myCatIds = new Set(seedData.categories.map((c) => c.id));
      expect(cats.some((c) => myCatIds.has(c.id))).toBe(true);

      // Negativo: categoria do tenant B NÃO está lá.
      expect(cats.some((c) => c.id === seedData.restaurantB.categoryId)).toBe(false);

      // Positivo: todas as categorias visíveis são do tenant A.
      for (const cat of cats) {
        expect(cat.restaurantId ?? cat.restaurant_id).toBe(seedData.restaurant.id);
      }
    }
  );

  // ─── CRIAÇÃO / MUTAÇÃO CROSS-TENANT ─────────────────────────

  test(
    'admin NÃO deve conseguir CRIAR produto em outro restaurante',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);

      // POST /products IGNORA `restaurantId` do body e usa o do JWT
      // (auditoria P0-01). Tentativa cross-tenant: ou 400 (DTO rejeita
      // `restaurantId` no body) ou 403 (ForbiddenException) — NUNCA 200
      // com produto criado em tenant B. 500 indica schema drift
      // (coluna `Product.restaurantId` ausente no DB — Issue #1) e
      // deve ser explicitamente diferenciado para não passar batido.
      const response = await page.request.post(`${E2E_API_URL}/products`, {
        headers: { 'Content-Type': 'application/json' },
        data: {
          restaurantId: seedData.restaurantB.id, // TENTATIVA DE ATTACK
          categoryId: seedData.categories[0].id,
          name: 'Produto Malicioso E2E',
          price: 100,
        },
      });

      const status = response.status();

      // 500 = schema drift (Issue #1 do code review): o antigo
      // whitelist `[400, 403, 500]` mascarava bugs reais. Agora
      // explodimos alto para que CI surface o problema em vez de
      // deixar passar como "rejeitado".
      if (status === 500) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `POST /products retornou 500 — schema drift suspected: ${body.slice(0, 300)}`
        );
      }

      // 400/403 = rejeitado (validação ou role). 200/201 = criado
      // NO MEU restaurante — o `restaurantId` do body foi ignorado.
      expect([400, 403, 200, 201]).toContain(status);

      if (status === 200 || status === 201) {
        const product = await response.json();
        const createdIn = product.restaurantId ?? product.restaurant_id;
        expect(createdIn).toBe(seedData.restaurant.id);
        // Cleanup defensivo.
        await page.request.delete(`${E2E_API_URL}/products/${product.id}`);
      }

      // ASSERÇÃO NO DB (CRITICAL #1 + Issue #1): independente do
      // status, o produto NUNCA pode ter sido criado no tenant B.
      const sql = getSql();
      const leaked = await sql<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
          FROM "Product"
         WHERE "restaurantId" = ${seedData.restaurantB.id}
           AND name = 'Produto Malicioso E2E'
      `;
      expect(leaked[0].count).toBe(0);
    }
  );

  test(
    'admin NÃO deve conseguir ATUALIZAR produto REAL do outro restaurante',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);

      // PATCH sobre o produto REAL do tenant B (criado em `seedTenantB`).
      // Esperado: 403 (ForbiddenException) ou 404. NUNCA 200 com
      // nome alterado — isso seria BOLA write. Substitui o `test.skip()`
      // permanente (IMPORTANT #5) por uma asserção real.
      const response = await page.request.patch(
        `${E2E_API_URL}/products/${seedData.restaurantB.productId}`,
        {
          headers: { 'Content-Type': 'application/json' },
          data: {
            name: 'Nome Hackeado',
            price: 999999,
          },
        }
      );

      expect([403, 404]).toContain(response.status());

      // ASSERÇÃO NO DB: o nome do produto B NÃO foi alterado.
      const sql = getSql();
      const rows = await sql<Array<{ name: string }>>`
        SELECT name FROM "Product" WHERE id = ${seedData.restaurantB.productId}
      `;
      expect(rows[0]?.name).toBe(seedData.restaurantB.productName);
      // E continua pertencendo ao tenant B.
      const tenant = await sql<Array<{ restaurantId: string }>>`
        SELECT "restaurantId" FROM "Product" WHERE id = ${seedData.restaurantB.productId}
      `;
      expect(tenant[0]?.restaurantId).toBe(seedData.restaurantB.id);
    }
  );

  test(
    'admin NÃO deve conseguir DELETAR produto REAL do outro restaurante',
    { tag: ['@security', '@bola'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);

      // DELETE sobre produto REAL do tenant B (Issue #3). O teste
      // antigo usava UUID fake e só validava o caminho "not found" —
      // agora exercita o caminho BOLA real.
      const response = await page.request.delete(
        `${E2E_API_URL}/products/${seedData.restaurantB.productId}`
      );

      // DELETE em products exige role `dono` (controller).
      // 403 = cross-tenant ForbiddenException (caminho BOLA correto).
      // 404 = não encontrado neste tenant (também correto).
      // 500 = schema drift — explodir alto (Issue #1).
      const status = response.status();
      if (status === 500) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `DELETE /products retornou 500 — schema drift suspected: ${body.slice(0, 300)}`
        );
      }
      expect([403, 404]).toContain(status);

      // ASSERÇÃO NO DB: o produto do tenant B CONTINUA EXISTINDO.
      const sql = getSql();
      const rows = await sql<Array<{ id: string }>>`
        SELECT id FROM "Product" WHERE id = ${seedData.restaurantB.productId}
      `;
      expect(rows.length).toBe(1);
    }
  );

  // ─── DATA LEAK EM LISTAGENS / ANALYTICS ──────────────────────

  test(
    'analytics /overview NÃO deve incluir faturamento do tenant B',
    { tag: ['@security', '@bola'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);

      // /analytics/overview usa o tenant do JWT.
      const response = await page.request.get(`${E2E_API_URL}/analytics/overview`);

      // analytics exige role gerente/dono — 200 quando OK. 403 quando
      // role sem permissão. O importante é que o tenant é o do JWT.
      expect([200, 403]).toContain(response.status());

      if (response.status() !== 200) return;

      const body = await response.json();

      // MINOR #9: assertion near-vacuous (`if (body.restaurantId ?? ...)`).
      // Substituímos por asserts em campos REAIS do overview.
      // Forma esperada: `{ orders: number, revenue: number }`
      // (escopado pelo tenant do JWT). Se a forma mudar, falhamos aqui
      // em vez de passar por engano.
      expect(body).toHaveProperty('orders');
      expect(body).toHaveProperty('revenue');
      expect(typeof body.orders).toBe('number');
      expect(typeof body.revenue).toBe('number');

      // Positivo: revenue do tenant A é > 0 (seed cria 2 pedidos pagos).
      expect(body.revenue).toBeGreaterThan(0);

      // Negativo (CRITICAL #1): revenue NUNCA chega perto do sentinela
      // 9999.99 do tenant B — se chegar, o filtro de tenant vazou.
      expect(body.revenue).toBeLessThan(seedData.restaurantB.orderTotal);
    }
  );

  // ─── MULTI-RESTAURANTE (mesmo usuário) ──────────────────────

  // Mantido como `test.skip` — depende de `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT`
  // e o seed atual não cria múltiplos vínculos para o mesmo usuário.
  test.skip(
    'usuário com múltiplos restaurantes vê APENAS dados dos seus',
    { tag: ['@security', '@multitenant'] },
    async () => {
      // Esse teste assume feature flag NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT.
      // Pula se feature não estiver ativa.
    }
  );

  // ─── AUTH BOUNDARY (NestJS direto, sem login) ────────────────

  test('sem token, NÃO deve acessar nada', { tag: ['@security', '@auth'] }, async ({ request: apiRequest }) => {
    // Batemos direto em NestJS `/auth/me` (rota protegida por JwtAuthGuard)
    // pra testar o auth boundary real. O proxy do Next.js (`/api/auth/profile`)
    // depende de `NEXT_PUBLIC_API_URL` que em dev local aponta pra
    // porta 3009 (não ativa), gerando timeout — não é um teste válido.
    const response = await apiRequest.get(`${E2E_API_URL}/auth/me`);
    expect(response.status()).toBe(401);
  });

  test(
    'token inválido deve ser rejeitado',
    { tag: ['@security', '@auth'] },
    async ({ request: apiRequest }) => {
      const response = await apiRequest.get(`${E2E_API_URL}/auth/me`, {
        headers: { Authorization: 'Bearer invalid_token_xyz' },
      });
      expect(response.status()).toBe(401);
    }
  );

  test(
    'token expirado deve ser rejeitado',
    { tag: ['@security', '@auth'] },
    async ({ request: apiRequest }) => {
      // Token JWT expirado (gerado manualmente)
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEiLCJpYXQiOjEwMDAwLCJleHAiOjExMDAxfQ.fake';

      const response = await apiRequest.get(`${E2E_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      expect(response.status()).toBe(401);
    }
  );
});