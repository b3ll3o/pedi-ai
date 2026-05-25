import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['paid', 'preparing', 'cancelled'],
  paid: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

type _OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ApiOrderStatus {
  id: string;
  status: string;
  paymentStatus: string;
  updatedAt: string;
}

// GET /api/orders/[id]/status - Get order status
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await apiClient.get<ApiResponse<ApiOrderStatus>>(`/orders/${id}`);

    const order = result.data;

    return NextResponse.json({
      id: order.id,
      status: order.status,
      payment_status: order.paymentStatus,
      updated_at: order.updatedAt,
    });
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/orders/[id]/status - Update order status
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    // Fetch current order first
    const currentResult = await apiClient.get<ApiResponse<ApiOrderStatus>>(`/orders/${id}`);

    if (!currentResult.data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentOrder = currentResult.data;
    const currentStatus = currentOrder.status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentOrder.status}' to '${status}'`,
          current_status: currentOrder.status,
          allowed_transitions: allowedTransitions,
        },
        { status: 400 }
      );
    }

    // Update order status via API
    const updatedResult = await apiClient.patch<ApiResponse<ApiOrderStatus>>(
      `/orders/${id}/status`,
      { status, notes }
    );

    const updatedOrder = updatedResult.data;

    return NextResponse.json({
      id: updatedOrder.id,
      status: updatedOrder.status,
      payment_status: updatedOrder.paymentStatus,
      updated_at: updatedOrder.updatedAt,
    });
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
