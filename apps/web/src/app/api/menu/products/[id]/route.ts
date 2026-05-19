import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';

type ModifierGroupWithValues = {
  id: string;
  name: string;
  required: boolean;
  min_selections: number;
  max_selections: number;
  values: Array<{
    id: string;
    name: string;
    price_adjustment: number;
  }>;
};

interface ProductDetailResponse {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  dietary_labels: string[] | null;
  available: boolean;
  category: { id: string; name: string };
  modifier_groups: ModifierGroupWithValues[];
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    // Fetch product with category join
    const productResult = await sql<{
      id: string;
      category_id: string;
      name: string;
      description: string | null;
      image_url: string | null;
      price: number;
      dietary_labels: string[] | null;
      available: boolean;
    }>`
      SELECT id, category_id, name, description, image_url, price, dietary_labels, available
      FROM products
      WHERE id = ${id}
    `;

    if (!productResult || productResult.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = productResult[0];

    // Fetch category to verify restaurant ownership
    const categoryResult = await sql<{ id: string; name: string; restaurant_id: string }>`
      SELECT id, name, restaurant_id
      FROM categories
      WHERE id = ${product.category_id} AND restaurant_id = ${restaurantId}
    `;

    if (!categoryResult || categoryResult.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const category = categoryResult[0];

    // Fetch modifier groups for this product via junction table
    const productModifierGroupsResult = await sql<{ product_id: string; modifier_group_id: string }>`
      SELECT product_id, modifier_group_id
      FROM product_modifier_groups
      WHERE product_id = ${id}
    `;

    const modifierGroupIds = productModifierGroupsResult.map((pmg) => pmg.modifier_group_id);

    // Fetch modifier groups
    const modifierGroupsData =
      modifierGroupIds.length > 0
        ? await sql<{
            id: string;
            name: string;
            required: boolean;
            min_selections: number;
            max_selections: number;
          }>`
            SELECT id, name, required, min_selections, max_selections
            FROM modifier_groups
            WHERE id = ANY(${modifierGroupIds}) AND restaurant_id = ${restaurantId}
          `
        : [];

    // Fetch modifier values for these groups
    const modifierValuesData =
      modifierGroupIds.length > 0
        ? await sql<{
            id: string;
            modifier_group_id: string;
            name: string;
            price_adjustment: number;
          }>`
            SELECT id, modifier_group_id, name, price_adjustment
            FROM modifier_values
            WHERE modifier_group_id = ANY(${modifierGroupIds}) AND available = true
          `
        : [];

    // Build response
    const response: ProductDetailResponse = {
      id: product.id,
      name: product.name,
      description: product.description,
      image_url: product.image_url,
      price: product.price,
      dietary_labels: product.dietary_labels,
      available: product.available,
      category: { id: category.id, name: category.name },
      modifier_groups: modifierGroupsData.map((mg) => ({
        id: mg.id,
        name: mg.name,
        required: mg.required,
        min_selections: mg.min_selections,
        max_selections: mg.max_selections,
        values: modifierValuesData
          .filter((mv) => mv.modifier_group_id === mg.id)
          .map((mv) => ({
            id: mv.id,
            name: mv.name,
            price_adjustment: mv.price_adjustment,
          })),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in /api/menu/products/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
