import { ItemPedido } from '../entities/ItemPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

export interface ResultadoCalculo {
  subtotal: Dinheiro;
  tax: Dinheiro;
  total: Dinheiro;
}

export class CalculadoraTotal {
  /**
   * Calcula o subtotal, taxa de serviço e total para uma lista de itens
   * @param itens Lista de itens do pedido
   * @param taxaServico Percentual de taxa de serviço (ex: 0.1 para 10%)
   * @returns Objeto com subtotal, tax e total
   */
  calcular(itens: ItemPedido[], taxaServico: number = 0): ResultadoCalculo {
    if (itens.length === 0) {
      return {
        subtotal: Dinheiro.ZERO,
        tax: Dinheiro.ZERO,
        total: Dinheiro.ZERO,
      };
    }

    // Calcular subtotal
    const subtotal = itens.reduce((acc, item) => acc.somar(item.subtotal), Dinheiro.ZERO);

    // Calcular taxa de serviço
    const tax = Dinheiro.criar(Math.round(subtotal.valor * taxaServico), subtotal.moeda);

    // Calcular total
    const total = subtotal.somar(tax);

    return { subtotal, tax, total };
  }

  /**
   * Calcula apenas o subtotal
   */
  calcularSubtotal(itens: ItemPedido[]): Dinheiro {
    return itens.reduce((acc, item) => acc.somar(item.subtotal), Dinheiro.ZERO);
  }

  /**
   * Calcula a taxa de serviço dado um subtotal
   */
  calcularTaxa(subtotal: Dinheiro, taxaServico: number): Dinheiro {
    return Dinheiro.criar(Math.round(subtotal.valor * taxaServico), subtotal.moeda);
  }
}
