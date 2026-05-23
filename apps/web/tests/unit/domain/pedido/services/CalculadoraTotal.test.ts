import { describe, it, expect } from 'vitest';
import { CalculadoraTotal } from '@/domain/pedido/services/CalculadoraTotal';
import { ItemPedido } from '@/domain/pedido/entities/ItemPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

describe('CalculadoraTotal', () => {
  const criarItemPedido = (
    id: string,
    produtoId: string,
    nome: string,
    precoUnitario: number,
    quantidade: number
  ): ItemPedido => {
    return ItemPedido.criar({
      id,
      produtoId,
      nome,
      precoUnitario: Dinheiro.criar(precoUnitario),
      quantidade,
      modificadoresSelecionados: [],
    });
  };

  describe('calcular', () => {
    it('deve retornar zeros para lista vazia', () => {
      const calculadora = new CalculadoraTotal();
      const resultado = calculadora.calcular([]);

      expect(resultado.subtotal.valor).toBe(0);
      expect(resultado.tax.valor).toBe(0);
      expect(resultado.total.valor).toBe(0);
    });

    it('deve calcular subtotal para um item', () => {
      const calculadora = new CalculadoraTotal();
      const itens = [criarItemPedido('1', 'prod-1', 'Pizza', 3500, 1)];

      const resultado = calculadora.calcular(itens);

      expect(resultado.subtotal.valor).toBe(3500);
    });

    it('deve calcular subtotal para múltiplos itens', () => {
      const calculadora = new CalculadoraTotal();
      const itens = [
        criarItemPedido('1', 'prod-1', 'Pizza', 3500, 2),
        criarItemPedido('2', 'prod-2', 'Refrigerante', 800, 3),
      ];

      const resultado = calculadora.calcular(itens);

      // Pizza: 35.00 * 2 = 70.00 (7000 centavos)
      // Refrigerante: 8.00 * 3 = 24.00 (2400 centavos)
      // Subtotal: 94.00 (9400 centavos)
      expect(resultado.subtotal.valor).toBe(9400);
    });

    it('deve calcular taxa de serviço', () => {
      const calculadora = new CalculadoraTotal();
      const itens = [criarItemPedido('1', 'prod-1', 'Pizza', 10000, 1)];

      const resultado = calculadora.calcular(itens, 0.1);

      expect(resultado.subtotal.valor).toBe(10000);
      expect(resultado.tax.valor).toBe(1000); // 10%
    });

    it('deve calcular total com taxa', () => {
      const calculadora = new CalculadoraTotal();
      const itens = [criarItemPedido('1', 'prod-1', 'Pizza', 10000, 1)];

      const resultado = calculadora.calcular(itens, 0.1);

      expect(resultado.total.valor).toBe(11000);
    });

    it('deve usar taxa zero por padrão', () => {
      const calculadora = new CalculadoraTotal();
      const itens = [criarItemPedido('1', 'prod-1', 'Pizza', 10000, 1)];

      const resultado = calculadora.calcular(itens);

      expect(resultado.tax.valor).toBe(0);
      expect(resultado.total.valor).toBe(10000);
    });

    it('deve arredondar taxa para cima', () => {
      const calculadora = new CalculadoraTotal();
      const itens = [criarItemPedido('1', 'prod-1', 'Pizza', 3333, 1)];

      const resultado = calculadora.calcular(itens, 0.1);

      // 3333 * 0.1 = 333.3 -> arredonda para 333
      expect(resultado.tax.valor).toBe(333);
    });
  });

  describe('calcularSubtotal', () => {
    it('deve retornar ZERO para lista vazia', () => {
      const calculadora = new CalculadoraTotal();
      const subtotal = calculadora.calcularSubtotal([]);

      expect(subtotal.valor).toBe(0);
    });

    it('deve calcular subtotal corretamente', () => {
      const calculadora = new CalculadoraTotal();
      const itens = [
        criarItemPedido('1', 'prod-1', 'Pizza', 3500, 2),
        criarItemPedido('2', 'prod-2', 'Refrigerante', 800, 1),
      ];

      const subtotal = calculadora.calcularSubtotal(itens);

      expect(subtotal.valor).toBe(7800);
    });
  });

  describe('calcularTaxa', () => {
    it('deve calcular taxa corretamente', () => {
      const calculadora = new CalculadoraTotal();
      const subtotal = Dinheiro.criar(10000);

      const taxa = calculadora.calcularTaxa(subtotal, 0.1);

      expect(taxa.valor).toBe(1000);
    });

    it('deve arredondar taxa para cima', () => {
      const calculadora = new CalculadoraTotal();
      const subtotal = Dinheiro.criar(3333);

      const taxa = calculadora.calcularTaxa(subtotal, 0.1);

      expect(taxa.valor).toBe(333);
    });

    it('deve retornar ZERO para taxa zero', () => {
      const calculadora = new CalculadoraTotal();
      const subtotal = Dinheiro.criar(10000);

      const taxa = calculadora.calcularTaxa(subtotal, 0);

      expect(taxa.valor).toBe(0);
    });
  });
});
