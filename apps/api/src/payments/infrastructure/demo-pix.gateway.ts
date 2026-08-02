import { Injectable, Logger } from '@nestjs/common';

import { CreatePixInput, PixChargeOutput, PixGateway } from './pix-gateway';

/**
 * Gateway PIX para desenvolvimento e CI.
 *
 * Gera um BR Code (PIX EMV) determinístico a partir do `orderId` e do valor,
 * sem chamar PSP real. Apps bancários podem recusar o payload por CRC16
 * placeholder — comportamento esperado (sem token MP, não há cobrança real).
 *
 * Quando `PIX_GATEWAY_MODE=mp` estiver configurado com token válido, o
 * `PaymentsModule` substitui este gateway pelo `MercadoPagoPixGateway`.
 *
 * @spec(RF-PAY-06)
 */
@Injectable()
export class DemoPixGateway implements PixGateway {
  private readonly logger = new Logger(DemoPixGateway.name);

  async createPixCharge(input: CreatePixInput): Promise<PixChargeOutput> {
    this.logger.warn(
      `DemoPixGateway criando cobrança PIX stub — ordem ${input.orderId} ` +
        `(R$ ${input.amount.toFixed(2)}). Em produção, configure MERCADOPAGO_ACCESS_TOKEN.`
    );

    const externalId = `demo-${input.orderId}`;
    const amount = input.amount.toFixed(2);
    const txid = input.orderId.slice(0, 25).padEnd(25, '0');

    const tlv = (tag: string, value: string): string => {
      const len = String(value.length).padStart(2, '0');
      return `${tag}${len}${value}`;
    };

    const merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('01', 'demo@pedi-ai.com');
    const parts = [
      tlv('00', '01'),
      tlv('26', merchantAccount),
      tlv('52', '0000'),
      tlv('53', '986'),
      tlv('54', amount),
      tlv('58', 'BR'),
      tlv('59', 'PEDI-AI DEMO'),
      tlv('60', 'SAO PAULO'),
      tlv('62', tlv('05', txid)),
    ];
    // CRC16 placeholder — sem CRC válido, apps bancários podem recusar
    // (por isso é importante migrar para o payload real do PSP quando ativo).
    const pixPayload = parts.join('') + '6304DEMO';

    // Renderiza via serviço público para fins de demo (mesmo padrão do stub
    // original). Em produção, isso é substituído pelo base64 retornado pelo MP.
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      pixPayload
    )}`;
    const qrCodeBase64 = '';

    return {
      externalId,
      qrCode,
      qrCodeBase64,
      expiresAt: new Date(Date.now() + input.expirationMs),
    };
  }
}
