import { describe, it, expect } from 'vitest';
import { Transacao, TransacaoProps, TipoTransacaoValue } from '@/domain/pagamento/entities/Transacao';

describe('Transacao', () => {
  const criarTransacao = (overrides?: Partial<TransacaoProps>): Transacao => {
    const props: TransacaoProps = {
      id: crypto.randomUUID(),
      pagamentoId: 'pagamento-1',
      tipo: 'charge',
      providerId: 'stripe-1',
      status: 'pending',
      payload: {},
      createdAt: new Date(),
      ...overrides,
    };
    return Transacao.criar(props);
  };

  describe('criar', () => {
    it('deve criar uma transação com status pending', () => {
      const transacao = criarTransacao();

      expect(transacao.id).toBeDefined();
      expect(transacao.pagamentoId).toBe('pagamento-1');
      expect(transacao.tipo).toBe('charge');
      expect(transacao.providerId).toBe('stripe-1');
      expect(transacao.status).toBe('pending');
      expect(transacao.createdAt).toBeInstanceOf(Date);
    });

    it('deve criar com ID fornecido', () => {
      const transacao = criarTransacao({ id: 'transacao-1' });
      expect(transacao.id).toBe('transacao-1');
    });

    it('deve criar com payload', () => {
      const transacao = criarTransacao({
        payload: { charge_id: 'ch_123', amount: 5000 },
      });

      expect(transacao.payload).toEqual({ charge_id: 'ch_123', amount: 5000 });
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const transacao1 = criarTransacao();
      const transacao2 = new Transacao({
        ...transacao1.props,
        id: transacao1.id,
        status: 'success',
      } as TransacaoProps);

      expect(transacao1.equals(transacao2)).toBe(true);
    });
  });

  describe('isPendente', () => {
    it('deve retornar true para status pending', () => {
      const transacao = criarTransacao();
      expect(transacao.isPendente()).toBe(true);
    });

    it('deve retornar false para status success', () => {
      const transacao = new Transacao({
        ...criarTransacao().props,
        id: 't1',
        status: 'success',
      } as TransacaoProps);

      expect(transacao.isPendente()).toBe(false);
    });
  });

  describe('isSucesso', () => {
    it('deve retornar true para status success', () => {
      const transacao = new Transacao({
        ...criarTransacao().props,
        id: 't1',
        status: 'success',
      } as TransacaoProps);

      expect(transacao.isSucesso()).toBe(true);
    });

    it('deve retornar false para status pending', () => {
      const transacao = criarTransacao();
      expect(transacao.isSucesso()).toBe(false);
    });
  });

  describe('isFalha', () => {
    it('deve retornar true para status failure', () => {
      const transacao = new Transacao({
        ...criarTransacao().props,
        id: 't1',
        status: 'failure',
      } as TransacaoProps);

      expect(transacao.isFalha()).toBe(true);
    });

    it('deve retornar false para status success', () => {
      const transacao = new Transacao({
        ...criarTransacao().props,
        id: 't1',
        status: 'success',
      } as TransacaoProps);

      expect(transacao.isFalha()).toBe(false);
    });
  });

  describe('marcarSucesso', () => {
    it('deve marcar transação como sucesso', () => {
      const transacao = criarTransacao();

      transacao.marcarSucesso();

      expect(transacao.status).toBe('success');
    });
  });

  describe('marcarFalha', () => {
    it('deve marcar transação como falha', () => {
      const transacao = criarTransacao();

      transacao.marcarFalha();

      expect(transacao.status).toBe('failure');
    });
  });

  describe('payload', () => {
    it('deve retornar cópia do payload', () => {
      const transacao = criarTransacao({ payload: { key: 'value' } });
      const payload1 = transacao.payload;
      const payload2 = transacao.payload;

      expect(payload1).not.toBe(payload2);
      expect(payload1).toEqual(payload2);
    });
  });

  describe('tipos de transação', () => {
    it('deve suportar tipo charge', () => {
      const transacao = criarTransacao({ tipo: 'charge' });
      expect(transacao.tipo).toBe('charge');
    });

    it('deve suportar tipo refund', () => {
      const transacao = criarTransacao({ tipo: 'refund' });
      expect(transacao.tipo).toBe('refund');
    });

    it('deve suportar tipo webhook', () => {
      const transacao = criarTransacao({ tipo: 'webhook' });
      expect(transacao.tipo).toBe('webhook');
    });

    it('deve suportar tipo callback', () => {
      const transacao = criarTransacao({ tipo: 'callback' });
      expect(transacao.tipo).toBe('callback');
    });
  });
});
