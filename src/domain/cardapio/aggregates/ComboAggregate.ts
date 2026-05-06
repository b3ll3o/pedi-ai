import { Combo, ComboProps } from '../entities/Combo';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { ItemCardapio } from '../entities/ItemCardapio';

export interface CalculoDescontoCombo {
  precoIndividualTotal: Dinheiro;
  precoBundle: Dinheiro;
  valorDesconto: Dinheiro;
  percentualDesconto: number;
}

export class ComboAggregate {
  private combo: Combo;
  private precosItens: Map<string, Dinheiro>;

  constructor(combo: Combo, precosItens?: Map<string, Dinheiro>) {
    this.combo = combo;
    this.precosItens = precosItens ?? new Map();
  }

  get id(): string {
    return this.combo.id;
  }

  get comboEntity(): Combo {
    return this.combo;
  }

  get nome(): string {
    return this.combo.nome;
  }

  get precoBundle(): Dinheiro {
    return this.combo.precoBundle;
  }

  get ativo(): boolean {
    return this.combo.ativo;
  }

  private calcularPrecoIndividualTotal(): Dinheiro {
    let total = Dinheiro.ZERO;

    for (const item of this.combo.itens) {
      const preco = this.precosItens.get(item.produtoId);
      if (preco) {
        total = total.somar(preco.multiplicar(item.quantidade));
      }
    }

    return total;
  }

  calcularDesconto(): CalculoDescontoCombo {
    const precoIndividualTotal = this.calcularPrecoIndividualTotal();
    const precoBundle = this.combo.precoBundle;
    const valorDesconto = precoIndividualTotal.subtrair(precoBundle);
    const percentualDesconto = precoIndividualTotal.valor > 0
      ? Math.round((valorDesconto.valor / precoIndividualTotal.valor) * 100)
      : 0;

    return {
      precoIndividualTotal,
      precoBundle,
      valorDesconto,
      percentualDesconto,
    };
  }

  temDescontoMinimo(percentualMinimo: number): boolean {
    const { percentualDesconto } = this.calcularDesconto();
    return percentualDesconto >= percentualMinimo;
  }

  validarItens(): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    if (this.combo.itens.length === 0) {
      erros.push('Combo deve ter pelo menos um item');
    }

    for (const item of this.combo.itens) {
      if (item.quantidade <= 0) {
        erros.push(`Quantidade inválida para produto ${item.produtoId}`);
      }
      if (!this.precosItens.has(item.produtoId)) {
        erros.push(`Preço não encontrado para produto ${item.produtoId}`);
      }
    }

    return {
      valido: erros.length === 0,
      erros,
    };
  }

  definirPrecoItens(itens: ItemCardapio[]): void {
    for (const item of itens) {
      if (this.combo.contemProduto(item.id)) {
        this.precosItens.set(item.id, item.preco);
      }
    }
  }

  static criar(props: Omit<ComboProps, 'id'>): ComboAggregate {
    const combo = Combo.criar(props);
    return new ComboAggregate(combo);
  }

  static reconstruir(props: ComboProps, precosItens?: Map<string, Dinheiro>): ComboAggregate {
    const combo = Combo.reconstruir(props);
    return new ComboAggregate(combo, precosItens);
  }
}
