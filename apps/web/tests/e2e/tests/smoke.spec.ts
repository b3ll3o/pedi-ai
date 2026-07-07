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

import { test, expect } from '../shared/fixtures';

test.describe('Smoke Tests @critical @smoke', () => {
  test('landing page deve carregar e ter CTA principal', { tag: ['@critical', '@smoke'] }, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/PediAI|pedi-ai/i);
    await expect(page.locator('a[href="/register"]').first()).toBeVisible();
  });

  test('página de cadastro deve carregar formulário', { tag: ['@smoke'] }, async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[type="submit"], button[type="submit"]')).toBeVisible();
  });

  test('página de login deve carregar formulário', { tag: ['@smoke'] }, async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('página /termos deve estar acessível', { tag: ['@smoke', '@lgpd'] }, async ({ page }) => {
    const response = await page.goto('/termos');
    expect(response?.status()).toBe(200);
    await expect(page.locator('text=Termos')).toBeVisible();
  });

  test('página /privacidade deve estar acessível', { tag: ['@smoke', '@lgpd'] }, async ({ page }) => {
    const response = await page.goto('/privacidade');
    expect(response?.status()).toBe(200);
    await expect(page.locator('text=Privacidade')).toBeVisible();
  });

  test('API health check deve responder', { tag: ['@smoke', '@infra'] }, async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('API REST deve responder com headers CORS corretos', { tag: ['@smoke', '@security'] }, async ({ request }) => {
    const response = await request.get('/health', {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-origin']).toBeTruthy();
  });

  test('cardápio público deve listar produtos do seed', { tag: ['@smoke', '@critical'] }, async ({ authenticated }) => {
    await authenticated.goto('/menu');
    await expect(authenticated.locator('[data-testid="menu-cardapio"]')).toBeVisible();
    // Pelo menos 1 produto do seed deve aparecer
    await expect(authenticated.locator('[data-testid="product-card"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('admin dashboard deve carregar após login', { tag: ['@smoke', '@critical'] }, async ({ admin }) => {
    await admin.goto('/admin/dashboard');
    await expect(admin.locator('h1, h2').first()).toBeVisible();
  });
});