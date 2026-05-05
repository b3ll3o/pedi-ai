// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { Combo, ComboProps, ComboItemProps } from '@/domain/cardapio/entities/Combo';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';

describe('Combo', () => {
  const criarCombo = (overrides?: Partial<Omit<ComboProps, 'id'>>): Combo => {
    const itens: ComboItemProps[] = [
      { produtoId: 'produto-1', quantidade: 1 },
      { produtoId: 'produto-2', quantidade: 2 },
    ];

    return Combo.criar({
      restauranteId: 'restaurante-1',
      nome: 'Combo Família',
      descricao: 'Combo para toda família',
      precoBundle: Dinheiro.criar(5000, 'BRL'),
      imagemUrl: null,
      itens,
      ativo: true,
      ...overrides,
    });
  };

  describe('criar', () => {
    it('deve criar um combo com ID gerado', () => {
      const combo = criarCombo();

      expect(combo.id).toBeDefined();
      expect(combo.restauranteId).toBe('restaurante-1');
      expect(combo.nome).toBe('Combo Família');
      expect(combo.descricao).toBe('Combo para toda família');
      expect(combo.precoBundle.reais).toBe(50);
      expect(combo.itens).toHaveLength(2);
      expect(combo.ativo).toBe(true);
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir um combo', () => {
      const props: ComboProps = {
        id: 'combo-1',
        restauranteId: 'restaurante-1',
        nome: 'Combo Executiva',
        descricao: 'Para o almoço',
        precoBundle: Dinheiro.criar(3500, 'BRL'),
        imagemUrl: 'https://exemplo.com/combo.jpg',
        itens: [{ produtoId: 'produto-1', quantidade: 1 }],
        ativo: true,
      };

      const combo = Combo.reconstruir(props);

      expect(combo.id).toBe('combo-1');
      expect(combo.nome).toBe('Combo Executiva');
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const combo1 = criarCombo();
      const combo2 = Combo.reconstruir({
        ...combo1.props,
        id: combo1.id,
        nome: 'Outro Nome',
      });

      expect(combo1.equals(combo2)).toBe(true);
    });
  });

  describe('quantidadeItens', () => {
    it('deve calcular a quantidade total de itens', () => {
      const combo = criarCombo();
      expect(combo.quantidadeItens).toBe(3); // 1 + 2
    });

    it('deve retornar 0 para combo sem itens', () => {
      const combo = criarCombo({ itens: [] });
      expect(combo.quantidadeItens).toBe(0);
    });
  });

  describe('contemProduto', () => {
    it('deve retornar true se contém o produto', () => {
      const combo = criarCombo();
      expect(combo.contemProduto('produto-1')).toBe(true);
      expect(combo.contemProduto('produto-2')).toBe(true);
    });

    it('deve retornar false se não contém o produto', () => {
      const combo = criarCombo();
      expect(combo.contemProduto('produto-999')).toBe(false);
    });
  });

  describe('ativar e desativar', () => {
    it('deve ativar o combo', () => {
      const combo = criarCombo({ ativo: false });
      combo.ativar();
      expect(combo.ativo).toBe(true);
    });

    it('deve desativar o combo', () => {
      const combo = criarCombo({ ativo: true });
      combo.desativar();
      expect(combo.ativo).toBe(false);
    });
  });

  describe('atualizarNome', () => {
    it('deve atualizar o nome', () => {
      const combo = criarCombo();
      combo.atualizarNome('Novo Combo');
      expect(combo.nome).toBe('Novo Combo');
    });
  });

  describe('atualizarDescricao', () => {
    it('deve atualizar a descrição', () => {
      const combo = criarCombo();
      combo.atualizarDescricao('Nova descrição');
      expect(combo.descricao).toBe('Nova descrição');
    });

    it('deve permitir descrição null', () => {
      const combo = criarCombo({ descricao: 'Descrição' });
      combo.atualizarDescricao(null);
      expect(combo.descricao).toBeNull();
    });
  });

  describe('atualizarPrecoBundle', () => {
    it('deve atualizar o preço do bundle', () => {
      const combo = criarCombo();
      const novoPreco = Dinheiro.criar(6000, 'BRL');
      combo.atualizarPrecoBundle(novoPreco);
      expect(combo.precoBundle.reais).toBe(60);
    });
  });

  describe('itens', () => {
    it('deve retornar cópia do array', () => {
      const combo = criarCombo();
      const itens1 = combo.itens;
      const itens2 = combo.itens;
      expect(itens1).not.toBe(itens2);
    });
  });
});
