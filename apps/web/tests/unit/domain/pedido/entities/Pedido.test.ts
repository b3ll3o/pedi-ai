import { describe, it, expect } from 'vitest';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('Pedido', () => {
  const criarItem = (): ItemPedido => {
    return ItemPedido.criar({
      id: 'item-1',
      produtoId: 'prod-1',
      nome: 'Pizza',
      quantidade: 1,
      precoUnitario: Dinheiro.criar(4500),
      modificadoresSelecionados: [],
    });
  };

  const criarPedido = (): Pedido => {
    return Pedido.criar({
      id: 'pedido-1',
      restauranteId: 'rest-1',
      clienteId: 'cliente-1',
      status: StatusPedido.RECEIVED,
      itens: [criarItem()],
      tax: Dinheiro.criar(450),
      mesaId: 'mesa-1',
    });
  };

  describe('criar', () => {
    it('deve criar pedido com status received', () => {
      const pedido = criarPedido();
      expect(pedido.status.toString()).toBe('received');
      expect(pedido.restauranteId).toBe('rest-1');
    });

    it('deve calcular totais corretamente', () => {
      const pedido = criarPedido();
      expect(pedido.subtotal.valor).toBe(4500);
      expect(pedido.tax.valor).toBe(450);
      expect(pedido.total.valor).toBe(4950);
    });
  });

  describe('adicionarItem', () => {
    it('deve adicionar item ao pedido', () => {
      const pedido = criarPedido();
      const novoItem = ItemPedido.criar({
        id: 'item-2',
        produtoId: 'prod-2',
        nome: 'Bebida',
        quantidade: 1,
        precoUnitario: Dinheiro.criar(1000),
        modificadoresSelecionados: [],
      });

      pedido.adicionarItem(novoItem);

      expect(pedido.itens).toHaveLength(2);
    });

    it('deve incrementar quantidade se item já existe', () => {
      const pedido = criarPedido();
      const itemExistente = ItemPedido.criar({
        id: 'item-1',
        produtoId: 'prod-1',
        nome: 'Pizza',
        quantidade: 1,
        precoUnitario: Dinheiro.criar(4500),
        modificadoresSelecionados: [],
      });

      pedido.adicionarItem(itemExistente);

      expect(pedido.itens).toHaveLength(1);
      expect(pedido.itens[0].quantidade).toBe(2);
    });
  });

  describe('removerItem', () => {
    it('deve remover item do pedido', () => {
      const pedido = criarPedido();
      pedido.removerItem('item-1');

      expect(pedido.itens).toHaveLength(0);
    });

    it('deve lançar erro se item não encontrado', () => {
      const pedido = criarPedido();
      expect(() => pedido.removerItem('nao-existe')).toThrow(/não encontrado/);
    });
  });

  describe('alterarStatus', () => {
    it('deve alterar status de received para preparing', () => {
      const pedido = criarPedido();
      pedido.alterarStatus(StatusPedido.PREPARING);
      expect(pedido.status.toString()).toBe('preparing');
    });

    it('deve alterar status de preparing para ready', () => {
      const pedido = criarPedido();
      pedido.alterarStatus(StatusPedido.PREPARING);
      pedido.alterarStatus(StatusPedido.READY);
      expect(pedido.status.toString()).toBe('ready');
    });

    it('deve lançar erro para transição inválida', () => {
      const pedido = criarPedido();
      expect(() => pedido.alterarStatus(StatusPedido.DELIVERED)).toThrow(/inválida/);
    });

    it('deve ignorar se status igual', () => {
      const pedido = criarPedido();
      expect(() => pedido.alterarStatus(StatusPedido.RECEIVED)).not.toThrow();
    });
  });

  describe('quantidadeItens', () => {
    it('deve retornar soma das quantidades', () => {
      const pedido = criarPedido();
      expect(pedido.quantidadeItens).toBe(1);
    });
  });

  describe('equals', () => {
    it('deve verificar igualdade por id', () => {
      const pedido1 = criarPedido();
      const pedido2 = Pedido.criar({
        id: 'pedido-1',
        restauranteId: 'rest-2',
        status: StatusPedido.PREPARING,
        itens: [],
        tax: Dinheiro.ZERO,
        mesaId: 'mesa-2',
      });

      expect(pedido1.equals(pedido2)).toBe(true);
    });

    it('deve retornar false para ids diferentes', () => {
      const pedido1 = criarPedido();
      const pedido2 = Pedido.criar({
        id: 'pedido-2',
        restauranteId: 'rest-1',
        status: StatusPedido.RECEIVED,
        itens: [],
        tax: Dinheiro.ZERO,
      });

      expect(pedido1.equals(pedido2)).toBe(false);
    });
  });

  describe('getters', () => {
    it('deve expor clienteId e mesaId', () => {
      const pedido = criarPedido();
      expect(pedido.clienteId).toBe('cliente-1');
      expect(pedido.mesaId).toBe('mesa-1');
    });
  });
});