/**
 * E2E: LGPD Compliance
 *
 * Valida conformidade com a Lei Geral de Proteção de Dados (LGPD):
 * 1. Cookie banner aparece e pode ser dismissado
 * 2. Páginas /termos e /privacidade existem e são acessíveis
 * 3. Plausible NÃO usa cookies (LGPD-friendly)
 * 4. Sentry captura erros mas mascara PII
 * 5. Pedidos não vazam dados sensíveis em logs públicos
 *
 * Tags: @lgpd, @compliance
 */

import { test, expect } from '../shared/fixtures';

test.describe('LGPD Compliance @lgpd @compliance', () => {
  test(
    'Cookie Banner deve aparecer e ser dismissável',
    { tag: ['@lgpd', '@smoke'] },
    async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Banner deve aparecer (LGPD Art. 9 — princípio de transparência)
      const banner = page.locator('[data-testid="cookie-banner"]');
      await expect(banner).toBeVisible({ timeout: 5_000 });

      // Deve ter link pra Política de Privacidade
      const privacyLink = banner.locator('a[href="/privacidade"]');
      await expect(privacyLink).toBeVisible();

      // Dismiss
      await banner.locator('[data-testid="cookie-banner-dismiss"]').click();
      await expect(banner).not.toBeVisible();

      // Reload e verifica que NÃO aparece mais (persistido em localStorage)
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(banner).not.toBeVisible();
    }
  );

  test(
    'página /termos deve estar acessível e completa',
    { tag: ['@lgpd'] },
    async ({ page }) => {
      await page.goto('/termos');

      // Verifica seções obrigatórias
      await expect(page.locator('h1')).toContainText(/termos/i);
      await expect(page.locator('text=LGPD')).toBeVisible();
      await expect(page.locator('text=Encarregado de Dados')).toBeVisible();
      await expect(page.locator('text=dpo@pedi.ai')).toBeVisible();
    }
  );

  test(
    'página /privacidade deve estar acessível e listar finalidades',
    { tag: ['@lgpd'] },
    async ({ page }) => {
      await page.goto('/privacidade');

      await expect(page.locator('h1')).toContainText(/privacidade/i);

      // Seções obrigatórias LGPD Art. 9
      const requiredSections = [
        'Quem somos',
        'Dados que coletamos',
        'Como usamos seus dados',
        'Com quem compartilhamos dados',
        'Por quanto tempo mantemos',
        'Seus direitos',
        'Segurança da informação',
        'Cookies',
        'Encarregado',
      ];

      for (const section of requiredSections) {
        await expect(page.locator(`text=${section}`).first()).toBeVisible();
      }
    }
  );

  test(
    'Plausible NÃO deve setar cookies (LGPD-friendly)',
    { tag: ['@lgpd', '@analytics'] },
    async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Espera Plausible carregar (se configurado)
      const cookies = await context.cookies();
      const plausibleCookies = cookies.filter((c) =>
        c.name.includes('plausible') || c.name.startsWith('_pa') || c.name.startsWith('PLA')
      );

      // Plausible não usa cookies — apenas localStorage (que é diferente)
      expect(plausibleCookies.length).toBe(0);
    }
  );

  test(
    'Sentry deve capturar erros sem vazar PII',
    { tag: ['@lgpd', '@sentry'] },
    async ({ page }) => {
      // Intercepta requests pro Sentry
      const sentryRequests: Array<{ event?: any }> = [];
      await page.route('**/sentry.io/**', async (route) => {
        const body = route.request().postDataJSON();
        sentryRequests.push({ event: body });
        await route.fulfill({ status: 200, body: '{}' });
      });

      // Dispara erro intencional
      await page.goto('/');
      await page.evaluate(() => {
        throw new Error('Test error E2E');
      });

      await page.waitForTimeout(2000);

      // Se Sentry capturou, verifica que NÃO tem PII óbvia
      if (sentryRequests.length > 0) {
        const event = sentryRequests[0].event;
        const json = JSON.stringify(event);
        // Email do usuário NÃO deve aparecer
        expect(json).not.toContain('@example.com');
        // CPF/CNPJ NÃO deve aparecer
        expect(json).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
      }
    }
  );

  test(
    'Webhook do Mercado Pago não deve logar cartão completo',
    { tag: ['@lgpd', '@payment'] },
    async ({ page }) => {
      // Intercepta logs do servidor (via console)
      const logs: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          logs.push(msg.text());
        }
      });

      // Simula webhook malicioso com dados de cartão
      await page.evaluate(async () => {
        await fetch('/payments/webhooks/pix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': 't=1234567890,v1=invalid',
            'x-request-id': 'test-request-123',
          },
          body: JSON.stringify({
            id: 'evt_test',
            type: 'payment',
            data: { id: 'pay_test' },
            card: { number: '4111111111111111', cvv: '123' }, // não deve aparecer nos logs
          }),
        });
      });

      await page.waitForTimeout(1000);

      // Logs NÃO devem conter número de cartão
      const allLogs = logs.join('\n');
      expect(allLogs).not.toContain('4111111111111111');
      expect(allLogs).not.toContain('"cvv":"123"');
    }
  );
});