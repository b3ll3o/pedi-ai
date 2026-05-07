import { describe, it, expect, beforeEach } from 'vitest';
import { CarrinhoRepository } from '@/infrastructure/persistence/pedido/CarrinhoRepository';
import { CarrinhoAggregate } from '@/domain/pedido/aggregates/CarrinhoAggregate';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { createTestDatabase } from '../_test-helpers';

describe('CarrinhoRepository', () => {
  let repository: CarrinhoRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new CarrinhoRepository(db);
  });

  function criarCarrinhoValido(overrides?: Partial<{ id: string; restauranteId: string }>): CarrinhoAggregate {
    return CarrinhoAggregate.criar({
      restauranteId: overrides?.restauranteId ?? 'rest-123',
      clienteId: 'cliente-abc',
      id: overrides?.id ?? 'carrinho-test-001',
    });
  }

  describe('save', () => {
    it('deve salvar carrinho', async () => {
      const carrinho = criarCarrinhoValido();

      await repository.save(carrinho);

      const existente = await db.carrinhos.get(carrinho.id);
      expect(existente).not.toBeNull();
      expect(existente!.restauranteId).toBe('rest-123');
    });

    it('deve atualizar carrinho existente', async () => {
      const carrinho = criarCarrinhoValido();
      await repository.save(carrinho);

      await repository.save(carrinho);

      const count = await db.carrinhos.count();
      expect(count).toBe(1);
    });
  });

  describe('get', () => {
    it('deve retornar carrinho salvo', async () => {
      const carrinho = criarCarrinhoValido();
      await repository.save(carrinho);

      const resultado = await repository.get();

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(carrinho.id);
    });

    it('deve retornar null quando nao existe carrinho', async () => {
      const resultado = await repository.get();
      expect(resultado).toBeNull();
    });
  });

  describe('clear', () => {
    it('deve limpar todos os carrinhos', async () => {
      const c1 = criarCarrinhoValido({ id: 'c1' });
      const c2 = criarCarrinhoValido({ id: 'c2', restauranteId: 'rest-456' });
      await repository.save(c1);
      await repository.save(c2);

      await repository.clear();

      const count = await db.carrinhos.count();
      expect(count).toBe(0);
    });
  });
});
