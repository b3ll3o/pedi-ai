import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        perFile: true,
      },
      include: ['src/**/*'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.tsx',
        'src/styles/**',
        'src/tests/**',
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
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})