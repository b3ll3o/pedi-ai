import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: restaurantId } = await params;

    // Verify user has access and is owner
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!profileResult[0] || profileResult[0].role !== 'dono') {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode desativar um restaurante' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // Soft delete restaurant
    await sql`
      UPDATE restaurants
      SET active = false, updated_at = ${now}
      WHERE id = ${restaurantId}
    `;

    // Also cancel any active subscriptions
    await sql`
      UPDATE subscriptions
      SET status = 'canceled', updated_at = ${now}
      WHERE restaurant_id = ${restaurantId} AND status = 'active'
    `;

    return NextResponse.json({
      success: true,
      message: 'Restaurante desativado com sucesso',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/restaurants/[id]/deactivate:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
