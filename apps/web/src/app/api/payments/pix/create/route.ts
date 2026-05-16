import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { orders, paymentIntents } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
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

    if (isDevDatabase()) {
      // Fetch order
      const orderResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, body.order_id))
        .limit(1);

      if (!orderResult || orderResult.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const order = orderResult[0];

      // Check if order is already paid
      if (order.payment_status === 'paid') {
        return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
      }

      // Create Pix payment with Mercado Pago
      const payment = await paymentClient!.create({
        body: {
          transaction_amount: order.total,
          description: `Pedido ${order.id}`,
          payment_method_id: 'pix',
          payer: {
            email: 'customer@pedi.ai', // TODO: get from customer data
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

      await db.insert(paymentIntents).values({
        id: paymentIntentId,
        order_id: order.id,
        restaurant_id: order.restaurant_id,
        amount: order.total,
        currency: 'BRL',
        status: 'pending',
        payment_method: 'pix',
        mercado_pago_payment_id: paymentIntentId,
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64 ?? null,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

      // Update order with payment method
      await db.update(orders).set({ payment_method: 'pix' }).where(eq(orders.id, body.order_id));

      const response: PixPaymentResponse = {
        qr_code: pixData.qr_code,
        qr_code_base64:
          pixData.qr_code_base64 ??
          `data:image/png;base64,${Buffer.from(pixData.qr_code).toString('base64')}`,
        expires_at: expiresAt.toISOString(),
      };

      return NextResponse.json(response);
    } else {
      const supabase = getSupabaseAdmin();

      // Fetch order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', body.order_id)
        .single();

      if (orderError || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Check if order is already paid
      if (order.payment_status === 'paid') {
        return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
      }

      // Create Pix payment with Mercado Pago
      const payment = await paymentClient!.create({
        body: {
          transaction_amount: order.total,
          description: `Pedido ${order.id}`,
          payment_method_id: 'pix',
          payer: {
            email: 'customer@pedi.ai', // TODO: get from customer data
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

      // Store payment intent in database (payment_intents table)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // Mercado Pago Pix expires in 30 minutes

      const paymentIntentId = payment.id?.toString();
      if (!paymentIntentId) {
        return NextResponse.json(
          { error: 'Mercado Pago returned an invalid payment ID' },
          { status: 500 }
        );
      }

      const paymentIntentInsert = {
        id: paymentIntentId,
        order_id: order.id,
        restaurant_id: order.restaurant_id,
        amount: order.total,
        currency: 'BRL',
        status: 'pending' as const,
        payment_method: 'pix' as const,
        mercado_pago_payment_id: paymentIntentId,
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64 ?? null,
        expires_at: expiresAt.toISOString(),
      };

      const { error: intentError } = await supabase
        .from('payment_intents')
        .insert(paymentIntentInsert);

      if (intentError) {
        logger.error('payments/pix', 'Error storing payment intent:', { error: intentError });
        // Continue anyway - the payment was created successfully
      }

      // Update order with payment method
      await supabase.from('orders').update({ payment_method: 'pix' }).eq('id', body.order_id);

      const response: PixPaymentResponse = {
        qr_code: pixData.qr_code,
        qr_code_base64:
          pixData.qr_code_base64 ??
          `data:image/png;base64,${Buffer.from(pixData.qr_code).toString('base64')}`,
        expires_at: expiresAt.toISOString(),
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    logger.error('payments/pix', 'Error creating Pix payment:', { error: error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
