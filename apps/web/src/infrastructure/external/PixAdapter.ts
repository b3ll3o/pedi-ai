import { MercadoPagoConfig, Payment } from 'mercadopago';
import { IPixAdapter, PixCharge } from '@/application/pagamento/services/adapters/IPixAdapter';

const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE === 'true';

/**
 * Implementação do adapter de Pix para Mercado Pago.
 * Usa o SDK oficial mercadopago v2.
 *
 * Variáveis de ambiente necessárias:
 * - MERCADOPAGO_ACCESS_TOKEN: Token de acesso do Mercado Pago
 * - NEXT_PUBLIC_DEMO_PAYMENT_MODE: Se "true", retorna dados simulados (para desenvolvimento)
 */
export class PixAdapter implements IPixAdapter {
  private accessToken: string;
  private client: Payment;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    const config = new MercadoPagoConfig({
      accessToken: this.accessToken,
    });
    this.client = new Payment(config);
  }

  /**
   * Cria uma cobrança Pix via Mercado Pago SDK v2.
   * Retorna QR code e dados para pagamento.
   */
  async criarCobranca(valorEmCentavos: number, pedidoId: string): Promise<PixCharge> {
    // Modo demo: retorna dados simulados sem chamar API externa
    if (isDemoMode()) {
      return this.criarCobrancaSimulada(valorEmCentavos, pedidoId);
    }

    if (!this.accessToken) {
      throw new Error(
        'Mercado Pago access token não configurado. Defina MERCADOPAGO_ACCESS_TOKEN.'
      );
    }

    try {
      const response = await this.client.create({
        body: {
          transaction_amount: valorEmCentavos / 100, // API espera reais, não centavos
          payment_method_id: 'pix',
          description: `Pedido ${pedidoId}`,
          external_reference: pedidoId,
          notification_url: process.env.MP_WEBHOOK_URL,
        },
      });

      const qrCodeBase64 = response.point_of_interaction?.transaction_data?.qr_code_base64;
      const qrCodeRaw = response.point_of_interaction?.transaction_data?.qr_code;
      const expiracaoStr = response.date_of_expiration;

      const expiracao = expiracaoStr ? new Date(expiracaoStr) : this.calcularExpiracaoPadrao();

      return {
        id: String(response.id),
        valor: valorEmCentavos / 100,
        imagemQrCode: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : '',
        codigoPix: qrCodeRaw || '',
        expiracao,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao criar cobrança Pix: ${message}`);
    }
  }

  /**
   * Verifica o status de uma cobrança Pix via Mercado Pago SDK.
   */
  async verificarStatus(cobrancaId: string): Promise<PixCharge> {
    // Modo demo: retorna simulação
    if (isDemoMode()) {
      return this.verificarStatusSimulado(cobrancaId);
    }

    if (!this.accessToken) {
      throw new Error(
        'Mercado Pago access token não configurado. Defina MERCADOPAGO_ACCESS_TOKEN.'
      );
    }

    try {
      const response = await this.client.get({ id: Number(cobrancaId) });

      const qrCodeBase64 = response.point_of_interaction?.transaction_data?.qr_code_base64;
      const qrCodeRaw = response.point_of_interaction?.transaction_data?.qr_code;
      const expiracaoStr = response.date_of_expiration;

      const expiracao = expiracaoStr ? new Date(expiracaoStr) : this.calcularExpiracaoPadrao();

      return {
        id: String(response.id),
        valor: response.transaction_amount || 0,
        imagemQrCode: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : '',
        codigoPix: qrCodeRaw || '',
        expiracao,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao verificar status Pix: ${message}`);
    }
  }

  private calcularExpiracaoPadrao(): Date {
    const expiracao = new Date();
    expiracao.setMinutes(expiracao.getMinutes() + 30);
    return expiracao;
  }

  private criarCobrancaSimulada(valorEmCentavos: number, pedidoId: string): PixCharge {
    const expiracao = this.calcularExpiracaoPadrao();
    return {
      id: `pix_${pedidoId}_${Date.now()}`,
      valor: valorEmCentavos / 100,
      imagemQrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
      codigoPix: `00020126580014br.gov.bcb.pix0136${pedidoId}520400005303986540410000005802BR5901${pedidoId}6009MATO700801`,
      expiracao,
    };
  }

  private verificarStatusSimulado(cobrancaId: string): PixCharge {
    const expiracao = this.calcularExpiracaoPadrao();
    return {
      id: cobrancaId,
      valor: 0,
      imagemQrCode: '',
      codigoPix: '',
      expiracao,
    };
  }
}
