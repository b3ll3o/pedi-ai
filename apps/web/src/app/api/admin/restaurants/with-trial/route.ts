import { NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const now = new Date().toISOString();

    // Get all restaurants owned by the user
    const profilesResult = await sql`
      SELECT restaurant_id FROM users_profiles
      WHERE user_id = ${userId} AND role = 'dono'
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
        r.subscription_status === 'trial' && trialEndsAt && new Date(trialEndsAt) > new Date(now)
      );
    });

    return NextResponse.json({ restaurants: restaurantsWithTrial });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants/with-trial:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
