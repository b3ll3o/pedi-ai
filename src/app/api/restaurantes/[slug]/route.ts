import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
  } catch (error) {
    console.error('Erro ao buscar restaurante por slug:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar restaurante' },
      { status: 500 }
    );
  }
}
