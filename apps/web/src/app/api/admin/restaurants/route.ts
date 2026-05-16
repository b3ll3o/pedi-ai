import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { restaurants, usersProfiles, subscriptions } from '@/infrastructure/database/schema';
import { eq, inArray } from 'drizzle-orm';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Auth client for validating user sessions via cookies
 */
async function getSupabaseAuth() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component - ignore
          }
        },
      },
    }
  );
}

export async function GET() {
  try {
    // Validate user session via cookies (uses anon key for auth)
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (isDevDatabase()) {
      // Get user's profiles using Drizzle
      const profilesResult = await db
        .select({ restaurant_id: usersProfiles.restaurant_id, role: usersProfiles.role })
        .from(usersProfiles)
        .where(eq(usersProfiles.user_id, user.id));

      const restaurantIds = profilesResult
        .map((p) => p.restaurant_id)
        .filter((id): id is string => id !== null);

      if (restaurantIds.length === 0) {
        return NextResponse.json({ restaurants: [] });
      }

      // Get restaurant details
      const restaurantsResult = await db
        .select()
        .from(restaurants)
        .where(inArray(restaurants.id, restaurantIds));

      // Get team count for each restaurant
      const teamCountsResult = await db
        .select({ restaurant_id: usersProfiles.restaurant_id })
        .from(usersProfiles)
        .where(inArray(usersProfiles.restaurant_id, restaurantIds));

      const teamCountMap = teamCountsResult.reduce(
        (acc, curr) => {
          if (curr.restaurant_id) {
            acc[curr.restaurant_id] = (acc[curr.restaurant_id] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      const restaurantsWithTeamCount = restaurantsResult.map((r) => ({
        ...r,
        team_count: teamCountMap[r.id] || 0,
      }));

      return NextResponse.json({ restaurants: restaurantsWithTeamCount });
    }

    // Production: use Supabase
    const supabaseAdmin = getSupabaseAdmin();

    // Get user's restaurants via users_profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('users_profiles')
      .select('restaurant_id, role')
      .eq('user_id', user.id);

    if (profilesError) {
      console.error('Error fetching profiles:', JSON.stringify(profilesError, null, 2));
      console.error('User ID from cookie:', user.id);
      console.error('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'NOT SET');
      return NextResponse.json({ error: 'Erro ao buscar restaurantes' }, { status: 500 });
    }

    const restaurantIds =
      profiles?.map((p) => p.restaurant_id).filter((id): id is string => id !== null) || [];

    if (restaurantIds.length === 0) {
      return NextResponse.json({ restaurants: [] });
    }

    // Get restaurant details
    const { data: restaurantsData, error: restaurantsError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .in('id', restaurantIds);

    if (restaurantsError) {
      console.error('Error fetching restaurants:', restaurantsError);
      return NextResponse.json({ error: 'Erro ao buscar restaurantes' }, { status: 500 });
    }

    // Get team count for each restaurant
    const { data: teamCounts } = await supabaseAdmin
      .from('users_profiles')
      .select('restaurant_id')
      .in('restaurant_id', restaurantIds);

    const teamCountMap =
      teamCounts?.reduce(
        (acc, curr) => {
          if (curr.restaurant_id) {
            acc[curr.restaurant_id] = (acc[curr.restaurant_id] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      ) || {};

    const restaurantsWithTeamCount = (restaurantsData || []).map((r) => ({
      ...r,
      team_count: teamCountMap[r.id] || 0,
    }));

    return NextResponse.json({ restaurants: restaurantsWithTeamCount });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate user session via cookies (uses anon key for auth)
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, address, phone, logo_url } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (isDevDatabase()) {
      // Create restaurant using Drizzle
      const newRestaurant = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        logo_url: logo_url || null,
        active: true,
        created_at: now,
        updated_at: now,
      };

      await db.insert(restaurants).values(newRestaurant);

      // Add user as owner
      const ownerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      await db.insert(usersProfiles).values({
        id: crypto.randomUUID(),
        user_id: user.id,
        restaurant_id: newRestaurant.id,
        role: 'dono',
        name: ownerName,
        email: user.email || '',
        created_at: now,
      });

      // Create subscription with 14-day free trial
      const trialDays = 14;
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      await db.insert(subscriptions).values({
        id: crypto.randomUUID(),
        restaurant_id: newRestaurant.id,
        status: 'trial',
        plan_type: 'monthly',
        price_cents: 1999,
        currency: 'BRL',
        trial_days: trialDays,
        trial_started_at: now,
        trial_ends_at: trialEndsAt.toISOString(),
        created_at: now,
        updated_at: now,
        version: 1,
      });

      return NextResponse.json({ restaurant: newRestaurant }, { status: 201 });
    }

    // Production: use Supabase
    const supabaseAdmin = getSupabaseAdmin();

    // Create restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        logo_url: logo_url || null,
      })
      .select()
      .single();

    if (restaurantError) {
      console.error('Error creating restaurant:', restaurantError);
      return NextResponse.json({ error: 'Erro ao criar restaurante' }, { status: 500 });
    }

    // Add user as owner
    const ownerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const { error: profileError } = await supabaseAdmin.from('users_profiles').insert({
      user_id: user.id,
      restaurant_id: restaurant.id,
      role: 'dono',
      name: ownerName,
      email: user.email || '',
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Rollback restaurant creation
      await supabaseAdmin.from('restaurants').delete().eq('id', restaurant.id);
      return NextResponse.json({ error: 'Erro ao configurar restaurante' }, { status: 500 });
    }

    // Create subscription with 14-day free trial
    const trialDays = 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const { error: subscriptionError } = await supabaseAdmin.from('subscriptions').insert({
      restaurant_id: restaurant.id,
      status: 'trial',
      plan_type: 'monthly',
      price_cents: 1999,
      currency: 'BRL',
      trial_days: trialDays,
      trial_started_at: new Date().toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
    });

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      // Non-fatal: restaurant created, subscription failure shouldn't rollback
    }

    return NextResponse.json({ restaurant }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/restaurants:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
