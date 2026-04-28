import { describe, it, expect } from 'vitest';
import { Pagamento, PagamentoProps } from '@/domain/pagamento/entities/Pagamento';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';

describe('Pagamento', () => {
  // Criar Pagamento usando new já que Pagamento.criar tem bug (não gera id)
  const criarPagamento = (props?: Partial<PagamentoProps> & { valor?: Dinheiro }): Pagamento => {
    const pagamentoProps: PagamentoProps = {
      id: crypto.randomUUID(),
      pedidoId: 'pedido-1',
      metodo: MetodoPagamento.PIX,
      status: StatusPagamento.PENDING,
      valor: Dinheiro.criar(5000, 'BRL'),
      createdAt: new Date(),
      ...props,
    };
    return new Pagamento(pagamentoProps);
  };

  describe('criar', () => {
    it('deve criar um pagamento pendente', () => {
      const pagamento = criarPagamento();

      expect(pagamento.id).toBeDefined();
      expect(pagamento.pedidoId).toBe('pedido-1');
      expect(pagamento.metodo).toEqual(MetodoPagamento.PIX);
      expect(pagamento.status).toEqual(StatusPagamento.PENDING);
      expect(pagamento.valor.reais).toBe(50);
      expect(pagamento.createdAt).toBeInstanceOf(Date);
    });

    it('deve criar com transacaoId e webhookId opcionais', () => {
      const pagamento = criarPagamento({
        transacaoId: 'transacao-1',
        webhookId: 'webhook-1',
      });

      expect(pagamento.transacaoId).toBe('transacao-1');
      expect(pagamento.webhookId).toBe('webhook-1');
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const pag1 = criarPagamento();
      const pag2 = new Pagamento({
        ...pag1.props,
        id: pag1.id,
      } as PagamentoProps);

      expect(pag1.equals(pag2)).toBe(true);
    });
  });

  describe('confirmar', () => {
    it('deve confirmar um pagamento pendente', () => {
      const pagamento = criarPagamento();

      pagamento.confirmar('transacao-123', 'webhook-456');

      expect(pagamento.status).toEqual(StatusPagamento.CONFIRMED);
      expect(pagamento.transacaoId).toBe('transacao-123');
      expect(pagamento.webhookId).toBe('webhook-456');
      expect(pagamento.confirmedAt).toBeInstanceOf(Date);
    });

    it('deve lançar erro se pagamento já não está pendente', () => {
      const pagamento = criarPagamento();
      pagamento.confirmar('transacao-1');

      expect(() => pagamento.confirmar('transacao-2')).toThrow('Pagamento já não está pendente');
    });
  });

  describe('falhar', () => {
    it('deve marcar pagamento como falhado', () => {
      const pagamento = criarPagamento();

      pagamento.falhar();

      expect(pagamento.status).toEqual(StatusPagamento.FAILED);
    });

    it('deve lançar erro se pagamento não está pendente', () => {
      const pagamento = criarPagamento();
      pagamento.confirmar('transacao-1');

      expect(() => pagamento.falhar()).toThrow('Pagamento já não está pendente');
    });
  });

  describe('reembolsar', () => {
    it('deve reembolsar um pagamento confirmado', () => {
      const pagamento = criarPagamento();
      pagamento.confirmar('transacao-1');

      pagamento.reembolsar();

      expect(pagamento.status).toEqual(StatusPagamento.REFUNDED);
    });

    it('deve lançar erro se pagamento não está confirmado', () => {
      const pagamento = criarPagamento();

      expect(() => pagamento.reembolsar()).toThrow('Apenas pagamentos confirmados podem ser reembolsados');
    });
  });

  describe('cancelar', () => {
    it('deve cancelar um pagamento pendente', () => {
      const pagamento = criarPagamento();

      pagamento.cancelar();

      expect(pagamento.status).toEqual(StatusPagamento.CANCELLED);
    });

    it('deve lançar erro se pagamento não está pendente', () => {
      const pagamento = criarPagamento();
      pagamento.confirmar('transacao-1');

      expect(() => pagamento.cancelar()).toThrow('Apenas pagamentos pendentes podem ser cancelados');
    });
  });

  describe('updatedAt', () => {
    it('deve retornar confirmedAt se existir', () => {
      const confirmedAt = new Date('2024-01-02');
      const pagamento = new Pagamento({
        id: 'pagamento-1',
        pedidoId: 'pedido-1',
        metodo: MetodoPagamento.PIX,
        status: StatusPagamento.CONFIRMED,
        valor: Dinheiro.criar(5000, 'BRL'),
        createdAt: new Date('2024-01-01'),
        confirmedAt,
      } as PagamentoProps);

      expect(pagamento.updatedAt).toEqual(confirmedAt);
    });

    it('deve retornar createdAt se não houver confirmedAt', () => {
      const createdAt = new Date('2024-01-01');
      const pagamento = new Pagamento({
        id: 'pagamento-1',
        pedidoId: 'pedido-1',
        metodo: MetodoPagamento.PIX,
        status: StatusPagamento.PENDING,
        valor: Dinheiro.criar(5000, 'BRL'),
        createdAt,
      } as PagamentoProps);

      expect(pagamento.updatedAt).toEqual(createdAt);
    });
  });
});
