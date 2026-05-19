import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabaseAuth() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component - ignore
          }
        },
      },
    }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: userId } = await params;

    // Get user profile
    const userResult = await sql`
      SELECT * FROM users_profiles WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult[0]) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verify requesting user has access to same restaurant
    const requestingUserResult = await sql`
      SELECT role, restaurant_id FROM users_profiles
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    if (!requestingUserResult[0]) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (requestingUserResult[0].restaurant_id !== userResult[0].restaurant_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json({ user: userResult[0] });
  } catch (error) {
    console.error('Error in GET /api/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: userId } = await params;
    const body = await request.json();
    const { name, email, role } = body;

    // Get target user
    const userResult = await sql`
      SELECT * FROM users_profiles WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult[0]) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verify requesting user has access
    const requestingUserResult = await sql`
      SELECT role, restaurant_id FROM users_profiles
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    if (!requestingUserResult[0]) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (requestingUserResult[0].restaurant_id !== userResult[0].restaurant_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Only owners can change roles
    if (role && requestingUserResult[0].role !== 'dono') {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode alterar cargos' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // Update user
    await sql`
      UPDATE users_profiles
      SET
        name = COALESCE(${name || null}, name),
        email = COALESCE(${email || null}, email),
        role = COALESCE(${role || null}, role),
        updated_at = ${now}
      WHERE id = ${userId}
    `;

    // Fetch updated user
    const updatedUser = await sql`
      SELECT * FROM users_profiles WHERE id = ${userId} LIMIT 1
    `;

    return NextResponse.json({ user: updatedUser[0] });
  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: userId } = await params;

    // Get target user
    const userResult = await sql`
      SELECT * FROM users_profiles WHERE id = ${userId} LIMIT 1
    `;

    if (!userResult[0]) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verify requesting user is owner
    const requestingUserResult = await sql`
      SELECT role, restaurant_id FROM users_profiles
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    if (!requestingUserResult[0] || requestingUserResult[0].role !== 'dono') {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode remover usuários' },
        { status: 403 }
      );
    }

    if (requestingUserResult[0].restaurant_id !== userResult[0].restaurant_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Delete user
    await sql`DELETE FROM users_profiles WHERE id = ${userId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
