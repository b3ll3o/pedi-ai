import { describe, it, expect } from 'vitest';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';

describe('StatusPagamento', () => {
  describe('fromValue', () => {
    it('deve criar status a partir de valor válido', () => {
      const status = StatusPagamento.fromValue('confirmed');
      expect(status.toString()).toBe('confirmed');
    });

    it('deve lançar erro para valor inválido', () => {
      expect(() => StatusPagamento.fromValue('invalid')).toThrow(/inválido/);
    });
  });

  describe('isPendente', () => {
    it('deve retornar true para pending', () => {
      expect(StatusPagamento.PENDING.isPendente()).toBe(true);
    });

    it('deve retornar false para confirmed', () => {
      expect(StatusPagamento.CONFIRMED.isPendente()).toBe(false);
    });
  });

  describe('isConfirmado', () => {
    it('deve retornar true para confirmed', () => {
      expect(StatusPagamento.CONFIRMED.isConfirmado()).toBe(true);
    });

    it('deve retornar false para pending', () => {
      expect(StatusPagamento.PENDING.isConfirmado()).toBe(false);
    });
  });

  describe('isFalhou', () => {
    it('deve retornar true para failed', () => {
      expect(StatusPagamento.FAILED.isFalhou()).toBe(true);
    });
  });

  describe('isReembolsado', () => {
    it('deve retornar true para refunded', () => {
      expect(StatusPagamento.REFUNDED.isReembolsado()).toBe(true);
    });
  });

  describe('isCancelado', () => {
    it('deve retornar true para cancelled', () => {
      expect(StatusPagamento.CANCELLED.isCancelado()).toBe(true);
    });
  });

  describe('isFinal', () => {
    it('deve retornar true para status finais', () => {
      expect(StatusPagamento.CONFIRMED.isFinal()).toBe(true);
      expect(StatusPagamento.FAILED.isFinal()).toBe(true);
      expect(StatusPagamento.REFUNDED.isFinal()).toBe(true);
      expect(StatusPagamento.CANCELLED.isFinal()).toBe(true);
    });

    it('deve retornar false para pending', () => {
      expect(StatusPagamento.PENDING.isFinal()).toBe(false);
    });
  });

  describe('equals', () => {
    it('deve verificar igualdade', () => {
      const s1 = StatusPagamento.PENDING;
      const s2 = StatusPagamento.fromValue('pending');
      expect(s1.equals(s2)).toBe(true);
    });

    it('deve retornar false para status diferentes', () => {
      const s1 = StatusPagamento.PENDING;
      const s2 = StatusPagamento.CONFIRMED;
      expect(s1.equals(s2)).toBe(false);
    });
  });
});
