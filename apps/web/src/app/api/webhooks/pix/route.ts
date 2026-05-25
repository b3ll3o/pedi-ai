import { createHmac, timingSafeEqual } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
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
 * Note: Realtime broadcasting foi removido
 */
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? '';
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? '';

function validateSignature(rawBody: string, signature: string): boolean {
  if (!MP_WEBHOOK_SECRET) {
    logger.error('webhooks/pix', 'MP_WEBHOOK_SECRET não configurado');
    return false;
  }

  // Mercado Pago signs the raw request body as-is
  const hmac = createHmac('sha256', MP_WEBHOOK_SECRET);
  hmac.update(rawBody);
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

function mapToOrderStatus(mpStatus: string): OrderStatus {
  return (STATUS_MAP[mpStatus] ?? 'pending_payment') as OrderStatus;
}

function mapToIntentStatus(mpStatus: string): string {
  if (mpStatus === 'approved') return 'succeeded';
  if (mpStatus === 'pending') return 'pending';
  if (mpStatus === 'rejected' || mpStatus === 'cancelled') return 'failed';
  return 'pending';
}

async function fetchMercadoPagoPayment(paymentId: string): Promise<MpPaymentResponse> {
  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!mpResponse.ok) {
    throw new Error(`Mercado Pago API error: ${mpResponse.status}`);
  }
  return mpResponse.json();
}

async function updateOrderStatus(orderId: string, orderStatus: OrderStatus): Promise<number> {
  const updateResult = await sql`
    UPDATE orders
    SET status = ${orderStatus}, updated_at = ${new Date().toISOString()}
    WHERE id = ${orderId}
  `;
  return updateResult.count ?? 0;
}

async function updatePaymentIntent(orderId: string, mpStatus: string): Promise<void> {
  const paymentIntent = await sql`
    SELECT id FROM payment_intents WHERE order_id = ${orderId} LIMIT 1
  `;

  if (paymentIntent.length > 0) {
    const intentStatus = mapToIntentStatus(mpStatus);
    await sql`
      UPDATE payment_intents
      SET status = ${intentStatus}
      WHERE order_id = ${orderId}
    `;
  }
}

async function recordWebhookEvent(eventId: string): Promise<void> {
  await sql`
    INSERT INTO webhook_events (id, event_type, processed_at)
    VALUES (${eventId}, 'payment', ${new Date().toISOString()})
  `;
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const existingEvent = await sql`
    SELECT id FROM webhook_events WHERE id = ${eventId} LIMIT 1
  `;
  return existingEvent.length > 0;
}

/**
 * POST /api/webhooks/pix
 * Recebe webhook payloads from Mercado Pago.
 */
export async function POST(request: NextRequest) {
  let rawBody: string;
  let payload: { id: string; type: string; data: { id: string } };
  let signature: string | null = null;

  try {
    // Read raw body first for signature validation, then parse JSON
    rawBody = await request.text();
    payload = JSON.parse(rawBody);
    // Extract signature from header
    signature = request.headers.get('x-mp-signature');
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const { id: eventId, type, data } = payload;

  // Only process payment events
  if (type !== 'payment' || !data?.id) {
    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }

  // Require valid signature for webhook authentication
  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 401 });
  }

  if (!validateSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
  }

  const paymentId = String(data.id);

  // Idempotency check
  if (await isEventProcessed(eventId)) {
    return NextResponse.json({ status: 'duplicate' }, { status: 200 });
  }

  // Fetch full payment details from Mercado Pago
  let mpPayment: MpPaymentResponse;
  try {
    mpPayment = await fetchMercadoPagoPayment(paymentId);
  } catch (err) {
    logger.error('webhooks/pix', 'Erro ao buscar payment details:', { error: err });
    return NextResponse.json({ error: 'Erro ao buscar detalhes do pagamento' }, { status: 500 });
  }

  const orderId = mpPayment.metadata?.order_id;
  if (!orderId) {
    return NextResponse.json({ error: 'order_id não encontrado no metadata' }, { status: 400 });
  }

  const orderStatus = mapToOrderStatus(mpPayment.status);

  // Update order status in database
  const updateCount = await updateOrderStatus(orderId, orderStatus);

  if (updateCount === 0) {
    logger.error('webhooks/pix', 'Pedido não encontrado:', { orderId });
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  // Also update payment_intents table if exists
  await updatePaymentIntent(orderId, mpPayment.status);

  // Record webhook event for idempotency
  await recordWebhookEvent(eventId);

  logger.info('webhooks/pix', 'Pagamento processado com sucesso', {
    orderId,
    status: orderStatus,
  });

  return NextResponse.json({ status: 'success' }, { status: 200 });
}
