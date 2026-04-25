import { IPixAdapter, PixCharge } from '@/application/pagamento/services/adapters/IPixAdapter';

/**
 * Implementação do adapter de Pix para Mercado Pago.
 * Em produção, deve-se configurar as variáveis de ambiente:
 * - MERCADOPAGO_ACCESS_TOKEN: Token de acesso do Mercado Pago
 * - MERCADOPAGO_BASE_URL: URL base da API (default: https://api.mercadopago.com)
 */
export class PixAdapter implements IPixAdapter {
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken?: string, baseUrl: string = 'https://api.mercadopago.com') {
    this.accessToken = accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    this.baseUrl = baseUrl;
  }

  /**
   * Cria uma cobrança Pix via Mercado Pago
   */
  async criarCobranca(valorEmCentavos: number, pedidoId: string): Promise<PixCharge> {
    // TODO: Implementar integração real com Mercado Pago quando disponível
    // Por enquanto, retorna uma cobrança simulada para desenvolvimento
    const expiracao = new Date();
    expiracao.setMinutes(expiracao.getMinutes() + 30);

    // Simulação de resposta do Mercado Pago
    const cobrancaSimulada: PixCharge = {
      id: `pix_${pedidoId}_${Date.now()}`,
      valor: valorEmCentavos / 100, // Convertendo de centavos para reais
      imagemQrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
      codigoPix: `00020126580014br.gov.bcb.pix0136${pedidoId}520400005303986540410000005802BR5901${pedidoId}6009MATO700801`,
      expiracao,
    };

    return Promise.resolve(cobrancaSimulada);
  }

  /**
   * Verifica o status de uma cobrança Pix
   */
  async verificarStatus(cobrancaId: string): Promise<PixCharge> {
    // TODO: Implementar verificação real com API do Mercado Pago
    // Por enquanto, retorna a cobrança como se estivesse pendente
    const expiracao = new Date();
    expiracao.setMinutes(expiracao.getMinutes() + 30);

    const cobrancaSimulada: PixCharge = {
      id: cobrancaId,
      valor: 0,
      imagemQrCode: '',
      codigoPix: '',
      expiracao,
    };

    return Promise.resolve(cobrancaSimulada);
  }
}
