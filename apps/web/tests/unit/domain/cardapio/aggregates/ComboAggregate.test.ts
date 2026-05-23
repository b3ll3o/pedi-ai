import { describe, it, expect } from 'vitest';
import { ComboAggregate } from '@/domain/cardapio/aggregates/ComboAggregate';
import { Combo } from '@/domain/cardapio/entities/Combo';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('ComboAggregate', () => {
  const criarItemCardapio = (id: string, preco: number): ItemCardapio => {
    return ItemCardapio.criar({
      id,
      nome: `Produto ${id}`,
      descricao: 'Descrição',
      preco: Dinheiro.criar(preco),
      tipo: 'produto',
      categoriaId: 'cat-1',
      restauranteId: 'rest-1',
      ativo: true,
    });
  };

  const criarCombo = (): Combo => {
    return Combo.criar({
      id: 'combo-1',
      nome: 'Combo Promocional',
      descricao: 'Combo com desconto',
      precoBundle: Dinheiro.criar(3500),
      itens: [
        { produtoId: 'prod-1', quantidade: 1 },
        { produtoId: 'prod-2', quantidade: 1 },
      ],
      ativo: true,
    });
  };

  describe('calcularDesconto', () => {
    it('deve calcular desconto corretamente', () => {
      const combo = criarCombo();
      const precosItens = new Map([
        ['prod-1', Dinheiro.criar(2000)],
        ['prod-2', Dinheiro.criar(2000)],
      ]);
      const aggregate = new ComboAggregate(combo, precosItens);

      const resultado = aggregate.calcularDesconto();

      expect(resultado.precoIndividualTotal.valor).toBe(4000);
      expect(resultado.precoBundle.valor).toBe(3500);
      expect(resultado.valorDesconto.valor).toBe(500);
      expect(resultado.percentualDesconto).toBe(12);
    });

    it('deve retornar 0% de desconto se preco individual for 0', () => {
      const combo = criarCombo();
      const aggregate = new ComboAggregate(combo, new Map());

      const resultado = aggregate.calcularDesconto();

      expect(resultado.percentualDesconto).toBe(0);
    });
  });

  describe('temDescontoMinimo', () => {
    it('deve retornar true se desconto for maior ou igual ao mínimo', () => {
      const combo = criarCombo();
      const precosItens = new Map([
        ['prod-1', Dinheiro.criar(2000)],
        ['prod-2', Dinheiro.criar(2000)],
      ]);
      const aggregate = new ComboAggregate(combo, precosItens);

      expect(aggregate.temDescontoMinimo(10)).toBe(true);
      expect(aggregate.temDescontoMinimo(15)).toBe(false);
    });
  });

  describe('validarItens', () => {
    it('deve retornar válido se combo tem itens com preços definidos', () => {
      const combo = criarCombo();
      const precosItens = new Map([
        ['prod-1', Dinheiro.criar(2000)],
        ['prod-2', Dinheiro.criar(2000)],
      ]);
      const aggregate = new ComboAggregate(combo, precosItens);

      const resultado = aggregate.validarItens();

      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve retornar erro se combo não tem itens', () => {
      const comboVazio = Combo.criar({
        id: 'combo-2',
        nome: 'Combo Vazio',
        descricao: 'Sem itens',
        precoBundle: Dinheiro.criar(1000),
        itens: [],
        ativo: true,
      });
      const aggregate = new ComboAggregate(comboVazio, new Map());

      const resultado = aggregate.validarItens();

      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('Combo deve ter pelo menos um item');
    });

    it('deve retornar erro se preço não encontrado para item', () => {
      const combo = criarCombo();
      const precosItens = new Map([['prod-1', Dinheiro.criar(2000)]]);
      const aggregate = new ComboAggregate(combo, precosItens);

      const resultado = aggregate.validarItens();

      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some((e) => e.includes('Preço não encontrado'))).toBe(true);
    });
  });

  describe('definirPrecoItens', () => {
    it('deve definir preços dos itens a partir de ItemCardapio', () => {
      const combo = criarCombo();
      const aggregate = new ComboAggregate(combo);

      const itens = [criarItemCardapio('prod-1', 2000), criarItemCardapio('prod-2', 1500)];
      aggregate.definirPrecoItens(itens);

      expect(aggregate.calcularDesconto().precoIndividualTotal.valor).toBe(3500);
    });
  });

  describe('criar', () => {
    it('deve criar aggregate via método estático', () => {
      const aggregate = ComboAggregate.criar({
        id: 'combo-3',
        nome: 'Novo Combo',
        descricao: 'Descrição',
        precoBundle: Dinheiro.criar(2500),
        itens: [{ produtoId: 'prod-1', quantidade: 1 }],
        ativo: true,
      });

      expect(aggregate.id).toBe('combo-3');
      expect(aggregate.nome).toBe('Novo Combo');
    });
  });

  describe('reconstruir', () => {
    it('deve reconstruir aggregate a partir de props', () => {
      const props = {
        id: 'combo-1',
        nome: 'Combo',
        descricao: 'Desc',
        precoBundle: Dinheiro.criar(3000),
        itens: [{ produtoId: 'prod-1', quantidade: 1 }],
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      const aggregate = ComboAggregate.reconstruir(props);

      expect(aggregate.id).toBe('combo-1');
    });

    it('deve reconstruir com preços dos itens', () => {
      const props = {
        id: 'combo-1',
        nome: 'Combo',
        descricao: 'Desc',
        precoBundle: Dinheiro.criar(3000),
        itens: [{ produtoId: 'prod-1', quantidade: 2 }],
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };
      const precosItens = new Map([['prod-1', Dinheiro.criar(2000)]]);

      const aggregate = ComboAggregate.reconstruir(props, precosItens);

      expect(aggregate.calcularDesconto().precoIndividualTotal.valor).toBe(4000);
    });
  });

  describe('getters', () => {
    it('deve expor id, nome, precoBundle e ativo', () => {
      const combo = criarCombo();
      const aggregate = new ComboAggregate(combo);

      expect(aggregate.id).toBe('combo-1');
      expect(aggregate.nome).toBe('Combo Promocional');
      expect(aggregate.precoBundle.valor).toBe(3500);
      expect(aggregate.ativo).toBe(true);
    });
  });
});
