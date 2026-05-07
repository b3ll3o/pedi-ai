import { describe, it, expect, beforeEach } from 'vitest';
import { PagamentoRepository } from '@/infrastructure/persistence/pagamento/PagamentoRepository';
import { Pagamento } from '@/domain/pagamento/entities/Pagamento';
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { createTestDatabase } from '../_test-helpers';

describe('PagamentoRepository', () => {
  let repository: PagamentoRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new PagamentoRepository(db);
  });

  function criarPagamentoValido(overrides?: Partial<{ id: string; pedidoId: string; status: StatusPagamento }>): Pagamento {
    return Pagamento.criar({
      pedidoId: overrides?.pedidoId ?? 'pedido-123',
      metodo: MetodoPagamento.PIX(),
      valor: Dinheiro.criar(5000, 'BRL'),
      status: overrides?.status ?? StatusPagamento.PENDENTE(),
      id: overrides?.id,
    });
  }

  describe('salvar', () => {
    it('deve salvar e retornar pagamento', async () => {
      const pagamento = criarPagamentoValido();

      const resultado = await repository.salvar(pagamento);

      expect(resultado).toBeDefined();
      expect(resultado.pedidoId).toBe('pedido-123');
    });

    it('deve persistir pagamento no banco', async () => {
      const pagamento = criarPagamentoValido();
      await repository.salvar(pagamento);

      const existente = await db.pagamentos.get(pagamento.id);
      expect(existente).not.toBeNull();
      expect(existente!.pedidoId).toBe('pedido-123');
    });
  });

  describe('buscarPorId', () => {
    it('deve encontrar pagamento por id', async () => {
      const pagamento = criarPagamentoValido();
      await repository.salvar(pagamento);

      const resultado = await repository.buscarPorId(pagamento.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(pagamento.id);
    });

    it('deve retornar null quando pagamento nao existe', async () => {
      const resultado = await repository.buscarPorId('id-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('buscarPorPedidoId', () => {
    it('deve encontrar pagamento por pedidoId', async () => {
      const pagamento = criarPagamentoValido({ pedidoId: 'pedido-busca' });
      await repository.salvar(pagamento);

      const resultado = await repository.buscarPorPedidoId('pedido-busca');

      expect(resultado).not.toBeNull();
      expect(resultado!.pedidoId).toBe('pedido-busca');
    });

    it('deve retornar null quando pagamento nao existe para pedido', async () => {
      const resultado = await repository.buscarPorPedidoId('pedido-sem-pagamento');
      expect(resultado).toBeNull();
    });
  });

  describe('buscarPorTransacaoId', () => {
    it('deve encontrar pagamento por transacaoId', async () => {
      const pagamento = criarPagamentoValido();
      await repository.salvar(pagamento);
      await db.pagamentos.update(pagamento.id, { transacaoId: 'trans-123' });

      const resultado = await repository.buscarPorTransacaoId('trans-123');

      expect(resultado).not.toBeNull();
    });
  });

  describe('listarPorStatus', () => {
    it('deve listar pagamentos por status', async () => {
      const p1 = criarPagamentoValido({ id: 'pag-1', status: StatusPagamento.PENDENTE() });
      const p2 = criarPagamentoValido({ id: 'pag-2', status: StatusPagamento.CONFIRMADO() });
      await repository.salvar(p1);
      await repository.salvar(p2);

      const resultado = await repository.listarPorStatus('pending');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].id).toBe('pag-1');
    });
  });

  describe('excluir', () => {
    it('deve remover pagamento do banco', async () => {
      const pagamento = criarPagamentoValido();
      await repository.salvar(pagamento);

      await repository.excluir(pagamento.id);

      const existente = await db.pagamentos.get(pagamento.id);
      expect(existente).toBeUndefined();
    });
  });
});
