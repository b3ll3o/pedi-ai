import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: comboId } = await params;

    // Get combo
    const comboResult = await sql`SELECT * FROM combos WHERE id = ${comboId} LIMIT 1`;

    if (!comboResult[0]) {
      return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${comboResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Get combo items
    const itemsResult = await sql`
      SELECT ci.*, p.name as product_name, p.price_cents as product_price
      FROM combo_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE ci.combo_id = ${comboId}
    `;

    return NextResponse.json({
      combo: { ...comboResult[0], items: itemsResult },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/combos/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: comboId } = await params;
    const body = await request.json();
    const { name, description, price_cents, active, items } = body;

    // Get combo first
    const comboResult = await sql`SELECT * FROM combos WHERE id = ${comboId} LIMIT 1`;

    if (!comboResult[0]) {
      return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${comboResult[0].restaurant_id}
      LIMIT 1
    `;

    if (
      !profileResult[0] ||
      (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')
    ) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Update combo
    await sql`
      UPDATE combos
      SET
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description !== undefined ? description?.trim() || null : null}, description),
        price_cents = COALESCE(${price_cents}, price_cents),
        active = COALESCE(${active}, active),
        updated_at = ${now}
      WHERE id = ${comboId}
    `;

    // Update combo items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await sql`DELETE FROM combo_items WHERE combo_id = ${comboId}`;

      // Insert new items
      for (const item of items) {
        await sql`
          INSERT INTO combo_items (id, combo_id, product_id, quantity, created_at)
          VALUES (
            ${crypto.randomUUID()},
            ${comboId},
            ${item.product_id},
            ${item.quantity || 1},
            ${now}
          )
        `;
      }
    }

    // Fetch updated combo with items
    const updatedCombo = await sql`SELECT * FROM combos WHERE id = ${comboId} LIMIT 1`;
    const itemsResult = await sql`
      SELECT ci.*, p.name as product_name, p.price_cents as product_price
      FROM combo_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE ci.combo_id = ${comboId}
    `;

    return NextResponse.json({
      combo: { ...updatedCombo[0], items: itemsResult },
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/combos/[id]:', error);
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
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: comboId } = await params;

    // Get combo first
    const comboResult = await sql`SELECT * FROM combos WHERE id = ${comboId} LIMIT 1`;

    if (!comboResult[0]) {
      return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${comboResult[0].restaurant_id}
      LIMIT 1
    `;

    if (
      !profileResult[0] ||
      (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')
    ) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    // Soft delete combo
    await sql`
      UPDATE combos SET active = false, updated_at = ${new Date().toISOString()}
      WHERE id = ${comboId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/combos/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
