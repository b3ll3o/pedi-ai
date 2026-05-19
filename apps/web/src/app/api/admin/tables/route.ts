import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado a este restaurante' }, { status: 403 });
    }

    // Get tables for this restaurant
    const tablesResult = await sql`
      SELECT * FROM tables
      WHERE restaurant_id = ${restaurantId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ tables: tablesResult });
  } catch (error) {
    console.error('Error in GET /api/admin/tables:', error);
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

    const body = await request.json();
    const { restaurant_id, name, capacity, table_number } = body;

    if (!restaurant_id || !name) {
      return NextResponse.json(
        { error: 'restaurant_id e name são obrigatórios' },
        { status: 400 }
      );
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Create new table
    const newTable = {
      id: crypto.randomUUID(),
      restaurant_id,
      name: name.trim(),
      capacity: capacity || null,
      table_number: table_number || null,
      active: true,
      created_at: now,
      updated_at: now,
    };

    await sql`
      INSERT INTO tables (id, restaurant_id, name, capacity, table_number, active, created_at, updated_at)
      VALUES (
        ${newTable.id},
        ${newTable.restaurant_id},
        ${newTable.name},
        ${newTable.capacity},
        ${newTable.table_number},
        ${newTable.active},
        ${newTable.created_at},
        ${newTable.updated_at}
      )
    `;

    return NextResponse.json({ table: newTable }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/tables:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
