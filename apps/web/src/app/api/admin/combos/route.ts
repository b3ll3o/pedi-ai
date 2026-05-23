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

    // Get combos with items
    const combosResult = await sql`
      SELECT * FROM combos
      WHERE restaurant_id = ${restaurantId}
      ORDER BY created_at DESC
    `;

    const comboIds = combosResult.map((c: { id: string }) => c.id);

    if (comboIds.length === 0) {
      return NextResponse.json({ combos: [] });
    }

    // Get combo items
    const comboItemsResult = await sql`
      SELECT ci.*, p.name as product_name, p.price_cents as product_price
      FROM combo_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE ci.combo_id = ANY(${comboIds})
    `;

    // Group items by combo_id
    const itemsByComboId = comboItemsResult.reduce(
      (acc: Record<string, unknown[]>, curr: { combo_id: string }) => {
        if (!acc[curr.combo_id]) {
          acc[curr.combo_id] = [];
        }
        acc[curr.combo_id].push(curr);
        return acc;
      },
      {} as Record<string, unknown[]>
    );

    // Attach items to combos
    const combosWithItems = combosResult.map((c: Record<string, unknown>) => ({
      ...c,
      items: itemsByComboId[c.id as string] || [],
    }));

    return NextResponse.json({ combos: combosWithItems });
  } catch (error) {
    console.error('Error in GET /api/admin/combos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

async function insertComboItem(
  comboId: string,
  item: { product_id: string; quantity?: number },
  now: string
): Promise<void> {
  const newItem = {
    id: crypto.randomUUID(),
    combo_id: comboId,
    product_id: item.product_id,
    quantity: item.quantity || 1,
    created_at: now,
  };

  await sql`
    INSERT INTO combo_items (id, combo_id, product_id, quantity, created_at)
    VALUES (
      ${newItem.id},
      ${newItem.combo_id},
      ${newItem.product_id},
      ${newItem.quantity},
      ${newItem.created_at}
    )
  `;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { restaurant_id, name, description, price_cents, active, items } = body;

    if (!restaurant_id || !name || price_cents === undefined) {
      return NextResponse.json(
        { error: 'restaurant_id, name e price_cents são obrigatórios' },
        { status: 400 }
      );
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${session.user.id} AND restaurant_id = ${restaurant_id}
      LIMIT 1
    `;

    if (
      !profileResult[0] ||
      (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')
    ) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Create new combo
    const newCombo = {
      id: crypto.randomUUID(),
      restaurant_id,
      name: name.trim(),
      description: description?.trim() || null,
      price_cents,
      active: active !== false,
      created_at: now,
      updated_at: now,
    };

    await sql`
      INSERT INTO combos (id, restaurant_id, name, description, price_cents, active, created_at, updated_at)
      VALUES (
        ${newCombo.id},
        ${newCombo.restaurant_id},
        ${newCombo.name},
        ${newCombo.description},
        ${newCombo.price_cents},
        ${newCombo.active},
        ${newCombo.created_at},
        ${newCombo.updated_at}
      )
    `;

    // Add combo items if provided
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await insertComboItem(newCombo.id, item, now);
      }
    }

    return NextResponse.json({ combo: { ...newCombo, items: items || [] } }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/combos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
