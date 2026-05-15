import { describe, it, expect, beforeEach } from 'vitest';
import { TransacaoRepository } from '@/infrastructure/persistence/pagamento/TransacaoRepository';
import { Transacao, TipoTransacaoValue } from '@/domain/pagamento/entities/Transacao';
import { createTestDatabase } from '../_test-helpers';

describe('TransacaoRepository', () => {
  let repository: TransacaoRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new TransacaoRepository(db);
  });

  function criarTransacaoValida(overrides?: Partial<{ id: string; pagamentoId: string; tipo: TipoTransacaoValue; status: 'pending' | 'success' | 'failure' }>): Transacao {
    return Transacao.criar({
      pagamentoId: overrides?.pagamentoId ?? 'pag-123',
      tipo: overrides?.tipo ?? 'charge',
      providerId: 'provider-xyz',
      payload: {},
      id: overrides?.id ?? 'transacao-001',
    });
  }

  describe('salvar', () => {
    it('deve salvar e retornar transacao', async () => {
      const transacao = criarTransacaoValida();

      const resultado = await repository.salvar(transacao);

      expect(resultado).toBeDefined();
      expect(resultado.pagamentoId).toBe('pag-123');
    });

    it('deve persistir transacao no banco', async () => {
      const transacao = criarTransacaoValida();
      await repository.salvar(transacao);

      const existente = await db.transacoes.get(transacao.id);
      expect(existente).not.toBeNull();
      expect(existente!.pagamentoId).toBe('pag-123');
    });
  });

  describe('buscarPorId', () => {
    it('deve encontrar transacao por id', async () => {
      const transacao = criarTransacaoValida();
      await repository.salvar(transacao);

      const resultado = await repository.buscarPorId(transacao.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(transacao.id);
    });

    it('deve retornar null quando transacao nao existe', async () => {
      const resultado = await repository.buscarPorId('id-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('buscarPorPagamentoId', () => {
    it('deve encontrar transacoes por pagamentoId', async () => {
      const t1 = criarTransacaoValida({ id: 't1', pagamentoId: 'pag-multi' });
      const t2 = criarTransacaoValida({ id: 't2', pagamentoId: 'pag-multi' });
      await repository.salvar(t1);
      await repository.salvar(t2);

      const resultado = await repository.buscarPorPagamentoId('pag-multi');

      expect(resultado).toHaveLength(2);
    });
  });

  describe('buscarPorProviderId', () => {
    it('deve encontrar transacao por providerId', async () => {
      const transacao = criarTransacaoValida();
      await repository.salvar(transacao);

      const resultado = await repository.buscarPorProviderId('provider-xyz');

      expect(resultado).not.toBeNull();
    });

    it('deve retornar null quando providerId nao existe', async () => {
      const resultado = await repository.buscarPorProviderId('provider-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('listarPorStatus', () => {
    it('deve listar transacoes por status', async () => {
      const t1 = criarTransacaoValida({ id: 't1' });
      await repository.salvar(t1);

      const resultado = await repository.listarPorStatus('pending');

      expect(resultado.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('excluir', () => {
    it('deve remover transacao do banco', async () => {
      const transacao = criarTransacaoValida();
      await repository.salvar(transacao);

      await repository.excluir(transacao.id);

      const existente = await db.transacoes.get(transacao.id);
      expect(existente).toBeUndefined();
    });
  });
});
