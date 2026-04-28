import { describe, it, expect } from 'vitest';
import { createMockPixPaymentAdapter, PixChargeMock } from './PixPaymentAdapter.mock';

describe('Payment Adapter Mocks', () => {
  describe('PixPaymentAdapter Mock', () => {
    it('deve criar mock com valores padrão', () => {
      const mockPix = createMockPixPaymentAdapter();

      expect(mockPix).toBeDefined();
      expect(typeof mockPix.criarCobranca).toBe('function');
      expect(typeof mockPix.verificarStatus).toBe('function');
    });

    it('deve permitir override de valores de retorno', async () => {
      const mockPix = createMockPixPaymentAdapter({
        criarCobranca: {
          valorEmCentavos: 5000,
          pedidoId: 'pedido-123',
          respostaParcial: {
            id: 'pix_custom_123',
            valor: 75.50,
          },
        },
      });

      const result = await mockPix.criarCobranca(5000, 'pedido-123');

      expect(result.id).toBe('pix_custom_123');
      expect(result.valor).toBe(75.50);
    });

    it('deve suportar vi.fn() para spying', async () => {
      const mockPix = createMockPixPaymentAdapter();

      await mockPix.criarCobranca(1000, 'pedido-test');

      expect(mockPix.criarCobranca).toHaveBeenCalledWith(1000, 'pedido-test');
      expect(mockPix.criarCobranca).toHaveBeenCalledTimes(1);
    });

    it('PixChargeMock.pendente deve retornar cobrança pendente', () => {
      const pendente = PixChargeMock.pendente('pedido-1');

      expect(pendente.id).toContain('pix_pedido-1');
      expect(pendente.valor).toBe(100.00);
      expect(pendente.codigoPix).toContain('pedido-1');
    });

    it('PixChargeMock.expirado deve ter expiração no passado', () => {
      const expirado = PixChargeMock.expirado('pedido-exp');

      expect(expirado.expiracao.getTime()).toBeLessThan(Date.now());
    });
  });
});
