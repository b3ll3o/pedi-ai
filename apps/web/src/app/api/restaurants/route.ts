import { NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { restaurants } from '@/infrastructure/database/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
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
        .orderBy(asc(restaurants.name));

      const response = {
        restaurants: result.map((r) => ({
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
    } else {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, description, address, phone, logo_url, settings')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching restaurants:', error);
        return NextResponse.json({ error: 'Erro ao buscar restaurantes' }, { status: 500 });
      }

      const response = {
        restaurants: (data || []).map((r) => ({
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
    }
  } catch (error) {
    console.error('Unexpected error in GET /api/restaurants:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
