import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's profiles using postgres
    const profilesResult = await sql`
      SELECT restaurant_id, role FROM users_profiles WHERE user_id = ${userId}
    `;

    const restaurantIds = profilesResult
      .map((p: { restaurant_id: string | null }) => p.restaurant_id)
      .filter((id: string | null): id is string => id !== null);

    if (restaurantIds.length === 0) {
      return NextResponse.json({ restaurants: [] });
    }

    // Get restaurant details
    const restaurantsResult = await sql`
      SELECT * FROM restaurants WHERE id = ANY(${restaurantIds})
    `;

    // Get team count for each restaurant
    const teamCountsResult = await sql`
      SELECT restaurant_id FROM users_profiles WHERE restaurant_id = ANY(${restaurantIds})
    `;

    const teamCountMap = teamCountsResult.reduce(
      (acc: Record<string, number>, curr: { restaurant_id: string | null }) => {
        if (curr.restaurant_id) {
          acc[curr.restaurant_id] = (acc[curr.restaurant_id] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const restaurantsWithTeamCount = restaurantsResult.map((r: Record<string, unknown>) => ({
      ...r,
      team_count: teamCountMap[r.id as string] || 0,
    }));

    return NextResponse.json({ restaurants: restaurantsWithTeamCount });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    const body = await request.json();
    const { name, description, address, phone, logo_url } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Create restaurant using postgres
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

    await sql`
      INSERT INTO restaurants (id, name, description, address, phone, logo_url, active, created_at, updated_at)
      VALUES (
        ${newRestaurant.id},
        ${newRestaurant.name},
        ${newRestaurant.description},
        ${newRestaurant.address},
        ${newRestaurant.phone},
        ${newRestaurant.logo_url},
        ${newRestaurant.active},
        ${newRestaurant.created_at},
        ${newRestaurant.updated_at}
      )
    `;

    // Add user as owner
    const ownerName = userEmail?.split('@')[0] || 'User';
    await sql`
      INSERT INTO users_profiles (id, user_id, restaurant_id, role, name, email, created_at)
      VALUES (
        ${crypto.randomUUID()},
        ${userId},
        ${newRestaurant.id},
        'dono',
        ${ownerName},
        ${userEmail || ''},
        ${now}
      )
    `;

    // Create subscription with 14-day free trial
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
        ${newRestaurant.id},
        'trial',
        'monthly',
        1999,
        'BRL',
        ${trialDays},
        ${now},
        ${trialEndsAt.toISOString()},
        ${now},
        ${now},
        1
      )
    `;

    return NextResponse.json({ restaurant: newRestaurant }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/restaurants:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
