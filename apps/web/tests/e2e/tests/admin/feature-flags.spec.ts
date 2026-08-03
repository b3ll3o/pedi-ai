/**
 * E2E — Feature Flags Runtime
 * Cobertura: RF-ADM-FF-10 (UI Painel) + propagação via SDK cliente (RF-ADM-FF-08).
 * @see .openspec/changes/feature-flags-runtime/design.md §9
 *
 * Convenções:
 *  - Helpers compartilhados em `tests/shared/fixtures` (admin, api, seedData).
 *  - Helpers específicos deste spec em `tests/shared/helpers/feature-flags.ts`.
 *  - Tag @smoke para cenário crítico de toggle + propagação.
 */
import { test, expect } from '../shared/fixtures';
import { evaluateFeatureFlags, type FeatureFlagSnapshot } from '../shared/helpers/feature-flags';

test.describe('Feature Flags — Painel Admin (RF-ADM-FF-10)', () => {
  test.afterEach(async ({ page }) => {
    try {
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch {
      /* cleanup tolerante */
    }
  });

  test(
    'admin owner acessa /admin/feature-flags e vê lista com 8 flags',
    { tag: ['@smoke', '@RF-ADM-FF-10', '@RF-ADM-FF-01'] },
    async ({ page, seedData }) => {
      // Login via API para ganhar JWT rápido
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: { email: seedData.admin.email, password: seedData.admin.password },
      });
      expect(loginResp.status()).toBeLessThan(400);

      await page.goto('/admin/feature-flags', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/admin\/feature-flags/);

      // Tabela presente com 8 linhas (8 flags seedadas)
      const rows = page.locator('[data-testid="feature-flag-row"]');
      await expect(rows).toHaveCount(8);

      // Cada linha deve ter key, descrição, valueType e toggle
      await expect(rows.first().locator('[data-testid="flag-key"]')).toBeVisible();
      await expect(rows.first().locator('[data-testid="flag-toggle"]')).toBeVisible();
    }
  );

  test(
    'toggle de flag global reflete em /evaluate em ≤ 30s (RF-ADM-FF-04 + propagação RF-ADM-FF-10)',
    { tag: ['@smoke', '@critical', '@RF-ADM-FF-04', '@RF-ADM-FF-08', '@RF-ADM-FF-10'] },
    async ({ page, seedData }) => {
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: { email: seedData.admin.email, password: seedData.admin.password },
      });
      expect(loginResp.status()).toBeLessThan(400);

      // 1. Garantir estado inicial: pix_enabled = true
      await page.goto('/admin/feature-flags', { waitUntil: 'domcontentloaded' });
      const pixRow = page.locator('[data-testid="feature-flag-row"][data-key="pix_enabled"]');
      await expect(pixRow).toBeVisible();

      // Estado inicial via evaluate direto (sem UI para evitar timing)
      const before = await evaluateFeatureFlags(page, ['pix_enabled']);
      expect(before.pix_enabled).toBe(true);

      // 2. Toggle off via UI
      const toggle = pixRow.locator('[data-testid="flag-toggle"]');
      await toggle.click();
      await page.locator('[data-testid="toast-success"]').waitFor({ state: 'visible' });

      // 3. Aguardar propagação (≤30s) via polling no /evaluate
      const deadline = Date.now() + 30_000;
      let snapshot: FeatureFlagSnapshot = before;
      while (Date.now() < deadline) {
        snapshot = await evaluateFeatureFlags(page, ['pix_enabled']);
        if (snapshot.pix_enabled === false) break;
        await page.waitForTimeout(1_000);
      }
      expect(snapshot.pix_enabled).toBe(false);
    }
  );

  test(
    'adicionar override por restaurante altera comportamento só naquele restaurante',
    { tag: ['@RF-ADM-FF-05', '@RF-ADM-FF-08'] },
    async ({ page, seedData }) => {
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: { email: seedData.admin.email, password: seedData.admin.password },
      });
      expect(loginResp.status()).toBeLessThan(400);

      // Estado base: combos_enabled = true para todos
      const before = await evaluateFeatureFlags(page, ['combos_enabled']);
      expect(before.combos_enabled).toBe(true);

      // Criar override RESTAURANT para o restaurante do seed
      const createResp = await page.request.post(
        `/api/v1/admin/feature-flags/combos_enabled/overrides`,
        {
          data: { scope: 'RESTAURANT', scopeId: seedData.restaurant.id, value: false },
        }
      );
      expect(createResp.status()).toBe(201);

      // Esperar propagação
      await page.waitForTimeout(2_000);

      const after = await evaluateFeatureFlags(page, ['combos_enabled'], {
        restaurantId: seedData.restaurant.id,
      });
      expect(after.combos_enabled).toBe(false);

      // Restaurar estado (cleanup)
      const overrideId = (await createResp.json()).id as string;
      await page.request.delete(
        `/api/v1/admin/feature-flags/combos_enabled/overrides/${overrideId}`
      );
    }
  );

  test(
    'rollout 50% em 100 usuários distintos distribui entre 40 e 60 true',
    { tag: ['@RF-ADM-FF-05', '@RF-ADM-FF-08', '@estatistico'] },
    async ({ page, seedData }) => {
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: { email: seedData.admin.email, password: seedData.admin.password },
      });
      expect(loginResp.status()).toBeLessThan(400);

      // Override GLOBAL com rolloutPct=50
      const createResp = await page.request.post(
        '/api/v1/admin/feature-flags/analytics_enabled/overrides',
        {
          data: { scope: 'GLOBAL', value: true, rolloutPct: 50 },
        }
      );
      expect(createResp.status()).toBe(201);

      let trueCount = 0;
      const total = 100;
      for (let i = 0; i < total; i++) {
        const userId = `user_e2e_${String(i).padStart(3, '0')}`;
        const snapshot = await evaluateFeatureFlags(page, ['analytics_enabled'], { userId });
        if (snapshot.analytics_enabled === true) trueCount++;
      }

      // Cleanup do override
      const overrideId = (await createResp.json()).id as string;
      await page.request.delete(
        `/api/v1/admin/feature-flags/analytics_enabled/overrides/${overrideId}`
      );

      // Faixa aceitável para p=0.5, n=100 com 95% de confiança: 40-60
      expect(trueCount).toBeGreaterThanOrEqual(40);
      expect(trueCount).toBeLessThanOrEqual(60);
    }
  );

  test(
    'manager recebe 403 ao tentar criar flag (RBAC visual + backend)',
    { tag: ['@RNF-SEC-FF-01', '@RF-ADM-FF-03'] },
    async ({ page, seedData }) => {
      // Login como manager real (papel 'gerente') — valida caminho específico
      // "manager mas mutation → 403" do FeatureFlagAdminGuard
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: { email: seedData.manager.email, password: seedData.manager.password },
      });
      expect(loginResp.status()).toBeLessThan(400);

      // Tenta criar flag — espera 403
      const createResp = await page.request.post('/api/v1/admin/feature-flags', {
        data: { key: 'flag_teste_negada', valueType: 'BOOLEAN', defaultValue: false },
      });
      expect(createResp.status()).toBe(403);

      // Tenta PATCH — espera 403
      const patchResp = await page.request.patch('/api/v1/admin/feature-flags/pix_enabled', {
        data: { enabled: false },
      });
      expect(patchResp.status()).toBe(403);

      // Tenta adicionar override — espera 403
      const overrideResp = await page.request.post(
        '/api/v1/admin/feature-flags/pix_enabled/overrides',
        { data: { scope: 'GLOBAL', value: false } }
      );
      expect(overrideResp.status()).toBe(403);

      // Mas pode LER (audit)
      const auditResp = await page.request.get(
        '/api/v1/admin/feature-flags/pix_enabled/audit?limit=10'
      );
      expect(auditResp.status()).toBe(200);

      // Tenta acessar a página — botão "+ Nova" deve estar desabilitado
      await page.goto('/admin/feature-flags', { waitUntil: 'domcontentloaded' });
      const createBtn = page.locator('[data-testid="btn-criar-flag"]');
      if (await createBtn.count()) {
        await expect(createBtn).toBeDisabled();
        await expect(createBtn).toHaveAttribute('title', /apenas owner/i);
      }
    }
  );

  test(
    'audit log registra quem/quando/antes/depois em mutação (RF-ADM-FF-09)',
    { tag: ['@RF-ADM-FF-09', '@auditoria'] },
    async ({ page, seedData }) => {
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: { email: seedData.admin.email, password: seedData.admin.password },
      });
      expect(loginResp.status()).toBeLessThan(400);

      // 1. Capturar estado atual do audit log
      const beforeResp = await page.request.get(
        '/api/v1/admin/feature-flags/pix_enabled/audit?limit=50'
      );
      expect(beforeResp.status()).toBe(200);
      const beforeCount = (await beforeResp.json()).data.length;

      // 2. Fazer uma mutação (toggle)
      const patchResp = await page.request.patch('/api/v1/admin/feature-flags/pix_enabled', {
        data: { enabled: true },
      });
      expect(patchResp.status()).toBeLessThan(300);

      // 3. Verificar nova entrada no audit
      const afterResp = await page.request.get(
        '/api/v1/admin/feature-flags/pix_enabled/audit?limit=50'
      );
      expect(afterResp.status()).toBe(200);
      const afterJson = await afterResp.json();
      expect(afterJson.data.length).toBeGreaterThan(beforeCount);

      const lastEntry = afterJson.data[0];
      expect(lastEntry.action).toMatch(/UPDATE|TOGGLE/);
      expect(lastEntry.actorId).toBe(seedData.admin.id);
      expect(lastEntry.before).toBeDefined();
      expect(lastEntry.after).toBeDefined();
      expect(new Date(lastEntry.createdAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
    }
  );

  test(
    'cliente cardápio reflete toggle global via SDK (polling 30s)',
    { tag: ['@RF-ADM-FF-08', '@RF-ADM-FF-10'] },
    async ({ page, seedData, guest }) => {
      // Setup: garantir flag ligada
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: { email: seedData.admin.email, password: seedData.admin.password },
      });
      expect(loginResp.status()).toBeLessThan(400);
      await page.request.patch('/api/v1/admin/feature-flags/waiter_mode_enabled', {
        data: { enabled: true },
      });

      // Abrir cardápio como guest
      await guest.goto('/menu', { waitUntil: 'domcontentloaded' });
      const waitBefore = Date.now();

      // Toggle off no admin
      await page.request.patch('/api/v1/admin/feature-flags/waiter_mode_enabled', {
        data: { enabled: false },
      });

      // Esperar até 35s para o cardápio refletir (polling 30s + margem)
      const buttonSel = '[data-testid="waiter-button"], [data-testid="btn-chamar-garcom"]';
      await expect(guest.locator(buttonSel)).toBeHidden({ timeout: 35_000 });
      expect(Date.now() - waitBefore).toBeLessThan(40_000);
    }
  );

  /**
   * Issue #79 — telemetry E2E.
   *
   * Valida que o caminho `/evaluate → /metrics` está vivo:
   *   1. GET /evaluate responde 200 e devolve mapa de flags.
   *   2. GET /metrics responde 200 com `text/plain; version=0.0.4` (Prometheus).
   *   3. Algum contador OTel (ex.: http_server_requests_total) incrementa
   *      após a request — evidência de que o pipeline `/metrics` está saudável.
   *
   * Observação: a integração canônica `feature_flag_evaluations_total`
   * exposta via OTel ainda não está conectada ao MeterProvider global
   * (vide design.md §6.1 / F5). Hoje a contagem é mantida em memória pela
   * classe `FeatureFlagMetrics` e validada por teste unitário em
   * `apps/api/src/.../telemetry/telemetry.spec.ts`. Quando o exporter for
   * conectado, este teste deve ser estendido para fazer scrape da métrica
   * específica (`feature_flag_evaluations_total{flag_key, scope, hit}`).
   */
  test(
    'telemetria: /evaluate e /metrics respondem — pipeline Prometheus saudável',
    { tag: ['@RF-ADM-FF-08', '@observability', '@issue-79'] },
    async ({ page, seedData }) => {
      // Autentica para garantir contexto (algumas métricas podem depender de usuário).
      const loginResp = await page.request.post('/api/v1/auth/login', {
        data: { email: seedData.admin.email, password: seedData.admin.password },
      });
      expect(loginResp.status()).toBeLessThan(400);

      // 1) Scrape inicial — baseline dos contadores OTel.
      const before = await page.request.get('/metrics');
      expect(before.ok()).toBeTruthy();
      expect(before.headers()['content-type']).toMatch(/text\/plain/);
      const beforeBody = await before.text();

      // Extrai um contador OTel estável para comparação (http_server_requests_total).
      const matchHttp =
        /http_server_requests_total\{[^}]*\}\s+(\d+)/.exec(beforeBody) ??
        /pedi_orders_created_total\{[^}]*\}\s+(\d+)/.exec(beforeBody);
      const beforeCount = matchHttp ? Number(matchHttp[1]) : 0;

      // 2) Dispara avaliação — deve incrementar contador HTTP server-side.
      const evalResp = await evaluateFeatureFlags(page, ['offline_enabled']);
      expect(evalResp).toHaveProperty('offline_enabled');

      // 3) Scrape final — contador HTTP deve ter crescido (>= 1 increment por
      //    request) E a métrica canônica `feature_flag_evaluations_total` deve
      //    ter sido emitida quando a integração OTel estiver conectada.
      const after = await page.request.get('/metrics');
      expect(after.ok()).toBeTruthy();
      const afterBody = await after.text();

      // 3a) Contador HTTP subiu — evidência de que /metrics está vivo.
      const matchHttpAfter =
        /http_server_requests_total\{[^}]*\}\s+(\d+)/.exec(afterBody) ??
        /pedi_orders_created_total\{[^}]*\}\s+(\d+)/.exec(afterBody);
      const afterCount = matchHttpAfter ? Number(matchHttpAfter[1]) : 0;
      expect(afterCount).toBeGreaterThan(beforeCount);

      // 3b) Verifica presença do HELP Prometheus (formato válido) — sem isso
      //     o collector do backend não consegue parsear nada.
      expect(afterBody).toMatch(/# HELP \w+/);
      expect(afterBody).toMatch(/# TYPE \w+ counter/);
    }
  );

  /**
   * Issue #79 — stub para invalidação de cache entre clientes (cross-client).
   *
   * Aguarda decisão de produto sobre política de propagação:
   *   - Consistência eventual via TTL (atual: polling 30s no front).
   *   - Invalidação imediata via pub/sub (alternativa em avaliação).
   *
   * Quando decidido, este teste deve ser ativado (`test.skip` → `test`)
   * e implementar:
   *   - Cliente A lê uma flag (snapshot capturado).
   *   - Admin altera a flag (toggle/override) via API autenticada.
   *   - Cliente B (sessão independente, sem cache local) lê a mesma flag.
   *   - Validar que a mudança refletiu em ≤30s (TTL) ou imediatamente (pub/sub).
   *
   * Tracking: https://github.com/b3ll3o/pedi-ai/issues/79
   */
  test.skip(
    'cross-client: override aplicado propaga entre clientes A e B em ≤30s',
    { tag: ['@RF-ADM-FF-08', '@issue-79-stub'] },
    async () => {
      // Stub — aguardando decisão de produto (consistência eventual vs.
      // invalidação imediata via pub/sub). Quando ativado, implementar
      // o cenário acima usando dois contextos Playwright distintos.
    }
  );
});
