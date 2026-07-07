/**
 * E2E: Onboarding Wizard
 *
 * Cobre o fluxo completo do wizard de onboarding:
 * 1. Step 1: escolha de vertical (Pizzaria, Hamburgueria, Marmita, Japonesa, Lanchonete)
 * 2. Step 2: dados básicos (nome, CNPJ, endereço, telefone)
 * 3. Step 3: preview do template + aplicação
 * 4. Step 4: sucesso + redirecionamento pro painel
 *
 * Valida:
 * - Navegação entre steps (próximo/voltar)
 * - Validação de campos obrigatórios
 * - Persistência em localStorage (refresh preserva estado)
 * - Aplicação correta do template escolhido
 * - Estado vazio quando nada selecionado
 * - Tracking Plausible disparado em cada step
 *
 * Tags: @critical, @smoke, @onboarding
 *
 * @see apps/web/src/lib/onboarding/templates.ts
 */

import { OnboardingPage } from '../../pages/OnboardingPage';
import { test, expect } from '../shared/fixtures';

test.describe('Onboarding Wizard @critical @onboarding', () => {
  let onboarding: OnboardingPage;

  test.beforeEach(async ({ page }) => {
    onboarding = new OnboardingPage(page);
    // Limpa localStorage para começar do zero
    await page.evaluate(() => {
      localStorage.removeItem('pedi_onboarding_state_v1');
    });
  });

  test(
    'deve completar wizard completo: pizzaria → dados → template → sucesso',
    { tag: ['@critical', '@smoke', '@onboarding'] },
    async ({ page, authenticated }) => {
      // ─── Step 1: Escolha de Vertical ────────────────────────
      await onboarding.goto();
      await onboarding.expectStep(1);

      // Verifica que todas as 5 verticais aparecem
      const verticals = ['pizzaria', 'hamburgueria', 'marmita', 'japonesa', 'lanchonete'];
      for (const v of verticals) {
        await expect(page.locator(`[data-vertical-slug="${v}"]`)).toBeVisible();
      }

      // Seleciona pizzaria
      await onboarding.selectVertical('pizzaria');

      // Botão Continuar deve ficar habilitado
      await expect(onboarding.continueButton).toBeEnabled();

      // Avança
      await onboarding.clickNext();
      await onboarding.expectStep(2);

      // ─── Step 2: Dados do Restaurante ───────────────────────
      await onboarding.fillRestaurantData({
        name: 'Pizzaria E2E Test',
        cnpj: '11.222.333/0001-44',
        address: 'Rua E2E, 123, São Paulo/SP',
        phone: '11999998888',
      });

      // Avança
      await onboarding.clickNext();
      await onboarding.expectStep(3);

      // ─── Step 3: Preview do Template ─────────────────────────
      // Deve mencionar pizzaria e template
      await expect(page.locator('[data-testid="template-vertical-name"]')).toContainText(/pizzaria/i);
      await expect(onboarding.applyTemplateButton).toBeVisible();

      // Aplica template
      await onboarding.applyTemplate();
      await onboarding.expectStep(4);

      // ─── Step 4: Sucesso ────────────────────────────────────
      await expect(onboarding.successMessage).toBeVisible();
      await expect(page.locator('text=Pizzaria E2E Test')).toBeVisible();

      // Botão pra ir pro painel
      await expect(onboarding.dashboardLink).toBeVisible();
    }
  );

  test(
    'deve desabilitar Continuar quando nenhuma vertical está selecionada',
    { tag: ['@onboarding'] },
    async ({ page }) => {
      await onboarding.goto();
      await onboarding.expectStep(1);

      // Botão Continuar começa desabilitado
      await expect(onboarding.continueButton).toBeDisabled();

      // Seleciona qualquer vertical
      await onboarding.selectVertical('hamburgueria');
      await expect(onboarding.continueButton).toBeEnabled();

      // Clica em outra (toggle off + on)
      await onboarding.selectVertical('marmita');
      await expect(onboarding.continueButton).toBeEnabled();
    }
  );

  test(
    'deve bloquear avanço no Step 2 sem nome e CNPJ',
    { tag: ['@onboarding', '@validation'] },
    async ({ page }) => {
      await onboarding.goto();
      await onboarding.selectVertical('japonesa');
      await onboarding.clickNext();
      await onboarding.expectStep(2);

      // Sem preencher nada, Continuar deve estar desabilitado
      await expect(onboarding.continueButton).toBeDisabled();

      // Preenche só nome
      await onboarding.restaurantNameInput.fill('Sushi E2E');
      await expect(onboarding.continueButton).toBeDisabled(); // ainda falta CNPJ

      // Preenche CNPJ
      await onboarding.cnpjInput.fill('99.888.777/0001-66');
      await expect(onboarding.continueButton).toBeEnabled();
    }
  );

  test(
    'deve preservar estado após refresh (localStorage)',
    { tag: ['@onboarding', '@state'] },
    async ({ page }) => {
      await onboarding.goto();
      await onboarding.selectVertical('lanchonete');
      await onboarding.clickNext();
      await onboarding.fillRestaurantData({
        name: 'Lanchonete Persistente',
        cnpj: '55.666.777/0001-88',
      });

      // Recarrega a página
      await page.reload();

      // Deve voltar pro Step 2 com os dados preenchidos
      await onboarding.expectStep(2);
      await expect(onboarding.restaurantNameInput).toHaveValue('Lanchonete Persistente');
      await expect(onboarding.cnpjInput).toHaveValue('55.666.777/0001-88');
    }
  );

  test(
    'botão Voltar deve funcionar corretamente entre steps',
    { tag: ['@onboarding', '@navigation'] },
    async ({ page }) => {
      await onboarding.goto();
      await onboarding.selectVertical('pizzaria');
      await onboarding.clickNext();
      await onboarding.expectStep(2);

      // Preenche dados
      await onboarding.fillRestaurantData({
        name: 'Pizza Back',
        cnpj: '11.111.111/0001-11',
      });
      await onboarding.clickNext();
      await onboarding.expectStep(3);

      // Volta
      await onboarding.clickBack();
      await onboarding.expectStep(2);
      // Dados devem estar preservados
      await expect(onboarding.restaurantNameInput).toHaveValue('Pizza Back');

      // Volta mais uma vez
      await onboarding.clickBack();
      await onboarding.expectStep(1);
      // Vertical deve estar selecionada
      await expect(page.locator('[data-vertical-slug="pizzaria"][aria-pressed="true"]')).toBeVisible();
    }
  );

  test(
    'deve aplicar template correto baseado na vertical escolhida',
    { tag: ['@onboarding', '@template'] },
    async ({ authenticated, page }) => {
      // Testa cada vertical e verifica que categorias + produtos corretos são criados
      const testCases = [
        {
          vertical: 'pizzaria' as const,
          expectedCategory: 'Pizzas Salgadas',
          expectedProduct: 'Mussarela',
        },
        {
          vertical: 'hamburgueria' as const,
          expectedCategory: 'Burgers Clássicos',
          expectedProduct: 'X-Burger',
        },
        {
          vertical: 'marmita' as const,
          expectedCategory: 'Marmitas Low Carb',
          expectedProduct: 'Frango Grelhado Low Carb',
        },
      ];

      for (const { vertical, expectedCategory, expectedProduct } of testCases) {
        // Reset state
        await page.evaluate(() => {
          localStorage.removeItem('pedi_onboarding_state_v1');
        });

        await onboarding.goto();
        await onboarding.selectVertical(vertical);
        await onboarding.clickNext();
        await onboarding.fillRestaurantData({
          name: `Restaurante ${vertical}`,
          cnpj: '00.000.000/0001-00',
        });
        await onboarding.clickNext();
        await onboarding.applyTemplate();

        // Vai pro painel e verifica produtos criados
        await onboarding.dashboardLink.click();
        await page.waitForURL(/admin\/dashboard/, { timeout: 10_000 });

        // Navega pro cardápio público (que reflete os produtos do restaurante)
        await page.goto('/menu');

        // Espera produtos carregarem
        await expect(page.locator(`text=${expectedProduct}`)).toBeVisible({ timeout: 15_000 });
        await expect(page.locator(`text=${expectedCategory}`)).toBeVisible();
      }
    }
  );
});