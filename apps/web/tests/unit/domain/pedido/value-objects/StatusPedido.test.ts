import { describe, it, expect } from 'vitest';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';

describe('StatusPedido', () => {
  describe('fromValue', () => {
    it('deve criar status a partir de valor válido', () => {
      const status = StatusPedido.fromValue('received');
      expect(status.toString()).toBe('received');
    });

    it('deve lançar erro para valor inválido', () => {
      expect(() => StatusPedido.fromValue('invalid')).toThrow(/inválido/);
    });
  });

  describe('transicoesPermitidas', () => {
    it('deve permitir received -> preparing', () => {
      const status = StatusPedido.RECEIVED;
      expect(status.transicoesPermitidas()).toContain('preparing');
    });

    it('deve permitir received -> cancelled', () => {
      const status = StatusPedido.RECEIVED;
      expect(status.transicoesPermitidas()).toContain('cancelled');
    });

    it('deve permitir preparing -> ready', () => {
      const status = StatusPedido.PREPARING;
      expect(status.transicoesPermitidas()).toContain('ready');
    });

    it('nao deve permitir received -> delivered', () => {
      const status = StatusPedido.RECEIVED;
      expect(status.transicoesPermitidas()).not.toContain('delivered');
    });

    it('deve retornar vazio para status final', () => {
      const status = StatusPedido.DELIVERED;
      expect(status.transicoesPermitidas()).toHaveLength(0);
    });
  });

  describe('equals', () => {
    it('deve verificar igualdade', () => {
      const s1 = StatusPedido.RECEIVED;
      const s2 = StatusPedido.fromValue('received');
      expect(s1.equals(s2)).toBe(true);
    });

    it('deve retornar false para status diferentes', () => {
      const s1 = StatusPedido.RECEIVED;
      const s2 = StatusPedido.PREPARING;
      expect(s1.equals(s2)).toBe(false);
    });
  });

  describe('isFinal', () => {
    it('deve retornar true para delivered', () => {
      expect(StatusPedido.DELIVERED.isFinal()).toBe(true);
    });

    it('deve retornar true para cancelled', () => {
      expect(StatusPedido.CANCELLED.isFinal()).toBe(true);
    });

    it('deve retornar false para received', () => {
      expect(StatusPedido.RECEIVED.isFinal()).toBe(false);
    });
  });
});
