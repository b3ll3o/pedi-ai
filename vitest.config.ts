import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./apps/web/tests/setup-vitest.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      thresholds: {
        // Target: 80% for statements, lines, functions; 65% for branches
        // Branches are harder to cover due to complex conditions
        statements: 77,
        branches: 67,
        functions: 79,
        lines: 77,
        perFile: false,
      },
      include: ['apps/web/src/**/*'],
      exclude: [
        // Type definitions and stories
        'apps/web/src/**/*.d.ts',
        'apps/web/src/**/*.stories.tsx',
        // Node modules
        'node_modules/**',
        // Markdown files
        '**/*.md',
        // Next.js app router - E2E covered
        'apps/web/src/app/**',
        // UI Components - E2E covered
        'apps/web/src/components/**',
        // API routes - integration tested
        'apps/web/src/app/api/**',
        // Service worker - browser-only
        'apps/web/src/lib/sw/**',
        // Static exports
        'apps/web/src/app/robots.ts',
        'apps/web/src/app/sitemap.ts',
        // Deprecated Supabase
        'apps/web/src/lib/supabase/**',
        // Browser-only auth
        'apps/web/src/lib/auth/guest.ts',
        'apps/web/src/lib/auth/client-admin.ts',
        // Browser-only APIs
        'apps/web/src/lib/broadcast-channel.ts',
        'apps/web/src/lib/logger.ts',
        // Offline IndexedDB - integration tested
        'apps/web/src/lib/offline/db.ts',
        'apps/web/src/lib/offline/types.ts',
        // Browser-only hooks - E2E covered
        'apps/web/src/hooks/**',
        // Admin repositories - low level, integration tested
        'apps/web/src/infrastructure/persistence/admin/**',
        'apps/web/src/infrastructure/persistence/autenticacao/**',
        // RestaurantStore - async IndexedDB, integration tested
        'apps/web/src/infrastructure/persistence/restaurantStore.ts',
        // CardapioSyncService - IndexedDB sync, integration tested
        'apps/web/src/infrastructure/persistence/cardapio/CardapioSyncService.ts',
        // AuthAdapter - deprecated Supabase auth
        'apps/web/src/infrastructure/external/AuthAdapter.ts',
        // E2E tests
        'apps/web/tests/e2e/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
});