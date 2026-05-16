import { describe, it, expect } from 'vitest';
import { ItemPedido, ItemPedidoProps } from '@/domain/pedido/entities/ItemPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { ModificadorSelecionado } from '@/domain/pedido/value-objects/ModificadorSelecionado';

describe('ItemPedido', () => {
  const criarItemPedido = (overrides?: Partial<ItemPedidoProps>): ItemPedido => {
    const props: ItemPedidoProps = {
      id: crypto.randomUUID(),
      produtoId: 'produto-1',
      nome: 'X-Burger',
      precoUnitario: Dinheiro.criar(2500, 'BRL'),
      quantidade: 1,
      modificadoresSelecionados: [],
      subtotal: Dinheiro.ZERO,
      ...overrides,
    };
    return ItemPedido.criar(props);
  };

  describe('criar', () => {
    it('deve criar um item de pedido e calcular subtotal', () => {
      const item = criarItemPedido();

      expect(item.id).toBeDefined();
      expect(item.produtoId).toBe('produto-1');
      expect(item.nome).toBe('X-Burger');
      expect(item.precoUnitario.reais).toBe(25);
      expect(item.quantidade).toBe(1);
      expect(item.subtotal.reais).toBe(25);
    });

    it('deve criar com pedidoId opcional', () => {
      const item = criarItemPedido({ pedidoId: 'pedido-1' });
      expect(item.pedidoId).toBe('pedido-1');
    });

    it('deve criar com observacao opcional', () => {
      const item = criarItemPedido({ observacao: 'Sem cebola' });
      expect(item.observacao).toBe('Sem cebola');
    });

    it('deve criar com modificadores', () => {
      const modificadores: ModificadorSelecionado[] = [
        { grupoId: 'grupo-1', valorId: 'valor-1', nome: 'Bacon', precoAdicional: 300 },
      ];
      const item = criarItemPedido({ modificadoresSelecionados: modificadores });

      expect(item.modificadoresSelecionados).toHaveLength(1);
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const item1 = criarItemPedido();
      // Criar segundo item com mesmo ID através de props
      const item2 = new ItemPedido({
        ...item1.props,
        id: item1.id,
        nome: 'Outro Nome',
      });

      expect(item1.equals(item2)).toBe(true);
    });
  });

  describe('recalcularSubtotal', () => {
    it('deve recalcular subtotal com quantidade', () => {
      const item = criarItemPedido({ quantidade: 3 });
      expect(item.subtotal.reais).toBe(75); // 25 * 3
    });

    it('deve incluir preço dos modificadores', () => {
      const modificadores: ModificadorSelecionado[] = [
        { grupoId: 'grupo-1', valorId: 'valor-1', nome: 'Bacon', precoAdicional: 300 },
        { grupoId: 'grupo-2', valorId: 'valor-2', nome: 'Queijo Extra', precoAdicional: 200 },
      ];
      const item = criarItemPedido({ quantidade: 2, modificadoresSelecionados: modificadores });

      // 25 * 2 = 50.00
      // modificadores: (3 + 2) * 2 = 10.00
      // total: 60.00 = 6000 centavos
      expect(item.subtotal.valor).toBe(6000);
    });
  });

  describe('atualizarQuantidade', () => {
    it('deve atualizar quantidade e recalcular subtotal', () => {
      const item = criarItemPedido();
      expect(item.subtotal.reais).toBe(25);

      item.atualizarQuantidade(4);

      expect(item.quantidade).toBe(4);
      expect(item.subtotal.reais).toBe(100);
    });
  });

  describe('modificadoresSelecionados', () => {
    it('deve retornar cópia do array', () => {
      const modificadores: ModificadorSelecionado[] = [
        { grupoId: 'grupo-1', valorId: 'valor-1', nome: 'Bacon', precoAdicional: 300 },
      ];
      const item = criarItemPedido({ modificadoresSelecionados: modificadores });
      const mods1 = item.modificadoresSelecionados;
      const mods2 = item.modificadoresSelecionados;

      expect(mods1).not.toBe(mods2);
    });
  });

  describe('pedidoId', () => {
    it('deve retornar undefined quando não definido', () => {
      const item = criarItemPedido();
      expect(item.pedidoId).toBeUndefined();
    });
  });

  describe('observacao', () => {
    it('deve retornar undefined quando não definida', () => {
      const item = criarItemPedido();
      expect(item.observacao).toBeUndefined();
    });
  });
});
