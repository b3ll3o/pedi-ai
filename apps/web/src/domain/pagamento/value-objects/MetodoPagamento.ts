import { ValueObjectClass } from '@/domain/shared';

export type MetodoPagamentoValue = 'pix';

export class MetodoPagamento extends ValueObjectClass<MetodoPagamentoValue> {
  static readonly PIX = new MetodoPagamento('pix');

  private constructor(value: MetodoPagamentoValue) {
    super(value);
  }

  static fromValue(value: string): MetodoPagamento {
    const metodo = ALL_METODOS.find((m) => m.props === value);
    if (!metodo) {
      throw new Error(`MetodoPagamento inválido: ${value}`);
    }
    return metodo;
  }

  equals(other: ValueObjectClass<MetodoPagamentoValue>): boolean {
    if (!(other instanceof MetodoPagamento)) return false;
    return this.props === other.props;
  }

  toString(): string {
    return this.props;
  }
}

const ALL_METODOS: MetodoPagamento[] = [MetodoPagamento.PIX];
