import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';
import { db, isDevDatabase } from '@/infrastructure/database';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as schema from '@/infrastructure/database/schema';

type ModifierValueForGroup = {
  id: string;
  name: string;
  price_adjustment: number;
  available: boolean;
};

interface MenuResponse {
  categories: schema.Category[];
  products: schema.Product[];
  modifier_groups: Array<{
    id: string;
    restaurant_id: string;
    name: string;
    required: boolean;
    min_selections: number;
    max_selections: number;
    modifier_values: ModifierValueForGroup[];
  }>;
  combos: schema.Combo[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    if (isDevDatabase()) {
      return handleDevMenu(restaurantId);
    } else {
      return handleSupabaseMenu(restaurantId);
    }
  } catch (error) {
    console.error('Erro em /api/menu:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function handleDevMenu(restaurantId: string): Promise<NextResponse> {
  // Fetch categories
  const categoriesData = db
    .select()
    .from(schema.categories)
    .where(
      and(eq(schema.categories.restaurant_id, restaurantId), eq(schema.categories.active, true))
    )
    .orderBy(asc(schema.categories.sort_order))
    .all();

  // Fetch products
  const productsData = db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.available, true)))
    .orderBy(asc(schema.products.sort_order))
    .all();

  // Filter products by restaurant_id via category join
  const categoryIds = categoriesData.map((c) => c.id);
  const filteredProducts = productsData.filter((p) => categoryIds.includes(p.category_id));

  // Fetch modifier groups
  const modifierGroupsData = db
    .select()
    .from(schema.modifierGroups)
    .where(eq(schema.modifierGroups.restaurant_id, restaurantId))
    .all();

  // Fetch modifier values
  const modifierGroupIds = modifierGroupsData.map((mg) => mg.id);
  const modifierValuesData =
    modifierGroupIds.length > 0
      ? db
          .select()
          .from(schema.modifierValues)
          .where(eq(schema.modifierValues.available, true))
          .all()
          .filter((mv) => modifierGroupIds.includes(mv.modifier_group_id))
      : [];

  // Nest modifier values within groups
  const modifierGroupsWithValues = modifierGroupsData.map((mg) => ({
    id: mg.id,
    restaurant_id: mg.restaurant_id,
    name: mg.name,
    required: mg.required,
    min_selections: mg.min_selections,
    max_selections: mg.max_selections,
    modifier_values: modifierValuesData
      .filter((mv) => mv.modifier_group_id === mg.id)
      .map((mv) => ({
        id: mv.id,
        name: mv.name,
        price_adjustment: mv.price_adjustment,
        available: mv.available,
      })),
  }));

  // Fetch combos
  const combosData = db
    .select()
    .from(schema.combos)
    .where(and(eq(schema.combos.restaurant_id, restaurantId), eq(schema.combos.available, true)))
    .all();

  const response: MenuResponse = {
    categories: categoriesData,
    products: filteredProducts,
    modifier_groups: modifierGroupsWithValues,
    combos: combosData,
  };

  return NextResponse.json(response);
}

async function handleSupabaseMenu(restaurantId: string): Promise<NextResponse> {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: categoriesData, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (categoriesError) {
    console.error('Erro categories:', categoriesError);
    return NextResponse.json({ error: 'Falha ao buscar categorias' }, { status: 500 });
  }

  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('available', true)
    .order('sort_order', { ascending: true });

  if (productsError) {
    console.error('Erro products:', productsError);
    return NextResponse.json({ error: 'Falha ao buscar produtos' }, { status: 500 });
  }

  const categoryIds = categoriesData.map((c) => c.id);
  const filteredProducts = productsData.filter((p) => categoryIds.includes(p.category_id));

  const { data: modifierGroupsData, error: modifierGroupsError } = await supabase
    .from('modifier_groups')
    .select('*')
    .eq('restaurant_id', restaurantId);

  if (modifierGroupsError) {
    return NextResponse.json({ error: 'Falha ao buscar grupos de modificadores' }, { status: 500 });
  }

  const modifierGroupIds = modifierGroupsData.map((mg) => mg.id);
  const { data: modifierValuesData } =
    modifierGroupIds.length > 0
      ? await supabase
          .from('modifier_values')
          .select('*')
          .in('modifier_group_id', modifierGroupIds)
          .eq('available', true)
      : { data: [] };

  const modifierGroupsWithValues = modifierGroupsData.map((mg) => ({
    ...mg,
    modifier_values: (modifierValuesData ?? [])
      .filter((mv) => mv.modifier_group_id === mg.id)
      .map((mv) => ({
        id: mv.id,
        name: mv.name,
        price_adjustment: mv.price_adjustment,
        available: mv.available,
      })),
  }));

  const { data: combosData, error: combosError } = await supabase
    .from('combos')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('available', true);

  if (combosError) {
    return NextResponse.json({ error: 'Falha ao buscar combos' }, { status: 500 });
  }

  const response: MenuResponse = {
    categories: categoriesData,
    products: filteredProducts,
    modifier_groups: modifierGroupsWithValues,
    combos: combosData,
  };

  return NextResponse.json(response);
}
