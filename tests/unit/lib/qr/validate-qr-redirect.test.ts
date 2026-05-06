import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateQRPayload } from '@/lib/qr/validator';

// Mock do módulo validator
vi.mock('@/lib/qr/validator', () => ({
  validateQRPayload: vi.fn(),
}));

// Tipos para o teste
interface QRRedirectInput {
  restaurant_id: string;
  table_id: string;
  timestamp: number;
  signature: string;
}

interface TableRepository {
  exists(tableId: string): Promise<boolean>;
}

// erros
class QRValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QRValidationError';
  }
}

class TableNotFoundError extends Error {
  constructor(tableId: string) {
    super(`Mesa não encontrada: ${tableId}`);
    this.name = 'TableNotFoundError';
  }
}

/**
 * Valida QR code e retorna path de redirect ou lança erro.
 * - QR válido + mesa existe → '/menu'
 * - QR inválido → QRValidationError
 * - QR válido + mesa não existe → TableNotFoundError
 */
async function validateQRRedirect(
  payload: QRRedirectInput,
  secretKey: string,
  tableRepository: TableRepository
): Promise<string> {
  // Validar payload do QR
  const validation = validateQRPayload(payload, secretKey);
  if (!validation.valid) {
    throw new QRValidationError(validation.error || 'QR code inválido');
  }

  // Verificar se mesa existe
  const tableExists = await tableRepository.exists(payload.table_id);
  if (!tableExists) {
    throw new TableNotFoundError(payload.table_id);
  }

  return '/menu';
}

describe('validateQRRedirect', () => {
  const mockSecret = 'test-secret';
  const mockRestaurantId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const mockTableId = 'f1e2d3c4-b5a6-9870-dcba-fedc09876543';

  let mockTableRepository: TableRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTableRepository = {
      exists: vi.fn().mockResolvedValue(true),
    };
  });

  describe('8.1.1: Should redirect to /menu when QR is valid', () => {
    it('deve retornar /menu quando QR é válido e mesa existe', async () => {
      const validPayload: QRRedirectInput = {
        restaurant_id: mockRestaurantId,
        table_id: mockTableId,
        timestamp: Date.now(),
        signature: 'valid-signature',
      };

      // Mock validateQRPayload retornar válido
      vi.mocked(validateQRPayload).mockReturnValue({ valid: true });

      const result = await validateQRRedirect(validPayload, mockSecret, mockTableRepository);

      expect(result).toBe('/menu');
      expect(validateQRPayload).toHaveBeenCalledWith(validPayload, mockSecret);
      expect(mockTableRepository.exists).toHaveBeenCalledWith(mockTableId);
    });

    it('deve validar payload com restaurant_id e table_id corretos', async () => {
      const validPayload: QRRedirectInput = {
        restaurant_id: mockRestaurantId,
        table_id: mockTableId,
        timestamp: Date.now(),
        signature: 'valid-signature',
      };

      vi.mocked(validateQRPayload).mockReturnValue({ valid: true });

      await validateQRRedirect(validPayload, mockSecret, mockTableRepository);

      expect(validateQRPayload).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurant_id: mockRestaurantId,
          table_id: mockTableId,
        }),
        mockSecret
      );
    });
  });

  describe('8.1.2: Should throw error when QR is invalid', () => {
    it('deve lançar QRValidationError quando QR é inválido', async () => {
      const invalidPayload: QRRedirectInput = {
        restaurant_id: mockRestaurantId,
        table_id: mockTableId,
        timestamp: Date.now(),
        signature: 'invalid-signature',
      };

      vi.mocked(validateQRPayload).mockReturnValue({
        valid: false,
        error: 'Signature mismatch',
      });

      await expect(
        validateQRRedirect(invalidPayload, mockSecret, mockTableRepository)
      ).rejects.toThrow(QRValidationError);

      expect(validateQRPayload).toHaveBeenCalledWith(invalidPayload, mockSecret);
      // Não deve verificar se mesa existe se QR é inválido
      expect(mockTableRepository.exists).not.toHaveBeenCalled();
    });

    it('deve lançar erro com mensagem correta para QR expirado', async () => {
      const expiredPayload: QRRedirectInput = {
        restaurant_id: mockRestaurantId,
        table_id: mockTableId,
        timestamp: Date.now() - 100000,
        signature: 'any-signature',
      };

      vi.mocked(validateQRPayload).mockReturnValue({
        valid: false,
        error: 'Timestamp expired or invalid',
      });

      await expect(
        validateQRRedirect(expiredPayload, mockSecret, mockTableRepository)
      ).rejects.toThrow('Timestamp expired or invalid');
    });

    it('deve lançar erro quando assinatura não confere', async () => {
      const tamperedPayload: QRRedirectInput = {
        restaurant_id: mockRestaurantId,
        table_id: mockTableId,
        timestamp: Date.now(),
        signature: 'tampered-signature',
      };

      vi.mocked(validateQRPayload).mockReturnValue({
        valid: false,
        error: 'Signature mismatch',
      });

      await expect(
        validateQRRedirect(tamperedPayload, mockSecret, mockTableRepository)
      ).rejects.toThrow('Signature mismatch');
    });
  });

  describe('8.1.3: Should throw TABLE_NOT_FOUND when table doesnt exist', () => {
    it('deve lançar TableNotFoundError quando mesa não existe', async () => {
      const validPayload: QRRedirectInput = {
        restaurant_id: mockRestaurantId,
        table_id: mockTableId,
        timestamp: Date.now(),
        signature: 'valid-signature',
      };

      // QR válido, mas mesa não existe
      vi.mocked(validateQRPayload).mockReturnValue({ valid: true });
      mockTableRepository.exists = vi.fn().mockResolvedValue(false);

      await expect(
        validateQRRedirect(validPayload, mockSecret, mockTableRepository)
      ).rejects.toThrow(TableNotFoundError);

      expect(validateQRPayload).toHaveBeenCalledWith(validPayload, mockSecret);
      expect(mockTableRepository.exists).toHaveBeenCalledWith(mockTableId);
    });

    it('deve lançar erro com ID da mesa quando mesa não encontrada', async () => {
      const validPayload: QRRedirectInput = {
        restaurant_id: mockRestaurantId,
        table_id: mockTableId,
        timestamp: Date.now(),
        signature: 'valid-signature',
      };

      vi.mocked(validateQRPayload).mockReturnValue({ valid: true });
      mockTableRepository.exists = vi.fn().mockResolvedValue(false);

      await expect(
        validateQRRedirect(validPayload, mockSecret, mockTableRepository)
      ).rejects.toThrow(`Mesa não encontrada: ${mockTableId}`);
    });

    it('não deve fazer redirect se mesa não existe mesmo com QR válido', async () => {
      const validPayload: QRRedirectInput = {
        restaurant_id: mockRestaurantId,
        table_id: mockTableId,
        timestamp: Date.now(),
        signature: 'valid-signature',
      };

      vi.mocked(validateQRPayload).mockReturnValue({ valid: true });
      mockTableRepository.exists = vi.fn().mockResolvedValue(false);

      await expect(
        validateQRRedirect(validPayload, mockSecret, mockTableRepository)
      ).rejects.not.toThrow(QRValidationError);
    });
  });
});
