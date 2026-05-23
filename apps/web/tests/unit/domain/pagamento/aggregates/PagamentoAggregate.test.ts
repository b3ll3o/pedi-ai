import { describe, it, expect } from 'vitest';
import { PagamentoAggregate } from '@/domain/pagamento/aggregates/PagamentoAggregate';
import { Pagamento } from '@/domain/pagamento/entities/Pagamento';
import { Transacao } from '@/domain/pagamento/entities/Transacao';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('PagamentoAggregate', () => {
  const criarPagamento = (): Pagamento => {
    return Pagamento.criar({
      id: 'pag-1',
      pedidoId: 'pedido-1',
      valor: Dinheiro.criar(10000),
      metodo: 'pix',
    });
  };

  describe('adicionarTransacaoCharge', () => {
    it('deve adicionar transação de charge em pagamento pendente', () => {
      const pagamento = criarPagamento();
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      const transacao = aggregate.adicionarTransacaoCharge('provider-1', { amount: 10000 });

      expect(transacao.tipo).toBe('charge');
      expect(aggregate.transacoes).toHaveLength(1);
    });

    it('deve lançar erro se pagamento não estiver pendente', () => {
      const pagamento = criarPagamento();
      pagamento.confirmar('provider-1');
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      expect(() => aggregate.adicionarTransacaoCharge('provider-1', {})).toThrow(
        'Não é possível adicionar transação de charge a pagamento não pendente'
      );
    });
  });

  describe('adicionarTransacaoWebhook', () => {
    it('deve adicionar transação de webhook', () => {
      const pagamento = criarPagamento();
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      const transacao = aggregate.adicionarTransacaoWebhook('provider-1', { webhookId: 'wh-123' });

      expect(transacao.tipo).toBe('webhook');
      expect(aggregate.transacoes).toHaveLength(1);
    });
  });

  describe('adicionarTransacaoReembolso', () => {
    it('deve adicionar transação de reembolso em pagamento confirmado', () => {
      const pagamento = criarPagamento();
      pagamento.confirmar('provider-1');
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      const transacao = aggregate.adicionarTransacaoReembolso('provider-1', {});

      expect(transacao.tipo).toBe('refund');
      expect(aggregate.transacoes).toHaveLength(1);
    });

    it('deve lançar erro se pagamento não estiver confirmado', () => {
      const pagamento = criarPagamento();
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      expect(() => aggregate.adicionarTransacaoReembolso('provider-1', {})).toThrow(
        'Apenas pagamentos confirmados podem receber reembolso'
      );
    });
  });

  describe('processarSucessoTransacao', () => {
    it('deve marcar transação como sucesso e confirmar pagamento', () => {
      const pagamento = criarPagamento();
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      const transacao = aggregate.adicionarTransacaoCharge('provider-1', { webhookId: 'wh-1' });
      aggregate.processarSucessoTransacao(transacao.id);

      expect(transacao.isSucesso()).toBe(true);
      expect(pagamento.status.isConfirmado()).toBe(true);
    });

    it('deve lançar erro se transação não existir', () => {
      const pagamento = criarPagamento();
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      expect(() => aggregate.processarSucessoTransacao('nao-existe')).toThrow();
    });
  });

  describe('processarFalhaTransacao', () => {
    it('deve marcar transação como falha', () => {
      const pagamento = criarPagamento();
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      const transacao = aggregate.adicionarTransacaoCharge('provider-1', {});
      aggregate.processarFalhaTransacao(transacao.id);

      expect(transacao.isSucesso()).toBe(false);
    });
  });

  describe('iniciarReembolso', () => {
    it('deve iniciar reembolso de pagamento confirmado', () => {
      const pagamento = criarPagamento();
      pagamento.confirmar('provider-1');
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      aggregate.iniciarReembolso(5000);

      expect(pagamento.status.isReembolsado()).toBe(true);
    });

    it('deve lançar erro se pagamento não confirmado', () => {
      const pagamento = criarPagamento();
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      expect(() => aggregate.iniciarReembolso(5000)).toThrow(
        'Apenas pagamentos confirmados podem ser reembolsados'
      );
    });

    it('deve lançar erro se valor exceder valor do pagamento', () => {
      const pagamento = criarPagamento();
      pagamento.confirmar('provider-1');
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      expect(() => aggregate.iniciarReembolso(15000)).toThrow(
        'Valor de reembolso não pode exceder o valor do pagamento'
      );
    });
  });

  describe('cancelarPagamento', () => {
    it('deve cancelar pagamento pendente', () => {
      const pagamento = criarPagamento();
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      aggregate.cancelarPagamento();

      expect(pagamento.status.isCancelado()).toBe(true);
    });

    it('deve lançar erro se pagamento não pendente', () => {
      const pagamento = criarPagamento();
      pagamento.confirmar('provider-1');
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      expect(() => aggregate.cancelarPagamento()).toThrow(
        'Apenas pagamentos pendentes podem ser cancelados'
      );
    });
  });

  describe('getEventos', () => {
    it('deve retornar evento de pagamento confirmado', () => {
      const pagamento = criarPagamento();
      pagamento.confirmar('provider-1');
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      const eventos = aggregate.getEventos();

      expect(eventos.some((e) => e.constructor.name === 'PagamentoConfirmadoEvent')).toBe(true);
    });

    it('deve retornar evento de pagamento falhou', () => {
      const pagamento = criarPagamento();
      pagamento.falhar();
      const aggregate = PagamentoAggregate.reconstituir(pagamento, []);

      const eventos = aggregate.getEventos();

      expect(eventos.some((e) => e.constructor.name === 'PagamentoFalhouEvent')).toBe(true);
    });
  });

  describe('criar', () => {
    it('deve criar pagamento aggregate', () => {
      const aggregate = PagamentoAggregate.criar({
        id: 'pag-2',
        pedidoId: 'pedido-2',
        valor: Dinheiro.criar(5000),
        metodo: 'pix',
      });

      expect(aggregate.id).toBe('pag-2');
      expect(aggregate.pagamento.status.isPendente()).toBe(true);
    });
  });

  describe('reconstituir', () => {
    it('deve reconstituir aggregate com transações', () => {
      const pagamento = criarPagamento();
      const transacao = Transacao.criar({
        id: 'tx-1',
        pagamentoId: 'pag-1',
        tipo: 'charge',
        providerId: 'provider-1',
        payload: {},
      });

      const aggregate = PagamentoAggregate.reconstituir(pagamento, [transacao]);

      expect(aggregate.transacoes).toHaveLength(1);
    });
  });

  describe('equals', () => {
    it('deve verificar igualdade por id', () => {
      const pagamento1 = criarPagamento();
      const pagamento2 = Pagamento.criar({
        id: 'pag-2',
        pedidoId: 'pedido-2',
        valor: Dinheiro.criar(5000),
        metodo: 'pix',
      });

      const aggregate1 = PagamentoAggregate.reconstituir(pagamento1, []);
      const aggregate2 = PagamentoAggregate.reconstituir(pagamento2, []);

      expect(aggregate1.equals(aggregate2)).toBe(false);
    });
  });
});
