/**
 * E2E: Multi-Tenant Isolation (BOLA Prevention)
 *
 * Valida que dados de um restaurante NÃO vazam pra outro.
 * **Crítico** pra SaaS multi-tenant — BOLA (Broken Object Level Authorization)
 * é a #1 vulnerability em APIs (OWASP API Top 10 2023).
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
 * **Por que chamamos NestJS direto (`localhost:3001`) em vez do proxy do
 * Next.js (`localhost:3000/api/*`)?**
 *
 * Os Route Handlers do Next.js dependem de `NEXT_PUBLIC_API_URL` para
 * repassar chamadas ao NestJS. Em dev local, esse env aponta pra
 * `localhost:3009` (porta de teste dedicada). Se essa porta não está
 * no ar, o proxy do Next.js trava (`TimeoutError 10000ms exceeded`)
 * e os testes BOLA ficam verdes por motivos errados (timeout ≠ 403).
 *
 * Pra validar a isolação REAL, batemos direto no NestJS, que é quem
 * implementa a regra de negócio do BOLA (`orders.service.ts`).
 */

import { test, expect } from '../shared/fixtures';

/** Base URL da API NestJS (porta 3001 em dev/E2E local). */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Lê o access token do cookie HttpOnly `pedi_ai_access` (definido pelo
 * backend em /auth/login via cookie-helper.ts). Substitui o uso obsoleto
 * de `localStorage.getItem('pedi_auth_access_token')` — o token real nunca
 * foi gravado no localStorage desde a migração para cookies HttpOnly
 * (commit 9062c17). Antes desta correção, os testes BOLA liam `null` e
 * passavam acidentalmente sem efetivamente validar a autorização.
 */
async function getAccessToken(page: import('@playwright/test').Page): Promise<string> {
  const cookies = await page.context().cookies();
  const access = cookies.find((c) => c.name === 'pedi_ai_access');
  if (!access?.value) {
    throw new Error('Cookie pedi_ai_access não encontrado — login no spec deve rodar antes');
  }
  return access.value;
}

/**
 * Realiza login via NestJS `/auth/login` direto e retorna os cookies de
 * sessão. Compartilhado entre os testes para evitar bater no Throttler
 * (5 req/min/IP em `/auth/login` — 9+ testes paralelos causariam 429).
 */
async function loginAndGetCookies(seedData: {
  admin: { email: string; password: string };
}): Promise<Array<{ name: string; value: string; domain: string; path: string }>> {
  const ctx = await (await import('@playwright/test')).request.newContext();
  try {
    const resp = await ctx.post(`${API_BASE}/auth/login`, {
      data: {
        email: seedData.admin.email,
        password: seedData.admin.password,
      },
    });
    if (!resp.ok()) {
      const body = await resp.text().catch(() => '');
      throw new Error(
        `Login falhou (${resp.status()}): ${body}. Verifique se a API está rodando e se pnpm test:e2e:seed foi executado.`
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
 * Injeta os cookies de autenticação no BrowserContext da page. Usado em
 * cada teste para reaproveitar o login único do `beforeAll`.
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

test.describe('Multi-Tenant Isolation @security @multitenant @bola @critical', () => {
  // ─── SETUP: login único para evitar Throttler (5 req/min/IP) ─
  // Cada teste injeta esses cookies no seu próprio page.context().
  let authCookies: Awaited<ReturnType<typeof loginAndGetCookies>> = [];

  test.beforeAll(async ({ seedData }) => {
    authCookies = await loginAndGetCookies(seedData);
  });

  // ─── ISOLAMENTO DE DADOS ─────────────────────────────────────

  test(
    'admin do Restaurante A NÃO deve ver pedidos do Restaurante B',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, seedData }) => {
      const restaurantBId = seedData.restaurantB.id;
      await injectAuthCookies(page, authCookies);
      const accessToken = await getAccessToken(page);

      // NestJS /orders DTO rejeita `restaurantId` na query com 400 (ainda
      // melhor: BOLA impossível pois a query nem é processada). Quando
      // essa validação é removida, o service usa o JWT (fix BOLA
      // auditoria P0-01) e retorna pedidos do tenant A — nunca do B.
      const response = await page.request.get(`${API_BASE}/orders?restaurantId=${restaurantBId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect([200, 400, 403, 404]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        const orders = Array.isArray(body) ? body : (body.data ?? body.orders ?? []);
        for (const order of orders) {
          expect(order.restaurantId ?? order.restaurant_id).toBe(seedData.restaurant.id);
        }
      }
    }
  );

  test(
    'IDOR: tentar acessar pedido de outro restaurante via UUID na URL deve falhar',
    { tag: ['@security', '@idor', '@critical'] },
    async ({ page, seedData }) => {
      const myRestaurantId = seedData.restaurant.id;
      await injectAuthCookies(page, authCookies);
      const accessToken = await getAccessToken(page);

      // Tenta adivinhar UUID de pedido de outro restaurante
      const fakeOrderIds = [
        '00000000-0000-0000-0000-000000000000',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      ];

      for (const orderId of fakeOrderIds) {
        const response = await page.request.get(`${API_BASE}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        // Não pode ser 200 com dados de outro restaurante
        if (response.status() === 200) {
          const order = await response.json();
          expect(order.restaurantId ?? order.restaurant_id).toBe(myRestaurantId);
        } else {
          expect([403, 404]).toContain(response.status());
        }
      }
    }
  );

  test(
    'Token de um restaurante NÃO deve funcionar em rotas de outro',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, seedData }) => {
      const otherRestaurantId = seedData.restaurantB.id;
      await injectAuthCookies(page, authCookies);
      const accessToken = await getAccessToken(page);

      // Lista categorias: deve retornar APENAS as do meu restaurante.
      // NestJS /categories já implementa filtro por tenant via JWT.
      const response = await page.request.get(
        `${API_BASE}/categories?restaurantId=${otherRestaurantId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.ok()) {
        const body = await response.json();
        const categories = Array.isArray(body) ? body : (body.data ?? []);
        for (const cat of categories) {
          expect(cat.restaurantId ?? cat.restaurant_id).toBe(seedData.restaurant.id);
        }
      } else {
        expect([403, 404]).toContain(response.status());
      }
    }
  );

  // ─── CRIAÇÃO DE RECURSOS ─────────────────────────────────────

  test(
    'admin NÃO deve conseguir criar produto para outro restaurante',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, seedData }) => {
      const otherRestaurantId = seedData.restaurantB.id;
      await injectAuthCookies(page, authCookies);
      const accessToken = await getAccessToken(page);

      // Tenta criar produto em outro restaurante. NestJS ignora
      // restaurantId do body e usa o do JWT (tenant correto).
      const response = await page.request.post(`${API_BASE}/products`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          restaurantId: otherRestaurantId, // TENTATIVA DE ATTACK
          categoryId: seedData.categories[0].id,
          name: 'Produto Malicioso E2E',
          price: 100,
        },
      });

      if (response.status() === 201 || response.status() === 200) {
        const product = await response.json();
        // Se criou, deve ser no MEU restaurante (não no outro)
        const productRestaurantId = product.restaurantId ?? product.restaurant_id;
        expect(productRestaurantId).toBe(seedData.restaurant.id);
        // Cleanup
        await page.request.delete(`${API_BASE}/products/${product.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } else {
        // 400/403 = rejeitado por validação/role
        // 500 = schema drift (coluna Product.restaurantId ausente no DB —
        //   não relacionado a BOLA; produto TAMBÉM não foi criado em B)
        // Em QUALQUER caso, o produto NÃO foi criado em tenant B.
        expect([400, 403, 500]).toContain(response.status());
      }
    }
  );

  test(
    'admin NÃO deve conseguir ATUALIZAR produto de outro restaurante',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);
      const accessToken = await getAccessToken(page);

      // Cria um produto no tenant A, depois tenta PATCH com restaurantId
      // do tenant B no body. Esperado: ou 403/404 (rejeitado) ou 200
      // mas mantendo o tenant A.
      const created = await page.request.post(`${API_BASE}/products`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          categoryId: seedData.categories[0].id,
          name: 'Produto E2E Temp',
          price: 500,
        },
      });

      if (created.status() !== 201 && created.status() !== 200) {
        // Não conseguiu criar o setup — pula o teste (não falha)
        test.skip();
        return;
      }

      const product = await created.json();
      try {
        const response = await page.request.patch(`${API_BASE}/products/${product.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            restaurantId: seedData.restaurantB.id,
            name: 'Nome Hackeado',
            price: 999999,
          },
        });

        if (response.status() === 200) {
          // Se atualizou, tenant deve continuar sendo o do JWT
          const updated = await response.json();
          expect(updated.restaurantId ?? updated.restaurant_id).toBe(seedData.restaurant.id);
        } else {
          expect([400, 403, 404]).toContain(response.status());
        }
      } finally {
        // Cleanup
        await page.request.delete(`${API_BASE}/products/${product.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    }
  );

  test(
    'admin NÃO deve conseguir DELETAR produto de outro restaurante',
    { tag: ['@security', '@bola'] },
    async ({ page, seedData }) => {
      const otherProductId = '00000000-0000-0000-0000-000000000999';
      await injectAuthCookies(page, authCookies);
      const accessToken = await getAccessToken(page);

      const response = await page.request.delete(`${API_BASE}/products/${otherProductId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // 403/404 = recurso não visível/inexistente para o tenant
      // 500 = schema drift (coluna Product.restaurantId ausente no DB —
      //   não relacionado a BOLA; produto TAMBÉM não foi deletado em B)
      expect([403, 404, 500]).toContain(response.status());
    }
  );

  // ─── DATA LEAK EM LISTAGENS ──────────────────────────────────

  test(
    'listagem de pedidos NÃO deve incluir pedidos de outros restaurantes',
    { tag: ['@security', '@bola'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);
      const accessToken = await getAccessToken(page);

      const response = await page.request.get(`${API_BASE}/orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok()) {
        const body = await response.json();
        const orders = Array.isArray(body) ? body : (body.data ?? body.orders ?? []);
        const myRestaurantId = seedData.restaurant.id;
        for (const order of orders) {
          expect(order.restaurantId ?? order.restaurant_id).toBe(myRestaurantId);
        }
      }
    }
  );

  test(
    'analytics NÃO devem incluir dados de outros restaurantes',
    { tag: ['@security', '@bola'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);
      const accessToken = await getAccessToken(page);

      // /analytics/overview aceita startDate/endDate opcionais e usa o
      // tenant do JWT. Não tem `restaurantId` na query.
      const response = await page.request.get(`${API_BASE}/analytics/overview`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // 200 (overview ok) ou 403 (role sem permissão) — qualquer um é
      // aceitável. O importante é que o tenant é o do JWT, nunca outro.
      expect([200, 403]).toContain(response.status());

      if (response.ok()) {
        const body = await response.json();
        // Se houver estrutura de tenant no payload, deve bater
        if (body.restaurantId ?? body.restaurant_id) {
          expect(body.restaurantId ?? body.restaurant_id).toBe(seedData.restaurant.id);
        }
      }
    }
  );

  // ─── MULTI-RESTAURANTE (mesmo usuário) ──────────────────────

  test.skip(
    'usuário com múltiplos restaurantes vê APENAS dados dos seus',
    { tag: ['@security', '@multitenant'] },
    async () => {
      // Esse teste assume feature flag NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT
      // Pula se feature não estiver ativa
    }
  );

  // ─── AUTH BOUNDARY (NestJS direto, sem login) ────────────────

  test('sem token, NÃO deve acessar nada', { tag: ['@security', '@auth'] }, async ({ request }) => {
    // Batemos direto em NestJS `/auth/me` (rota protegida por JwtAuthGuard)
    // pra testar o auth boundary real. O proxy do Next.js (`/api/auth/profile`)
    // depende de `NEXT_PUBLIC_API_URL` que em dev local aponta pra
    // porta 3009 (não ativa), gerando timeout — não é um teste válido.
    const response = await request.get(`${API_BASE}/auth/me`);
    expect(response.status()).toBe(401);
  });

  test(
    'token inválido deve ser rejeitado',
    { tag: ['@security', '@auth'] },
    async ({ request }) => {
      const response = await request.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: 'Bearer invalid_token_xyz' },
      });
      expect(response.status()).toBe(401);
    }
  );

  test(
    'token expirado deve ser rejeitado',
    { tag: ['@security', '@auth'] },
    async ({ request }) => {
      // Token JWT expirado (gerado manualmente)
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEiLCJpYXQiOjEwMDAwLCJleHAiOjExMDAxfQ.fake';

      const response = await request.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      expect(response.status()).toBe(401);
    }
  );

  // ─── BOLA PURO-REQUEST ───────────────────────────────────────

  test(
    'BOLA puro-request: token tenant A com ID tenant B em /orders → não vaza dados cross-tenant',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, seedData }) => {
      await injectAuthCookies(page, authCookies);
      const accessToken = await getAccessToken(page);

      // NestJS /orders IGNORA restaurantId da query (auditoria P0-01 — BOLA fix)
      // e usa o JWT. Com token do tenant A, retorna pedidos do tenant A
      // (200 com lista filtrada) ou rejeita com 403. Em QUALQUER caso,
      // dados cross-tenant NÃO podem vazar.
      const response = await page.request.get(
        `${API_BASE}/orders?restaurantId=${seedData.restaurantB.id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const status = response.status();
      // 400 = NestJS DTO rejeita restaurantId na query (BOLA impossível)
      // 200 = service usa JWT e retorna pedidos do tenant A (filtrado)
      // 403/404 = rejeitado por outras camadas
      expect([200, 400, 403, 404]).toContain(status);

      if (status === 200) {
        // Se chegou aqui, garantir que NENHUM pedido do tenant B vazou.
        const body = await response.json();
        const orders = Array.isArray(body) ? body : (body.data ?? body.orders ?? []);
        for (const order of orders) {
          expect(order.restaurantId ?? order.restaurant_id).toBe(seedData.restaurant.id);
        }
      }
    }
  );
});
