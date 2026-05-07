import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Webhook handler for Mercado Pago PIX notifications.
 * 
 * This route is called by the Supabase Edge Function after it validates
 * the signature and checks idempotency. It handles:
 * 1. Signature validation (HMAC-SHA256)
 * 2. Idempotency check
 * 3. Updating order status
 * 4. Broadcasting event via Supabase Realtime for connected clients
 * 
 * The Supabase Edge Function (pix-webhook) forwards validated payloads here
 * to allow proper domain event dispatching through the application layer.
 */
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? '';
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createSupabaseAdmin(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function validateSignature(payload: { id: string }, signature: string): boolean {
  if (!MP_WEBHOOK_SECRET) {
    console.error('[webhooks/pix] MP_WEBHOOK_SECRET não configurado');
    return false;
  }

  const bodyStr = JSON.stringify(payload);
  const dataToSign = `${payload.id}.${bodyStr}`;
  const hmac = createHmac('sha256', MP_WEBHOOK_SECRET);
  hmac.update(dataToSign);
  const expectedSignature = `sha256=${hmac.digest('base64')}`;

  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

const STATUS_MAP: Record<string, string> = {
  approved: 'paid',
  pending: 'pending_payment',
  processing: 'processing',
  rejected: 'payment_failed',
  cancelled: 'payment_failed',
  refunded: 'refunded',
};

interface MpPaymentResponse {
  id: number;
  status: string;
  metadata: {
    order_id?: string;
    restaurant_id?: string;
  };
  transaction_details?: {
    payment_method_reference_id?: string;
  };
}

/**
 * POST /api/webhooks/pix
 * Receives forwarded webhook payloads from the Supabase Edge Function.
 */
export async function POST(request: NextRequest) {
  let payload: { id: string; type: string; data: { id: string } };
  let signature: string | null = null;

  try {
    // Extract signature from header (forwarded by Edge Function)
    signature = request.headers.get('x-mp-signature');
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const { id: eventId, type, data } = payload;

  // Only process payment events
  if (type !== 'payment' || !data?.id) {
    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }

  // Validate signature if provided (Edge Function should have validated already,
  // but we double-check if signature is present)
  if (signature && !validateSignature(payload, signature)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const paymentId = String(data.id);

  // Idempotency check
  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('id', eventId)
    .single();

  if (existingEvent) {
    return NextResponse.json({ status: 'duplicate' }, { status: 200 });
  }

  // Fetch full payment details from Mercado Pago
  let mpPayment: MpPaymentResponse;
  try {
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!mpResponse.ok) {
      throw new Error(`Mercado Pago API error: ${mpResponse.status}`);
    }
    mpPayment = await mpResponse.json();
  } catch (err) {
    console.error('[webhooks/pix] Erro ao buscar payment details:', err);
    return NextResponse.json({ error: 'Erro ao buscar detalhes do pagamento' }, { status: 500 });
  }

  const orderId = mpPayment.metadata?.order_id;
  if (!orderId) {
    return NextResponse.json({ error: 'order_id não encontrado no metadata' }, { status: 400 });
  }

  const orderStatus = STATUS_MAP[mpPayment.status] ?? 'pending_payment';

  // Update order status in database
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: orderStatus })
    .eq('id', orderId);

  if (updateError) {
    console.error('[webhooks/pix] Erro ao atualizar pedido:', updateError);
    return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
  }

  // Also update payment_intents table if exists
  const { data: paymentIntent } = await supabase
    .from('payment_intents')
    .select('id')
    .eq('order_id', orderId)
    .single();

  if (paymentIntent) {
    const intentStatus = mpPayment.status === 'approved' ? 'succeeded' :
                         mpPayment.status === 'pending' ? 'pending' :
                         mpPayment.status === 'rejected' || mpPayment.status === 'cancelled' ? 'failed' : 'pending';
    await supabase
      .from('payment_intents')
      .update({ status: intentStatus })
      .eq('order_id', orderId);
  }

  // Record webhook event for idempotency
  await supabase
    .from('webhook_events')
    .insert({ id: eventId, event_type: type });

  // Broadcast event via Supabase Realtime for connected clients
  // Uses same 'orders' channel and 'order_updated' event as admin order status route
  try {
    const realtimeChannel = supabase.channel('orders')
    await realtimeChannel.send({
      type: 'broadcast',
      event: 'order_updated',
      payload: {
        order_id: orderId,
        status: orderStatus,
        updated_at: new Date().toISOString(),
        updated_by: 'system',
        payment_id: String(paymentId),
      },
    })
    await supabase.removeChannel(realtimeChannel)
  } catch (broadcastErr) {
    // Non-fatal: log but don't fail the webhook
    console.warn('[webhooks/pix] Falha ao broadcast event:', broadcastErr)
  }

  return NextResponse.json({ status: 'success' }, { status: 200 });
}
