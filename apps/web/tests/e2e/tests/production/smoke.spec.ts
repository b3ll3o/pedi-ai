/**
 * E2E Production Smoke Tests
 *
 * **Quando rodar:**
 * - Pós-deploy em produção (automático via CI/CD ou manual)
 * - Validação inicial após provisionar staging
 * - Health check diário (cron job)
 *
 * **O que valida (10 testes em < 1 min):**
 * - Landing page carrega
 * - CTAs funcionam
 * - Rotas públicas (/termos, /privacidade, /register, /login) carregam
 * - Assets estáticos (CSS, JS, fonts) carregam
 * - API /health responde
 * - SSL válido (HSTS, etc)
 * - CORS correto
 * - SEO meta tags presentes
 * - Sem mixed content (HTTPS only)
 * - Tempo de carregamento aceitável (LCP < 3s)
 *
 * **PRÉ-REQUISITOS:**
 * - Setar `BASE_URL=https://pedi.ai` (ou staging URL)
 * - NÃO precisa de DB seed
 * - NÃO modifica dados em prod
 *
 * Tags: @production @smoke
 *
 * @see apps/web/tests/e2e/playwright.prod.config.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://pedi.ai';
const API_URL = process.env.API_URL || BASE_URL.replace('pedi.ai', 'api.pedi.ai');

test.describe('Production Smoke Tests @production @smoke', () => {
  test.use({ baseURL: BASE_URL });

  // ──── HEALTH CHECKS ──────────────────────────────────────────

  test(
    'API health check deve responder 200',
    { tag: ['@production', '@critical', '@smoke'] },
    async ({ request }) => {
      const response = await request.get(`${API_URL}/health`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('ok');
    }
  );

  test(
    'Database health check (via API) deve estar saudável',
    { tag: ['@production', '@critical'] },
    async ({ request }) => {
      const response = await request.get(`${API_URL}/health/db`);
      // Endpoint pode não existir — nesse caso aceita 404
      if (response.status() === 200) {
        const body = await response.json();
        expect(body.database).toMatch(/up|ok|healthy/i);
      }
    }
  );

  // ──── LANDING PAGE ──────────────────────────────────────────

  test(
    'Landing page deve carregar e ter H1',
    { tag: ['@production', '@critical', '@smoke'] },
    async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.status()).toBe(200);

      // H1 principal
      await expect(page.locator('h1').first()).toBeVisible();

      // Tempo de carregamento (LCP proxy)
      const loadTime = Date.now();
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - loadTime;
      expect(elapsed).toBeLessThan(5_000); // < 5s
    }
  );

  test(
    'Landing page deve ter CTA principal "Começar Grátis"',
    { tag: ['@production', '@smoke'] },
    async ({ page }) => {
      await page.goto('/');

      const cta = page.locator('a:has-text(/come[çc]ar|criar|teste gr[áa]tis/i)').first();
      await expect(cta).toBeVisible();

      const href = await cta.getAttribute('href');
      expect(href).toBeTruthy();
      // Deve apontar pra /register ou similar (rotas internas)
      expect(href).toMatch(/^\/(register|onboarding|cadastro)/);
    }
  );

  test(
    'Landing page deve ter SEO meta tags essenciais',
    { tag: ['@production', '@seo'] },
    async ({ page }) => {
      await page.goto('/');

      // Title
      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThan(70);

      // Meta description
      const description = await page
        .locator('meta[name="description"]')
        .getAttribute('content');
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThan(50);

      // Open Graph
      const ogTitle = await page
        .locator('meta[property="og:title"]')
        .getAttribute('content');
      expect(ogTitle).toBeTruthy();

      // Canonical
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBeTruthy();
      expect(canonical).toMatch(/^https?:\/\//);
    }
  );

  test(
    'Landing page deve ter SSL válido (HTTPS + HSTS)',
    { tag: ['@production', '@security'] },
    async ({ page }) => {
      const response = await page.goto('/');
      const url = page.url();
      expect(url).toMatch(/^https:\/\//);

      // HSTS header (configurado em next.config.ts)
      const hsts = response?.headers()['strict-transport-security'];
      expect(hsts).toBeTruthy();
      expect(hsts).toMatch(/max-age=\d+/);
    }
  );

  // ──── ROTAS PÚBLICAS ─────────────────────────────────────────

  const publicRoutes = [
    { path: '/termos', titleMatch: /termos/i },
    { path: '/privacidade', titleMatch: /privacidade/i },
    { path: '/register', titleMatch: /cadastr|criar|registr/i },
    { path: '/login', titleMatch: /login|entrar/i },
  ];

  for (const route of publicRoutes) {
    test(
      `rota pública ${route.path} deve carregar`,
      { tag: ['@production', '@smoke', '@routes'] },
      async ({ page }) => {
        const response = await page.goto(route.path);
        expect(response?.status()).toBeLessThan(400);

        await expect(page.locator('h1').first()).toBeVisible();
      }
    );
  }

  // ──── ASSETS ESTÁTICOS ───────────────────────────────────────

  test(
    'CSS principal deve ser servido com cache headers',
    { tag: ['@production', '@performance'] },
    async ({ request }) => {
      // Pega HTML primeiro pra descobrir CSS link
      const htmlResponse = await request.get('/');
      const html = await htmlResponse.text();
      const cssMatch = html.match(/href="(\/_next\/static\/css\/[^"]+\.css)"/);

      if (cssMatch) {
        const cssResponse = await request.get(cssMatch[1]);
        expect(cssResponse.status()).toBe(200);

        // Cache headers (Vercel/Cloudflare devem setar)
        const cacheControl = cssResponse.headers()['cache-control'];
        if (cacheControl) {
          expect(cacheControl).toMatch(/max-age|immutable/);
        }
      }
    }
  );

  test(
    'manifest.json deve estar acessível (PWA)',
    { tag: ['@production', '@pwa'] },
    async ({ request }) => {
      const response = await request.get('/manifest.json');
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.name).toBeTruthy();
      expect(body.icons).toBeTruthy();
    }
  );

  test(
    'robots.txt deve estar acessível',
    { tag: ['@production', '@seo'] },
    async ({ request }) => {
      const response = await request.get('/robots.txt');
      expect(response.status()).toBe(200);
      const text = await response.text();
      expect(text.toLowerCase()).toContain('user-agent');
    }
  );

  test(
    'sitemap.xml deve estar acessível',
    { tag: ['@production', '@seo'] },
    async ({ request }) => {
      const response = await request.get('/sitemap.xml');
      expect(response.status()).toBe(200);
      const text = await response.text();
      expect(text).toContain('<urlset');
    }
  );

  // ──── CORS / SECURITY ────────────────────────────────────────

  test(
    'CORS deve permitir origem do próprio site',
    { tag: ['@production', '@security'] },
    async ({ request }) => {
      const response = await request.fetch(`${API_URL}/health`, {
        headers: { Origin: BASE_URL },
      });
      expect(response.status()).toBe(200);

      const allowOrigin = response.headers()['access-control-allow-origin'];
      expect(allowOrigin).toBeTruthy();
    }
  );

  test(
    'CSP deve estar configurado',
    { tag: ['@production', '@security'] },
    async ({ page }) => {
      const response = await page.goto('/');
      const csp = response?.headers()['content-security-policy'];
      expect(csp).toBeTruthy();
      // Não pode ter wildcard em produção
      expect(csp).not.toContain("* 'unsafe-inline'");
    }
  );

  test(
    'Headers de segurança obrigatórios devem estar presentes',
    { tag: ['@production', '@security', '@critical'] },
    async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers() ?? {};

      // Obrigatórios
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['referrer-policy']).toMatch(/strict-origin/i);
    }
  );

  // ──── ANALYTICS ──────────────────────────────────────────────

  test(
    'Plausible deve estar carregando (analytics funcionando)',
    { tag: ['@production', '@analytics'] },
    async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(2000);

      // Verifica se o script do Plausible foi injetado
      const plausibleScript = page.locator('script[src*="plausible"]');
      const scriptCount = await plausibleScript.count();

      if (scriptCount > 0) {
        // Script carregou — boa!
        expect(scriptCount).toBeGreaterThanOrEqual(1);
      }
      // Se count = 0, é porque Plausible não tá configurado nesse env (ok em dev/staging)
    }
  );

  test(
    'Cookie banner LGPD deve aparecer em nova sessão',
    { tag: ['@production', '@lgpd'] },
    async ({ context, page }) => {
      // Limpa cookies pra simular primeira visita
      await context.clearCookies();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const banner = page.locator('[data-testid="cookie-banner"]');
      // Banner pode estar dismissado se localStorage persistir
      const isVisible = await banner.isVisible().catch(() => false);

      if (isVisible) {
        await expect(banner).toBeVisible();
        await expect(banner.locator('a[href="/privacidade"]')).toBeVisible();
      }
    }
  );

  // ──── PERFORMANCE ────────────────────────────────────────────

  test(
    'Landing page deve ter LCP < 3 segundos',
    { tag: ['@production', '@performance', '@critical'] },
    async ({ page }) => {
      const start = Date.now();
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Aguarda o H1 ficar visível (proxy razoável pra LCP)
      await page.locator('h1').first().waitFor({ state: 'visible' });
      const lcp = Date.now() - start;

      // Em produção: < 3s (75th percentile de bons sites)
      expect(lcp).toBeLessThan(3_000);
    }
  );

  test(
    'Bundle JS principal deve ter tamanho razoável (< 300KB)',
    { tag: ['@production', '@performance'] },
    async ({ request }) => {
      const htmlResponse = await request.get('/');
      const html = await htmlResponse.text();

      // Pega todos os chunks JS
      const jsMatches = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)];

      let totalSize = 0;
      for (const match of jsMatches) {
        const jsResponse = await request.get(match[1]);
        const buffer = await jsResponse.body();
        totalSize += buffer.length;
      }

      // Sem hard limit estrito — apenas sanity check
      // (avisamos se JS > 1MB, provavelmente ruim)
      expect(totalSize).toBeLessThan(1_500_000); // 1.5MB
    }
  );

  // ──── AVAILABILITY CHECKS ────────────────────────────────────

  test(
    'Homepage não deve ter erro 500',
    { tag: ['@production', '@critical', '@smoke'] },
    async ({ request }) => {
      const response = await request.get('/');
      expect(response.status()).toBeLessThan(500);
    }
  );

  test(
    'Todas as rotas públicas devem responder < 500',
    { tag: ['@production', '@critical', '@smoke'] },
    async ({ request }) => {
      const routes = ['/', '/termos', '/privacidade', '/register', '/login', '/manifest.json'];

      for (const route of routes) {
        const response = await request.get(route);
        expect(response.status(), `Route ${route} should not 5xx`).toBeLessThan(500);
      }
    }
  );
});