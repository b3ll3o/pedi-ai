/**
 * Playwright fixtures compartilhadas pelos testes E2E do Pedi-AI.
 *
 * Centraliza `test` e `expect` para permitir injeção futura de fixtures
 * customizadas (autenticação, seed por spec, helpers de pagamento mock, etc.)
 * sem precisar editar cada spec individualmente.
 *
 * Por enquanto apenas re-exporta do `@playwright/test` para evitar
 * quebrar specs que importam desta fixture esperando a API padrão.
 *
 * Como estender:
 * - Importar `test as base` do `@playwright/test`
 * - Chamar `base.extend({ ...minhasFixtures })` para criar fixtures
 * - Exportar o `test` resultante deste arquivo
 *
 * Exemplo futuro:
 * ```typescript
 * import { test as base, expect } from '@playwright/test';
 *
 * export const test = base.extend({
 *   restauranteLogado: async ({ page }, use) => {
 *     // setup login, entrega sessão pronta pro spec, cleanup no use
 *   },
 * });
 * export { expect };
 * ```
 */
export { test, expect } from '@playwright/test';
