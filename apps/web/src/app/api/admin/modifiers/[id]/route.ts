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

    const { id: modifierId } = await params;

    // Get modifier
    const modifierResult = await sql`SELECT * FROM modifiers WHERE id = ${modifierId} LIMIT 1`;

    if (!modifierResult[0]) {
      return NextResponse.json({ error: 'Modificador não encontrado' }, { status: 404 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${modifierResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Get modifier values
    const valuesResult = await sql`
      SELECT * FROM modifier_values
      WHERE modifier_id = ${modifierId}
      ORDER BY position ASC
    `;

    return NextResponse.json({
      modifier: { ...modifierResult[0], values: valuesResult },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/modifiers/[id]:', error);
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

    const { id: modifierId } = await params;
    const body = await request.json();
    const { name, description, min_selections, max_selections, required, active } = body;

    // Get modifier first
    const modifierResult = await sql`SELECT * FROM modifiers WHERE id = ${modifierId} LIMIT 1`;

    if (!modifierResult[0]) {
      return NextResponse.json({ error: 'Modificador não encontrado' }, { status: 404 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${modifierResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Update modifier
    await sql`
      UPDATE modifiers
      SET
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description !== undefined ? (description?.trim() || null) : null}, description),
        min_selections = COALESCE(${min_selections}, min_selections),
        max_selections = COALESCE(${max_selections}, max_selections),
        required = COALESCE(${required}, required),
        active = COALESCE(${active}, active),
        updated_at = ${now}
      WHERE id = ${modifierId}
    `;

    // Fetch updated modifier with values
    const updatedModifier = await sql`SELECT * FROM modifiers WHERE id = ${modifierId} LIMIT 1`;
    const valuesResult = await sql`
      SELECT * FROM modifier_values
      WHERE modifier_id = ${modifierId}
      ORDER BY position ASC
    `;

    return NextResponse.json({
      modifier: { ...updatedModifier[0], values: valuesResult },
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/modifiers/[id]:', error);
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

    const { id: modifierId } = await params;

    // Get modifier first
    const modifierResult = await sql`SELECT * FROM modifiers WHERE id = ${modifierId} LIMIT 1`;

    if (!modifierResult[0]) {
      return NextResponse.json({ error: 'Modificador não encontrado' }, { status: 404 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${modifierResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    // Soft delete modifier
    await sql`
      UPDATE modifiers SET active = false, updated_at = ${new Date().toISOString()}
      WHERE id = ${modifierId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/modifiers/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
