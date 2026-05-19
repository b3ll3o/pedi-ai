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

    const { id: productId } = await params;

    // Get product
    const productResult = await sql`SELECT * FROM products WHERE id = ${productId} LIMIT 1`;

    if (!productResult[0]) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${productResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json({ product: productResult[0] });
  } catch (error) {
    console.error('Error in GET /api/admin/products/[id]:', error);
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

    const { id: productId } = await params;
    const body = await request.json();
    const { name, description, price_cents, image_url, category_id, preparation_time_minutes, active } = body;

    // Get product first
    const productResult = await sql`SELECT * FROM products WHERE id = ${productId} LIMIT 1`;

    if (!productResult[0]) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${productResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Update product
    await sql`
      UPDATE products
      SET
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description !== undefined ? (description?.trim() || null) : null}, description),
        price_cents = COALESCE(${price_cents}, price_cents),
        image_url = COALESCE(${image_url || null}, image_url),
        category_id = COALESCE(${category_id || null}, category_id),
        preparation_time_minutes = COALESCE(${preparation_time_minutes}, preparation_time_minutes),
        active = COALESCE(${active}, active),
        updated_at = ${now}
      WHERE id = ${productId}
    `;

    // Fetch updated product
    const updatedProduct = await sql`SELECT * FROM products WHERE id = ${productId} LIMIT 1`;

    return NextResponse.json({ product: updatedProduct[0] });
  } catch (error) {
    console.error('Error in PUT /api/admin/products/[id]:', error);
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

    const { id: productId } = await params;

    // Get product first
    const productResult = await sql`SELECT * FROM products WHERE id = ${productId} LIMIT 1`;

    if (!productResult[0]) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${productResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    // Soft delete product
    await sql`
      UPDATE products SET active = false, updated_at = ${new Date().toISOString()}
      WHERE id = ${productId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/products/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
