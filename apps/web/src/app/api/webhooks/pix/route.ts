import { createHmac, timingSafeEqual } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';

const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? '';

function validateSignature(rawBody: string, signature: string): boolean {
  if (!MP_WEBHOOK_SECRET) {
    logger.error('webhooks/pix', 'MP_WEBHOOK_SECRET não configurado');
    return false;
  }

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

/**
 * POST /api/webhooks/pix
 * Proxy webhook to API after signature validation
 */
export async function POST(request: NextRequest) {
  let rawBody: string;
  let payload: { id: string | number; type: string; data: { id: string | number } };
  let signature: string | null = null;

  try {
    rawBody = await request.text();
    payload = JSON.parse(rawBody);
    signature = request.headers.get('x-mp-signature');
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const { type, data } = payload;

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

  // Forward to API
  try {
    const result = await apiClient.post<{ status: string }>('/payments/webhooks/pix', payload);
    return NextResponse.json({ status: result.status }, { status: 200 });
  } catch (error) {
    logger.error('webhooks/pix', 'Erro ao enviar webhook para API:', { error });
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}
