import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabaseAdmin() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    const supabaseAdmin = await getSupabaseAdmin();
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: restaurantId } = await params;

    // Verify user has access to this restaurant
    const { data: profile } = await supabaseAdmin
      .from('users_profiles')
      .select('role')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Acesso negado a este restaurante' },
        { status: 403 }
      );
    }

    // Get restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError) {
      console.error('Error fetching restaurant:', restaurantError);
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: restaurantId } = await params;

    // Verify user has access and is owner/manager
    const { data: profile } = await supabaseAdmin
      .from('users_profiles')
      .select('role')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!profile || (profile.role !== 'dono' && profile.role !== 'gerente')) {
      return NextResponse.json(
        { error: 'Permissão insuficiente' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, address, phone, logo_url } = body;

    // Update restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .update({
        name: name?.trim() || undefined,
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        logo_url: logo_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurantId)
      .select()
      .single();

    if (restaurantError) {
      console.error('Error updating restaurant:', restaurantError);
      return NextResponse.json(
        { error: 'Erro ao atualizar restaurante' },
        { status: 500 }
      );
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error in PUT /api/admin/restaurants/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: restaurantId } = await params;

    // Verify user is owner
    const { data: profile } = await supabaseAdmin
      .from('users_profiles')
      .select('role')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!profile || profile.role !== 'dono') {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode excluir um restaurante' },
        { status: 403 }
      );
    }

    // Delete restaurant (cascade should handle related data)
    const { error: deleteError } = await supabaseAdmin
      .from('restaurants')
      .delete()
      .eq('id', restaurantId);

    if (deleteError) {
      console.error('Error deleting restaurant:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao excluir restaurante' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/restaurants/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
