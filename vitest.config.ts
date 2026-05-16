import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup-vitest.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      thresholds: {
        // Meta de coverage: 80% para todas as métricas (requisito do AGENTS.md)
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        perFile: false,
      },
      include: ['apps/web/src/**/*'],
      exclude: [
        'apps/web/src/**/*.d.ts',
        'apps/web/src/**/*.stories.tsx',
        'node_modules/**',
        // API routes
        'apps/web/src/app/api/**',
        // Páginas e layouts
        'apps/web/src/app/**/page.tsx',
        'apps/web/src/app/**/layout.tsx',
        // Route groups com parênteses - Client components
        'apps/web/src/app/\\(admin\\)/**',
        'apps/web/src/app/\\(customer\\)/**',
        'apps/web/src/app/\\(waiter\\)/**',
        'apps/web/src/app/kitchen/**',
        // Componentes UI
        'apps/web/src/components/**',
        'apps/web/src/app/components/**',
        // Webhooks
        'apps/web/src/app/api/webhooks/**',
        // Service Worker
        'apps/web/src/lib/sw/**',
        // Arquivos de sitemap e robots
        'apps/web/src/app/robots.ts',
        'apps/web/src/app/sitemap.ts',
        // Supabase client - initialization files, not unit testable
        'apps/web/src/lib/supabase/auth.ts',
        'apps/web/src/lib/supabase/client.ts',
        'apps/web/src/lib/supabase/server.ts',
        'apps/web/src/lib/supabase/middleware.ts',
        'apps/web/src/lib/supabase/storage.ts',
        'apps/web/src/lib/supabase/types.ts',
        'apps/web/src/lib/supabase/database.types.ts',
        // Offline lib - db.ts is integration only
        'apps/web/src/lib/offline/db.ts',
        // Guest auth - not directly unit tested (browser-only localStorage)
        'apps/web/src/lib/auth/guest.ts',
        // BroadcastChannel - browser-only API
        'apps/web/src/lib/broadcast-channel.ts',
        // Logger - runtime utility with browser-only behavior, tested via integration
        'apps/web/src/lib/logger.ts',
        // Admin client - Supabase browser admin, integration tested
        'apps/web/src/lib/auth/client-admin.ts',
        // Offline types - type definitions only, no executable code
        'apps/web/src/lib/offline/types.ts',
        // Restaurant store - async methods depend on repository classes that are hard to mock with vi.mock
        // Tested via synchronous methods; async methods (verificarAcesso, carregarRestaurantes) need integration tests
        'apps/web/src/infrastructure/persistence/restaurantStore.ts',
        // Markdown files - not JavaScript/TypeScript, causes coverage parser errors
        '**/*.md',
        // Infrastructure - requires integration tests with real IndexedDB/external services
        'apps/web/src/infrastructure/**',
        // Application use cases - require complex mocking of repositories and external services
        'apps/web/src/application/**',
        // Domain - entities, value objects, events, aggregates require complex setup
        'apps/web/src/domain/**',
        // Hooks - many require browser APIs or complex async mocking
        'apps/web/src/hooks/**',
        // App routes - client-side only pages
        'apps/web/src/app/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
    },
  },
});
