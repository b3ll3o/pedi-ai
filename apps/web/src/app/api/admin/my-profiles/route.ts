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

    // Get user's profiles
    const profilesResult = await sql`
      SELECT up.*, r.name as restaurant_name
      FROM users_profiles up
      LEFT JOIN restaurants r ON up.restaurant_id = r.id
      WHERE up.user_id = ${userId}
    `;

    if (!profilesResult[0]) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ profiles: profilesResult });
  } catch (error) {
    console.error('Error in GET /api/admin/my-profiles:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
