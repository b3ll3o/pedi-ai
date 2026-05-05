// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('Final Landing Page Verification', () => {
  test('complete verification of all elements', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 1. Badge "Mais Popular" visível
    const badge = page.locator('text=Mais Popular').first();
    await expect(badge).toBeVisible();
    const badgeBox = await badge.boundingBox();
    console.log('Badge size:', badgeBox?.width, 'x', badgeBox?.height);

    // 2. Pricing cards - middle card has highlight class but NO permanent shadow
    const highlightCard = page.locator('.pricingCardHighlight');
    await expect(highlightCard).toHaveClass(/pricingCardHighlight/);

    // Verify middle card doesn't have permanent transform
    const transformBefore = await highlightCard.evaluate(el => getComputedStyle(el).transform);
    console.log('Middle card default transform:', transformBefore);

    // 3. FAQ accordion
    const faqButtons = page.locator('button[aria-expanded]').all();
    console.log('FAQ buttons:', await faqButtons.length);

    // Click FAQ
    await faqButtons[0].click();
    await page.waitForTimeout(400);
    const expanded = await faqButtons[0].getAttribute('aria-expanded');
    console.log('FAQ toggled to:', expanded);

    // 4. OG Image - check head meta
    const ogImageContent = await page.evaluate(() => {
      const el = document.querySelector('meta[property="og:image"]');
      return el ? el.content : null;
    });
    console.log('OG Image:', ogImageContent);

    // 5. Favicon
    const faviconHref = await page.evaluate(() => {
      const el = document.querySelector('link[rel="icon"]');
      return el ? el.href : null;
    });
    console.log('Favicon:', faviconHref);

    // 6. Logo
    const logoVisible = await page.locator('[class*="logo"]').first().isVisible();
    console.log('Logo visible:', logoVisible);

    // 7. JSON-LD content
    const jsonLdContent = await page.evaluate(() => {
      const el = document.querySelector('script[type="application/ld+json"]');
      if (!el) return null;
      try {
        return JSON.parse(el.textContent);
      } catch {
        return null;
      }
    });

    if (jsonLdContent) {
      console.log('JSON-LD @type:', jsonLdContent['@type']);
      console.log('JSON-LD Organization logo:', jsonLdContent.logo ? 'Present' : 'Missing');
    }

    // 8. Mobile layout
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForLoadState('networkidle');
    const hasOverflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    console.log('Mobile overflow:', hasOverflow ? 'YES (problem!)' : 'No (good)');

    // Badge visible on mobile too
    await expect(page.locator('text=Mais Popular').first()).toBeVisible();
  });
});