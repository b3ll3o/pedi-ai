import { Injectable, Logger } from '@nestjs/common';

import { CreatePixInput, PixChargeOutput, PixGateway, buildIdempotencyKey } from './pix-gateway';

/**
 * Shape mínimo da resposta de `POST /v1/payments` do MercadoPago que
 * consumimos. Mantido local para evitar dependência hard da tipagem
 * do SDK (`mercadopago` exporta um union muito verboso).
 */
interface MercadoPagoPaymentResponse {
  id?: number | string;
  point_of_interaction?: {
    transaction_details?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
  date_of_expiration?: string;
}

/**
 * Gateway PIX real do Mercado Pago.
 *
 * Faz `POST /v1/payments` com `payment_method_id: 'pix'` e usa
 * `Idempotency-Key` para garantir que retries do cliente não gerem
 * cobranças duplicadas. O webhook do MP confirma o pagamento e o
 * `PaymentsController` reconcilia o status.
 *
 * **Por que não usamos o SDK `mercadopago`?** — O SDK oficial adiciona
 * ~1MB de dependências transitivas e força tipagem específica de cada
 * versão da API. Como só precisamos de 1 endpoint (POST /v1/payments
 * com PIX), `fetch` direto com tipos locais é mais leve, auditável e
 * trivial de mockar em testes. O SDK pode ser reintroduzido se
 * passarmos a consumir múltiplos recursos.
 *
 * @spec(RF-PAY-01)
 */
@Injectable()
export class MercadoPagoPixGateway implements PixGateway {
  private readonly logger = new Logger(MercadoPagoPixGateway.name);

  constructor(
    private readonly accessToken: string,
    private readonly baseUrl = 'https://api.mercadopago.com',
    private readonly timeoutMs = 10_000
  ) {
    if (!accessToken || accessToken.trim().length === 0) {
      throw new Error('MercadoPagoPixGateway requer accessToken não-vazio');
    }
  }

  async createPixCharge(input: CreatePixInput): Promise<PixChargeOutput> {
    const idempotencyKey = buildIdempotencyKey(input.orderId);

    const response = await fetch(`${this.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
        'User-Agent': 'PediAI/1.0 (pix-gateway)',
      },
      body: JSON.stringify({
        transaction_amount: Number(input.amount.toFixed(2)),
        description: input.description,
        payment_method_id: 'pix',
        payer: input.payerEmail ? { email: input.payerEmail } : undefined,
        external_reference: input.orderId,
        date_of_expiration: new Date(Date.now() + input.expirationMs).toISOString(),
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(
        `MercadoPago PIX create falhou: ${response.status} ${response.statusText} — ${errorText.slice(0, 500)}`
      );
      throw new Error(`Falha ao criar cobrança PIX no MercadoPago (HTTP ${response.status})`);
    }

    const data = (await response.json()) as MercadoPagoPaymentResponse;
    const tx = data.point_of_interaction?.transaction_details;

    if (!data.id || !tx?.qr_code) {
      this.logger.error(`Resposta do MercadoPago PIX sem id ou qr_code (orderId=${input.orderId})`);
      throw new Error('Resposta do MercadoPago PIX incompleta (sem id ou qr_code)');
    }

    return {
      externalId: String(data.id),
      qrCode: tx.qr_code,
      qrCodeBase64: tx.qr_code_base64 ?? '',
      expiresAt: new Date(data.date_of_expiration ?? Date.now() + input.expirationMs),
    };
  }
}
