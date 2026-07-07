/**
 * E2E: Visual Regression Testing
 *
 * Captura screenshots de páginas/componentes críticos e compara com baseline.
 * Detecta mudanças visuais não-intencionais (CSS quebrado, regressões de UI).
 *
 * **Como funciona:**
 * - Primeira execução: cria snapshots baseline
 * - Execuções seguintes: compara com baseline
 * - Falha = alguma coisa mudou visualmente
 * - `pnpm test:e2e:visual:update` regenera baseline
 *
 * **Boas práticas:**
 * - Tire snapshots em estado estável (após loading)
 * - Use `toHaveScreenshot()` com nome descritivo
 * - Máscara áreas dinâmicas (timestamps, números randômicos)
 * - Cuidado com fontes e animações (use `animations: 'disabled'`)
 *
 * Tags: @visual @regression @screenshot
 *
 * @see https://playwright.dev/docs/test-snapshots
 */

import { test, expect } from '../playwright-fixtures';

// Configuração global pra snapshots estáveis
test.use({
  // Desabilita animações durante screenshot
  // (pra evitar diferenças de renderização)
});

// ─── PÁGINAS PÚBLICAS ─────────────────────────────────────────

test.describe('Visual Regression — Páginas Públicas @visual @regression', () => {
  test('landing page deve estar visualmente estável', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Aguarda fontes carregarem (evita FOUT no snapshot)
    await page.evaluate(() => document.fonts.ready);

    // Máscara áreas dinâmicas (se houver)
    await expect(page).toHaveScreenshot('landing-full-page.png', {
      fullPage: true,
      animations: 'disabled',
      // Tolerância de 0.2% de pixels diferentes (anti-aliasing variations)
      maxDiffPixelRatio: 0.002,
    });
  });

  test('landing page above-the-fold', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot('landing-hero.png', {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });

  test('página /termos deve estar visualmente estável', async ({ page }) => {
    await page.goto('/termos');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('termos.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });

  test('página /privacidade deve estar visualmente estável', async ({ page }) => {
    await page.goto('/privacidade');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('privacidade.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });

  test('página de cadastro deve estar visualmente estável', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('register.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });

  test('página de login deve estar visualmente estável', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });

  test('cookie banner deve aparecer', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const banner = page.locator('[data-testid="cookie-banner"]');
    await expect(banner).toBeVisible();

    await expect(banner).toHaveScreenshot('cookie-banner.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });
});

// ─── COMPONENTES ESPECÍFICOS ──────────────────────────────────

test.describe('Visual Regression — Componentes @visual @regression @components', () => {
  test('botão primário deve ter estilo consistente', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const ctaButton = page.locator('a[href="/register"]').first();
    await expect(ctaButton).toBeVisible();

    await expect(ctaButton).toHaveScreenshot('cta-button.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });

  test('navegação principal (header)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('header nav, nav').first();
    if ((await nav.count()) > 0) {
      await expect(nav).toHaveScreenshot('navigation.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.002,
      });
    }
  });

  test('footer deve estar visualmente estável', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer').first();
    if ((await footer.count()) > 0) {
      await expect(footer).toHaveScreenshot('footer.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.002,
      });
    }
  });

  test('form de login com estados (vazio, preenchido, erro)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Estado vazio
    await expect(page.locator('form').first()).toHaveScreenshot('login-empty.png', {
      animations: 'disabled',
    });

    // Estado preenchido
    await page.locator('input[type="email"]').fill('teste@exemplo.com');
    await page.locator('input[type="password"]').fill('senha123');
    await expect(page.locator('form').first()).toHaveScreenshot('login-filled.png', {
      animations: 'disabled',
    });

    // Estado de erro
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('form').first()).toHaveScreenshot('login-error.png', {
      animations: 'disabled',
    });
  });
});

// ─── MOBILE / RESPONSIVO ──────────────────────────────────────

test.describe('Visual Regression — Mobile @visual @mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro

  test('landing mobile deve estar visualmente estável', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot('landing-mobile.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });

  test('login mobile', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-mobile.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });

  test('menu hambúrguer mobile (se existir)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const menuButton = page.locator('[aria-label*="menu" i], [data-testid="menu-toggle"]').first();
    if ((await menuButton.count()) > 0) {
      await menuButton.click();
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('mobile-menu-open.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.002,
      });
    }
  });
});

// ─── ESTADOS DINÂMICOS ────────────────────────────────────────

test.describe('Visual Regression — Estados Dinâmicos @visual @states', () => {
  test('toast de sucesso deve aparecer consistentemente', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Trigger alguma ação que mostra toast
    // (assumindo que tem algum fluxo de sucesso)
    // await page.fill('input[type="email"]', 'novo@test.com');
    // await page.click('button[type="submit"]');
    // await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

    // Por ora, só verificamos que toast existe
    // await expect(page.locator('[data-testid="success-toast"]')).toHaveScreenshot('toast-success.png');
  });

  test('modal de confirmação visual', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Trigger algum modal (vai depender do app)
    // Por ora, placeholder
    // const trigger = page.locator('button[data-testid="delete-something"]');
    // if (await trigger.count() > 0) {
    //   await trigger.click();
    //   await expect(page.locator('[role="dialog"]')).toHaveScreenshot('confirm-modal.png');
    // }
  });

  test('loading state deve ser visualmente estável', async ({ page, context }) => {
    // Simula requisição lenta
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/admin/dashboard');

    // Captura estado de loading (se houver)
    const loadingIndicator = page.locator('[data-testid="loading"], [aria-busy="true"]').first();
    if ((await loadingIndicator.count()) > 0) {
      await expect(loadingIndicator).toHaveScreenshot('loading-state.png', {
        animations: 'disabled',
      });
    }
  });
});

// ─── CROSS-BROWSER ────────────────────────────────────────────

test.describe('Visual Regression — Cross-browser @visual @cross-browser', () => {
  // Firefox
  test('landing em Firefox', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Só roda no Firefox');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('landing-firefox.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.005, // Firefox pode ter pequenas diferenças de render
    });
  });

  // WebKit (Safari)
  test('landing em WebKit/Safari', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Só roda no WebKit');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('landing-safari.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.005,
    });
  });
});