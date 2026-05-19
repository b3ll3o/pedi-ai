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
      return NextResponse.json({ error: 'Acesso negado a esta mesa' }, { status: 403 });
    }

    return NextResponse.json({ table: tableResult[0] });
  } catch (error) {
    console.error('Error in GET /api/admin/tables/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: tableId } = await params;
    const body = await request.json();
    const { name, capacity, table_number, active } = body;

    // Get table first
    const tableResult = await sql`SELECT * FROM tables WHERE id = ${tableId} LIMIT 1`;

    if (!tableResult[0]) {
      return NextResponse.json({ error: 'Mesa não encontrada' }, { status: 404 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${tableResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Update table
    await sql`
      UPDATE tables
      SET
        name = COALESCE(${name || null}, name),
        capacity = COALESCE(${capacity}, capacity),
        table_number = COALESCE(${table_number}, table_number),
        active = COALESCE(${active}, active),
        updated_at = ${now}
      WHERE id = ${tableId}
    `;

    // Fetch updated table
    const updatedTable = await sql`SELECT * FROM tables WHERE id = ${tableId} LIMIT 1`;

    return NextResponse.json({ table: updatedTable[0] });
  } catch (error) {
    console.error('Error in PUT /api/admin/tables/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Verify user is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${tableResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    // Soft delete table
    await sql`
      UPDATE tables SET active = false, updated_at = ${new Date().toISOString()}
      WHERE id = ${tableId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/tables/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
