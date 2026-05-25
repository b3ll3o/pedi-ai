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

interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: string;
  notes: string | null;
  createdAt: string;
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
  statusHistory: OrderStatusHistory[];
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<Order>>(`/orders/${orderId}`);

    return NextResponse.json({ order: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/orders/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
