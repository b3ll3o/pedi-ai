/**
 * E2E — FeatureFlagsAdminGuard aplicado via @UseGuards (P0-03)
 * @see PLANO_AUDITORIA_2026-07-29.md §P0-03
 * @see docs/superpowers/plans/2026-07-29-auditoria-tranche-a-p0.md (Task 4)
 *
 * Cobertura: garante que `FeatureFlagAdminGuard` aplicado no
 * `FeatureFlagsController` rejeita clientes com 403 e chamadas sem token
 * com 401. Validações de role `owner|manager` e do handler público
 * `/evaluate` já estão cobertas em `feature-flags.spec.ts`.
 *
 * Por que este spec existe separado:
 *  - Cobertura mínima de RBAC a nível HTTP para defesa contra regressão
 *    caso alguém remova o `@UseGuards(JwtAuthGuard, FeatureFlagAdminGuard)`
 *    do controller ou troque a ordem dos guards.
 *
 * **Setup necessário (CI):**
 *  - `pnpm test:e2e:seed` populou a base com `admin`/`customer`/`manager`.
 *  - API rodando em `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`)
 *    e Next.js em `BASE_URL` (default `http://localhost:3000`).
 *  - Pode ser rodado localmente com `docker-compose -f docker-compose.dev.yml up -d`
 *    + `pnpm test:e2e:seed`.
 */
import { test, expect } from '../shared/fixtures';

test.describe('FeatureFlagsAdminGuard (P0-03) — RBAC HTTP', () => {
  // Limpa cookies ANTES de cada teste para garantir isolamento entre
  // cenários (Playwright pode herdar cookies do `page.context()` se houver
  // testes anteriores que fizeram login). Sem isso, o teste "sem token"
  // poderia passar falsamente — o cookie herdado da sessão anterior faria
  // o `JwtAuthGuard` autenticar a request e o 401 nunca apareceria.
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test(
    'cliente NÃO pode editar feature flags (PATCH retorna 403)',
    { tag: ['@RNF-SEC-FF-01', '@RBAC', '@admin-guard'] },
    async ({ page, seedData }) => {
      // Login via page.request para propagar cookies/Authorization corretamente.
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: {
          email: seedData.customer.email,
          password: seedData.customer.password,
        },
      });
      expect(loginResp.status()).toBeLessThan(400);

      const patchResp = await page.request.patch('/api/v1/admin/feature-flags/pix_enabled', {
        data: { enabled: false },
      });

      expect(patchResp.status()).toBe(403);
    }
  );

  test(
    'cliente NÃO pode criar feature flags (POST retorna 403)',
    { tag: ['@RNF-SEC-FF-01', '@RBAC', '@admin-guard'] },
    async ({ page, seedData }) => {
      // Login via page.request para propagar cookies/Authorization corretamente.
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: {
          email: seedData.customer.email,
          password: seedData.customer.password,
        },
      });
      expect(loginResp.status()).toBeLessThan(400);

      const createResp = await page.request.post('/api/v1/admin/feature-flags', {
        data: {
          key: 'flag_cliente_negada',
          valueType: 'BOOLEAN',
          defaultValue: false,
        },
      });

      expect(createResp.status()).toBe(403);
    }
  );

  test(
    'cliente NÃO pode adicionar override (POST overrides retorna 403)',
    { tag: ['@RNF-SEC-FF-01', '@RBAC', '@admin-guard'] },
    async ({ page, seedData }) => {
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: {
          email: seedData.customer.email,
          password: seedData.customer.password,
        },
      });
      expect(loginResp.status()).toBeLessThan(400);

      const overrideResp = await page.request.post(
        '/api/v1/admin/feature-flags/pix_enabled/overrides',
        { data: { scope: 'GLOBAL', value: false } }
      );

      expect(overrideResp.status()).toBe(403);
    }
  );

  test(
    'cliente NÃO pode deletar override (DELETE retorna 403)',
    { tag: ['@RNF-SEC-FF-01', '@RBAC', '@admin-guard'] },
    async ({ page, seedData }) => {
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: {
          email: seedData.customer.email,
          password: seedData.customer.password,
        },
      });
      expect(loginResp.status()).toBeLessThan(400);

      const deleteResp = await page.request.delete(
        '/api/v1/admin/feature-flags/pix_enabled/overrides/qualquer-id'
      );

      expect(deleteResp.status()).toBe(403);
    }
  );

  test(
    'sem token retorna 401 (qualquer método de mutação)',
    { tag: ['@RNF-SEC-FF-01', '@RBAC', '@admin-guard'] },
    async ({ page }) => {
      // page.request herda contexto sem cookies — equivalente a "sem token".
      const patchResp = await page.request.patch('/api/v1/admin/feature-flags/pix_enabled', {
        data: { enabled: false },
      });
      expect(patchResp.status()).toBe(401);

      const postResp = await page.request.post('/api/v1/admin/feature-flags', {
        data: { key: 'flag_teste', valueType: 'BOOLEAN', defaultValue: false },
      });
      expect(postResp.status()).toBe(401);
    }
  );

  test(
    'cliente recebe 403 em GET (não passa de JwtAuthGuard para FeatureFlagAdminGuard)',
    { tag: ['@RNF-SEC-FF-01', '@RBAC', '@admin-guard'] },
    async ({ page, seedData }) => {
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: {
          email: seedData.customer.email,
          password: seedData.customer.password,
        },
      });
      expect(loginResp.status()).toBeLessThan(400);

      // GET em leitura — cliente deve receber 403 (não 200). Apenas
      // owner/manager passam pela camada RBAC.
      const listResp = await page.request.get('/api/v1/admin/feature-flags?limit=10');
      expect(listResp.status()).toBe(403);

      const detailResp = await page.request.get('/api/v1/admin/feature-flags/pix_enabled');
      expect(detailResp.status()).toBe(403);
    }
  );

  test(
    'manager recebe 403 em mutação mas pode ler (GET 200)',
    { tag: ['@RNF-SEC-FF-01', '@RBAC', '@admin-guard'] },
    async ({ page, seedData }) => {
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: {
          email: seedData.manager.email,
          password: seedData.manager.password,
        },
      });
      expect(loginResp.status()).toBeLessThan(400);

      // Mutação — 403
      const patchResp = await page.request.patch('/api/v1/admin/feature-flags/pix_enabled', {
        data: { enabled: false },
      });
      expect(patchResp.status()).toBe(403);

      // Leitura — 200
      const auditResp = await page.request.get(
        '/api/v1/admin/feature-flags/pix_enabled/audit?limit=10'
      );
      expect(auditResp.status()).toBe(200);
    }
  );
});
