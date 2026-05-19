import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface OpeningHours {
  open: string;
  close: string;
}

export interface RestaurantSettings {
  restaurant_id: string;
  config: Record<string, unknown>;
  restaurant_name?: string;
  description?: string;
  opening_hours?: OpeningHours;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

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

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado a este restaurante' }, { status: 403 });
    }

    // Get settings
    const settingsResult = await sql`
      SELECT * FROM restaurant_settings
      WHERE restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!settingsResult[0]) {
      // Return default settings if none exist
      return NextResponse.json({
        settings: {
          restaurant_id: restaurantId,
          config: {},
        },
      });
    }

    return NextResponse.json({ settings: settingsResult[0] });
  } catch (error) {
    console.error('Error in GET /api/admin/settings:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { restaurant_id, config } = body;

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    // Verify user has access and is owner/manager
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0] || (profileResult[0].role !== 'dono' && profileResult[0].role !== 'gerente')) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Upsert settings
    const existingSettings = await sql`
      SELECT * FROM restaurant_settings WHERE restaurant_id = ${restaurant_id} LIMIT 1
    `;

    if (existingSettings[0]) {
      await sql`
        UPDATE restaurant_settings
        SET config = ${JSON.stringify(config)}, updated_at = ${now}
        WHERE restaurant_id = ${restaurant_id}
      `;
    } else {
      await sql`
        INSERT INTO restaurant_settings (id, restaurant_id, config, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${restaurant_id}, ${JSON.stringify(config)}, ${now}, ${now})
      `;
    }

    // Fetch updated settings
    const updatedSettings = await sql`
      SELECT * FROM restaurant_settings WHERE restaurant_id = ${restaurant_id} LIMIT 1
    `;

    return NextResponse.json({ settings: updatedSettings[0] });
  } catch (error) {
    console.error('Error in PUT /api/admin/settings:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
