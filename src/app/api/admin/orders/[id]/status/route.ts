import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/auth/admin'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Valid order statuses based on DB enum
type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

// Valid status transitions (DB schema)
const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

// Status display names in Portuguese
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

// Valid order statuses based on DB enum
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const { id } = await params
    const body = await request.json()
    const { status } = body as { status: OrderStatus }

    if (!status) {
      return NextResponse.json(
        { error: 'status é obrigatório' },
        { status: 400 }
      )
    }

    const validStatuses: OrderStatus[] = ['pending_payment', 'paid', 'preparing', 'ready', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status '${status}' não é válido` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, restaurant_id')
      .eq('id', id)
      .single()

    if (fetchError || !currentOrder) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Validate status transition
    const currentStatus = currentOrder.status as OrderStatus
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || []

    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Transição de status inválida de '${currentStatus}' para '${status}'`,
          current_status: currentStatus,
          allowed_transitions: allowedTransitions,
        },
        { status: 400 }
      )
    }

    // Update order status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating order status:', updateError)
      return NextResponse.json(
        { error: 'Falha ao atualizar status do pedido' },
        { status: 500 }
      )
    }

    // Record status change in history (actor info stored in notes since DB doesn't have actor columns)
    const actorNotes = JSON.stringify({
      actor_id: authUser.id,
      actor_type: 'admin',
      actor_email: authUser.email,
    })

    await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        status,
        notes: actorNotes,
      })

    // Emit realtime event to orders channel
    try {
      supabase.channel('orders').send({
        type: 'broadcast',
        event: 'order_updated',
        payload: {
          order_id: id,
          status,
          updated_at: updatedOrder.updated_at,
          updated_by: authUser.id,
        },
      })
    } catch (realtimeError) {
      // Log but don't fail the request if realtime fails
      console.warn('Failed to emit realtime event:', realtimeError)
    }

    return NextResponse.json({
      data: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updated_at: updatedOrder.updated_at,
      },
    })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/admin/orders/[id]/status:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    const status = message === 'Não autenticado' || message === 'Usuário não encontrado' ? 401 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}