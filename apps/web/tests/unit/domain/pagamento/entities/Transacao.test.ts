import { describe, it, expect } from 'vitest';
import { Transacao } from '@/domain/pagamento/entities/Transacao';

describe('Transacao', () => {
  const criarTransacao = (): Transacao => {
    return Transacao.criar({
      id: 'tx-1',
      pagamentoId: 'pag-1',
      tipo: 'charge',
      providerId: 'provider-1',
      payload: { webhookId: 'wh-123' },
    });
  };

  describe('criar', () => {
    it('deve criar transação com status pending', () => {
      const tx = criarTransacao();
      expect(tx.status).toBe('pending');
      expect(tx.tipo).toBe('charge');
      expect(tx.pagamentoId).toBe('pag-1');
    });

    it('deve criar transação de refund', () => {
      const tx = Transacao.criar({
        id: 'tx-2',
        pagamentoId: 'pag-1',
        tipo: 'refund',
        providerId: 'provider-1',
        payload: {},
      });

      expect(tx.tipo).toBe('refund');
    });
  });

  describe('isPendente / isSucesso / isFalha', () => {
    it('deve retornar status corretamente', () => {
      const tx = criarTransacao();
      expect(tx.isPendente()).toBe(true);
      expect(tx.isSucesso()).toBe(false);
      expect(tx.isFalha()).toBe(false);
    });
  });

  describe('marcarSucesso', () => {
    it('deve marcar transação como sucesso', () => {
      const tx = criarTransacao();
      tx.marcarSucesso();

      expect(tx.isSucesso()).toBe(true);
      expect(tx.isPendente()).toBe(false);
    });
  });

  describe('marcarFalha', () => {
    it('deve marcar transação como falha', () => {
      const tx = criarTransacao();
      tx.marcarFalha();

      expect(tx.isFalha()).toBe(true);
      expect(tx.isPendente()).toBe(false);
    });
  });

  describe('equals', () => {
    it('deve verificar igualdade por id', () => {
      const tx1 = criarTransacao();
      const tx2 = Transacao.criar({
        id: 'tx-1',
        pagamentoId: 'pag-2',
        tipo: 'refund',
        providerId: 'provider-2',
        payload: {},
      });

      expect(tx1.equals(tx2)).toBe(true);
    });

    it('deve retornar false para ids diferentes', () => {
      const tx1 = criarTransacao();
      const tx2 = Transacao.criar({
        id: 'tx-2',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'provider-1',
        payload: {},
      });

      expect(tx1.equals(tx2)).toBe(false);
    });
  });

  describe('getters', () => {
    it('deve retornar payload como cópia', () => {
      const tx = criarTransacao();
      const payload = tx.payload;
      payload['novo'] = 'valor';

      expect(tx.payload).not.toHaveProperty('novo');
    });
  });
});
