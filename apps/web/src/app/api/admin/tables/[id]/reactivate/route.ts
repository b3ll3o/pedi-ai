import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: tableId } = await params;

    // Get table first
    const tableResult = await sql`SELECT * FROM tables WHERE id = ${tableId} LIMIT 1`;

    if (!tableResult[0]) {
      return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 });
    }

    // Verify user has access
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${tableResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Reactivate table
    await sql`
      UPDATE tables SET active = true, updated_at = ${now}
      WHERE id = ${tableId}
    `;

    // Fetch updated table
    const updatedTable = await sql`SELECT * FROM tables WHERE id = ${tableId} LIMIT 1`;

    return NextResponse.json({ table: updatedTable[0] });
  } catch (error) {
    console.error('Error in POST /api/admin/tables/[id]/reactivate:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
