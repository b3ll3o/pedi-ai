/**
 * Playwright fixtures compartilhadas pelos testes E2E do Pedi-AI.
 *
 * Re-exporta o `test` estendido definido em
 * `tests/shared/fixtures/index.ts` que injeta as fixtures
 * `authenticated`, `admin`, `kitchen`, `waiter`, `manager`,
 * `guest`, `cleanPage`, `seedData` e `api`. Sem este redirect,
 * testes que importam `test` daqui recebem a versão bare do
 * `@playwright/test` e quebram em runtime com
 * "Test has unknown parameter 'authenticated'" / 'admin' / etc.
 *
 * Especificações E2E devem importar de `./playwright-fixtures`:
 * ```typescript
 * import { test, expect } from './playwright-fixtures';
 * ```
 */
export { test, expect } from './shared/fixtures';
