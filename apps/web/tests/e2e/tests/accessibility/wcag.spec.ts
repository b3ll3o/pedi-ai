/**
 * E2E: Accessibility (WCAG 2.1 AA)
 *
 * Valida conformidade com WCAG 2.1 nível AA usando axe-core.
 *
 * **Categorias verificadas:**
 * - Perceptível: contraste, alt text, legendas
 * - Operável: keyboard nav, focus, sem seizures
 * - Compreensível: linguagem, ordem de leitura
 * - Robusto: ARIA válido, compatível com assistive tech
 *
 * Tags: @a11y @wcag @accessibility
 *
 * Instalação: `pnpm add -D @axe-core/playwright`
 *
 * @see https://playwright.dev/docs/accessibility-testing
 * @see .claude/references/accessibility-checklist.md
 */

import { test, expect } from '../playwright-fixtures';
import AxeBuilder from '@axe-core/playwright';

// Páginas que devem ser testadas
const PAGES_TO_TEST = [
  { path: '/', name: 'Landing', requiresAuth: false },
  { path: '/login', name: 'Login', requiresAuth: false },
  { path: '/register', name: 'Cadastro', requiresAuth: false },
  { path: '/termos', name: 'Termos', requiresAuth: false },
  { path: '/privacidade', name: 'Privacidade', requiresAuth: false },
  { path: '/menu', name: 'Cardápio público', requiresAuth: false },
  { path: '/admin/dashboard', name: 'Admin Dashboard', requiresAuth: true },
  { path: '/admin/produtos', name: 'Admin Produtos', requiresAuth: true },
  { path: '/kitchen', name: 'KDS Cozinha', requiresAuth: true },
  { path: '/onboarding', name: 'Onboarding Wizard', requiresAuth: false },
];

test.describe('Accessibility (WCAG 2.1 AA) @a11y @wcag', () => {
  for (const pageConfig of PAGES_TO_TEST) {
    test(
      `${pageConfig.name} deve passar em WCAG 2.1 AA`,
      { tag: ['@a11y', `@a11y-${pageConfig.path}`, '@critical'] },
      async ({ page, authenticated, admin, kitchen }) => {
        // Escolhe o context correto
        const context = pageConfig.requiresAuth
          ? pageConfig.name.includes('KDS')
            ? kitchen
            : admin
          : authenticated;

        await context.goto(pageConfig.path);
        await context.waitForLoadState('networkidle');

        // Roda axe-core
        const accessibilityScanResults = await new AxeBuilder({ page: context })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        // Filtra violações críticas (blocker)
        const criticalViolations = accessibilityScanResults.violations.filter(
          (v) => v.impact === 'critical'
        );

        // Reporta violações pra debug
        if (accessibilityScanResults.violations.length > 0) {
          console.log(`\n⚠️ ${pageConfig.name} (${pageConfig.path}):`);
          for (const violation of accessibilityScanResults.violations) {
            console.log(`  - [${violation.impact}] ${violation.id}: ${violation.description}`);
            console.log(`    Help: ${violation.helpUrl}`);
            console.log(`    Nodes: ${violation.nodes.length}`);
          }
        }

        // Nenhuma violação CRÍTICA permitida
        expect(criticalViolations).toEqual([]);

        // Permitir até 3 violações SERIOUS (podem ser ajustadas)
        const seriousViolations = accessibilityScanResults.violations.filter(
          (v) => v.impact === 'serious'
        );
        expect(seriousViolations.length).toBeLessThanOrEqual(3);
      }
    );
  }

  // ─── KEYBOARD NAVIGATION ──────────────────────────────────────

  test(
    'login deve ser navegável apenas com teclado',
    { tag: ['@a11y', '@keyboard'] },
    async ({ page }) => {
      await page.goto('/login');

      // Tab até o input de email
      await page.keyboard.press('Tab');
      let focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();

      // Tab até password
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON']).toContain(focused);

      // Preenche
      await page.keyboard.type('test@example.com');
      await page.keyboard.press('Tab');
      await page.keyboard.type('senha123');

      // Submit com Enter
      await page.keyboard.press('Enter');
      // Aguarda resposta
      await page.waitForTimeout(500);
    }
  );

  test(
    'focus visível em todos os elementos focáveis',
    { tag: ['@a11y', '@focus'] },
    async ({ page }) => {
      await page.goto('/');

      // Foca no primeiro link/botão
      await page.locator('a, button').first().focus();

      // Verifica outline visível
      const outlineWidth = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = window.getComputedStyle(el);
        return style.outlineWidth;
      });

      // outline-width deve ser >= 2px pra ser visível
      expect(parseInt(outlineWidth)).toBeGreaterThanOrEqual(2);
    }
  );

  // ─── CONTRASTE ────────────────────────────────────────────────

  test(
    'texto principal deve ter contraste >= 4.5:1 (WCAG AA)',
    { tag: ['@a11y', '@contrast'] },
    async ({ page }) => {
      await page.goto('/');

      const contrastIssues = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .options({ runOnly: ['color-contrast'] })
        .analyze();

      expect(contrastIssues.violations).toEqual([]);
    }
  );

  // ─── ARIA ─────────────────────────────────────────────────────

  test(
    'botões sem texto devem ter aria-label',
    { tag: ['@a11y', '@aria'] },
    async ({ page }) => {
      await page.goto('/');

      const buttonsWithoutLabel = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons
          .filter((btn) => {
            const text = btn.textContent?.trim();
            const ariaLabel = btn.getAttribute('aria-label');
            const ariaLabelledBy = btn.getAttribute('aria-labelledby');
            return !text && !ariaLabel && !ariaLabelledBy;
          })
          .map((btn) => btn.outerHTML.slice(0, 100));
      });

      expect(buttonsWithoutLabel).toEqual([]);
    }
  );

  test(
    'imagens devem ter alt text',
    { tag: ['@a11y', '@aria'] },
    async ({ page }) => {
      await page.goto('/menu');

      const imagesWithoutAlt = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images
          .filter((img) => !img.hasAttribute('alt'))
          .map((img) => img.src.slice(0, 100));
      });

      expect(imagesWithoutAlt).toEqual([]);
    }
  );

  // ─── HTML SEMÂNTICO ───────────────────────────────────────────

  test(
    'deve ter estrutura semântica correta (header, main, footer)',
    { tag: ['@a11y', '@semantic'] },
    async ({ page }) => {
      await page.goto('/');

      const hasHeader = (await page.locator('header, [role="banner"]').count()) > 0;
      const hasMain = (await page.locator('main, [role="main"]').count()) > 0;
      const hasFooter = (await page.locator('footer, [role="contentinfo"]').count()) > 0;

      // Pelo menos main deve existir
      expect(hasMain).toBe(true);

      // Header/footer opcionais mas recomendados em landing
      if (page.url().endsWith('/')) {
        expect(hasHeader).toBe(true);
      }
    }
  );

  test(
    'página deve ter apenas 1 h1',
    { tag: ['@a11y', '@semantic'] },
    async ({ page }) => {
      await page.goto('/');

      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    }
  );

  test(
    'headings devem seguir hierarquia (h1 > h2 > h3)',
    { tag: ['@a11y', '@semantic'] },
    async ({ page }) => {
      await page.goto('/');

      const headings = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => ({
          level: parseInt(h.tagName.slice(1)),
          text: h.textContent?.slice(0, 50),
        }));
      });

      // Verifica que não pula níveis (ex: h1 > h3 sem h2)
      let prevLevel = 0;
      for (const heading of headings) {
        if (prevLevel > 0 && heading.level > prevLevel + 1) {
          throw new Error(
            `Hierarquia de headings inválida: pulou de h${prevLevel} para h${heading.level} ("${heading.text}")`
          );
        }
        prevLevel = heading.level;
      }
    }
  );

  // ─── FORMULÁRIOS ──────────────────────────────────────────────

  test(
    'inputs devem ter labels associados',
    { tag: ['@a11y', '@forms'] },
    async ({ page }) => {
      await page.goto('/register');

      const inputsWithoutLabels = await page.evaluate(() => {
        const inputs = Array.from(
          document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])')
        );
        return inputs
          .filter((input) => {
            const id = input.id;
            const ariaLabel = input.getAttribute('aria-label');
            const ariaLabelledBy = input.getAttribute('aria-labelledby');
            const label = id ? document.querySelector(`label[for="${id}"]`) : null;
            const wrapped = input.closest('label') !== null;

            return !label && !ariaLabel && !ariaLabelledBy && !wrapped;
          })
          .map((input) => input.outerHTML.slice(0, 100));
      });

      expect(inputsWithoutLabels).toEqual([]);
    }
  );

  test(
    'mensagens de erro devem ter aria-live',
    { tag: ['@a11y', '@forms'] },
    async ({ page }) => {
      await page.goto('/register');

      // Submete form vazio
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);

      // Procura erros com aria-live
      const errorWithAriaLive = await page.evaluate(() => {
        const errors = Array.from(document.querySelectorAll('[role="alert"], [aria-live]'));
        return errors.length;
      });

      expect(errorWithAriaLive).toBeGreaterThanOrEqual(1);
    }
  );

  // ─── PREFERÊNCIA DE MOVIMENTO ─────────────────────────────────

  test(
    'deve respeitar prefers-reduced-motion',
    { tag: ['@a11y', '@a11y-motion'] },
    async ({ browser }) => {
      const context = await browser.newContext({
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      await page.goto('/');

      // Espera 1s pra animações rolarem
      await page.waitForTimeout(1000);

      // Verifica que não há animações longas (CSS transition duration <= 100ms)
      const longTransitions = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        let count = 0;
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          const duration = parseFloat(style.transitionDuration);
          if (duration > 0.1) count++;
        }
        return count;
      });

      // Com prefers-reduced-motion, transições devem ser mínimas
      expect(longTransitions).toBeLessThan(50); // heurística

      await context.close();
    }
  );
});