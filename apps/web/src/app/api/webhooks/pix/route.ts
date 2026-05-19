import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

/**
 * Webhook handler for Mercado Pago PIX notifications.
 *
 * This route handles:
 * 1. Signature validation (HMAC-SHA256)
 * 2. Idempotency check
 * 3. Updating order status
 *
 * Note: Realtime broadcasting is removed as we're no longer using Supabase
 */
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? '';
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? '';

function validateSignature(payload: { id: string }, signature: string): boolean {
  if (!MP_WEBHOOK_SECRET) {
    logger.error('webhooks/pix', 'MP_WEBHOOK_SECRET não configurado');
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
 * Receives webhook payloads from Mercado Pago.
 */
export async function POST(request: NextRequest) {
  let payload: { id: string; type: string; data: { id: string } };
  let signature: string | null = null;

  try {
    // Extract signature from header
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

  // Validate signature if provided
  if (signature && !validateSignature(payload, signature)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
  }

  const paymentId = String(data.id);

  // Idempotency check
  const existingEvent = await sql`
    SELECT id FROM webhook_events WHERE id = ${eventId} LIMIT 1
  `;

  if (existingEvent.length > 0) {
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
    logger.error('webhooks/pix', 'Erro ao buscar payment details:', { error: err });
    return NextResponse.json({ error: 'Erro ao buscar detalhes do pagamento' }, { status: 500 });
  }

  const orderId = mpPayment.metadata?.order_id;
  if (!orderId) {
    return NextResponse.json({ error: 'order_id não encontrado no metadata' }, { status: 400 });
  }

  const orderStatus = (STATUS_MAP[mpPayment.status] ?? 'pending_payment') as OrderStatus;

  // Update order status in database
  const updateResult = await sql`
    UPDATE orders
    SET status = ${orderStatus}, updated_at = ${new Date().toISOString()}
    WHERE id = ${orderId}
  `;

  if (updateResult.count === 0) {
    logger.error('webhooks/pix', 'Pedido não encontrado:', { orderId });
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  // Also update payment_intents table if exists
  const paymentIntent = await sql`
    SELECT id FROM payment_intents WHERE order_id = ${orderId} LIMIT 1
  `;

  if (paymentIntent.length > 0) {
    const intentStatus =
      mpPayment.status === 'approved'
        ? 'succeeded'
        : mpPayment.status === 'pending'
          ? 'pending'
          : mpPayment.status === 'rejected' || mpPayment.status === 'cancelled'
            ? 'failed'
            : 'pending';
    await sql`
      UPDATE payment_intents
      SET status = ${intentStatus}
      WHERE order_id = ${orderId}
    `;
  }

  // Record webhook event for idempotency
  await sql`
    INSERT INTO webhook_events (id, event_type, processed_at)
    VALUES (${eventId}, 'payment', ${new Date().toISOString()})
  `;

  logger.info('webhooks/pix', 'Pagamento processado com sucesso', {
    orderId,
    status: orderStatus,
  });

  return NextResponse.json({ status: 'success' }, { status: 200 });
}
