import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { restaurants } from '@/infrastructure/database/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (isDevDatabase()) {
      const result = await db
        .select({
          id: restaurants.id,
          name: restaurants.name,
          slug: restaurants.slug,
          description: restaurants.description,
          address: restaurants.address,
          phone: restaurants.phone,
          logo_url: restaurants.logo_url,
          settings: restaurants.settings,
        })
        .from(restaurants)
        .where(and(eq(restaurants.slug, slug), eq(restaurants.active, true)))
        .limit(1);

      if (!result || result.length === 0) {
        return NextResponse.json(
          { error: 'Restaurante não encontrado' },
          { status: 404 }
        );
      }

      const restaurant = result[0];
      return NextResponse.json({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        address: restaurant.address,
        phone: restaurant.phone,
        logoUrl: restaurant.logo_url,
        settings: restaurant.settings,
      });
    } else {
      const supabase = getSupabaseAdmin();

      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .select('id, name, slug, description, address, phone, logo_url, settings, active')
        .eq('slug', slug)
        .eq('active', true)
        .single();

      if (error || !restaurant) {
        return NextResponse.json(
          { error: 'Restaurante não encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        description: restaurant.description,
        address: restaurant.address,
        phone: restaurant.phone,
        logoUrl: restaurant.logo_url,
        settings: restaurant.settings,
      });
    }
  } catch (error) {
    console.error('Erro ao buscar restaurante por slug:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar restaurante' },
      { status: 500 }
    );
  }
}
