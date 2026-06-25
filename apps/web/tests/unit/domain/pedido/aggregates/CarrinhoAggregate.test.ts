/**
 * Cobertura: RF-ORDER-01, RF-ORDER-02, RF-ORDER-03, RF-ORDER-04, RF-ORDER-10
 * @see .openspec/specs/pedido/design.md
 */
import { describe, it, expect } from 'vitest';
import { CarrinhoAggregate } from '@/domain/pedido/aggregates/CarrinhoAggregate';
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('CarrinhoAggregate', () => {
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

  const criarCarrinho = (): CarrinhoAggregate => {
    return CarrinhoAggregate.criar({
      id: 'carrinho-1',
      restauranteId: 'rest-1',
      clienteId: 'cliente-1',
      mesaId: 'mesa-1',
    });
  };

  describe('criar', () => {
    it('deve criar carrinho vazio', () => {
      const carrinho = criarCarrinho();

      expect(carrinho.id).toBe('carrinho-1');
      expect(carrinho.isEmpty).toBe(true);
      expect(carrinho.itens).toHaveLength(0);
    });
  });

  describe('adicionarItem', () => {
    it('deve adicionar item ao carrinho', () => {
      const carrinho = criarCarrinho();
      const item = criarItem();

      carrinho.adicionarItem(item);

      expect(carrinho.itens).toHaveLength(1);
      expect(carrinho.isEmpty).toBe(false);
    });

    it('deve incrementar quantidade se item já existe', () => {
      const carrinho = criarCarrinho();
      const item = criarItem();

      carrinho.adicionarItem(item);
      carrinho.adicionarItem(item);

      expect(carrinho.itens).toHaveLength(1);
      expect(carrinho.itens[0].quantidade).toBe(4);
    });
  });

  describe('removerItem', () => {
    it('deve remover item do carrinho', () => {
      const carrinho = criarCarrinho();
      const item = criarItem();

      carrinho.adicionarItem(item);
      carrinho.removerItem('item-1');

      expect(carrinho.isEmpty).toBe(true);
    });
  });

  describe('atualizarQuantidade', () => {
    it('deve atualizar quantidade do item', () => {
      const carrinho = criarCarrinho();
      const item = criarItem();

      carrinho.adicionarItem(item);
      carrinho.atualizarQuantidade('item-1', 5);

      expect(carrinho.itens[0].quantidade).toBe(5);
    });

    it('deve remover item se quantidade for 0 ou negativa', () => {
      const carrinho = criarCarrinho();
      const item = criarItem();

      carrinho.adicionarItem(item);
      carrinho.atualizarQuantidade('item-1', 0);

      expect(carrinho.isEmpty).toBe(true);
    });
  });

  describe('definirMetodoPagamento', () => {
    it('deve definir método de pagamento', () => {
      const carrinho = criarCarrinho();

      carrinho.definirMetodoPagamento('pix');

      expect(carrinho.metodoPagamento).toBe('pix');
    });
  });

  describe('limpar', () => {
    it('deve limpar todos os itens', () => {
      const carrinho = criarCarrinho();
      const item = criarItem();

      carrinho.adicionarItem(item);
      carrinho.limpar();

      expect(carrinho.isEmpty).toBe(true);
      expect(carrinho.metodoPagamento).toBeUndefined();
    });
  });

  describe('subtotal', () => {
    it('deve calcular subtotal corretamente', () => {
      const carrinho = criarCarrinho();
      const item1 = criarItem();

      carrinho.adicionarItem(item1);

      expect(carrinho.subtotal.valor).toBe(9000);
    });
  });

  describe('toPedido', () => {
    it('deve converter carrinho em pedido', () => {
      const carrinho = criarCarrinho();
      const item = criarItem();

      carrinho.adicionarItem(item);
      carrinho.definirMetodoPagamento('pix');

      const pedido = carrinho.toPedido('pedido-1', 0.1);

      expect(pedido.id).toBe('pedido-1');
      expect(pedido.restauranteId).toBe('rest-1');
      expect(pedido.itens).toHaveLength(1);
      expect(pedido.status.props).toBe('received');
    });

    it('deve calcular taxa de servico', () => {
      const carrinho = criarCarrinho();
      const item = ItemPedido.criar({
        id: 'item-1',
        produtoId: 'prod-1',
        nome: 'Produto',
        quantidade: 1,
        precoUnitario: Dinheiro.criar(10000),
        modificadoresSelecionados: [],
      });

      carrinho.adicionarItem(item);
      const pedido = carrinho.toPedido('pedido-1', 0.1);

      expect(pedido.tax.valor).toBe(1000);
      expect(pedido.total.valor).toBe(11000);
    });

    it('deve lancar erro se carrinho vazio', () => {
      const carrinho = criarCarrinho();

      expect(() => carrinho.toPedido('pedido-1')).toThrow(/carrinho vazio/);
    });
  });

  describe('getters', () => {
    it('deve expor clienteId, mesaId e restauranteId', () => {
      const carrinho = criarCarrinho();

      expect(carrinho.clienteId).toBe('cliente-1');
      expect(carrinho.mesaId).toBe('mesa-1');
      expect(carrinho.restauranteId).toBe('rest-1');
    });

    it('deve retornar undefined para clienteId e mesaId se não definidos', () => {
      const carrinho = CarrinhoAggregate.criar({
        id: 'carrinho-2',
        restauranteId: 'rest-1',
      });

      expect(carrinho.clienteId).toBeUndefined();
      expect(carrinho.mesaId).toBeUndefined();
    });
  });
});
