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

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { modifier_id, name, price_cents, position } = body;

    if (!modifier_id || !name) {
      return NextResponse.json(
        { error: 'modifier_id e name são obrigatórios' },
        { status: 400 }
      );
    }

    // Get modifier to check restaurant
    const modifierResult = await sql`SELECT * FROM modifiers WHERE id = ${modifier_id} LIMIT 1`;

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

    // Get max position if not provided
    let positionValue = position;
    if (positionValue === undefined) {
      const maxPosResult = await sql`
        SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM modifier_values
        WHERE modifier_id = ${modifier_id}
      `;
      positionValue = maxPosResult[0]?.next_pos || 1;
    }

    // Create new modifier value
    const newValue = {
      id: crypto.randomUUID(),
      modifier_id,
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
    console.error('Error in POST /api/admin/modifiers/values:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
