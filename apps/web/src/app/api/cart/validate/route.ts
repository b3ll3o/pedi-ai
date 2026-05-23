import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
import type { CartItem, SelectedModifier } from '@/infrastructure/persistence/cartStore';

interface ValidateCartRequest {
  items: CartItem[];
  restaurantId: string;
  tableId?: string;
}

interface ProductValidation {
  productId: string;
  name: string;
  available: boolean;
  price: number;
}

interface ValidationError {
  field: string;
  message: string;
}

async function fetchProductAvailability(productIds: string[]) {
  return sql<{
    id: string;
    name: string | null;
    available: boolean;
    price: number;
    category_id: string;
  }>`
    SELECT id, name, available, price, category_id
    FROM "Product"
    WHERE id = ANY(${productIds})
  `;
}

async function fetchRequiredModifierGroups(productIds: string[]) {
  const productModifierGroupsData = await sql<{
    product_id: string;
    modifier_group_id: string;
  }>`
    SELECT product_id, modifier_group_id
    FROM "ProductModifierGroup"
    WHERE product_id = ANY(${productIds})
  `;

  const modifierGroupIds = [
    ...new Set(
      productModifierGroupsData.map((pmg: { modifier_group_id: string }) =>
        String(pmg.modifier_group_id)
      )
    ),
  ];

  if (modifierGroupIds.length === 0) return { modifierGroups: [], productModifierGroupsData };

  const modifierGroups = await sql<{
    id: string;
    name: string | null;
    required: boolean;
    min_selections: number;
  }>`
      SELECT id, name, required, min_selections
      FROM "ModifierGroup"
      WHERE id = ANY(${modifierGroupIds}) AND required = true
    `;

  return { modifierGroups, productModifierGroupsData };
}

async function validateTable(
  tableId: string,
  restaurantId: string
): Promise<ValidationError | null> {
  const tableResult = await sql<{ id: string; active: boolean }>`
    SELECT id, active
    FROM "Table"
    WHERE id = ${tableId} AND restaurant_id = ${restaurantId} AND active = true
    LIMIT 1
  `;

  if (!tableResult || tableResult.length === 0) {
    return { field: 'table', message: 'Mesa inválida ou inativa' };
  }
  return null;
}

function formatPrice(p: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);
}

function validateRequiredModifiers(
  item: CartItem,
  productValidation: ProductValidation,
  requiredModifiersByProduct: Map<
    string,
    { id: string; name: string | null; min_selections: number }[]
  >
): ValidationError[] {
  const errors: ValidationError[] = [];
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

  return errors;
}

function buildProductMap(
  products: { id: string; name: string | null; available: boolean; price: number }[]
): Map<string, ProductValidation> {
  const productMap = new Map<string, ProductValidation>();
  for (const product of products) {
    productMap.set(String(product.id), {
      productId: String(product.id),
      name: String(product.name ?? ''),
      available: Boolean(product.available),
      price: Number(product.price),
    });
  }
  return productMap;
}

function buildRequiredModifiersMap(
  modifierGroups: { id: string; name: string | null; min_selections: number }[],
  productModifierGroupsData: { product_id: string; modifier_group_id: string }[]
): Map<string, typeof modifierGroups> {
  const requiredModifiersByProduct = new Map<string, typeof modifierGroups>();
  for (const mg of modifierGroups) {
    const productModifierGroup = productModifierGroupsData.find(
      (pmg: { product_id: string; modifier_group_id: string }) =>
        String(pmg.modifier_group_id) === String(mg.id)
    );
    if (productModifierGroup) {
      const existing =
        requiredModifiersByProduct.get(String(productModifierGroup.product_id)) ?? [];
      existing.push(mg);
      requiredModifiersByProduct.set(String(productModifierGroup.product_id), existing);
    }
  }
  return requiredModifiersByProduct;
}

function validateAllCartItems(
  items: CartItem[],
  productMap: Map<string, ProductValidation>,
  requiredModifiersByProduct: Map<
    string,
    { id: string; name: string | null; min_selections: number }[]
  >
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const item of items) {
    const productValidation = productMap.get(item.productId);
    if (!productValidation) {
      errors.push({
        field: `item-${item.id}`,
        message: `Produto '${item.name || item.productId}' não encontrado`,
      });
      continue;
    }
    if (!productValidation.available) {
      errors.push({
        field: `item-${item.id}`,
        message: `Produto '${productValidation.name}' não está mais disponível`,
      });
    }
    if (item.unitPrice !== productValidation.price) {
      errors.push({
        field: `item-${item.id}`,
        message: `Preço do produto '${productValidation.name}' mudou de ${formatPrice(item.unitPrice)} para ${formatPrice(productValidation.price)}`,
      });
    }
    const modifierErrors = validateRequiredModifiers(
      item,
      productValidation,
      requiredModifiersByProduct
    );
    errors.push(...modifierErrors);
  }
  return errors;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateCartRequest = await request.json();
    const { items, restaurantId, tableId } = body;

    // Rule 1: Empty cart validation
    if (!items || items.length === 0) {
      return NextResponse.json({
        valid: false,
        errors: ['Carrinho vazio - adicione itens para fazer o pedido'],
      });
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await fetchProductAvailability(productIds);
    const productMap = buildProductMap(products);

    const { modifierGroups, productModifierGroupsData } =
      await fetchRequiredModifierGroups(productIds);
    const requiredModifiersByProduct = buildRequiredModifiersMap(
      modifierGroups,
      productModifierGroupsData
    );

    const errors: ValidationError[] = [];

    // Rule 5: Table validation
    if (tableId) {
      const tableError = await validateTable(tableId, restaurantId);
      if (tableError) errors.push(tableError);
    }

    // Validate all items
    const itemErrors = validateAllCartItems(items, productMap, requiredModifiersByProduct);
    errors.push(...itemErrors);

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
