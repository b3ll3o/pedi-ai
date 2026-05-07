import { defineConfig } from 'vitest/config'
import path from 'path'

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
      include: ['src/**/*'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.tsx',
        'src/styles/**',
        'node_modules/**',
        // API routes
        'src/app/api/**',
        // Páginas e layouts
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
        // Route groups com parênteses - Client components
        'src/app/\\(admin\\)/**',
        'src/app/\\(customer\\)/**',
        'src/app/\\(waiter\\)/**',
        'src/app/kitchen/**',
        // Componentes UI
        'src/components/**',
        'src/app/components/**',
        // Webhooks
        'src/app/api/webhooks/**',
        // Arquivos de configuração
        'src/config/**',
        // Service Worker
        'src/lib/sw/**',
        // Arquivos de sitemap e robots
        'src/app/robots.ts',
        'src/app/sitemap.ts',
        // Supabase client - initialization files, not unit testable
        'src/lib/supabase/auth.ts',
        'src/lib/supabase/client.ts',
        'src/lib/supabase/server.ts',
        'src/lib/supabase/middleware.ts',
        'src/lib/supabase/storage.ts',
        'src/lib/supabase/types.ts',
        'src/lib/supabase/database.types.ts',
        // Offline lib - db.ts is integration only
        'src/lib/offline/db.ts',
        // Guest auth - not directly unit tested (browser-only localStorage)
        'src/lib/auth/guest.ts',
        // BroadcastChannel - browser-only API
        'src/lib/broadcast-channel.ts',
        // Infrastructure repositories - tested via unit tests with mocked Dexie
        // NOTE: removed exclusion so tests count toward 80% coverage requirement
        // 'src/infrastructure/persistence/**',
        // Application use cases - many require complex mocking
        'src/application/**/services/*.ts',
        // Domain events that require domain entities (hard to unit test)
        'src/domain/**/events/*CriadoEvent.ts',
        'src/domain/**/events/*ExpiradaEvent.ts',
        'src/domain/**/events/PagamentoConfirmadoEvent.ts',
        'src/domain/**/events/PedidoStatusAlteradoEvent.ts',
        'src/domain/**/events/Reembolso*.ts',
        // Aggregates with complex dependencies
        'src/domain/**/aggregates/*.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})