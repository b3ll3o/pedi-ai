import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ModificadorValor {
  id: string;
  name: string;
  price_adjustment: number;
}

interface GrupoModificador {
  id: string;
  name: string;
  required: boolean;
  max_selections: number;
  modificador_valores: ModificadorValor[] | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  category_id: string;
  grupos_modificadores: GrupoModificador[] | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  order: number;
  products: Product[] | null;
}

interface CategoryFormatted {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  order: number;
  products: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    available: boolean;
    categoryId: string;
    modifierGroups: Array<{
      id: string;
      name: string;
      required: boolean;
      maxSelections: number;
      values: Array<{
        id: string;
        name: string;
        priceAdjustment: number;
      }>;
    }>;
  }>;
}

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

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurante não encontrado' },
        { status: 404 }
      );
    }

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        description,
        image_url,
        order,
        products (
          id,
          name,
          description,
          price,
          image_url,
          available,
          category_id,
          grupos_modificadores (
            id,
            name,
            required,
            max_selections,
            modificador_valores (
              id,
              name,
              price_adjustment
            )
          )
        )
      `)
      .eq('restaurant_id', restaurant.id)
      .eq('active', true)
      .order('order', { ascending: true });

    if (categoriesError) {
      console.error('Erro ao buscar cardápio:', categoriesError);
      return NextResponse.json(
        { error: 'Erro ao buscar cardápio' },
        { status: 500 }
      );
    }

    const formattedCategories: CategoryFormatted[] = (categories as unknown as Category[] | null)?.map((cat): CategoryFormatted => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      imageUrl: cat.image_url,
      order: cat.order,
      products: cat.products
        ?.filter((p) => p.available)
        .map((product): CategoryFormatted['products'][0] => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.image_url,
          available: product.available,
          categoryId: product.category_id,
          modifierGroups: product.grupos_modificadores?.map((gm): CategoryFormatted['products'][0]['modifierGroups'][0] => ({
            id: gm.id,
            name: gm.name,
            required: gm.required,
            maxSelections: gm.max_selections,
            values: gm.modificador_valores?.map((v) => ({
              id: v.id,
              name: v.name,
              priceAdjustment: v.price_adjustment,
            })) || [],
          })) || [],
        })) || [],
    })) || [];

    return NextResponse.json({
      restaurantId: restaurant.id,
      categories: formattedCategories,
    });
  } catch (error) {
    console.error('Erro ao buscar cardápio:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar cardápio' },
      { status: 500 }
    );
  }
}
