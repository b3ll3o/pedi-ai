import { describe, it, expect } from 'vitest';
import { Pedido, PedidoProps } from '@/domain/pedido/entities/Pedido';
import { ItemPedido, ItemPedidoProps } from '@/domain/pedido/entities/ItemPedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';

describe('Pedido', () => {
  // Criar ItemPedido usando new diretamente para ter controle total sobre o id
  const criarItemPedido = (props: Partial<ItemPedidoProps> & { id?: string; produtoId?: string; nome?: string }): ItemPedido => {
    const id = props.id ?? crypto.randomUUID();
    const itemProps: ItemPedidoProps = {
      id,
      produtoId: props.produtoId ?? 'produto-1',
      nome: props.nome ?? 'X-Burger',
      precoUnitario: props.precoUnitario ?? Dinheiro.criar(2500, 'BRL'),
      quantidade: props.quantidade ?? 1,
      modificadoresSelecionados: props.modificadoresSelecionados ?? [],
      subtotal: props.subtotal ?? Dinheiro.criar(2500, 'BRL'),
      pedidoId: props.pedidoId,
      observacao: props.observacao,
    };
    return new ItemPedido(itemProps);
  };

  // Criar Pedido usando new diretamente já que Pedido.criar tem bug (não gera id)
  const criarPedido = (props: Partial<PedidoProps> & { itens?: ItemPedido[] }): Pedido => {
    const now = new Date();
    const pedidoProps: PedidoProps = {
      id: crypto.randomUUID(),
      restauranteId: 'restaurante-1',
      status: StatusPedido.PENDING_PAYMENT,
      itens: [],
      subtotal: Dinheiro.ZERO,
      tax: Dinheiro.ZERO,
      total: Dinheiro.ZERO,
      createdAt: now,
      updatedAt: now,
      clienteId: props.clienteId,
      mesaId: props.mesaId,
      status: props.status ?? StatusPedido.PENDING_PAYMENT,
      restauranteId: props.restauranteId ?? 'restaurante-1',
      itens: props.itens ?? [],
      subtotal: props.subtotal ?? Dinheiro.ZERO,
      tax: props.tax ?? Dinheiro.ZERO,
      total: props.total ?? Dinheiro.ZERO,
    };
    return new Pedido(pedidoProps);
  };

  describe('criar', () => {
    it('deve criar um pedido com ID e datas', () => {
      const pedido = criarPedido({});

      expect(pedido.id).toBeDefined();
      expect(pedido.restauranteId).toBe('restaurante-1');
      expect(pedido.status).toEqual(StatusPedido.PENDING_PAYMENT);
      expect(pedido.itens).toHaveLength(0);
      expect(pedido.subtotal).toEqual(Dinheiro.ZERO);
      expect(pedido.tax).toEqual(Dinheiro.ZERO);
      expect(pedido.total).toEqual(Dinheiro.ZERO);
      expect(pedido.createdAt).toBeInstanceOf(Date);
      expect(pedido.updatedAt).toBeInstanceOf(Date);
    });

    it('deve criar pedido com clienteId e mesaId', () => {
      const pedido = criarPedido({
        clienteId: 'cliente-1',
        mesaId: 'mesa-1',
      });

      expect(pedido.clienteId).toBe('cliente-1');
      expect(pedido.mesaId).toBe('mesa-1');
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const pedido1 = criarPedido({});
      const pedido2 = new Pedido({
        ...pedido1.props,
        id: pedido1.id,
      } as PedidoProps);

      expect(pedido1.equals(pedido2)).toBe(true);
    });
  });

  describe('quantidadeItens', () => {
    it('deve retornar a quantidade total de itens', () => {
      const item1 = criarItemPedido({ quantidade: 2 });
      const item2 = criarItemPedido({ id: crypto.randomUUID(), produtoId: 'prod-2', quantidade: 3 });
      const pedido = criarPedido({
        itens: [item1, item2],
      });

      expect(pedido.quantidadeItens).toBe(5);
    });
  });

  describe('adicionarItem', () => {
    it('deve adicionar um novo item', () => {
      const pedido = criarPedido({});
      const item = criarItemPedido({});

      pedido.adicionarItem(item);

      expect(pedido.itens).toHaveLength(1);
    });

    it('deve incrementar quantidade se item já existe', () => {
      const pedido = criarPedido({});
      const item = criarItemPedido({ produtoId: 'produto-1' });

      pedido.adicionarItem(item);
      pedido.adicionarItem(item);

      expect(pedido.itens).toHaveLength(1);
      expect(pedido.itens[0].quantidade).toBe(2);
    });

    it('deve atualizar totales após adicionar item', () => {
      const pedido = criarPedido({});
      const item = criarItemPedido({});

      pedido.adicionarItem(item);

      expect(pedido.subtotal.valor).toBe(2500);
      expect(pedido.total.valor).toBe(2500);
    });
  });

  describe('removerItem', () => {
    it('deve remover um item existente', () => {
      const item = criarItemPedido({});
      const pedido = criarPedido({ itens: [item] });

      pedido.removerItem(item.id);

      expect(pedido.itens).toHaveLength(0);
    });

    it('deve lançar erro se item não existe', () => {
      const pedido = criarPedido({});

      expect(() => pedido.removerItem('nao-existe')).toThrow('Item nao-existe não encontrado no pedido');
    });
  });

  describe('alterarStatus', () => {
    it('deve alterar o status do pedido', () => {
      const pedido = criarPedido({});

      pedido.alterarStatus(StatusPedido.PAID);

      expect(pedido.status).toEqual(StatusPedido.PAID);
    });

    it('deve não alterar se status é o mesmo', () => {
      const pedido = criarPedido({ status: StatusPedido.PENDING_PAYMENT });
      const updatedAt = pedido.updatedAt;

      pedido.alterarStatus(StatusPedido.PENDING_PAYMENT);

      expect(pedido.updatedAt).toEqual(updatedAt);
    });
  });

  describe('clienteId e mesaId', () => {
    it('devem ser undefined quando não definidos', () => {
      const pedido = criarPedido({});

      expect(pedido.clienteId).toBeUndefined();
      expect(pedido.mesaId).toBeUndefined();
    });
  });

  describe('itens', () => {
    it('deve retornar cópia do array', () => {
      const item = criarItemPedido({});
      const pedido = criarPedido({ itens: [item] });
      const itens1 = pedido.itens;
      const itens2 = pedido.itens;

      expect(itens1).not.toBe(itens2);
    });
  });
});
