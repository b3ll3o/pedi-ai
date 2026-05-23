import { MercadoPagoConfig, Payment } from 'mercadopago';
import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
import { logger } from '@/lib/logger';

// Demo mode check
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE === 'true';

// Configure MercadoPago client (only if not demo mode)
let client: MercadoPagoConfig | null = null;
let paymentClient: Payment | null = null;

if (!isDemoMode) {
  client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });
  paymentClient = new Payment(client);
}

interface CreatePixPaymentRequest {
  order_id: string;
}

interface PixPaymentResponse {
  qr_code: string;
  qr_code_base64: string;
  expires_at: string;
}

export async function POST(request: NextRequest) {
  // DEMO MODE: Return mock PIX data
  if (isDemoMode) {
    await request.json().catch(() => ({ order_id: 'demo' }));
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const mockQrCode =
      '00020101021226880014br.gov.bcb.pix2565demo.here.co/v2/demo' +
      Math.random().toString(36).substring(7);

    return NextResponse.json({
      qr_code: mockQrCode,
      qr_code_base64: `data:image/png;base64,${Buffer.from(mockQrCode).toString('base64')}`,
      expires_at: expiresAt.toISOString(),
    });
  }

  try {
    const body: CreatePixPaymentRequest = await request.json();

    if (!body.order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Fetch order with customer email
    const orderResult = await sql<{
      id: string;
      restaurant_id: string;
      total: number;
      payment_status: string;
      customer_email: string | null;
    }>`
      SELECT id, restaurant_id, total, payment_status, customer_email
      FROM orders
      WHERE id = ${body.order_id}
      LIMIT 1
    `;

    if (!orderResult || orderResult.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderResult[0];

    // Check if order is already paid
    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
    }

    // Validate we have an email for the payer
    if (!order.customer_email) {
      logger.error('payments/pix', 'Customer email not found for order', {
        orderId: body.order_id,
      });
      return NextResponse.json(
        { error: 'Customer email is required for PIX payment' },
        { status: 400 }
      );
    }

    // Create Pix payment with Mercado Pago
    const payment = await paymentClient!.create({
      body: {
        transaction_amount: order.total,
        description: `Pedido ${order.id}`,
        payment_method_id: 'pix',
        payer: {
          email: order.customer_email,
        },
        metadata: {
          order_id: order.id,
          restaurant_id: order.restaurant_id,
        },
      },
    });

    // Extract Pix data from the payment response
    const pixData = payment.point_of_interaction?.transaction_data;

    if (!pixData?.qr_code) {
      return NextResponse.json({ error: 'Failed to generate Pix QR code' }, { status: 500 });
    }

    // Store payment intent in database
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // Mercado Pago Pix expires in 30 minutes

    const paymentIntentId = payment.id?.toString();
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Mercado Pago returned an invalid payment ID' },
        { status: 500 }
      );
    }

    await sql`
      INSERT INTO payment_intents (
        id, order_id, restaurant_id, amount, currency, status,
        payment_method, mercado_pago_payment_id, qr_code, qr_code_base64,
        expires_at, created_at
      ) VALUES (
        ${paymentIntentId}, ${order.id}, ${order.restaurant_id}, ${order.total},
        'BRL', 'pending', 'pix', ${paymentIntentId}, ${pixData.qr_code},
        ${pixData.qr_code_base64 ?? null}, ${expiresAt.toISOString()}, ${new Date().toISOString()}
      )
    `;

    // Update order with payment method
    await sql`
      UPDATE orders SET payment_method = 'pix' WHERE id = ${body.order_id}
    `;

    const response: PixPaymentResponse = {
      qr_code: pixData.qr_code,
      qr_code_base64:
        pixData.qr_code_base64 ??
        `data:image/png;base64,${Buffer.from(pixData.qr_code).toString('base64')}`,
      expires_at: expiresAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('payments/pix', 'Error creating Pix payment:', { error: error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
