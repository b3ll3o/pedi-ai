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

    const { id: categoryId } = await params;

    // Get category
    const categoryResult = await sql`SELECT * FROM categories WHERE id = ${categoryId} LIMIT 1`;

    if (!categoryResult[0]) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${categoryResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json({ category: categoryResult[0] });
  } catch (error) {
    console.error('Error in GET /api/admin/categories/[id]:', error);
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

    const { id: categoryId } = await params;
    const body = await request.json();
    const { name, description, position, active } = body;

    // Get category first
    const categoryResult = await sql`SELECT * FROM categories WHERE id = ${categoryId} LIMIT 1`;

    if (!categoryResult[0]) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${categoryResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Update category
    await sql`
      UPDATE categories
      SET
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description !== undefined ? (description?.trim() || null) : null}, description),
        position = COALESCE(${position}, position),
        active = COALESCE(${active}, active),
        updated_at = ${now}
      WHERE id = ${categoryId}
    `;

    // Fetch updated category
    const updatedCategory = await sql`SELECT * FROM categories WHERE id = ${categoryId} LIMIT 1`;

    return NextResponse.json({ category: updatedCategory[0] });
  } catch (error) {
    console.error('Error in PUT /api/admin/categories/[id]:', error);
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

    const { id: categoryId } = await params;

    // Get category first
    const categoryResult = await sql`SELECT * FROM categories WHERE id = ${categoryId} LIMIT 1`;

    if (!categoryResult[0]) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${categoryResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    // Soft delete category
    await sql`
      UPDATE categories SET active = false, updated_at = ${new Date().toISOString()}
      WHERE id = ${categoryId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/categories/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
