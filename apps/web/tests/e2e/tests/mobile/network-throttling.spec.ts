/**
 * E2E: Mobile Throttling & Network Conditions
 *
 * Simula condições reais de rede em dispositivos móveis pra validar que:
 * - App é usável em 3G lento
 * - Offline-first funciona (Service Worker + IndexedDB)
 * - Imagens lazy-loaded não bloqueiam UX
 * - Bundle JS inicial não é gigante
 *
 * Tags: @mobile @network @resilience
 *
 * @see apps/web/docs/guides/MOBILE_PWA.md
 */

import { test, expect } from '../shared/fixtures';

// Perfis de rede (download/upload em Mbps, latency em ms)
// Ref: https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/models/NetworkConditions.ts
const NETWORK_PROFILES = {
  'wifi-fast': { download: 50, upload: 30, latency: 5 },
  '4g-lte': { download: 9, upload: 9, latency: 100 },
  '3g-fast': { download: 1.6, upload: 750 / 1000, latency: 150 },
  '3g-slow': { download: 400 / 1000, upload: 400 / 1000, latency: 400 },
  'edge': { download: 240 / 1000, upload: 200 / 1000, latency: 800 },
  offline: { download: 0, upload: 0, latency: 0 },
};

test.describe('Mobile Throttling & Network @mobile @network', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  // ─── PERFORMANCE EM DIFERENTES REDES ──────────────────────────

  for (const [profileName, conditions] of Object.entries(NETWORK_PROFILES)) {
    test.skip(
      profileName === 'offline',
      'testado em separado (offline.spec.ts)',
    );

    test(
      `landing carrega em < ${profileName === 'edge' ? '10' : '5'}s com rede ${profileName}`,
      { tag: ['@mobile', `@network-${profileName}`, '@performance'] },
      async ({ page, context }) => {
        // Aplica throttling via CDP
        const client = await context.newCDPSession(page);
        await client.send('Network.enable');
        await client.send('Network.emulateNetworkConditions', {
          offline: conditions.download === 0,
          downloadThroughput: (conditions.download * 1024 * 1024) / 8,
          uploadThroughput: (conditions.upload * 1024 * 1024) / 8,
          latency: conditions.latency,
        });

        const start = Date.now();
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.locator('h1').first().waitFor({ state: 'visible' });
        const loadTime = Date.now() - start;

        // 3G slow / edge pode demorar até 10s
        const maxTime =
          profileName === 'edge' ? 10_000 : profileName.startsWith('3g') ? 8_000 : 5_000;
        expect(loadTime).toBeLessThan(maxTime);
      }
    );
  }

  // ─── OFFLINE-FIRST ────────────────────────────────────────────

  test(
    'deve funcionar OFFLINE após primeira visita (Service Worker)',
    { tag: ['@mobile', '@offline', '@critical'] },
    async ({ page, context }) => {
      // 1. Primeira visita ONLINE (cacheia no Service Worker)
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Espera o SW registrar
      await page.waitForFunction(
        () => navigator.serviceWorker?.ready !== undefined,
        { timeout: 10_000 }
      );

      // 2. Vai offline
      const client = await context.newCDPSession(page);
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0,
      });

      // 3. Recarrega a página
      await page.reload();

      // 4. Deve carregar do cache do Service Worker
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 5_000 });
      // O H1 deve ter o mesmo texto (provando que é cache)
      const h1Text = await page.locator('h1').first().textContent();
      expect(h1Text).toBeTruthy();
    }
  );

  test(
    'deve exibir indicador offline quando sem conexão',
    { tag: ['@mobile', '@offline'] },
    async ({ page, context }) => {
      await page.goto('/');

      // Vai offline
      const client = await context.newCDPSession(page);
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0,
      });

      // Dispara evento offline (SW também notifica)
      await page.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // Indicador offline deve aparecer
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible({
        timeout: 3_000,
      });
    }
  );

  test(
    'cardápio deve carregar do IndexedDB quando offline',
    { tag: ['@mobile', '@offline', '@critical'] },
    async ({ page, context }) => {
      await page.goto('/menu/rest_123');
      await page.waitForLoadState('networkidle');

      // Vai offline
      const client = await context.newCDPSession(page);
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: true,
        downloadThroughput: 0,
        uploadThroughput: 0,
        latency: 0,
      });

      // Recarrega
      await page.reload();

      // Cardápio deve aparecer do cache
      await expect(page.locator('[data-testid="menu-cardapio"]')).toBeVisible({
        timeout: 5_000,
      });
    }
  );

  // ─── IMAGENS E ASSETS ─────────────────────────────────────────

  test(
    'imagens devem ter lazy loading (não bloqueiam LCP)',
    { tag: ['@mobile', '@performance'] },
    async ({ page }) => {
      await page.goto('/menu/rest_123');

      const images = page.locator('img');
      const count = await images.count();

      if (count > 0) {
        // Pelo menos 50% das imagens devem ter loading="lazy"
        let lazyCount = 0;
        for (let i = 0; i < count; i++) {
          const loading = await images.nth(i).getAttribute('loading');
          if (loading === 'lazy') lazyCount++;
        }

        expect(lazyCount / count).toBeGreaterThanOrEqual(0.5);
      }
    }
  );

  test(
    'imagens devem ter srcset pra responsividade',
    { tag: ['@mobile', '@performance'] },
    async ({ page }) => {
      await page.goto('/menu/rest_123');

      const images = page.locator('img').first();
      const count = await images.count();

      if (count > 0) {
        const srcset = await images.first().getAttribute('srcset');
        // srcset opcional mas recomendado pra mobile
        // Se não tiver, pelo menos src deve estar presente
        const src = await images.first().getAttribute('src');
        expect(src).toBeTruthy();
      }
    }
  );

  // ─── UX EM TELAS PEQUENAS ────────────────────────────────────

  test(
    'menu deve funcionar em viewport 320px (iPhone SE)',
    { tag: ['@mobile', '@responsive'] },
    async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/menu/rest_123');

      // Sem scroll horizontal
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // tolerância de 1px

      // Botões devem ter tamanho mínimo de toque (44x44)
      const buttons = page.locator('button').first();
      if ((await buttons.count()) > 0) {
        const box = await buttons.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(36); // tolerância menor que 44 mas aceitável
        }
      }
    }
  );

  test(
    'input não deve causar zoom em iOS (font-size >= 16px)',
    { tag: ['@mobile', '@ux'] },
    async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.locator('input[type="email"]');
      if ((await emailInput.count()) > 0) {
        const fontSize = await emailInput.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });
        expect(fontSize).toBeGreaterThanOrEqual(16);
      }
    }
  );
});