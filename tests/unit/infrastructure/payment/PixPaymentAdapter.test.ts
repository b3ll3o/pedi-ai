import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PixAdapter } from '@/infrastructure/external/PixAdapter';
import { Payment } from 'mercadopago';

// Mock do módulo mercadopago
vi.mock('mercadopago', () => {
  const mockPaymentInstance = {
    create: vi.fn(),
    get: vi.fn(),
  };
  return {
    MercadoPagoConfig: vi.fn().mockImplementation(() => ({})),
    Payment: vi.fn(() => mockPaymentInstance),
  };
});

describe('PixAdapter', () => {
  let pixAdapter: PixAdapter;
  let mockPayment: jest.Mocked<Payment>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_DEMO_PAYMENT_MODE', 'false');
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'TEST_TOKEN_123');

    // Recria o adapter com token de teste
    pixAdapter = new PixAdapter('TEST_TOKEN_123');

    // Acessa o client interno via reflection (não exposto públicamente, mas necessário para mock)
    mockPayment = (Payment as unknown as jest.Mock).mock.results[0]?.value as jest.Mocked<Payment>;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('criarCobranca', () => {
    it('deve criar cobrança Pix com dados válidos e retornar QR code', async () => {
      // Arrange
      const valorEmCentavos = 5000; // R$ 50,00
      const pedidoId = 'pedido-123';
      const mockResponse = {
        id: 1234567890,
        transaction_amount: 50,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        point_of_interaction: {
          transaction_data: {
            qr_code_base64: 'MOCK_QR_CODE_BASE64',
            qr_code: '00020126580014br.gov.bcb.pix0136pedido-123',
          },
        },
      };

      mockPayment.create.mockResolvedValue(mockResponse);

      // Act
      const resultado = await pixAdapter.criarCobranca(valorEmCentavos, pedidoId);

      // Assert
      expect(mockPayment.create).toHaveBeenCalledWith({
        body: {
          transaction_amount: 50,
          payment_method_id: 'pix',
          description: `Pedido ${pedidoId}`,
          external_reference: pedidoId,
          notification_url: undefined,
        },
      });
      expect(resultado.id).toBe('1234567890');
      expect(resultado.valor).toBe(50);
      expect(resultado.codigoPix).toBe('00020126580014br.gov.bcb.pix0136pedido-123');
      expect(resultado.imagemQrCode).toBe('data:image/png;base64,MOCK_QR_CODE_BASE64');
      expect(resultado.expiracao).toBeInstanceOf(Date);
    });

    it('deve converter valor de centavos para reais ao criar cobrança', async () => {
      // Arrange
      const mockResponse = {
        id: 999,
        transaction_amount: 25.5,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        point_of_interaction: {
          transaction_data: {
            qr_code_base64: 'ABC123',
            qr_code: 'pix_code_123',
          },
        },
      };
      mockPayment.create.mockResolvedValue(mockResponse);

      // Act
      const resultado = await pixAdapter.criarCobranca(2550, 'pedido-456');

      // Assert
      expect(resultado.valor).toBe(25.5);
      expect(mockPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ transaction_amount: 25.5 }) })
      );
    });

    it('deve falhar quando API retorna erro', async () => {
      // Arrange
      mockPayment.create.mockRejectedValue(new Error('Unauthorized'));

      // Act & Assert
      await expect(pixAdapter.criarCobranca(1000, 'pedido-erro'))
        .rejects.toThrow('Falha ao criar cobrança Pix: Unauthorized');
    });

    it('deve usar NEXT_PUBLIC_DEMO_PAYMENT_MODE=true para retornar dados simulados', async () => {
      // Arrange
      vi.stubEnv('NEXT_PUBLIC_DEMO_PAYMENT_MODE', 'true');
      vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', '');
      const demoAdapter = new PixAdapter();

      // Act
      const resultado = await demoAdapter.criarCobranca(1000, 'pedido-demo');

      // Assert
      expect(resultado.id).toContain('pedido-demo');
      expect(resultado.codigoPix).toContain('pedido-demo');
      expect(resultado.imagemQrCode).toContain('data:image/png;base64');
      expect(mockPayment.create).not.toHaveBeenCalled();
    });

    it('deve jogar erro quando token não está configurado (sem modo demo)', async () => {
      // Arrange
      vi.stubEnv('NEXT_PUBLIC_DEMO_PAYMENT_MODE', 'false');
      vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', '');
      const adapterSemToken = new PixAdapter('');

      // Act & Assert
      await expect(adapterSemToken.criarCobranca(1000, 'pedido-sem-token'))
        .rejects.toThrow('Mercado Pago access token não configurado');
    });
  });

  describe('verificarStatus', () => {
    it('deve verificar status de cobrança Pix existente', async () => {
      // Arrange
      const cobrancaId = '1234567890';
      const mockResponse = {
        id: 1234567890,
        transaction_amount: 50,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        point_of_interaction: {
          transaction_data: {
            qr_code_base64: 'STATUS_QR_BASE64',
            qr_code: 'status_qr_code',
          },
        },
      };
      mockPayment.get.mockResolvedValue(mockResponse);

      // Act
      const resultado = await pixAdapter.verificarStatus(cobrancaId);

      // Assert
      expect(mockPayment.get).toHaveBeenCalledWith({ id: 1234567890 });
      expect(resultado.id).toBe('1234567890');
      expect(resultado.valor).toBe(50);
      expect(resultado.codigoPix).toBe('status_qr_code');
      expect(resultado.imagemQrCode).toBe('data:image/png;base64,STATUS_QR_BASE64');
    });

    it('deve falhar quando API retorna erro ao verificar status', async () => {
      // Arrange
      mockPayment.get.mockRejectedValue(new Error('Not Found'));

      // Act & Assert
      await expect(pixAdapter.verificarStatus('999999'))
        .rejects.toThrow('Falha ao verificar status Pix: Not Found');
    });

    it('deve usar modo demo quando NEXT_PUBLIC_DEMO_PAYMENT_MODE=true', async () => {
      // Arrange
      vi.stubEnv('NEXT_PUBLIC_DEMO_PAYMENT_MODE', 'true');
      vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', '');
      const demoAdapter = new PixAdapter();

      // Act
      const resultado = await demoAdapter.verificarStatus('demo-cobranca-id');

      // Assert
      expect(resultado.id).toBe('demo-cobranca-id');
      expect(resultado.valor).toBe(0);
      expect(resultado.codigoPix).toBe('');
      expect(mockPayment.get).not.toHaveBeenCalled();
    });
  });

  describe('tratamento de erros', () => {
    it('deve lidar com qr_code_base64 ausente na resposta', async () => {
      // Arrange
      const mockResponse = {
        id: 777,
        transaction_amount: 10,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        point_of_interaction: {
          transaction_data: {
            qr_code: 'only_raw_qr',
          },
        },
      };
      mockPayment.create.mockResolvedValue(mockResponse);

      // Act
      const resultado = await pixAdapter.criarCobranca(1000, 'pedido-sem-qr-base64');

      // Assert
      expect(resultado.imagemQrCode).toBe('');
      expect(resultado.codigoPix).toBe('only_raw_qr');
    });

    it('deve calcular expiração padrão quando date_of_expiration não vem na resposta', async () => {
      // Arrange
      const mockResponse = {
        id: 888,
        transaction_amount: 15,
        point_of_interaction: {
          transaction_data: {
            qr_code_base64: 'ABC',
            qr_code: 'qr',
          },
        },
      };
      mockPayment.create.mockResolvedValue(mockResponse);

      // Act
      const antes = new Date();
      const resultado = await pixAdapter.criarCobranca(1500, 'pedido-sem-expiracao');
      const depois = new Date();

      // Assert
      const diffMs = resultado.expiracao.getTime() - antes.getTime();
      const diffEsperado = 30 * 60 * 1000;
      expect(diffMs).toBeGreaterThanOrEqual(diffEsperado - 2000);
      expect(diffMs).toBeLessThanOrEqual(diffEsperado + 2000 + (depois.getTime() - antes.getTime()));
    });
  });
});
