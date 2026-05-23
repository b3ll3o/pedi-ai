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

    // Get categories for this restaurant
    const categoriesResult = await sql`
      SELECT * FROM categories
      WHERE restaurant_id = ${restaurantId}
      ORDER BY position ASC, created_at ASC
    `;

    return NextResponse.json({ categories: categoriesResult });
  } catch (error) {
    console.error('Error in GET /api/admin/categories:', error);
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
    const { restaurant_id, name, description, position } = body;

    if (!restaurant_id || !name) {
      return NextResponse.json({ error: 'restaurant_id e name são obrigatórios' }, { status: 400 });
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

    // Get max position if not provided
    let positionValue = position;
    if (positionValue === undefined) {
      const maxPosResult = await sql`
        SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM categories
        WHERE restaurant_id = ${restaurant_id}
      `;
      positionValue = maxPosResult[0]?.next_pos || 1;
    }

    // Create new category
    const newCategory = {
      id: crypto.randomUUID(),
      restaurant_id,
      name: name.trim(),
      description: description?.trim() || null,
      position: positionValue,
      active: true,
      created_at: now,
      updated_at: now,
    };

    await sql`
      INSERT INTO categories (id, restaurant_id, name, description, position, active, created_at, updated_at)
      VALUES (
        ${newCategory.id},
        ${newCategory.restaurant_id},
        ${newCategory.name},
        ${newCategory.description},
        ${newCategory.position},
        ${newCategory.active},
        ${newCategory.created_at},
        ${newCategory.updated_at}
      )
    `;

    return NextResponse.json({ category: newCategory }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/categories:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
