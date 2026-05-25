import { describe, it, expect } from 'vitest';
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload';

describe('QRCodePayload', () => {
  const criarPayloadValido = () => ({
    restauranteId: 'rest-123',
    mesaId: 'mesa-456',
    assinatura: 'abc123signature',
  });

  describe('reconstruir', () => {
    it('deve reconstruir payload com props válidas', () => {
      const props = criarPayloadValido();
      const payload = QRCodePayload.reconstruir(props);

      expect(payload.restauranteId).toBe('rest-123');
      expect(payload.mesaId).toBe('mesa-456');
      expect(payload.assinatura).toBe('abc123signature');
    });

    it('deve preservar valores exatos reconstruídos', () => {
      const props = criarPayloadValido();
      const payload = QRCodePayload.reconstruir(props);

      expect(payload.restauranteId).toBe(props.restauranteId);
      expect(payload.mesaId).toBe(props.mesaId);
      expect(payload.assinatura).toBe(props.assinatura);
    });
  });

  describe('getters', () => {
    it('deve expor restauranteId', () => {
      const payload = QRCodePayload.reconstruir(criarPayloadValido());
      expect(payload.restauranteId).toBeDefined();
    });

    it('deve expor mesaId', () => {
      const payload = QRCodePayload.reconstruir(criarPayloadValido());
      expect(payload.mesaId).toBeDefined();
    });

    it('deve expor assinatura', () => {
      const payload = QRCodePayload.reconstruir(criarPayloadValido());
      expect(payload.assinatura).toBeDefined();
    });
  });

  describe('equals', () => {
    it('deve retornar true para payloads idênticos', () => {
      const props = criarPayloadValido();
      const payload1 = QRCodePayload.reconstruir(props);
      const payload2 = QRCodePayload.reconstruir(props);

      expect(payload1.equals(payload2)).toBe(true);
    });

    it('deve retornar false para payloads com restauranteId diferente', () => {
      const payload1 = QRCodePayload.reconstruir(criarPayloadValido());
      const payload2 = QRCodePayload.reconstruir({
        ...criarPayloadValido(),
        restauranteId: 'rest-outro',
      });

      expect(payload1.equals(payload2)).toBe(false);
    });

    it('deve retornar false para payloads com mesaId diferente', () => {
      const payload1 = QRCodePayload.reconstruir(criarPayloadValido());
      const payload2 = QRCodePayload.reconstruir({
        ...criarPayloadValido(),
        mesaId: 'mesa-outra',
      });

      expect(payload1.equals(payload2)).toBe(false);
    });

    it('deve retornar false para payloads com assinatura diferente', () => {
      const payload1 = QRCodePayload.reconstruir(criarPayloadValido());
      const payload2 = QRCodePayload.reconstruir({
        ...criarPayloadValido(),
        assinatura: 'outra-assinatura',
      });

      expect(payload1.equals(payload2)).toBe(false);
    });

    it('deve retornar false para objeto que não é QRCodePayload', () => {
      const payload = QRCodePayload.reconstruir(criarPayloadValido());

      expect(
        payload.equals({
          restauranteId: 'rest-123',
          mesaId: 'mesa-456',
          assinatura: 'abc123',
        } as any)
      ).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('deve aceitar IDs vazios', () => {
      const payload = QRCodePayload.reconstruir({
        restauranteId: '',
        mesaId: '',
        assinatura: '',
      });

      expect(payload.restauranteId).toBe('');
      expect(payload.mesaId).toBe('');
      expect(payload.assinatura).toBe('');
    });

    it('deve aceitar caracteres especiais em IDs', () => {
      const payload = QRCodePayload.reconstruir({
        restauranteId: 'rest-123_abc',
        mesaId: 'mesa-456@def',
        assinatura: 's1g+nat/ure==',
      });

      expect(payload.restauranteId).toBe('rest-123_abc');
      expect(payload.mesaId).toBe('mesa-456@def');
      expect(payload.assinatura).toBe('s1g+nat/ure==');
    });
  });
});
