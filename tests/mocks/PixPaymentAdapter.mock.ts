import { vi } from 'vitest';
import { IPixAdapter, PixCharge } from '@/application/pagamento/services/adapters/IPixAdapter';

/**
 * Configuração padrão para mocks de PixCharge
 */
export interface MockPixConfig {
  criarCobranca?: {
    valorEmCentavos?: number;
    pedidoId?: string;
    respostaParcial?: Partial<PixCharge>;
  };
  verificarStatus?: {
    cobrancaId?: string;
    respostaParcial?: Partial<PixCharge>;
  };
}

/**
 * Cria um mock de IPixAdapter com valores configuráveis para testes unitários.
 *
 * @param config - Configuração opcional para sobrescrever valores de retorno
 * @returns Mock do adapter Pix
 *
 * @example
 * // Mock básico com valores padrão
 * const mockPix = createMockPixPaymentAdapter();
 *
 * @example
 * // Mock com valores customizados
 * const mockPix = createMockPixPaymentAdapter({
 *   criarCobranca: {
 *     valorEmCentavos: 5000,
 *     pedidoId: 'pedido-123',
 *     respostaParcial: {
 *       id: 'pix_custom_123',
 *       valor: 50.00
 *     }
 *   }
 * });
 */
export function createMockPixPaymentAdapter(config?: MockPixConfig): IPixAdapter {
  const defaultPixCharge: PixCharge = {
    id: `pix_mock_${Date.now()}`,
    valor: 50.00,
    imagemQrCode: 'data:image/png;base64,mock_qr_code_base64',
    codigoPix: '00020126580014br.gov.bcb.pix0136mock_pedido_id520400005303986540410000005802BR5901mock6011MATO700801',
    expiracao: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
  };

  const mock = {
    criarCobranca: vi.fn(async (valorEmCentavos: number, pedidoId: string): Promise<PixCharge> => {
      const criarCobrancaConfig = config?.criarCobranca?.respostaParcial;
      const generatedId = `pix_${pedidoId}_${Date.now()}`;

      return {
        id: criarCobrancaConfig?.id ?? generatedId,
        valor: criarCobrancaConfig?.valor ?? (valorEmCentavos / 100),
        imagemQrCode: criarCobrancaConfig?.imagemQrCode ?? defaultPixCharge.imagemQrCode,
        codigoPix: criarCobrancaConfig?.codigoPix ?? defaultPixCharge.codigoPix,
        expiracao: criarCobrancaConfig?.expiracao ?? defaultPixCharge.expiracao,
      };
    }),

    verificarStatus: vi.fn(async (cobrancaId: string): Promise<PixCharge> => {
      const statusConfig = config?.verificarStatus?.respostaParcial;

      return {
        id: statusConfig?.id ?? cobrancaId,
        valor: statusConfig?.valor ?? defaultPixCharge.valor,
        imagemQrCode: statusConfig?.imagemQrCode ?? defaultPixCharge.imagemQrCode,
        codigoPix: statusConfig?.codigoPix ?? defaultPixCharge.codigoPix,
        expiracao: statusConfig?.expiracao ?? defaultPixCharge.expiracao,
      };
    }),
  };

  return mock;
}

/**
 * Mock de PixCharge pré-configurado para cenários de teste comuns
 */
export const PixChargeMock = {
  /**
   * Cobrança pendente de pagamento
   */
  pendente: (pedidoId: string = 'pedido-pendente'): PixCharge => ({
    id: `pix_${pedidoId}_${Date.now()}`,
    valor: 100.00,
    imagemQrCode: 'data:image/png;base64,pendente_qr',
    codigoPix: '00020126580014br.gov.bcb.pix0136' + pedidoId + '520400005303986540410000005802BR5901' + pedidoId + '6011MATO700801',
    expiracao: new Date(Date.now() + 30 * 60 * 1000),
  }),

  /**
   * Cobrança confirmada/paga
   */
  confirmado: (pedidoId: string = 'pedido-confirmado'): PixCharge => ({
    id: `pix_${pedidoId}_${Date.now()}`,
    valor: 100.00,
    imagemQrCode: 'data:image/png;base64,confirmado_qr',
    codigoPix: '00020126580014br.gov.bcb.pix0136' + pedidoId + '520400005303986540410000005802BR5901' + pedidoId + '6011MATO700801',
    expiracao: new Date(Date.now() + 30 * 60 * 1000),
  }),

  /**
   * Cobrança expirada
   */
  expirado: (pedidoId: string = 'pedido-expirado'): PixCharge => ({
    id: `pix_${pedidoId}_${Date.now()}`,
    valor: 100.00,
    imagemQrCode: 'data:image/png;base64,expirado_qr',
    codigoPix: '00020126580014br.gov.bcb.pix0136' + pedidoId + '520400005303986540410000005802BR5901' + pedidoId + '6011MATO700801',
    expiracao: new Date(Date.now() - 60 * 1000), // Expirado há 1 minuto
  }),
};
