import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { restaurants, usersProfiles } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: restaurantId } = await params;

    if (isDevDatabase()) {
      // Verify user is owner
      const profileResult = await db
        .select({ role: usersProfiles.role })
        .from(usersProfiles)
        .where(eq(usersProfiles.user_id, user.id))
        .limit(1)
        .get();

      if (!profileResult || profileResult.role !== 'dono') {
        return NextResponse.json(
          { error: 'Apenas o proprietário pode desativar um restaurante' },
          { status: 403 }
        );
      }

      // Check if restaurant exists and is active
      const restaurantResult = await db
        .select({ active: restaurants.active })
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1)
        .get();

      if (!restaurantResult) {
        return NextResponse.json(
          { error: 'Restaurante não encontrado' },
          { status: 404 }
        );
      }

      if (restaurantResult.active === false) {
        return NextResponse.json(
          { error: 'Este restaurante já está desativado' },
          { status: 400 }
        );
      }

      // Deactivate restaurant (soft delete)
      await db.update(restaurants).set({ active: false, updated_at: new Date().toISOString() }).where(eq(restaurants.id, restaurantId));

      // Fetch updated restaurant
      const deactivatedRestaurant = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1)
        .get();

      return NextResponse.json({ restaurant: deactivatedRestaurant });
    }

    // Production: use Supabase
    const supabaseAdmin = getSupabaseAdmin();

    // Verify user is owner
    const { data: profile } = await supabaseAdmin
      .from('users_profiles')
      .select('role')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!profile || profile.role !== 'dono') {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode desativar um restaurante' },
        { status: 403 }
      );
    }

    // Check if restaurant exists and is active
    const { data: restaurant, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('active')
      .eq('id', restaurantId)
      .single();

    if (fetchError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      );
    }

    if (restaurant.active === false) {
      return NextResponse.json(
        { error: 'Este restaurante já está desativado' },
        { status: 400 }
      );
    }

    // Deactivate restaurant (soft delete)
    const { data: deactivatedRestaurant, error: deactivateError } = await supabaseAdmin
      .from('restaurants')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', restaurantId)
      .select()
      .single();

    if (deactivateError) {
      console.error('Error deactivating restaurant:', deactivateError);
      return NextResponse.json(
        { error: 'Erro ao desativar restaurante' },
        { status: 500 }
      );
    }

    return NextResponse.json({ restaurant: deactivatedRestaurant });
  } catch (error) {
    console.error('Error in POST /api/admin/restaurants/[id]/deactivate:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
