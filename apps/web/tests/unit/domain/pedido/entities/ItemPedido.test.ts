import { describe, it, expect } from 'vitest';
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido';
import { ModificadorSelecionado } from '@/domain/pedido/value-objects/ModificadorSelecionado';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('ItemPedido', () => {
  const criarItem = (): ItemPedido => {
    return ItemPedido.criar({
      id: 'item-1',
      produtoId: 'prod-1',
      nome: 'Pizza Margherita',
      quantidade: 2,
      precoUnitario: Dinheiro.criar(4500),
      observacao: null,
      modificadoresSelecionados: [],
    });
  };

  const criarModificador = (): ModificadorSelecionado => {
    return {
      grupoId: 'grupo-1',
      grupoNome: 'Borda',
      valorId: 'valor-1',
      valorNome: 'Borda Catupiry',
      precoAdicional: 500,
    };
  };

  describe('criar', () => {
    it('deve criar item com subtotal calculado', () => {
      const item = criarItem();
      expect(item.subtotal.valor).toBe(9000);
      expect(item.quantidade).toBe(2);
      expect(item.precoUnitario.valor).toBe(4500);
    });

    it('deve calcular subtotal com modificadores', () => {
      const mod = criarModificador();
      const item = ItemPedido.criar({
        id: 'item-2',
        produtoId: 'prod-1',
        nome: 'Pizza',
        quantidade: 1,
        precoUnitario: Dinheiro.criar(4000),
        observacao: null,
        modificadoresSelecionados: [mod],
      });

      expect(item.subtotal.valor).toBe(4500);
    });

    it('deve multiplicar preco por quantidade com modificadores', () => {
      const mod = criarModificador();
      const item = ItemPedido.criar({
        id: 'item-3',
        produtoId: 'prod-1',
        nome: 'Pizza',
        quantidade: 2,
        precoUnitario: Dinheiro.criar(4000),
        observacao: null,
        modificadoresSelecionados: [mod],
      });

      expect(item.subtotal.valor).toBe(9000);
    });
  });

  describe('atualizarQuantidade', () => {
    it('deve atualizar quantidade e recalcular subtotal', () => {
      const item = criarItem();
      item.atualizarQuantidade(3);

      expect(item.quantidade).toBe(3);
      expect(item.subtotal.valor).toBe(13500);
    });

    it('deve recalcular subtotal após atualizar quantidade', () => {
      const item = criarItem();
      item.atualizarQuantidade(5);

      expect(item.subtotal.valor).toBe(22500);
    });
  });

  describe('recalcularSubtotal', () => {
    it('deve recalcular subtotal após adição de modificadores', () => {
      const item = criarItem();
      const mod = criarModificador();

      item.recalcularSubtotal();
      expect(item.subtotal.valor).toBe(9000);
    });
  });

  describe('equals', () => {
    it('deve verificar igualdade por id', () => {
      const item1 = criarItem();
      const item2 = ItemPedido.criar({
        id: 'item-1',
        produtoId: 'prod-2',
        nome: 'Outro',
        quantidade: 10,
        precoUnitario: Dinheiro.criar(100),
        modificadoresSelecionados: [],
      });

      expect(item1.equals(item2)).toBe(true);
    });

    it('deve retornar false para ids diferentes', () => {
      const item1 = criarItem();
      const item2 = ItemPedido.criar({
        id: 'item-2',
        produtoId: 'prod-1',
        nome: 'Pizza',
        quantidade: 2,
        precoUnitario: Dinheiro.criar(4500),
        modificadoresSelecionados: [],
      });

      expect(item1.equals(item2)).toBe(false);
    });
  });

  describe('getters', () => {
    it('deve expor props corretamente', () => {
      const item = criarItem();
      expect(item.produtoId).toBe('prod-1');
      expect(item.nome).toBe('Pizza Margherita');
      expect(item.observacao).toBeNull();
    });
  });
});