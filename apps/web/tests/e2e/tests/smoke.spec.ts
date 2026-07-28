/**
 * E2E: Smoke Tests Críticos
 *
 * Conjunto de testes rápidos que validam que o sistema está funcionando
 * end-to-end. Roda em < 2 min e cobre os fluxos mais importantes.
 *
 * Ideal para:
 * - CI/CD pipeline (deploy gate)
 * - Smoke test pós-deploy em produção
 * - Validação rápida após mudanças grandes
 *
 * Tags: @critical, @smoke
 */

// Import relativo: smoke.spec.ts está em tests/e2e/tests/, e
// shared/fixtures está em tests/e2e/tests/shared/fixtures/. Caminho
// correto é './shared/fixtures' (mesma pasta), não '../shared/fixtures'.
import { test, expect } from './shared/fixtures';

test.describe('Smoke Tests @critical @smoke', () => {
  test(
    'landing page deve carregar e ter CTA principal',
    { tag: ['@critical', '@smoke'] },
    async ({ page }) => {
      await page.goto('/');
      // Brand também aparece no Navbar/footer além de <title>
      await expect(page.getByText(/PediAI|pedi-ai/i).first()).toBeVisible();
      await expect(page.locator('a[href="/register"]').first()).toBeVisible();
    }
  );

  test('página de cadastro deve carregar formulário', { tag: ['@smoke'] }, async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('página de login deve carregar formulário', { tag: ['@smoke'] }, async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
  });

  test('página /termos deve estar acessível', { tag: ['@smoke', '@lgpd'] }, async ({ page }) => {
    const response = await page.goto('/termos');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /termos de uso/i })).toBeVisible();
  });

  test(
    'página /privacidade deve estar acessível',
    { tag: ['@smoke', '@lgpd'] },
    async ({ page }) => {
      const response = await page.goto('/privacidade');
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: /política de privacidade/i })).toBeVisible();
    }
  );

  test('API health check deve responder', { tag: ['@smoke', '@infra'] }, async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test(
    'API REST deve responder com headers CORS corretos',
    { tag: ['@smoke', '@security'] },
    async ({ request }) => {
      const response = await request.get('/api/health', {
        headers: { Origin: 'http://localhost:3000' },
      });
      expect(response.status()).toBe(200);
      expect(response.headers()['access-control-allow-origin']).toBeTruthy();
    }
  );
});

// Os testes abaixo dependem do seed E2E (pnpm test:e2e:seed). Sem o
// banco preparado, os fixtures `authenticated`/`admin` falham ao logar
// (timeout 45s esperando redirect que nunca acontece porque usuário não
// existe). Em CI, o job de E2E roda o seed antes. Local sem seed,
// defina `E2E_HAS_SEED=1` ou rode o seed antes.
//
// `test.skip()` num `test.beforeAll` é checado ANTES da resolução de
// fixtures, evitando que o worker gaste ~90s em tentativas inúteis de
// login quando o seed não está presente. `test.skip()` no corpo do
// teste roda DEPOIS dos fixtures, então não evitaria o custo.
test.describe('Smoke Tests (requer seed E2E)', () => {
  test.beforeAll(() => {
    // `process.env.E2E_HAS_SEED` é string — `!"0"` é `false` (string não-vazia
    // é truthy em JS). Comparar com `'1'` evita o falso negativo quando o
    // usuário seta `E2E_HAS_SEED=0` esperando "skip".
    test.skip(
      process.env.E2E_HAS_SEED !== '1',
      'Requer pnpm test:e2e:seed no banco antes de rodar'
    );
  });

  test(
    'cardápio público deve listar produtos do seed',
    { tag: ['@smoke', '@critical'] },
    async ({ authenticated }) => {
      await authenticated.goto('/menu');
      await expect(authenticated.locator('[data-testid="page-title"]')).toBeVisible();
    }
  );

  test(
    'admin dashboard deve carregar após login',
    { tag: ['@smoke', '@critical'] },
    async ({ admin }) => {
      await admin.goto('/admin/dashboard');
      await expect(admin.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    }
  );
});
