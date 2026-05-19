import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function GET(
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

    // Get table
    const tableResult = await sql`SELECT * FROM tables WHERE id = ${tableId} LIMIT 1`;

    if (!tableResult[0]) {
      return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${tableResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Generate QR code URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const qrUrl = `${baseUrl}/menu/${tableResult[0].restaurant_id}?table_id=${tableId}`;

    return NextResponse.json({
      table: tableResult[0],
      qr_url: qrUrl,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/tables/[id]/qr:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
