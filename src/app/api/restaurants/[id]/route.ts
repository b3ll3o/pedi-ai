import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { restaurants } from '@/lib/supabase/types';

type Restaurant = Omit<restaurants, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do restaurante é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, description, address, phone, logo_url, settings')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Restaurante não encontrado' },
          { status: 404 }
        );
      }
      console.error('Error fetching restaurant:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar restaurante' },
        { status: 500 }
      );
    }

    const restaurant: Restaurant = data;

    const response = {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        phone: restaurant.phone,
        logo_url: restaurant.logo_url,
        horarios: restaurant.settings?.horarios || null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/restaurants/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}