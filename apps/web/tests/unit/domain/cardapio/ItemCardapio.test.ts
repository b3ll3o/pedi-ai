import { describe, it, expect } from 'vitest';
import { ItemCardapio, ItemCardapioProps } from '@/domain/cardapio/entities/ItemCardapio';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico';

describe('ItemCardapio', () => {
  // Criar ItemCardapio usando new para evitar problema com id não gerado
  const criarItemCardapio = (props?: Partial<ItemCardapioProps>): ItemCardapio => {
    const itemProps: ItemCardapioProps = {
      id: crypto.randomUUID(),
      categoriaId: 'categoria-1',
      restauranteId: 'restaurante-1',
      nome: 'X-Burger',
      descricao: 'Hambúrguer artesanal',
      preco: Dinheiro.criar(2500, 'BRL'),
      imagemUrl: null,
      tipo: TipoItemCardapio.PRODUTO,
      labelsDieteticos: [],
      ativo: true,
      ...props,
    };
    return new ItemCardapio(itemProps);
  };

  describe('criar', () => {
    it('deve criar um item de cardápio com ID e propriedades', () => {
      const item = criarItemCardapio();

      expect(item.id).toBeDefined();
      expect(item.categoriaId).toBe('categoria-1');
      expect(item.nome).toBe('X-Burger');
      expect(item.descricao).toBe('Hambúrguer artesanal');
      expect(item.preco.reais).toBe(25);
      expect(item.ativo).toBe(true);
    });
  });

  describe('equals', () => {
    it('deve ser igual quando IDs são iguais', () => {
      const item1 = criarItemCardapio();
      const item2 = new ItemCardapio({
        ...item1.props,
        id: item1.id,
        nome: 'Outro Nome',
      });

      expect(item1.equals(item2)).toBe(true);
    });
  });

  describe('isProduto e isCombo', () => {
    it('deve identificar como produto', () => {
      const item = criarItemCardapio({ tipo: TipoItemCardapio.PRODUTO });
      expect(item.isProduto()).toBe(true);
      expect(item.isCombo()).toBe(false);
    });

    it('deve identificar como combo', () => {
      const item = criarItemCardapio({ tipo: TipoItemCardapio.COMBO });
      expect(item.isCombo()).toBe(true);
      expect(item.isProduto()).toBe(false);
    });
  });

  describe('temLabel', () => {
    it('deve verificar se tem label dietético', () => {
      const item = criarItemCardapio({
        labelsDieteticos: [LabelDietetico.VEGANO],
      });

      expect(item.temLabel('vegano')).toBe(true);
      expect(item.temLabel('vegetariano')).toBe(false);
    });
  });

  describe('ativar e desativar', () => {
    it('deve ativar o item', () => {
      const item = criarItemCardapio({ ativo: false });
      item.ativar();
      expect(item.ativo).toBe(true);
    });

    it('deve desativar o item', () => {
      const item = criarItemCardapio({ ativo: true });
      item.desativar();
      expect(item.ativo).toBe(false);
    });
  });

  describe('atualizarPreco', () => {
    it('deve atualizar o preço', () => {
      const item = criarItemCardapio();
      const novoPreco = Dinheiro.criar(3000, 'BRL');
      item.atualizarPreco(novoPreco);
      expect(item.preco.reais).toBe(30);
    });
  });

  describe('atualizarNome', () => {
    it('deve atualizar o nome', () => {
      const item = criarItemCardapio();
      item.atualizarNome('X-Bacon');
      expect(item.nome).toBe('X-Bacon');
    });
  });

  describe('atualizarDescricao', () => {
    it('deve atualizar a descrição', () => {
      const item = criarItemCardapio();
      item.atualizarDescricao('Nova descrição');
      expect(item.descricao).toBe('Nova descrição');
    });

    it('deve permitir descrição null', () => {
      const item = criarItemCardapio({ descricao: 'Descrição' });
      item.atualizarDescricao(null);
      expect(item.descricao).toBeNull();
    });
  });

  describe('atualizarImagem', () => {
    it('deve atualizar a imagem', () => {
      const item = criarItemCardapio();
      item.atualizarImagem('https://exemplo.com/nova-img.jpg');
      expect(item.imagemUrl).toBe('https://exemplo.com/nova-img.jpg');
    });
  });

  describe('atualizarTipo', () => {
    it('deve atualizar o tipo', () => {
      const item = criarItemCardapio({ tipo: TipoItemCardapio.PRODUTO });
      item.atualizarTipo(TipoItemCardapio.COMBO);
      expect(item.tipo).toEqual(TipoItemCardapio.COMBO);
    });
  });

  describe('atualizarLabels', () => {
    it('deve atualizar os labels', () => {
      const item = criarItemCardapio({
        labelsDieteticos: [LabelDietetico.VEGANO],
      });
      item.atualizarLabels([LabelDietetico.VEGETARIANO, LabelDietetico.SEM_GLUTEN]);
      expect(item.labelsDieteticos).toHaveLength(2);
      expect(item.labelsDieteticos).toContain(LabelDietetico.VEGETARIANO);
    });
  });

  describe('labelsDieteticos', () => {
    it('deve retornar cópia do array', () => {
      const item = criarItemCardapio({
        labelsDieteticos: [LabelDietetico.VEGANO],
      });
      const labels1 = item.labelsDieteticos;
      const labels2 = item.labelsDieteticos;
      expect(labels1).not.toBe(labels2);
    });
  });

  describe('restauranteId', () => {
    it('deve retornar restauranteId quando definido', () => {
      const item = criarItemCardapio({ restauranteId: 'rest-1' });
      expect(item.restauranteId).toBe('rest-1');
    });

    it('deve retornar undefined quando não definido', () => {
      const item = criarItemCardapio({ restauranteId: undefined });
      expect(item.restauranteId).toBeUndefined();
    });
  });
});
