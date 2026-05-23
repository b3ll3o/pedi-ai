/**
 * Root ESLint v9 flat config — Monorepo-wide ignores.
 *
 * Apps (apps/web, apps/api) importam este arquivo e mesclam
 * seus ignores locais com os daqui.
 */
import { globalIgnores } from 'eslint/config';

const rootConfig = [
  // Monorepo-wide ignores
  globalIgnores([
    // Build outputs
    '**/dist/**',
    '**/.next/**',
    '**/out/**',
    '**/build/**',

    // Generated / 3rd party
    '**/node_modules/**',
    '**/coverage/**',

    // Playwright
    'apps/web/tests/e2e/playwright-report/**',
    'apps/web/test-results/**',
    'apps/web/playwright-traces/**',

    // Misc
    '*.js', // legacy helpers, configs
    '*.mjs', // unless target of linting
    '*.cjs',

    // Workbox service worker (generated, TypeScript syntax in .js)
    'apps/web/public/sw.js',
  ]),
];

export default rootConfig;
