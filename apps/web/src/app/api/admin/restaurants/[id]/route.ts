import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { restaurants, usersProfiles } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: restaurantId } = await params;

    if (isDevDatabase()) {
      // Verify user has access to this restaurant
      const profileResult = await db
        .select({ role: usersProfiles.role })
        .from(usersProfiles)
        .where(eq(usersProfiles.user_id, user.id))
        .limit(1)
        .get();

      if (!profileResult) {
        return NextResponse.json({ error: 'Acesso negado a este restaurante' }, { status: 403 });
      }

      // Get restaurant
      const restaurantResult = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1)
        .get();

      if (!restaurantResult) {
        return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 });
      }

      return NextResponse.json({ restaurant: restaurantResult });
    }

    // Production: use Supabase
    const supabaseAdmin = getSupabaseAdmin();

    // Verify user has access to this restaurant
    const { data: profile } = await supabaseAdmin
      .from('users_profiles')
      .select('role')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Acesso negado a este restaurante' }, { status: 403 });
    }

    // Get restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError) {
      console.error('Error fetching restaurant:', restaurantError);
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants/[id]:', error);
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

    const { id: restaurantId } = await params;

    if (isDevDatabase()) {
      // Verify user has access and is owner/manager
      const profileResult = await db
        .select({ role: usersProfiles.role })
        .from(usersProfiles)
        .where(eq(usersProfiles.user_id, user.id))
        .limit(1)
        .get();

      if (!profileResult || (profileResult.role !== 'dono' && profileResult.role !== 'gerente')) {
        return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
      }

      const body = await request.json();
      const { name, description, address, phone, logo_url } = body;

      // Update restaurant
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (name?.trim()) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (address !== undefined) updateData.address = address?.trim() || null;
      if (phone !== undefined) updateData.phone = phone?.trim() || null;
      if (logo_url !== undefined) updateData.logo_url = logo_url || null;

      await db.update(restaurants).set(updateData).where(eq(restaurants.id, restaurantId));

      // Fetch updated restaurant
      const updatedRestaurant = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1)
        .get();

      return NextResponse.json({ restaurant: updatedRestaurant });
    }

    // Production: use Supabase
    const supabaseAdmin = getSupabaseAdmin();

    // Verify user has access and is owner/manager
    const { data: profile } = await supabaseAdmin
      .from('users_profiles')
      .select('role')
      .eq('user_id', user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!profile || (profile.role !== 'dono' && profile.role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
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
      return NextResponse.json({ error: 'Erro ao atualizar restaurante' }, { status: 500 });
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error in PUT /api/admin/restaurants/[id]:', error);
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

    const { id: restaurantId } = await params;

    if (isDevDatabase()) {
      // Verify user is owner
      const profileResult = await db
        .select({ role: usersProfiles.role })
        .from(usersProfiles)
        .where(eq(usersProfiles.user_id, user.id))
        .limit(1)
        .get();

      if (!profileResult || profileResult.role !== 'dono') {
        return NextResponse.json(
          { error: 'Apenas o proprietário pode excluir um restaurante' },
          { status: 403 }
        );
      }

      // Soft delete restaurant - set deleted_at instead of actually deleting
      await db.update(restaurants).set({ active: false }).where(eq(restaurants.id, restaurantId));

      return NextResponse.json({
        success: true,
        message: 'Restaurante removido com sucesso (soft delete)',
      });
    }

    // Production: use Supabase
    const supabaseAdmin = getSupabaseAdmin();

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

    // Soft delete restaurant - set deleted_at instead of actually deleting
    const { error: deleteError } = await supabaseAdmin
      .from('restaurants')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', restaurantId);

    if (deleteError) {
      console.error('Error deleting restaurant:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir restaurante' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurante removido com sucesso (soft delete)',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/restaurants/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
