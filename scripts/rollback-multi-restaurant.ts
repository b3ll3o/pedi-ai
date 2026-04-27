#!/usr/bin/env tsx
/**
 * Script: rollback-multi-restaurant.ts
 * Purpose: Rollback the N:N multi-restaurant migration
 *
 * ROLLBACK STEPS (in order):
 * 1. Set NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT=false in .env.local
 * 2. Run: npx tsx scripts/rollback-multi-restaurant.ts
 * 3. Verify app builds: npm run build
 * 4. Test login: http://localhost:3000/login
 *
 * Actions:
 * (a) Remove user_restaurants table data
 * (b) Restore unique constraint on users_profiles (manual DB step)
 * (c) Clear restaurant_id from products (manual step if needed)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function rollback() {
  console.log('🔄 Starting multi-restaurant rollback...');

  // (a) Clear user_restaurants
  console.log('🗑️  Clearing user_restaurants...');
  const { error: clearError } = await supabase
    .from('user_restaurants')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (clearError) throw clearError;
  console.log('✅ Cleared user_restaurants table');

  // (b) Restore unique constraint on users_profiles.user_id
  console.log('🔒 Restoring unique constraint on users_profiles...');
  const { error: _indexError } = await supabase.rpc('create_index_if_not_exists', {
    table_name: 'users_profiles',
    index_name: 'idx_users_profiles_user_id_unique',
    index_sql: 'CREATE UNIQUE INDEX idx_users_profiles_user_id_unique ON users_profiles(user_id)'
  });
  
  // Alternative: direct SQL since rpc may not exist
  // await supabase.query('CREATE UNIQUE INDEX idx_users_profiles_user_id_unique ON users_profiles(user_id)');
  console.log('✅ Unique constraint restoration attempted — verify manually in DB');
  
  console.log('✅ Rollback complete. NOTE: Clear restaurant_id from products manually if needed.');
}

rollback().catch(console.error);