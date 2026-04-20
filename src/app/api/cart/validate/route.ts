import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CartItem, SelectedModifier } from '@/stores/cartStore'

interface ValidateCartRequest {
  items: CartItem[]
  restaurantId: string
  tableId?: string
}

interface ValidationError {
  field: string
  message: string
}

interface ProductValidation {
  productId: string
  name: string
  available: boolean
  price: number
  requiredModifiers: {
    groupId: string
    groupName: string
    minSelections: number
    selectedCount: number
  }[]
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateCartRequest = await request.json()
    const { items, restaurantId, tableId } = body

    const errors: ValidationError[] = []

    // Rule 1: Empty cart validation
    if (!items || items.length === 0) {
      return NextResponse.json({
        valid: false,
        errors: ['Carrinho vazio - adicione itens para fazer o pedido'],
      })
    }

    const supabase = await createClient()

    // Extract unique product IDs from cart
    const productIds = [...new Set(items.map((item) => item.productId))]

    // Rule 2 & 3: Fetch products and validate availability and prices
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, available, price, category_id')
      .in('id', productIds)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json(
        { valid: false, errors: ['Erro ao validar produtos'] },
        { status: 500 }
      )
    }

    // Create a map for quick product lookup
    const productMap = new Map<string, ProductValidation>()
    for (const product of products ?? []) {
      productMap.set(String(product.id), {
        productId: String(product.id),
        name: String(product.name ?? ''),
        available: Boolean(product.available),
        price: Number(product.price),
        requiredModifiers: [],
      })
    }

    // Rule 4: Validate required modifiers
    // Get modifier groups for all products in cart
    const { data: productModifierGroups, error: pmgError } = await supabase
      .from('product_modifier_groups')
      .select('product_id, modifier_group_id')
      .in('product_id', productIds)

    if (pmgError) {
      console.error('Error fetching product modifier groups:', pmgError)
      return NextResponse.json(
        { valid: false, errors: ['Erro ao validar modificadores'] },
        { status: 500 }
      )
    }

    // Get required modifier groups
    const modifierGroupIds = [
      ...new Set(productModifierGroups?.map((pmg) => String(pmg.modifier_group_id)) ?? []),
    ]

    const { data: modifierGroups, error: mgError } = await supabase
      .from('modifier_groups')
      .select('id, name, required, min_selections')
      .in('id', modifierGroupIds)
      .eq('required', true)

    if (mgError) {
      console.error('Error fetching modifier groups:', mgError)
      return NextResponse.json(
        { valid: false, errors: ['Erro ao validar modificadores'] },
        { status: 500 }
      )
    }

    // Map modifier groups by product
    const requiredModifiersByProduct = new Map<string, typeof modifierGroups>()
    for (const mg of modifierGroups ?? []) {
      const productModifierGroup = productModifierGroups?.find(
        (pmg) => String(pmg.modifier_group_id) === String(mg.id)
      )
      if (productModifierGroup) {
        const existing = requiredModifiersByProduct.get(String(productModifierGroup.product_id)) ?? []
        existing.push(mg)
        requiredModifiersByProduct.set(String(productModifierGroup.product_id), existing)
      }
    }

    // Rule 5: Table validation (if table order)
    if (tableId) {
      const { data: table, error: tableError } = await supabase
        .from('tables')
        .select('id, active')
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .single()

      if (tableError || !table) {
        errors.push({
          field: 'table',
          message: 'Mesa inválida ou inativa',
        })
      }
    }

    // Validate each cart item
    for (const item of items) {
      const productValidation = productMap.get(item.productId)

      // Check if product exists
      if (!productValidation) {
        errors.push({
          field: `item-${item.id}`,
          message: `Produto '${item.name || item.productId}' não encontrado`,
        })
        continue
      }

      // Rule 2: Product availability
      if (!productValidation.available) {
        errors.push({
          field: `item-${item.id}`,
          message: `Produto '${productValidation.name}' não está mais disponível`,
        })
      }

      // Rule 3: Price consistency
      const cartPrice = item.unitPrice
      const currentPrice = productValidation.price
      if (cartPrice !== currentPrice) {
        const formatPrice = (p: number) =>
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p)
        errors.push({
          field: `item-${item.id}`,
          message: `Preço do produto '${productValidation.name}' mudou de ${formatPrice(cartPrice)} para ${formatPrice(currentPrice)}`,
        })
      }

      // Rule 4: Required modifiers
      const requiredGroups = requiredModifiersByProduct.get(item.productId) ?? []
      for (const requiredGroup of requiredGroups) {
        const selectedModifiers = item.modifiers.filter(
          (mod: SelectedModifier) => mod.group_id === String(requiredGroup.id)
        )
        const minSelections = Number(requiredGroup.min_selections) || 0
        if (selectedModifiers.length < minSelections) {
          errors.push({
            field: `item-${item.id}`,
            message: `Produto '${productValidation.name}' requer pelo menos ${minSelections} opção(ões) em '${String(requiredGroup.name)}'`,
          })
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        valid: false,
        errors: errors.map((e) => e.message),
      })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Unexpected error in /api/cart/validate:', error)
    return NextResponse.json(
      { valid: false, errors: ['Erro interno do servidor'] },
      { status: 500 }
    )
  }
}