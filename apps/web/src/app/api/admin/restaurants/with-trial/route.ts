import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
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

export async function GET() {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // Get all restaurants owned by the user
    const profilesResult = await sql`
      SELECT restaurant_id FROM users_profiles
      WHERE user_id = ${user.id} AND role = 'dono'
    `;

    if (!profilesResult[0]) {
      return NextResponse.json({ error: 'Nenhum restaurante encontrado' }, { status: 404 });
    }

    const restaurantIds = profilesResult.map((p: { restaurant_id: string }) => p.restaurant_id);

    // Get restaurants with their subscriptions that are in trial
    const restaurantsResult = await sql`
      SELECT r.*, s.status as subscription_status, s.trial_ends_at
      FROM restaurants r
      LEFT JOIN subscriptions s ON r.id = s.restaurant_id
      WHERE r.id = ANY(${restaurantIds}) AND r.active = true
    `;

    // Filter to only those in trial
    const restaurantsWithTrial = restaurantsResult.filter((r: Record<string, unknown>) => {
      const trialEndsAt = r.trial_ends_at as string | null;
      return (
        r.subscription_status === 'trial' &&
        trialEndsAt &&
        new Date(trialEndsAt) > new Date(now)
      );
    });

    return NextResponse.json({ restaurants: restaurantsWithTrial });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants/with-trial:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
