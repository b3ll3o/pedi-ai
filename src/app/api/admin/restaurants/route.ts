import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin API client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Get user's restaurants via users_profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('users_profiles')
      .select('restaurant_id, role')
      .eq('user_id', user.id);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Erro ao buscar restaurantes' },
        { status: 500 }
      );
    }

    const restaurantIds = profiles?.map((p) => p.restaurant_id) || [];

    if (restaurantIds.length === 0) {
      return NextResponse.json({ restaurants: [] });
    }

    // Get restaurant details
    const { data: restaurants, error: restaurantsError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .in('id', restaurantIds);

    if (restaurantsError) {
      console.error('Error fetching restaurants:', restaurantsError);
      return NextResponse.json(
        { error: 'Erro ao buscar restaurantes' },
        { status: 500 }
      );
    }

    // Get team count for each restaurant
    const { data: teamCounts } = await supabaseAdmin
      .from('users_profiles')
      .select('restaurant_id')
      .in('restaurant_id', restaurantIds);

    const teamCountMap = teamCounts?.reduce((acc, curr) => {
      acc[curr.restaurant_id] = (acc[curr.restaurant_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const restaurantsWithTeamCount = (restaurants || []).map((r) => ({
      ...r,
      team_count: teamCountMap[r.id] || 0,
    }));

    return NextResponse.json({ restaurants: restaurantsWithTeamCount });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, address, phone, logo_url } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    // Create restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        logo_url: logo_url || null,
      })
      .select()
      .single();

    if (restaurantError) {
      console.error('Error creating restaurant:', restaurantError);
      return NextResponse.json(
        { error: 'Erro ao criar restaurante' },
        { status: 500 }
      );
    }

    // Add user as owner
    const { error: profileError } = await supabaseAdmin
      .from('users_profiles')
      .insert({
        user_id: user.id,
        restaurant_id: restaurant.id,
        role: 'owner',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Rollback restaurant creation
      await supabaseAdmin.from('restaurants').delete().eq('id', restaurant.id);
      return NextResponse.json(
        { error: 'Erro ao configurar restaurante' },
        { status: 500 }
      );
    }

    return NextResponse.json({ restaurant }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/restaurants:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
