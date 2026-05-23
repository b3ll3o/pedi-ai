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

    // Get products for this restaurant with category info
    const productsResult = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.restaurant_id = ${restaurantId}
      ORDER BY c.position ASC, p.created_at DESC
    `;

    return NextResponse.json({ products: productsResult });
  } catch (error) {
    console.error('Error in GET /api/admin/products:', error);
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
    const {
      restaurant_id,
      category_id,
      name,
      description,
      price_cents,
      image_url,
      preparation_time_minutes,
      active,
    } = body;

    if (!restaurant_id || !name || price_cents === undefined) {
      return NextResponse.json(
        { error: 'restaurant_id, name e price_cents são obrigatórios' },
        { status: 400 }
      );
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

    // Create new product
    const newProduct = {
      id: crypto.randomUUID(),
      restaurant_id,
      category_id: category_id || null,
      name: name.trim(),
      description: description?.trim() || null,
      price_cents,
      image_url: image_url || null,
      preparation_time_minutes: preparation_time_minutes || null,
      active: active !== false,
      created_at: now,
      updated_at: now,
    };

    await sql`
      INSERT INTO products (
        id, restaurant_id, category_id, name, description, price_cents,
        image_url, preparation_time_minutes, active, created_at, updated_at
      )
      VALUES (
        ${newProduct.id},
        ${newProduct.restaurant_id},
        ${newProduct.category_id},
        ${newProduct.name},
        ${newProduct.description},
        ${newProduct.price_cents},
        ${newProduct.image_url},
        ${newProduct.preparation_time_minutes},
        ${newProduct.active},
        ${newProduct.created_at},
        ${newProduct.updated_at}
      )
    `;

    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/products:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
