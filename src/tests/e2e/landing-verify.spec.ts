import { test, expect } from '@playwright/test';

test.describe('Landing Page Verification', () => {
  test('should verify all landing page elements', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 1. Badge "Mais Popular" visível
    const badge = page.locator('text=Mais Popular').first();
    await expect(badge).toBeVisible();

    // 2. Cards de preço - o do meio NÃO deve ter hover permanente
    const cards = page.locator('[class*="rounded-2xl"]');
    await expect(cards).toHaveCount(3); // 3 cards de preço

    // 3. FAQ com aria-expanded
    const faqItems = page.locator('[aria-expanded]');
    const faqCount = await faqItems.count();
    console.log('FAQ items found:', faqCount);

    // 4. OG Image
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute('content', /.+/);

    // 5. Favicon
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toHaveAttribute('href', /.+/);

    // 6. Logo
    const logos = page.locator('img[alt*="logo" i]');
    const logoCount = await logos.count();
    console.log('Logos found:', logoCount);

    // 7. JSON-LD
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);

    // 8. Links e botões
    const links = page.locator('a[href]');
    const buttons = page.locator('button');
    console.log('Links:', await links.count(), '| Buttons:', await buttons.count());
  });

  test('should verify JSON-LD content', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const jsonLdContent = await page.evaluate(() => {
      const el = document.querySelector('script[type="application/ld+json"]');
      return el ? el.textContent : null;
    });

    expect(jsonLdContent).toBeTruthy();
    const parsed = JSON.parse(jsonLdContent!);
    expect(parsed['@type']).toBe('Organization');
    expect(parsed.logo).toBeTruthy();
    expect(parsed.image).toBeTruthy();
  });

  test('should verify mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Verificar que não há elementos cortados (sem overflow horizontal)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('should verify FAQ accordion functionality', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Clicar no primeiro item FAQ
    const firstFaqButton = page.locator('[aria-expanded]').first();
    const initialState = await firstFaqButton.getAttribute('aria-expanded');

    await firstFaqButton.click();
    await page.waitForTimeout(300); // Aguardar animação

    const newState = await firstFaqButton.getAttribute('aria-expanded');
    expect(newState).not.toBe(initialState);
  });
});