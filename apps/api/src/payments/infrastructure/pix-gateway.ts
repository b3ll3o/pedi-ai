/**
 * Gateway para criação de cobranças PIX.
 *
 * @spec(RF-PAY-01)
 *
 * Define o contrato que `PaymentsService` consome. A implementação concreta
 * é resolvida por DI no `PaymentsModule` com base em `PIX_GATEWAY_MODE`:
 *
 * - `mp`        → `MercadoPagoPixGateway` (produção/staging com token válido).
 * - `demo`      → `DemoPixGateway` (dev/CI sem credenciais reais; gera BR Code
 *                 EMV determinístico).
 *
 * Este contrato permite trocar de PSP (ou estratégia de fallback) sem mexer
 * no service. **P0-07** (auditoria 2026-07-29) — antes o `payments.service.ts`
 * embutia o stub BR Code, deixando clientes sem caminho de pagamento real.
 */
export interface CreatePixInput {
  /** ID interno do pedido (usado como `external_reference` no MP). */
  orderId: string;
  /** Valor em reais (já convertido de centavos). */
  amount: number;
  /** Descrição legível que aparece no app do banco do cliente. */
  description: string;
  /**
   * Email do pagador. MercadoPago exige payer.email para PIX dinâmico.
   * Opcional no contrato (gateway demo não usa) — controllers devem
   * preencher a partir do customer do pedido.
   */
  payerEmail?: string;
  /** TTL em ms; após esse ponto, o QR Code expira. */
  expirationMs: number;
}

export interface PixChargeOutput {
  /** ID do pagamento no PSP. Persistido como `mpPaymentId` para reconciliação. */
  externalId: string;
  /** Payload PIX EMV (BR Code) — texto a ser codificado no QR. */
  qrCode: string;
  /** QR Code já codificado em base64 PNG, pronto para `<img src=>`. */
  qrCodeBase64: string;
  /** Data de expiração da cobrança. */
  expiresAt: Date;
}

export interface PixGateway {
  createPixCharge(input: CreatePixInput): Promise<PixChargeOutput>;
}

/**
 * Resolve qual implementação concreta do `PixGateway` deve ser usada.
 * Lê `PIX_GATEWAY_MODE` (default: `mp` quando há token, `demo` caso
 * contrário). Permite override explícito em testes.
 */
export function resolvePixGatewayMode(): 'mp' | 'demo' {
  const explicit = process.env.PIX_GATEWAY_MODE?.toLowerCase();
  if (explicit === 'mp' || explicit === 'demo') return explicit;

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (token && token.trim().length > 0) return 'mp';
  return 'demo';
}

/** Token de idempotência estável para um `orderId`. MP exige que o mesmo
 *  `Idempotency-Key` reentregue a mesma resposta em reintents legítimos. */
export function buildIdempotencyKey(orderId: string): string {
  return `pix-${orderId}`;
}
