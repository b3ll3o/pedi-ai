import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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

    // Get modifiers with values
    const modifiersResult = await sql`
      SELECT * FROM modifiers
      WHERE restaurant_id = ${restaurantId}
      ORDER BY created_at DESC
    `;

    // Get modifier values
    const modifierIds = modifiersResult.map((m: { id: string }) => m.id);
    let modifierValues: Record<string, unknown>[] = [];

    if (modifierIds.length > 0) {
      modifierValues = await sql`
        SELECT * FROM modifier_values
        WHERE modifier_id = ANY(${modifierIds})
        ORDER BY position ASC
      `;
    }

    // Group values by modifier_id
    const valuesByModifierId = modifierValues.reduce<
      Record<string, { modifier_id: string; name: string; price_adjustment: number; available: boolean; }[]>
    >((acc, curr) => {
        const modifierId = curr.modifier_id as string;
        const item = curr as { modifier_id: string; name: string; price_adjustment: number; available: boolean };
        if (!acc[modifierId]) {
          acc[modifierId] = [];
        }
        acc[modifierId].push(item);
        return acc;
      },
      {} as Record<string, { modifier_id: string; name: string; price_adjustment: number; available: boolean; }[]>
    );

    // Attach values to modifiers
    const modifiersWithValues = modifiersResult.map((m: Record<string, unknown>) => ({
      ...m,
      values: valuesByModifierId[m.id as string] || [],
    }));

    return NextResponse.json({ modifiers: modifiersWithValues });
  } catch (error) {
    console.error('Error in GET /api/admin/modifiers:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await request.json();
    const { restaurant_id, name, description, min_selections, max_selections, required } = body;

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

    // Create new modifier
    const newModifier = {
      id: crypto.randomUUID(),
      restaurant_id,
      name: name.trim(),
      description: description?.trim() || null,
      min_selections: min_selections || 0,
      max_selections: max_selections || null,
      required: required || false,
      active: true,
      created_at: now,
      updated_at: now,
    };

    await sql`
      INSERT INTO modifiers (
        id, restaurant_id, name, description, min_selections, max_selections,
        required, active, created_at, updated_at
      )
      VALUES (
        ${newModifier.id},
        ${newModifier.restaurant_id},
        ${newModifier.name},
        ${newModifier.description},
        ${newModifier.min_selections},
        ${newModifier.max_selections},
        ${newModifier.required},
        ${newModifier.active},
        ${newModifier.created_at},
        ${newModifier.updated_at}
      )
    `;

    return NextResponse.json({ modifier: { ...newModifier, values: [] } }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/modifiers:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
