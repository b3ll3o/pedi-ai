import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { restaurants } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';

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

    if (isDevDatabase()) {
      const result = await db
        .select({
          id: restaurants.id,
          name: restaurants.name,
          description: restaurants.description,
          address: restaurants.address,
          phone: restaurants.phone,
          logo_url: restaurants.logo_url,
          settings: restaurants.settings,
        })
        .from(restaurants)
        .where(eq(restaurants.id, id))
        .limit(1);

      if (!result || result.length === 0) {
        return NextResponse.json(
          { error: 'Restaurante não encontrado' },
          { status: 404 }
        );
      }

      const restaurant = result[0];
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
    } else {
      const supabase = getSupabaseAdmin();

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

      const response = {
        restaurant: {
          id: data.id,
          name: data.name,
          description: data.description,
          address: data.address,
          phone: data.phone,
          logo_url: data.logo_url,
          horarios: data.settings?.horarios || null,
        },
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Unexpected error in GET /api/restaurants/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
