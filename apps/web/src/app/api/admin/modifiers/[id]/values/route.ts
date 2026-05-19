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

    const { id: modifierId } = await params;

    // Get modifier values
    const valuesResult = await sql`
      SELECT * FROM modifier_values
      WHERE modifier_id = ${modifierId}
      ORDER BY position ASC
    `;

    return NextResponse.json({ values: valuesResult });
  } catch (error) {
    console.error('Error in GET /api/admin/modifiers/[id]/values:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: modifierId } = await params;
    const body = await request.json();
    const { name, price_cents, position } = body;

    // Get modifier to check restaurant
    const modifierResult = await sql`SELECT * FROM modifiers WHERE id = ${modifierId} LIMIT 1`;

    if (!modifierResult[0]) {
      return NextResponse.json({ error: 'Modificador não encontrado' }, { status: 404 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${modifierResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Get max position if not provided
    let positionValue = position;
    if (positionValue === undefined) {
      const maxPosResult = await sql`
        SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM modifier_values
        WHERE modifier_id = ${modifierId}
      `;
      positionValue = maxPosResult[0]?.next_pos || 1;
    }

    // Create new modifier value
    const newValue = {
      id: crypto.randomUUID(),
      modifier_id: modifierId,
      name: name.trim(),
      price_cents: price_cents || 0,
      position: positionValue,
      active: true,
      created_at: now,
      updated_at: now,
    };

    await sql`
      INSERT INTO modifier_values (id, modifier_id, name, price_cents, position, active, created_at, updated_at)
      VALUES (
        ${newValue.id},
        ${newValue.modifier_id},
        ${newValue.name},
        ${newValue.price_cents},
        ${newValue.position},
        ${newValue.active},
        ${newValue.created_at},
        ${newValue.updated_at}
      )
    `;

    return NextResponse.json({ value: newValue }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/modifiers/[id]/values:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
