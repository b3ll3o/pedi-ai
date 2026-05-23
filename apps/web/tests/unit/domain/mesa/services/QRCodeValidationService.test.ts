import { describe, it, expect } from 'vitest';
import { IQRCodeValidationService } from '@/domain/mesa/services/QRCodeValidationService';
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload';

/**
 * Testes para a interface IQRCodeValidationService.
 * Como é uma interface, os testes verificam o contrato esperado.
 */
describe('QRCodeValidationService (Interface)', () => {
  const mockPayload: QRCodePayload = QRCodePayload.reconstruir({
    restauranteId: 'rest-123',
    mesaId: 'mesa-456',
    assinatura: 'assinatura-valida',
  });

  describe('IQRCodeValidationService contract', () => {
    it('deve definir método validarAssinatura que aceita payload e secret', () => {
      // Verifica que a interface define a estrutura correta
      const service: IQRCodeValidationService = {
        validarAssinatura: (payload, secret) => {
          // Mock implementation
          const expectedSignature = service.gerarAssinatura(payload.restauranteId, payload.mesaId, secret);
          return payload.assinatura === expectedSignature;
        },
        gerarAssinatura: (restauranteId, mesaId, secret) => {
          // Mock implementation simples para teste
          return `${restauranteId}:${mesaId}:${secret}`;
        },
      };

      const secret = 'minha-senha-secreta';
      const result = service.validarAssinatura(mockPayload, secret);

      expect(typeof result).toBe('boolean');
    });

    it('deve definir método gerarAssinatura que retorna string', () => {
      const service: IQRCodeValidationService = {
        validarAssinatura: () => true,
        gerarAssinatura: (restauranteId, mesaId, secret) => {
          return `${restauranteId}:${mesaId}:${secret}`;
        },
      };

      const signature = service.gerarAssinatura('rest-123', 'mesa-456', 'secret');

      expect(typeof signature).toBe('string');
      expect(signature).toContain('rest-123');
      expect(signature).toContain('mesa-456');
    });

    it('validarAssinatura deve retornar false para assinatura inválida', () => {
      const service: IQRCodeValidationService = {
        validarAssinatura: (payload, _secret) => {
          // Sempre retorna false para teste
          return false;
        },
        gerarAssinatura: () => 'assinatura-falsa',
      };

      expect(service.validarAssinatura(mockPayload, 'secret')).toBe(false);
    });

    it('validarAssinatura deve retornar true para assinatura válida', () => {
      const service: IQRCodeValidationService = {
        validarAssinatura: (payload, secret) => {
          const expectedSignature = service.gerarAssinatura(payload.restauranteId, payload.mesaId, secret);
          return payload.assinatura === expectedSignature;
        },
        gerarAssinatura: (restauranteId, mesaId, secret) => {
          return `expected-${restauranteId}-${mesaId}-${secret}`;
        },
      };

      // Create payload with matching signature
      const validPayload = QRCodePayload.reconstruir({
        restauranteId: 'rest-123',
        mesaId: 'mesa-456',
        assinatura: 'expected-rest-123-mesa-456-secret',
      });

      expect(service.validarAssinatura(validPayload, 'secret')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('deve lidar com secret vazio', () => {
      const service: IQRCodeValidationService = {
        validarAssinatura: (payload, secret) => {
          const sig = service.gerarAssinatura(payload.restauranteId, payload.mesaId, secret);
          return payload.assinatura === sig;
        },
        gerarAssinatura: (restauranteId, mesaId, secret) => {
          return `${restauranteId}:${mesaId}:${secret || 'empty'}`;
        },
      };

      expect(() => service.gerarAssinatura('rest', 'mesa', '')).not.toThrow();
    });

    it('deve gerar assinaturas diferentes para restaurantes diferentes', () => {
      const service: IQRCodeValidationService = {
        validarAssinatura: () => false,
        gerarAssinatura: (restauranteId, mesaId, secret) => {
          return `${restauranteId}:${mesaId}:${secret}`;
        },
      };

      const sig1 = service.gerarAssinatura('rest-1', 'mesa-1', 'secret');
      const sig2 = service.gerarAssinatura('rest-2', 'mesa-1', 'secret');

      expect(sig1).not.toBe(sig2);
    });
  });
});
