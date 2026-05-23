import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await request.json();
    const { restaurant_id, updates } = body;

    if (!restaurant_id || !updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'restaurant_id e updates (array) são obrigatórios' },
        { status: 400 }
      );
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${restaurant_id}
      LIMIT 1
    `;

    if (
      !profileResult[0] ||
      (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')
    ) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Update each category's position
    for (const update of updates) {
      const { id, position } = update;
      await sql`
        UPDATE categories
        SET position = ${position}, updated_at = ${now}
        WHERE id = ${id} AND restaurant_id = ${restaurant_id}
      `;
    }

    // Fetch updated categories
    const categoriesResult = await sql`
      SELECT * FROM categories
      WHERE restaurant_id = ${restaurant_id}
      ORDER BY position ASC
    `;

    return NextResponse.json({ categories: categoriesResult });
  } catch (error) {
    console.error('Error in POST /api/admin/categories/reorder:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
