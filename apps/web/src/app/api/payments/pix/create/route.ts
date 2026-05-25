import { MercadoPagoConfig, Payment } from 'mercadopago';
import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';
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
  restaurant_id?: string;
}

interface PixPaymentResponse {
  qr_code: string;
  qr_code_base64: string;
  expires_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ApiPixPayment {
  id: string;
  qrCode: string;
  expiresAt: string;
  amount: number;
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

    // Get order details from API
    let orderTotal = 0;
    let customerEmail = '';
    let restaurantId = body.restaurant_id || '';

    try {
      const orderResult = await apiClient.get<
        ApiResponse<{
          total: number;
          customerEmail: string | null;
          restaurantId: string;
        }>
      >(`/orders/${body.order_id}`);

      orderTotal = orderResult.data.total;
      customerEmail = orderResult.data.customerEmail || '';
      restaurantId = orderResult.data.restaurantId;
    } catch {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Create Pix payment with Mercado Pago
    if (!paymentClient) {
      return NextResponse.json({ error: 'Mercado Pago not configured' }, { status: 500 });
    }

    const payment = await paymentClient.create({
      body: {
        transaction_amount: orderTotal,
        description: `Pedido ${body.order_id}`,
        payment_method_id: 'pix',
        payer: {
          email: customerEmail,
        },
        metadata: {
          order_id: body.order_id,
          restaurant_id: restaurantId,
        },
      },
    });

    // Extract Pix data from the payment response
    const pixData = payment.point_of_interaction?.transaction_data;

    if (!pixData?.qr_code) {
      return NextResponse.json({ error: 'Failed to generate Pix QR code' }, { status: 500 });
    }

    // Calculate expires_at (30 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const paymentIntentId = payment.id?.toString();
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Mercado Pago returned an invalid payment ID' },
        { status: 500 }
      );
    }

    // Store payment intent via API
    try {
      await apiClient.post<ApiResponse<ApiPixPayment>>('/payments/pix/create', {
        orderId: body.order_id,
        restaurantId,
        amount: orderTotal,
      });
    } catch (error) {
      logger.error('payments/pix', 'Failed to create payment intent via API:', { error });
      // Continue anyway - the Mercado Pago payment was created
    }

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
