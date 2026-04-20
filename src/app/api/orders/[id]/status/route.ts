import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

// GET /api/orders/[id]/status - Get order status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const supabase = await createClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching order:', error)
      return NextResponse.json(
        { error: 'Failed to fetch order' },
        { status: 500 }
      )
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      updated_at: order.updated_at,
    })
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id]/status - Update order status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('id', id)
      .single()

    if (fetchError || !currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Validate status transition
    const allowedTransitions = VALID_TRANSITIONS[currentOrder.status] || []
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentOrder.status}' to '${status}'`,
          current_status: currentOrder.status,
          allowed_transitions: allowedTransitions,
        },
        { status: 400 }
      )
    }

    // If cancelling, handle payment refund if applicable
    if (status === 'cancelled' && currentOrder.payment_status === 'paid') {
      // Payment refund logic would go here
      // For now, we'll just update the payment status
    }

    // Update order status
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating order status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      )
    }

    // Record status change in history
    await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        status,
        notes: notes || null,
      })

    return NextResponse.json({
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      updated_at: order.updated_at,
    })
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
