import { describe, it, expect, beforeEach } from 'vitest';
import { ItemCardapioRepository } from '@/infrastructure/persistence/cardapio/ItemCardapioRepository';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { createTestDatabase } from '../_test-helpers';

describe('ItemCardapioRepository', () => {
  let repository: ItemCardapioRepository;
  let db: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    repository = new ItemCardapioRepository(db);
  });

  function criarItemValido(overrides?: Partial<{ id: string; categoriaId: string; nome: string; ativo: boolean }>): ItemCardapio {
    return ItemCardapio.criar({
      categoriaId: overrides?.categoriaId ?? 'cat-123',
      restauranteId: 'rest-123',
      nome: overrides?.nome ?? 'Hambúrguer Artesanal',
      descricao: 'Delicioso hambúrguer',
      preco: Dinheiro.criar(2590, 'BRL'),
      imagemUrl: null,
      tipo: TipoItemCardapio.LANCHE(),
      labelsDieteticos: [],
      ativo: overrides?.ativo ?? true,
      id: overrides?.id,
    });
  }

  describe('salvar', () => {
    it('deve salvar e retornar item', async () => {
      const item = criarItemValido();

      const resultado = await repository.salvar(item);

      expect(resultado).toBeDefined();
      expect(resultado.nome).toBe('Hambúrguer Artesanal');
    });

    it('deve persistir item no banco', async () => {
      const item = criarItemValido();
      await repository.salvar(item);

      const existente = await db.itens_cardapio.get(item.id);
      expect(existente).not.toBeNull();
      expect(existente!.nome).toBe('Hambúrguer Artesanal');
    });
  });

  describe('buscarPorId', () => {
    it('deve encontrar item por id', async () => {
      const item = criarItemValido();
      await repository.salvar(item);

      const resultado = await repository.buscarPorId(item.id);

      expect(resultado).not.toBeNull();
      expect(resultado!.id).toBe(item.id);
    });

    it('deve retornar null quando item nao existe', async () => {
      const resultado = await repository.buscarPorId('id-inexistente');
      expect(resultado).toBeNull();
    });
  });

  describe('buscarPorCategoria', () => {
    it('deve retornar itens da categoria', async () => {
      const i1 = criarItemValido({ id: 'item-1', nome: 'Hambúrguer' });
      const i2 = criarItemValido({ id: 'item-2', nome: 'Pizza', categoriaId: 'cat-456' });
      await repository.salvarMany([i1, i2]);

      const resultado = await repository.buscarPorCategoria('cat-123');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nome).toBe('Hambúrguer');
    });
  });

  describe('buscarAtivos', () => {
    it('deve retornar apenas itens ativos', async () => {
      const i1 = criarItemValido({ id: 'item-1', nome: 'Ativo', ativo: true });
      const i2 = criarItemValido({ id: 'item-2', nome: 'Inativo', ativo: false });
      await repository.salvarMany([i1, i2]);

      const resultado = await repository.buscarAtivos('cat-123');

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nome).toBe('Ativo');
    });
  });

  describe('buscarPorIds', () => {
    it('deve buscar múltiplos itens por ids', async () => {
      const i1 = criarItemValido({ id: 'item-1' });
      const i2 = criarItemValido({ id: 'item-2' });
      await repository.salvarMany([i1, i2]);

      const resultado = await repository.buscarPorIds(['item-1', 'item-2']);

      expect(resultado).toHaveLength(2);
    });
  });

  describe('salvarMany', () => {
    it('deve salvar múltiplos itens', async () => {
      const i1 = criarItemValido({ id: 'item-1' });
      const i2 = criarItemValido({ id: 'item-2' });
      await repository.salvarMany([i1, i2]);

      const todas = await repository.buscarPorCategoria('cat-123');
      expect(todas).toHaveLength(2);
    });
  });

  describe('excluir', () => {
    it('deve remover item do banco', async () => {
      const item = criarItemValido();
      await repository.salvar(item);

      await repository.excluir(item.id);

      const existente = await db.itens_cardapio.get(item.id);
      expect(existente).toBeUndefined();
    });
  });
});
