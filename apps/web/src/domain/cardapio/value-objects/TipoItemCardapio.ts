import { ValueObjectClass } from '@/domain/shared';

export type TipoItemCardapioValue = 'produto' | 'combo';

export class TipoItemCardapio extends ValueObjectClass<TipoItemCardapioValue> {
  static readonly PRODUTO = new TipoItemCardapio('produto');
  static readonly COMBO = new TipoItemCardapio('combo');

  private constructor(value: TipoItemCardapioValue) {
    super(value);
  }

  static fromValue(value: string): TipoItemCardapio {
    if (value === 'produto') return TipoItemCardapio.PRODUTO;
    if (value === 'combo') return TipoItemCardapio.COMBO;
    throw new Error(`TipoItemCardapio inválido: ${value}`);
  }

  equals(other: ValueObjectClass<TipoItemCardapioValue>): boolean {
    if (!(other instanceof TipoItemCardapio)) return false;
    return this.props === other.props;
  }

  isProduto(): boolean {
    return this.props === 'produto';
  }

  isCombo(): boolean {
    return this.props === 'combo';
  }

  toString(): string {
    return this.props;
  }
}
