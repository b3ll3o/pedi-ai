// ============================================================
// Database index — ponto de entrada para infraestrutura de banco
// ============================================================

import { db, sqlite, getSession, getGlobalToken, hashPassword, verifyPassword } from './dev-client';
import { createClient } from '@supabase/supabase-js';

export { db, sqlite, getSession, getGlobalToken, hashPassword, verifyPassword };

export function isDevDatabase(): boolean {
  return process.env.DATABASE_PROVIDER === 'sqlite';
}

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
