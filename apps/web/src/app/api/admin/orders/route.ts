import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  comboId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
}

interface Order {
  id: string;
  restaurantId: string;
  tableId: string | null;
  customerId: string | null;
  customerPhone: string | null;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');
    const status = request.nextUrl.searchParams.get('status');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const params = new URLSearchParams({ restaurantId });
    if (status) params.append('status', status);

    const result = await apiClient.get<ApiResponse<Order[]>>(`/orders?${params.toString()}`);

    const ordersWithPagination = {
      orders: result.data,
      pagination: {
        page: 1,
        limit: 20,
        total: result.data.length,
        totalPages: 1,
      },
    };

    return NextResponse.json(ordersWithPagination);
  } catch (error) {
    console.error('Error in GET /api/admin/orders:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
