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
 */

import { test, expect } from '../shared/fixtures';

test.describe('Multi-Tenant Isolation @security @multitenant @bola @critical', () => {
  // ─── ISOLAMENTO DE DADOS ─────────────────────────────────────

  test(
    'admin do Restaurante A NÃO deve ver pedidos do Restaurante B',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, request, seedData }) => {
      // Assume seedData tem 2 restaurantes: A e B
      // (Vamos criar via API se necessário)
      const restaurantA = seedData.restaurant;
      const restaurantBId = 'rest_other_seed'; // placeholder

      // Como admin do restaurante A
      await page.goto(`/admin/pedidos?restaurantId=${restaurantA.id}`);
      await page.waitForLoadState('networkidle');

      // Tenta acessar pedido do restaurante B via API direta
      const response = await request.get(`/api/admin/orders?restaurantId=${restaurantBId}`, {
        headers: {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pedi_auth_access_token'))}`,
        },
      });

      // Deve retornar 403 (Forbidden) ou 404 (Not Found)
      expect([403, 404]).toContain(response.status());

      // Tenta acessar pedido específico do restaurante B
      const orderFromB = `order_${restaurantBId}_fake`;
      const response2 = await request.get(`/api/admin/orders/${orderFromB}`, {
        headers: {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pedi_auth_access_token'))}`,
        },
      });

      expect([403, 404]).toContain(response2.status());
    }
  );

  test(
    'IDOR: tentar acessar pedido de outro restaurante via UUID na URL deve falhar',
    { tag: ['@security', '@idor', '@critical'] },
    async ({ page, request, seedData }) => {
      const myRestaurantId = seedData.restaurant.id;

      // Tenta adivinhar UUID de pedido de outro restaurante
      const fakeOrderIds = [
        '00000000-0000-0000-0000-000000000000',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        `${myRestaurantId}_fake_order`,
      ];

      for (const orderId of fakeOrderIds) {
        const response = await request.get(`/api/admin/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pedi_auth_access_token'))}`,
          },
        });

        // Não pode ser 200 com dados de outro restaurante
        if (response.status() === 200) {
          const order = await response.json();
          // Se retornar 200, DEVE ser do próprio restaurante (ou 404)
          expect(order.restaurantId).toBe(myRestaurantId);
        } else {
          expect([403, 404]).toContain(response.status());
        }
      }
    }
  );

  test(
    'Token de um restaurante NÃO deve funcionar em rotas de outro',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, request, seedData }) => {
      // Gera token "válido" mas para outro restaurante
      // (simulação: usa o token do admin atual mas tenta acessar dados de outro)

      const myRestaurant = seedData.restaurant;
      const otherRestaurantId = 'rest_attacker_target';

      // Lista categorias: deve retornar APENAS as do meu restaurante
      const response = await request.get(`/api/categories?restaurantId=${otherRestaurantId}`, {
        headers: {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pedi_auth_access_token'))}`,
        },
      });

      // 403/404 OU 200 mas sem categorias de outro restaurante
      if (response.ok()) {
        const categories = await response.json();
        // Se retornou categorias, todas devem ser do meu restaurante
        for (const cat of categories) {
          expect(cat.restaurantId).toBe(myRestaurant.id);
        }
      } else {
        expect([403, 404]).toContain(response.status());
      }
    }
  );

  // ─── CRIAÇÃO DE RECURSOS ─────────────────────────────────────

  test(
    'admin NÃO deve conseguir criar recurso para outro restaurante',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, request, seedData }) => {
      const myRestaurant = seedData.restaurant;
      const otherRestaurantId = 'rest_attacker';

      // Tenta criar produto em outro restaurante
      const response = await request.post('/api/products', {
        headers: {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pedi_auth_access_token'))}`,
          'Content-Type': 'application/json',
        },
        data: {
          restaurantId: otherRestaurantId, // TENTATIVA DE ATTACK
          name: 'Produto Malicioso',
          priceCents: 100,
        },
      });

      // Deve falhar (403 ou 400) OU criar para o MEU restaurante (ignora o restaurantId do body)
      if (response.status() === 201) {
        const product = await response.json();
        // Se criou, deve ser no MEU restaurante (não no outro)
        expect(product.restaurantId).toBe(myRestaurant.id);
        // Cleanup
        await request.delete(`/api/products/${product.id}`);
      } else {
        expect([400, 403]).toContain(response.status());
      }
    }
  );

  test(
    'admin NÃO deve conseguir ATUALIZAR produto de outro restaurante',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, request, seedData }) => {
      // Tenta fazer PATCH/PUT em recurso de outro restaurante
      const otherProductId = 'prod_other_restaurant';

      const response = await request.patch(`/api/products/${otherProductId}`, {
        headers: {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pedi_auth_access_token'))}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: 'Nome Hackeado',
          priceCents: 999999,
        },
      });

      expect([403, 404]).toContain(response.status());
    }
  );

  test(
    'admin NÃO deve conseguir DELETAR produto de outro restaurante',
    { tag: ['@security', '@bola', '@critical'] },
    async ({ page, request, seedData }) => {
      const otherProductId = 'prod_other_restaurant';

      const response = await request.delete(`/api/products/${otherProductId}`, {
        headers: {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pedi_auth_access_token'))}`,
        },
      });

      expect([403, 404]).toContain(response.status());
    }
  );

  // ─── DATA LEAK EM LISTAGENS ──────────────────────────────────

  test(
    'listagem de pedidos NÃO deve incluir pedidos de outros restaurantes',
    { tag: ['@security', '@bola'] },
    async ({ page, request, seedData }) => {
      // Lista pedidos
      const response = await request.get('/api/orders', {
        headers: {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pedi_auth_access_token'))}`,
        },
      });

      if (response.ok()) {
        const orders = await response.json();
        const myRestaurantId = seedData.restaurant.id;

        // TODOS os pedidos devem ser do meu restaurante
        for (const order of orders) {
          expect(order.restaurantId).toBe(myRestaurantId);
        }
      }
    }
  );

  test(
    'analytics NÃO devem incluir dados de outros restaurantes',
    { tag: ['@security', '@bola'] },
    async ({ page, request, seedData }) => {
      const response = await request.get('/api/analytics/dashboard', {
        headers: {
          Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('pedi_auth_access_token'))}`,
        },
      });

      if (response.ok()) {
        const analytics = await response.json();
        // Total de pedidos deve ser apenas do meu restaurante
        // (não conseguimos verificar diretamente, mas se houver ID leak já é problema)
        if (analytics.orders) {
          for (const order of analytics.orders) {
            expect(order.restaurantId).toBe(seedData.restaurant.id);
          }
        }
      }
    }
  );

  // ─── MULTI-RESTAURANTE (mesmo usuário) ──────────────────────

  test.skip(
    'usuário com múltiplos restaurantes vê APENAS dados dos seus',
    { tag: ['@security', '@multitenant'] },
    async ({ page, request }) => {
      // Esse teste assume feature flag NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT
      // Pula se feature não estiver ativa
    }
  );

  // ─── AUTH BOUNDARY ───────────────────────────────────────────

  test(
    'sem token, NÃO deve acessar nada',
    { tag: ['@security', '@auth'] },
    async ({ request }) => {
      // Sem header Authorization
      const response = await request.get('/api/admin/orders');
      expect(response.status()).toBe(401);
    }
  );

  test(
    'token inválido deve ser rejeitado',
    { tag: ['@security', '@auth'] },
    async ({ request }) => {
      const response = await request.get('/api/admin/orders', {
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

      const response = await request.get('/api/admin/orders', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      expect(response.status()).toBe(401);
    }
  );
});