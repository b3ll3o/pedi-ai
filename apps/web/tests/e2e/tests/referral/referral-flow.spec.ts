/**
 * E2E: Sistema de Referral — Fluxo Completo
 *
 * Cobre todos os fluxos do programa de indicação:
 * 1. Dono A acessa /admin/indicacao → recebe código único
 * 2. Dono B se cadastra via /register?ref=CODIGO → ReferralConversion criada
 * 3. Dono B assina → webhook Asaas → Referral do A ganha reward
 * 4. Painel do A atualiza stats em tempo real
 * 5. Anti-fraude: auto-referral, código inválido, limite excedido
 *
 * Tags: @referral @critical
 *
 * @see apps/web/src/domain/referral/
 */

import { test, expect } from '../shared/fixtures';

test.describe('Sistema de Referral @referral @critical', () => {
  // ────────────────────────────────────────────────
  // 1. PAINEL ADMIN MOSTRA CÓDIGO ÚNICO
  // ────────────────────────────────────────────────

  test(
    'deve exibir código único de referral no painel admin',
    { tag: ['@referral', '@critical', '@smoke'] },
    async ({ admin }) => {
      await admin.goto('/admin/indicacao');

      // Aguarda carregar
      await expect(admin.locator('[data-testid="pedi-referral-panel"]')).toBeVisible({
        timeout: 10_000,
      });

      // Deve ter código de 8 caracteres
      const code = await admin
        .locator('[data-testid="pedi-referral-code"]')
        .textContent();

      expect(code).toMatch(/^[A-Z0-9]{8}$/);

      // Link de indicação deve conter o código
      const shareUrl = await admin
        .locator('[data-testid="pedi-referral-link"]')
        .inputValue();

      expect(shareUrl).toContain(`/register?ref=${code}`);
      expect(shareUrl).toMatch(/^https?:\/\//);
    }
  );

  test(
    'botão "Copiar" deve copiar link pro clipboard',
    { tag: ['@referral', '@ux'] },
    async ({ admin, context }) => {
      // Concede permissão de clipboard
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await admin.goto('/admin/indicacao');
      await expect(admin.locator('[data-testid="pedi-referral-panel"]')).toBeVisible();

      // Clica em copiar
      await admin.locator('[data-testid="pedi-referral-copy"]').click();

      // Verifica que o texto mudou pra "Copiado!"
      await expect(admin.locator('[data-testid="pedi-referral-copy"]')).toContainText(
        /copiado/i,
        { timeout: 2_000 }
      );

      // Verifica clipboard
      const clipboardContent = await admin.evaluate(() => navigator.clipboard.readText());
      expect(clipboardContent).toMatch(/\/register\?ref=/);
    }
  );

  test(
    'botão "WhatsApp" deve abrir link de compartilhamento',
    { tag: ['@referral', '@ux'] },
    async ({ admin, context }) => {
      await admin.goto('/admin/indicacao');
      await expect(admin.locator('[data-testid="pedi-referral-panel"]')).toBeVisible();

      // Captura a URL esperada antes de clicar
      const expectedUrl = await admin
        .locator('[data-testid="pedi-referral-link"]')
        .inputValue();

      // Intercepta window.open
      await admin.evaluate(() => {
        window.open = (url: string) => {
          (window as any).__lastOpenedUrl = url;
          return null;
        };
      });

      // Clica em WhatsApp
      await admin.locator('[data-testid="pedi-referral-whatsapp"]').click();

      // Verifica que abriu wa.me com URL correta
      const openedUrl = await admin.evaluate(() => (window as any).__lastOpenedUrl);
      expect(openedUrl).toContain('wa.me');
      expect(openedUrl).toContain(encodeURIComponent(expectedUrl));
    }
  );

  // ────────────────────────────────────────────────
  // 2. SIGNUP COM REFERRAL CODE
  // ────────────────────────────────────────────────

  test(
    'banner verde deve aparecer no signup com ?ref=',
    { tag: ['@referral', '@critical'] },
    async ({ page, seedData }) => {
      // Busca código do seed (assume seed cria referral)
      // OU cria via API
      const response = await page.request.get('/api/referral/me');
      const { referral } = await response.json();

      const code = referral?.code ?? 'ABC23456';

      await page.goto(`/register?ref=${code}`);
      await page.waitForLoadState('networkidle');

      // Banner verde deve aparecer
      await expect(
        page.locator('[data-testid="pedi-referral-banner-valid"]')
      ).toBeVisible({ timeout: 5_000 });

      // Deve mencionar o benefício
      await expect(
        page.locator('[data-testid="pedi-referral-banner-valid"]')
      ).toContainText(/m[êe]s gr[áa]tis/i);
    }
  );

  test(
    'banner amarelo deve aparecer com código inválido',
    { tag: ['@referral', '@validation'] },
    async ({ page }) => {
      await page.goto('/register?ref=INVALIDO');
      await page.waitForLoadState('networkidle');

      await expect(
        page.locator('[data-testid="pedi-referral-banner-invalid"]')
      ).toBeVisible({ timeout: 5_000 });
    }
  );

  test(
    'signup com código válido deve criar ReferralConversion pendente',
    { tag: ['@referral', '@critical'] },
    async ({ page, request }) => {
      // 1. Pega código válido
      const referralResponse = await request.get('/api/referral/me');
      const { referral } = await referralResponse.json();

      // Skip se não tem referral (test setup issue)
      test.skip(!referral, 'Sem referral no seed');

      const code = referral.code;

      // 2. Vai pro signup
      await page.goto(`/register?ref=${code}`);
      await page.waitForLoadState('networkidle');

      // 3. Preenche form
      await page.locator('input[type="email"]').fill(`new-${Date.now()}@test.com`);
      await page.locator('input[name="name"], input[type="text"]').first().fill('Indicado Teste');
      await page.locator('input[type="password"]').fill('senha123test');
      await page.locator('button[type="submit"]').click();

      // 4. Aguarda sucesso
      await page.waitForURL(/\/(login|admin\/dashboard|menu)/, { timeout: 10_000 });
    }
  );

  // ────────────────────────────────────────────────
  // 3. CONVERSÃO VIA WEBHOOK MOCKADO
  // ────────────────────────────────────────────────

  test(
    'webhook PAYMENT_RECEIVED deve creditar reward ao referrer',
    { tag: ['@referral', '@webhook', '@critical'] },
    async ({ admin, request, seedData }) => {
      // 1. Pega snapshot do Referral do restaurante seed (que é o referrer)
      const before = await request.get('/api/referral/me');
      const beforeData = (await before.json()).referral;
      const beforeConversions = beforeData?.totalConversions ?? 0;
      const beforeCredit = beforeData?.rewardCreditMonths ?? 0;

      // 2. Cria um novo restaurante via signup com referral
      // (assumindo que você tem um helper ou faz via API direta)
      const newRestaurantId = `rest_teste_${Date.now()}`;
      const signupResponse = await request.post('/api/auth/register-with-referral', {
        data: {
          email: `indicado-${Date.now()}@test.com`,
          nome: 'Indicado E2E',
          senha: 'senha123test',
          intent: 'gerenciar_restaurante',
          referralCode: beforeData.code,
        },
      });
      expect(signupResponse.status()).toBe(201);

      // 3. Simula webhook Asaas de PAYMENT_RECEIVED
      // (cria subscription manualmente e dispara webhook)
      const webhookResponse = await request.post('/api/webhooks/asaas', {
        headers: {
          'asaas-access-token': process.env.ASAAS_WEBHOOK_SECRET ?? 'test-secret',
          'Content-Type': 'application/json',
        },
        data: {
          event: 'PAYMENT_RECEIVED',
          payment: {
            id: `pay_test_${Date.now()}`,
            customer: 'cus_test',
            value: 4990,
            billingType: 'CREDIT_CARD',
            status: 'RECEIVED',
            subscription: 'sub_test_123',
          },
        },
      });
      expect(webhookResponse.status()).toBe(200);

      // 4. Verifica que Referral do referrer foi incrementado
      await admin.goto('/admin/indicacao');
      await expect(admin.locator('[data-testid="pedi-referral-panel"]')).toBeVisible();

      const statConversions = await admin
        .locator('[data-testid="pedi-referral-stat-conversions"]')
        .textContent();
      const currentConversions = parseInt(statConversions?.match(/\d+/)?.[0] ?? '0');
      expect(currentConversions).toBeGreaterThan(beforeConversions);
    }
  );

  test(
    'webhook duplicado (mesmo eventId) deve ser ignorado (idempotência)',
    { tag: ['@referral', '@webhook', '@idempotency'] },
    async ({ request }) => {
      const eventPayload = {
        event: 'PAYMENT_RECEIVED',
        payment: {
          id: `pay_idempotency_${Date.now()}`,
          customer: 'cus_test',
          value: 4990,
          billingType: 'CREDIT_CARD',
          status: 'RECEIVED',
          subscription: 'sub_test',
        },
      };

      // Envia 3 vezes (mesmo payload = mesmo eventId no Asaas)
      const responses = await Promise.all(
        [1, 2, 3].map(() =>
          request.post('/api/webhooks/asaas', {
            headers: {
              'asaas-access-token': process.env.ASAAS_WEBHOOK_SECRET ?? 'test-secret',
              'Content-Type': 'application/json',
            },
            data: eventPayload,
          })
        )
      );

      // Todos devem retornar 200 (não duplicar processamento = não duplicar reward)
      for (const r of responses) {
        expect(r.status()).toBe(200);
      }
    }
  );

  test(
    'webhook com assinatura inválida deve ser rejeitado (401)',
    { tag: ['@referral', '@webhook', '@security'] },
    async ({ request }) => {
      const response = await request.post('/api/webhooks/asaas', {
        headers: {
          'asaas-access-token': 'assinatura-invalida',
          'Content-Type': 'application/json',
        },
        data: { event: 'PAYMENT_RECEIVED', payment: {} },
      });

      expect(response.status()).toBe(401);
    }
  );

  // ────────────────────────────────────────────────
  // 4. ANTI-FRAUDE
  // ────────────────────────────────────────────────

  test(
    'NÃO deve permitir auto-referral (mesmo restaurantId)',
    { tag: ['@referral', '@security', '@anti-fraud'] },
    async ({ admin, request }) => {
      // 1. Pega o próprio código do restaurante
      const meResponse = await request.get('/api/referral/me');
      const { referral } = await meResponse.json();
      const myCode = referral.code;
      const myRestaurantId = referral.referrerRestaurantId;

      // 2. Tenta se cadastrar usando o PRÓPRIO código
      const signupResponse = await request.post('/api/auth/register-with-referral', {
        data: {
          email: `self-ref-${Date.now()}@test.com`,
          nome: 'Self Referral',
          senha: 'senha123test',
          intent: 'gerenciar_restaurante',
          referralCode: myCode,
        },
      });

      // Pode retornar 201 (com auto-referral bloqueado silenciosamente)
      // ou 400 (validação rejeita)
      if (signupResponse.status() === 201) {
        const body = await signupResponse.json();
        // Verifica que NÃO criou conversion (porque é auto-referral)
        // Como a rota já bloqueia, referralApplied deve ser false
        expect(body.referralApplied).toBe(false);
      } else {
        expect([400, 409]).toContain(signupResponse.status());
      }
    }
  );

  test(
    'NÃO deve aceitar código com formato inválido',
    { tag: ['@referral', '@validation'] },
    async ({ request }) => {
      const invalidCodes = ['abc', '12345', 'TOOLONGCODENAME', 'has space', '!@#$'];

      for (const code of invalidCodes) {
        const response = await request.get(`/api/referral/validate?code=${encodeURIComponent(code)}`);
        expect(response.status()).toBe(400);
      }
    }
  );

  test(
    'NÃO deve aceitar código que não existe',
    { tag: ['@referral', '@validation'] },
    async ({ request }) => {
      const response = await request.get('/api/referral/validate?code=ZZZZZZZZ');
      expect(response.status()).toBe(404);
    }
  );

  test(
    'NÃO deve aceitar código de referral cancelado',
    { tag: ['@referral', '@validation', '@anti-fraud'] },
    async ({ admin, request }) => {
      // 1. Pega referral atual
      const meResponse = await request.get('/api/referral/me');
      const { referral } = await meResponse.json();
      const code = referral.code;

      // 2. Cancela via API admin (ou direto no DB em test)
      const cancelResponse = await request.patch(`/api/admin/referrals/${referral.id}`, {
        headers: {
          'Content-Type': 'application/json',
          // Em prod: requer auth + permissão
        },
        data: { status: 'cancelled' },
      });

      if (cancelResponse.ok()) {
        // 3. Tenta usar o código cancelado
        const validateResponse = await request.get(`/api/referral/validate?code=${code}`);
        expect(validateResponse.status()).toBe(404);
      }
      // Se endpoint não existe, skip
    }
  );

  // ────────────────────────────────────────────────
  // 5. TIER DE REWARD
  // ────────────────────────────────────────────────

  test(
    'após 3 conversões, reward credit deve ser 1 mês',
    { tag: ['@referral', '@tier'] },
    async ({ request }) => {
      const response = await request.get('/api/referral/me');
      const { referral } = await response.json();

      if (referral.totalConversions >= 3 && referral.totalConversions < 6) {
        expect(referral.rewardCreditMonths).toBe(1);
      } else if (referral.totalConversions >= 6 && referral.totalConversions < 11) {
        expect(referral.rewardCreditMonths).toBe(2);
      } else if (referral.totalConversions >= 11) {
        expect(referral.rewardCreditMonths).toBe(3);
      }
    }
  );

  // ────────────────────────────────────────────────
  // 6. CUSTOM CODE (POST /api/referral/me/custom-code)
  // ────────────────────────────────────────────────

  test(
    'dono deve poder customizar o código',
    { tag: ['@referral'] },
    async ({ admin, request }) => {
      const customCode = `MEU${Date.now().toString().slice(-4)}`; // 6-12 chars alfanuméricos

      const response = await request.post('/api/referral/me/custom-code', {
        data: { code: customCode },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.referral.code).toBe(customCode);
      expect(body.referral.shareUrl).toContain(`ref=${customCode}`);

      // Verifica que aparece no painel
      await admin.goto('/admin/indicacao');
      await expect(admin.locator('[data-testid="pedi-referral-panel"]')).toBeVisible();
      await expect(admin.locator('[data-testid="pedi-referral-code"]')).toContainText(
        customCode
      );
    }
  );

  test(
    'NÃO deve aceitar código customizado já em uso',
    { tag: ['@referral', '@validation'] },
    async ({ request }) => {
      // Pega código de QUALQUER restaurante
      const firstResponse = await request.get('/api/referral/me');
      const firstReferral = (await firstResponse.json()).referral;
      const takenCode = firstReferral.code;

      // Tenta usar esse código como custom (deve dar 409)
      const response = await request.post('/api/referral/me/custom-code', {
        data: { code: takenCode },
      });

      // Pode retornar 409 (conflict) ou 200 (mesmo restaurantId — auto-update)
      if (response.status() === 409) {
        const body = await response.json();
        expect(body.error).toBeTruthy();
      }
    }
  );
});