import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { restaurants, categories, products, modifierGroups, modifierValues } from '@/infrastructure/database/schema';
import { eq, and, asc } from 'drizzle-orm';

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

    if (isDevDatabase()) {
      // Buscar restaurante pelo slug
      const restaurantResult = await db
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(and(eq(restaurants.slug, slug), eq(restaurants.active, true)))
        .limit(1);

      if (!restaurantResult || restaurantResult.length === 0) {
        return NextResponse.json(
          { error: 'Restaurante não encontrado' },
          { status: 404 }
        );
      }

      const restaurantId = restaurantResult[0].id;

      // Buscar categorias com produtos e modificadores
      const categoriesResult = await db
        .select()
        .from(categories)
        .where(and(eq(categories.restaurant_id, restaurantId), eq(categories.active, true)))
        .orderBy(asc(categories.sort_order));

      const formattedCategories: CategoryFormatted[] = [];

      for (const cat of categoriesResult) {
        // Buscar produtos da categoria
        const productsResult = await db
          .select()
          .from(products)
          .where(and(eq(products.category_id, cat.id), eq(products.available, true)));

        const formattedProducts: CategoryFormatted['products'] = [];

        for (const product of productsResult) {
          // Buscar grupos de modificadores do produto
          const groupsResult = await db
            .select()
            .from(modifierGroups)
            .where(eq(modifierGroups.restaurant_id, restaurantId));

          const formattedGroups: CategoryFormatted['products'][0]['modifierGroups'] = [];

          for (const group of groupsResult) {
            // Buscar valores do modificador
            const valuesResult = await db
              .select()
              .from(modifierValues)
              .where(eq(modifierValues.modifier_group_id, group.id));

            formattedGroups.push({
              id: group.id,
              name: group.name,
              required: group.required,
              maxSelections: group.max_selections,
              values: valuesResult.map((v) => ({
                id: v.id,
                name: v.name,
                priceAdjustment: v.price_adjustment,
              })),
            });
          }

          formattedProducts.push({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: product.image_url,
            available: product.available,
            categoryId: product.category_id,
            modifierGroups: formattedGroups,
          });
        }

        formattedCategories.push({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          imageUrl: cat.image_url,
          order: cat.sort_order,
          products: formattedProducts,
        });
      }

      return NextResponse.json({
        restaurantId,
        categories: formattedCategories,
      });
    } else {
      const supabase = getSupabaseAdmin();

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

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          description,
          image_url,
          sort_order,
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
        .order('sort_order', { ascending: true });

      if (categoriesError) {
        console.error('Erro ao buscar cardápio:', categoriesError);
        return NextResponse.json(
          { error: 'Erro ao buscar cardápio' },
          { status: 500 }
        );
      }

      const formattedCategories: CategoryFormatted[] = (categoriesData as unknown as Category[] | null)?.map((cat): CategoryFormatted => ({
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
    }
  } catch (error) {
    console.error('Erro ao buscar cardápio:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar cardápio' },
      { status: 500 }
    );
  }
}
