import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

interface ValidateRequest {
  /**
   * QR code no formato base64-encoded JSON.
   * Aceita tanto o formato PT-BR (gerado por `MesaAggregate.gerarQRCodePayload`):
   * `{ restauranteId, mesaId, assinatura }`
   * quanto o formato EN (`@/lib/qr/validator.ts`):
   * `{ restaurant_id, table_id, timestamp, signature, nonce?, expiry? }`.
   */
  qrCode: string;
}

interface ValidateResponse {
  valid: boolean;
  restauranteId?: string;
  mesaId?: string;
  error?: string;
}

interface NormalizedPayload {
  restauranteId?: string;
  mesaId?: string;
  assinatura?: string;
  timestamp?: number;
  nonce?: string;
  expiry?: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QR_MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 horas
const LEGACY_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas para QRs legados sem timestamp

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Decodifica base64 JSON do QR e normaliza campos PT-BR ↔ EN.
 * Retorna `null` se o payload não puder ser parseado.
 */
function decodePayload(qrCode: string): NormalizedPayload | null {
  try {
    const json = Buffer.from(qrCode, 'base64').toString('utf-8');
    const payload = JSON.parse(json) as Record<string, unknown>;
    return {
      restauranteId:
        (payload.restauranteId as string | undefined) ??
        (payload.restaurant_id as string | undefined),
      mesaId: (payload.mesaId as string | undefined) ?? (payload.table_id as string | undefined),
      assinatura:
        (payload.assinatura as string | undefined) ?? (payload.signature as string | undefined),
      timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : undefined,
      nonce: typeof payload.nonce === 'string' ? payload.nonce : undefined,
      expiry: typeof payload.expiry === 'number' ? payload.expiry : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Valida estrutura e formato do payload. Retorna a mensagem de erro ou
 * `null` se estiver tudo OK.
 */
function validatePayloadShape(payload: NormalizedPayload): string | null {
  if (!payload.restauranteId || !payload.mesaId || !payload.assinatura) {
    return 'Campos obrigatórios ausentes no QR';
  }
  if (!isValidUUID(payload.restauranteId) || !isValidUUID(payload.mesaId)) {
    return 'IDs em formato inválido';
  }
  if (payload.nonce !== undefined && !isValidUUID(payload.nonce)) {
    return 'Nonce em formato inválido';
  }
  return null;
}

/**
 * Valida janelas de tempo do QR code (timestamp + expiry).
 * Retorna a mensagem de erro ou `null` se válido.
 */
function validateTimestamps(payload: NormalizedPayload): string | null {
  const { timestamp, nonce, expiry } = payload;
  if (timestamp !== undefined) {
    const now = Date.now();
    const maxAge = nonce !== undefined ? QR_MAX_AGE_MS : LEGACY_MAX_AGE_MS;
    if (timestamp <= 0 || timestamp > now || now - timestamp > maxAge) {
      return 'QR code expirado ou timestamp inválido';
    }
  }
  if (expiry !== undefined && Date.now() > expiry) {
    return 'QR code expirado';
  }
  return null;
}

/**
 * Verifica a assinatura HMAC-SHA256 sobre o payload canônico
 * `restauranteId:mesaId[:timestamp[:nonce]]`. Formato compartilhado com
 * `MesaAggregate.gerarQRCodePayload` (apps/web) e `TablesService.assinarQrCode`
 * (apps/api).
 */
function verifySignature(payload: NormalizedPayload, secret: string): boolean {
  const { restauranteId, mesaId, timestamp, nonce, assinatura } = payload;
  if (!restauranteId || !mesaId || !assinatura) return false;
  const messageParts = [restauranteId, mesaId];
  if (timestamp !== undefined) messageParts.push(String(timestamp));
  if (nonce !== undefined) messageParts.push(nonce);
  const expected = createHmac('sha256', secret).update(messageParts.join(':')).digest('hex');
  return timingSafeCompare(expected, assinatura);
}

/**
 * Validação server-side de QR code de mesa.
 *
 * Recebe o payload base64 do QR e verifica a assinatura HMAC-SHA256
 * usando `QR_SECRET_KEY` (variável de ambiente **server-only** — nunca
 * acessível ao bundle do cliente).
 *
 * Esta rota substitui a validação client-side que existia em
 * `useValidarQRCode` e que vazava o segredo no bundle.
 *
 * @see apps/web/src/lib/qr/validator.ts para a especificação completa do
 * formato EN (incluindo nonce/expiry).
 * @see apps/web/src/domain/mesa/aggregates/MesaAggregate.ts para o
 * formato PT-BR usado por `gerarQRCodePayload`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ValidateRequest>;
    const { qrCode } = body;

    if (typeof qrCode !== 'string' || qrCode.length === 0) {
      return NextResponse.json<ValidateResponse>(
        { valid: false, error: 'qrCode é obrigatório' },
        { status: 400 }
      );
    }

    const secret = process.env.QR_SECRET_KEY;
    if (!secret) {
      // Erro de configuração do servidor — não vaza detalhes ao cliente.
      return NextResponse.json<ValidateResponse>(
        { valid: false, error: 'Validação indisponível no momento' },
        { status: 503 }
      );
    }

    const payload = decodePayload(qrCode);
    if (!payload) {
      return NextResponse.json<ValidateResponse>(
        { valid: false, error: 'QR code inválido (formato esperado: base64 JSON)' },
        { status: 400 }
      );
    }

    const shapeError = validatePayloadShape(payload);
    if (shapeError) {
      return NextResponse.json<ValidateResponse>(
        { valid: false, error: shapeError },
        { status: 400 }
      );
    }

    const timestampError = validateTimestamps(payload);
    if (timestampError) {
      return NextResponse.json<ValidateResponse>(
        { valid: false, error: timestampError },
        { status: 400 }
      );
    }

    if (!verifySignature(payload, secret)) {
      return NextResponse.json<ValidateResponse>(
        { valid: false, error: 'Assinatura inválida' },
        { status: 400 }
      );
    }

    return NextResponse.json<ValidateResponse>({
      valid: true,
      restauranteId: payload.restauranteId,
      mesaId: payload.mesaId,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[/api/tables/validate]', error);
    }
    return NextResponse.json<ValidateResponse>(
      { valid: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
