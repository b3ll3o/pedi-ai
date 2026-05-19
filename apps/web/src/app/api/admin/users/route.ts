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

    const role = profileResult[0].role;
    if (role !== 'dono' && role !== 'gerente') {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    // Get users for this restaurant
    const usersResult = await sql`
      SELECT * FROM users_profiles
      WHERE restaurant_id = ${restaurantId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ users: usersResult });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
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
    const { restaurant_id, email, name, role } = body;

    if (!restaurant_id || !email || !name || !role) {
      return NextResponse.json(
        { error: 'restaurant_id, email, name e role são obrigatórios' },
        { status: 400 }
      );
    }

    // Verify requesting user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    // Check if user already exists
    const existingResult = await sql`
      SELECT id FROM users_profiles WHERE email = ${email} AND restaurant_id = ${restaurant_id}
    `;

    if (existingResult[0]) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este email neste restaurante' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Create new user profile
    const newUser = {
      id: crypto.randomUUID(),
      user_id: null, // Will be linked when they sign up
      restaurant_id,
      email,
      name,
      role,
      created_at: now,
      updated_at: now,
    };

    await sql`
      INSERT INTO users_profiles (id, user_id, restaurant_id, email, name, role, created_at, updated_at)
      VALUES (
        ${newUser.id},
        ${newUser.user_id},
        ${newUser.restaurant_id},
        ${newUser.email},
        ${newUser.name},
        ${newUser.role},
        ${newUser.created_at},
        ${newUser.updated_at}
      )
    `;

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
