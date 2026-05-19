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

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado a este restaurante' }, { status: 403 });
    }

    // Get subscription
    const subscriptionResult = await sql`
      SELECT s.*, r.name as restaurant_name
      FROM subscriptions s
      LEFT JOIN restaurants r ON s.restaurant_id = r.id
      WHERE s.restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!subscriptionResult[0]) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ subscription: subscriptionResult[0] });
  } catch (error) {
    console.error('Error in GET /api/admin/subscriptions:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { restaurant_id, plan_type, price_cents } = body;

    if (!restaurant_id || !plan_type) {
      return NextResponse.json(
        { error: 'restaurant_id e plan_type são obrigatórios' },
        { status: 400 }
      );
    }

    // Verify user is owner
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || profileResult[0].role !== 'dono') {
      return NextResponse.json({ error: 'Apenas o proprietário pode alterar a assinatura' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Check for existing subscription
    const existingSubscription = await sql`
      SELECT * FROM subscriptions WHERE restaurant_id = ${restaurant_id} LIMIT 1
    `;

    if (existingSubscription[0]) {
      // Update existing subscription
      await sql`
        UPDATE subscriptions
        SET
          plan_type = ${plan_type},
          price_cents = ${price_cents || existingSubscription[0].price_cents},
          status = 'active',
          updated_at = ${now}
        WHERE restaurant_id = ${restaurant_id}
      `;
    } else {
      // Create new subscription
      const trialDays = 14;
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      await sql`
        INSERT INTO subscriptions (
          id, restaurant_id, status, plan_type, price_cents, currency,
          trial_days, trial_started_at, trial_ends_at, created_at, updated_at, version
        )
        VALUES (
          ${crypto.randomUUID()},
          ${restaurant_id},
          'trial',
          ${plan_type},
          ${price_cents || 1999},
          'BRL',
          ${trialDays},
          ${now},
          ${trialEndsAt.toISOString()},
          ${now},
          ${now},
          1
        )
      `;
    }

    // Fetch updated subscription
    const updatedSubscription = await sql`
      SELECT s.*, r.name as restaurant_name
      FROM subscriptions s
      LEFT JOIN restaurants r ON s.restaurant_id = r.id
      WHERE s.restaurant_id = ${restaurant_id}
      LIMIT 1
    `;

    return NextResponse.json({ subscription: updatedSubscription[0] });
  } catch (error) {
    console.error('Error in POST /api/admin/subscriptions:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
