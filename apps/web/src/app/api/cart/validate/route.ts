import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import type { CartItem, SelectedModifier } from '@/infrastructure/persistence/cartStore';

interface ValidateCartRequest {
  items: CartItem[];
  restaurantId: string;
  tableId?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface ProductValidation {
  productId: string;
  name: string;
  available: boolean;
  price: number;
  requiredModifiers: {
    groupId: string;
    groupName: string;
    minSelections: number;
    selectedCount: number;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateCartRequest = await request.json();
    const { items, restaurantId, tableId } = body;

    const errors: ValidationError[] = [];

    // Rule 1: Empty cart validation
    if (!items || items.length === 0) {
      return NextResponse.json({
        valid: false,
        errors: ['Carrinho vazio - adicione itens para fazer o pedido'],
      });
    }

    // Extract unique product IDs from cart
    const productIds = [...new Set(items.map((item) => item.productId))];

    // Rule 2 & 3: Fetch products and validate availability and prices
    const products = await sql<{
      id: string;
      name: string | null;
      available: boolean;
      price: number;
      category_id: string;
    }>`
      SELECT id, name, available, price, category_id
      FROM products
      WHERE id = ANY(${productIds})
    `;

    // Create a map for quick product lookup
    const productMap = new Map<string, ProductValidation>();
    for (const product of products) {
      productMap.set(String(product.id), {
        productId: String(product.id),
        name: String(product.name ?? ''),
        available: Boolean(product.available),
        price: Number(product.price),
        requiredModifiers: [],
      });
    }

    // Rule 4: Validate required modifiers
    // Get modifier groups for all products in cart via junction table
    const productModifierGroupsData = await sql<{
      product_id: string;
      modifier_group_id: string;
    }>`
      SELECT product_id, modifier_group_id
      FROM product_modifier_groups
      WHERE product_id = ANY(${productIds})
    `;

    const modifierGroupIds = [
      ...new Set(productModifierGroupsData.map((pmg: { modifier_group_id: string }) => String(pmg.modifier_group_id))),
    ];

    // Get required modifier groups
    const modifierGroups =
      modifierGroupIds.length > 0
        ? await sql<{
            id: string;
            name: string | null;
            required: boolean;
            min_selections: number;
          }>`
            SELECT id, name, required, min_selections
            FROM modifier_groups
            WHERE id = ANY(${modifierGroupIds}) AND required = true
          `
        : [];

    // Map modifier groups by product
    const requiredModifiersByProduct = new Map<string, typeof modifierGroups>();
    for (const mg of modifierGroups) {
      const productModifierGroup = productModifierGroupsData.find(
        (pmg: { product_id: string; modifier_group_id: string }) => String(pmg.modifier_group_id) === String(mg.id)
      );
      if (productModifierGroup) {
        const existing =
          requiredModifiersByProduct.get(String(productModifierGroup.product_id)) ?? [];
        existing.push(mg);
        requiredModifiersByProduct.set(String(productModifierGroup.product_id), existing);
      }
    }

    // Rule 5: Table validation (if table order)
    if (tableId) {
      const tableResult = await sql<{ id: string; active: boolean }>`
        SELECT id, active
        FROM tables
        WHERE id = ${tableId} AND restaurant_id = ${restaurantId} AND active = true
        LIMIT 1
      `;

      if (!tableResult || tableResult.length === 0) {
        errors.push({
          field: 'table',
          message: 'Mesa inválida ou inativa',
        });
      }
    }

    // Validate each cart item
    for (const item of items) {
      const productValidation = productMap.get(item.productId);

      // Check if product exists
      if (!productValidation) {
        errors.push({
          field: `item-${item.id}`,
          message: `Produto '${item.name || item.productId}' não encontrado`,
        });
        continue;
      }

      // Rule 2: Product availability
      if (!productValidation.available) {
        errors.push({
          field: `item-${item.id}`,
          message: `Produto '${productValidation.name}' não está mais disponível`,
        });
      }

      // Rule 3: Price consistency
      const cartPrice = item.unitPrice;
      const currentPrice = productValidation.price;
      if (cartPrice !== currentPrice) {
        const formatPrice = (p: number) =>
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);
        errors.push({
          field: `item-${item.id}`,
          message: `Preço do produto '${productValidation.name}' mudou de ${formatPrice(cartPrice)} para ${formatPrice(currentPrice)}`,
        });
      }

      // Rule 4: Required modifiers
      const requiredGroups = requiredModifiersByProduct.get(item.productId) ?? [];
      for (const requiredGroup of requiredGroups) {
        const selectedModifiers = item.modifiers.filter(
          (mod: SelectedModifier) => mod.group_id === String(requiredGroup.id)
        );
        const minSelections = Number(requiredGroup.min_selections) || 0;
        if (selectedModifiers.length < minSelections) {
          errors.push({
            field: `item-${item.id}`,
            message: `Produto '${productValidation.name}' requer pelo menos ${minSelections} opção(ões) em '${String(requiredGroup.name)}'`,
          });
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        valid: false,
        errors: errors.map((e) => e.message),
      });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Unexpected error in /api/cart/validate:', error);
    return NextResponse.json(
      { valid: false, errors: ['Erro interno do servidor'] },
      { status: 500 }
    );
  }
}
