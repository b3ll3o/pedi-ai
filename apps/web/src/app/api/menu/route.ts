import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';

type ModifierValueForGroup = {
  id: string;
  name: string;
  price_adjustment: number;
  available: boolean;
};

interface MenuResponse {
  categories: Array<{
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    sort_order: number;
    active: boolean;
  }>;
  products: Array<{
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    price: number;
    available: boolean;
    sort_order: number;
    dietary_labels: string[] | null;
  }>;
  modifier_groups: Array<{
    id: string;
    restaurant_id: string;
    name: string;
    required: boolean;
    min_selections: number;
    max_selections: number;
    modifier_values: ModifierValueForGroup[];
  }>;
  combos: Array<{
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    price: number;
    available: boolean;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    // Fetch categories
    const categoriesData = await sql<{
      id: string;
      restaurant_id: string;
      name: string;
      description: string | null;
      image_url: string | null;
      sort_order: number;
      active: boolean;
    }>`
      SELECT id, restaurant_id, name, description, image_url, sort_order, active
      FROM categories
      WHERE restaurant_id = ${restaurantId} AND active = true
      ORDER BY sort_order ASC
    `;

    // Fetch products
    const productsData = await sql<{
      id: string;
      category_id: string;
      name: string;
      description: string | null;
      image_url: string | null;
      price: number;
      available: boolean;
      sort_order: number;
      dietary_labels: string[] | null;
    }>`
      SELECT id, category_id, name, description, image_url, price, available, sort_order, dietary_labels
      FROM products
      WHERE available = true
      ORDER BY sort_order ASC
    `;

    // Filter products by restaurant_id via category join
    const categoryIds = categoriesData.map((c: { id: string; restaurant_id: string; name: string; description: string | null; image_url: string | null; sort_order: number; active: boolean }) => c.id);
    const filteredProducts = productsData.filter((p: { id: string; category_id: string; name: string; description: string | null; image_url: string | null; price: number; available: boolean; sort_order: number; dietary_labels: string[] | null }) => categoryIds.includes(p.category_id));

    // Fetch modifier groups
    const modifierGroupsData = await sql<{
      id: string;
      restaurant_id: string;
      name: string;
      required: boolean;
      min_selections: number;
      max_selections: number;
    }>`
      SELECT id, restaurant_id, name, required, min_selections, max_selections
      FROM modifier_groups
      WHERE restaurant_id = ${restaurantId}
    `;

    // Fetch modifier values
    const modifierGroupIds = modifierGroupsData.map((mg: { id: string; restaurant_id: string; name: string; required: boolean; min_selections: number; max_selections: number }) => mg.id);
    const modifierValuesData =
      modifierGroupIds.length > 0
        ? await sql<{
            id: string;
            modifier_group_id: string;
            name: string;
            price_adjustment: number;
            available: boolean;
          }>`
            SELECT id, modifier_group_id, name, price_adjustment, available
            FROM modifier_values
            WHERE available = true AND modifier_group_id = ANY(${modifierGroupIds})
          `
        : [];

    // Nest modifier values within groups
    const modifierGroupsWithValues = modifierGroupsData.map((mg: { id: string; restaurant_id: string; name: string; required: boolean; min_selections: number; max_selections: number }) => ({
      id: mg.id,
      restaurant_id: mg.restaurant_id,
      name: mg.name,
      required: mg.required,
      min_selections: mg.min_selections,
      max_selections: mg.max_selections,
      modifier_values: modifierValuesData
        .filter((mv: { id: string; modifier_group_id: string; name: string; price_adjustment: number; available: boolean }) => mv.modifier_group_id === mg.id)
        .map((mv: { id: string; modifier_group_id: string; name: string; price_adjustment: number; available: boolean }) => ({
          id: mv.id,
          name: mv.name,
          price_adjustment: mv.price_adjustment,
          available: mv.available,
        })),
    }));

    // Fetch combos
    const combosData = await sql<{
      id: string;
      restaurant_id: string;
      name: string;
      description: string | null;
      price: number;
      available: boolean;
    }>`
      SELECT id, restaurant_id, name, description, price, available
      FROM combos
      WHERE restaurant_id = ${restaurantId} AND available = true
    `;

    const response: MenuResponse = {
      categories: categoriesData,
      products: filteredProducts,
      modifier_groups: modifierGroupsWithValues,
      combos: combosData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro em /api/menu:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
