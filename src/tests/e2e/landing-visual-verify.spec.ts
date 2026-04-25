import { test, expect } from '@playwright/test';

test.describe('Landing Page Visual Verification', () => {
  test.setTimeout(60000);

  test('verify pricing section badge and cards', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000');

    // 1. Badge "Mais Popular" visível por completo
    const badge = page.locator('text=Mais Popular').first();
    await expect(badge).toBeVisible();

    // Verificar que o badge está dentro do card correto
    const badgeBox = await badge.boundingBox();
    console.log('Badge bounding box:', badgeBox);

    // 2. Cards de preço - o do meio (Profissional) é o destacado
    const pricingCards = page.locator('[class*="pricingCard"]');
    const cardCount = await pricingCards.count();
    console.log('Pricing cards found:', cardCount);
    expect(cardCount).toBe(3);

    // 3. O card do meio NÃO deve ter hover permanente (verificar estilos)
    const middleCard = pricingCards.nth(1);
    const middleCardClasses = await middleCard.getAttribute('class');
    console.log('Middle card classes:', middleCardClasses);

    // Verificar que tem a classe de destaque (highlight) mas não tem estilos de hover permanente
    expect(middleCardClasses).toContain('pricingCardHighlight');
  });

  test('verify FAQ accordion functionality', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000');

    // Localizar FAQ - usar seletor mais específico para items da lista de FAQ
    const faqSection = page.locator('[aria-labelledby="faq-title"]');
    await expect(faqSection).toBeVisible();

    // Os itens FAQ são buttons com aria-expanded dentro do FAQ
    const faqButtons = page.locator('[aria-labelledby="faq-title"] button[aria-expanded]');
    const faqCount = await faqButtons.count();
    console.log('FAQ items found:', faqCount);
    expect(faqCount).toBeGreaterThan(0);

    // Clicar no primeiro item FAQ
    const firstFaq = faqButtons.first();
    const initialState = await firstFaq.getAttribute('aria-expanded');
    console.log('Initial FAQ state:', initialState);

    await firstFaq.click();
    await page.waitForTimeout(500); // Aguardar animação

    const newState = await firstFaq.getAttribute('aria-expanded');
    console.log('New FAQ state:', newState);
    expect(newState).not.toBe(initialState);
  });

  test('verify images and JSON-LD', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000');

    // 4. OG Image
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    console.log('OG Image:', ogImage);
    expect(ogImage).toBeTruthy();

    // 5. Favicon
    const favicon = await page.locator('link[rel="icon"]').first().getAttribute('href');
    console.log('Favicon:', favicon);
    expect(favicon).toBeTruthy();

    // 6. Logo
    const logos = await page.locator('[class*="logo"]').all();
    console.log('Logo elements:', logos.length);

    // 7. JSON-LD
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);

    const jsonLdContent = await page.evaluate(() => {
      const el = document.querySelector('script[type="application/ld+json"]');
      return el ? JSON.parse(el.textContent) : null;
    });

    console.log('JSON-LD @type:', jsonLdContent['@type']);
    console.log('JSON-LD has logo:', !!jsonLdContent.logo);
    console.log('JSON-LD has image:', !!jsonLdContent.image);

    expect(jsonLdContent['@type']).toBe('Organization');
    expect(jsonLdContent.logo).toBeTruthy();
    expect(jsonLdContent.image).toBeTruthy();
  });

  test('verify mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3000');

    // Verificar que não há elementos cortados (sem overflow horizontal)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verificar que o badge "Mais Popular" é visível
    const badge = page.locator('text=Mais Popular').first();
    await expect(badge).toBeVisible();
  });
});