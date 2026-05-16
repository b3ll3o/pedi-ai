// ============================================================
// API Client — acesso ao banco para API routes
// ============================================================
// isDevDatabase() → usa Drizzle/SQLite
// !isDevDatabase() → usa Supabase (produção)

import { db, sqlite } from './dev-client';
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js';

// Re-exporta do dev-client para conveniência
export { db, sqlite };

export function isDevDatabase(): boolean {
  return process.env.DATABASE_PROVIDER === 'sqlite';
}

export function getSupabaseAdmin() {
  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
