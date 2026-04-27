#!/usr/bin/env tsx
/**
 * Script: migrate-to-multi-restaurant.ts
 * Purpose: Migrate existing 1:1 user-restaurant relationship to N:N
 * 
 * Actions:
 * (a) Populate user_restaurants from existing users_profiles (one record per user-restaurant)
 * (b) Backfill restaurant_id in products table via category relationship  
 * (c) Validate no orphan records exist
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
  console.log('🔄 Starting multi-restaurant migration...');

  // (a) Populate user_restaurants from users_profiles
  console.log('📋 Populating user_restaurants from users_profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('users_profiles')
    .select('user_id, restaurant_id, role');

  if (profilesError) throw profilesError;

  const userRestaurants = profiles.map(p => ({
    user_id: p.user_id,
    restaurant_id: p.restaurant_id,
    role: p.role,
  }));

  const { error: insertError } = await supabase
    .from('user_restaurants')
    .upsert(userRestaurants, { onConflict: 'user_id,restaurant_id' });

  if (insertError) throw insertError;
  console.log(`✅ Inserted ${userRestaurants.length} user_restaurants records`);

  // (b) Backfill restaurant_id in products
  console.log('📋 Backfilling restaurant_id in products...');
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, restaurant_id');

  if (catError) throw catError;

  const categoryMap = new Map(categories.map(c => [c.id, c.restaurant_id]));
  
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, category_id');

  if (prodError) throw prodError;

  const updates = products
    .map(p => ({
      id: p.id,
      restaurant_id: categoryMap.get(p.category_id),
    }))
    .filter(p => p.restaurant_id);

  for (const update of updates) {
    await supabase
      .from('products')
      .update({ restaurant_id: update.restaurant_id })
      .eq('id', update.id);
  }
  console.log(`✅ Backfilled restaurant_id for ${updates.length} products`);

  // (c) Validate no orphan records
  console.log('🔍 Validating data integrity...');

  const { count: orphanProducts } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .is('restaurant_id', null);

  if (orphanProducts && orphanProducts > 0) {
    console.warn(`⚠️  ${orphanProducts} products without restaurant_id — manual review needed`);
  } else {
    console.log('✅ No orphan products found');
  }

  const { count: orphanUsers } = await supabase
    .from('users_profiles')
    .select('id', { count: 'exact', head: true });

  console.log(`✅ Migration complete. ${orphanUsers} users_profiles records processed.`);
}

migrate().catch(console.error);