import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { restaurants } from '@/lib/supabase/types';

type Restaurant = Omit<restaurants, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export async function GET() {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, description, address, phone, logo_url, settings')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching restaurants:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar restaurantes' },
        { status: 500 }
      );
    }

    const restaurantsList: Restaurant[] = data || [];

    const response = {
      restaurants: restaurantsList.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        address: r.address,
        phone: r.phone,
        logo_url: r.logo_url,
        horarios: r.settings?.horarios || null,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/restaurants:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}