import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, restaurantId, tableId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({
        valid: false,
        errors: ['Carrinho vazio - adicione itens para fazer o pedido'],
      });
    }

    const result = await apiClient.post<{ valid: boolean; errors?: string[] }>('/cart/validate', {
      items,
      restaurantId,
      tableId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Unexpected error in /api/cart/validate:', error);
    return NextResponse.json(
      { valid: false, errors: ['Erro interno do servidor'] },
      { status: 500 }
    );
  }
}
