import { ValueObjectClass } from '@/domain/shared';

export type PapelValue = 'dono' | 'gerente' | 'atendente' | 'cliente';

export class Papel extends ValueObjectClass<PapelValue> {
  static readonly DONO = new Papel('dono');
  static readonly GERENTE = new Papel('gerente');
  static readonly ATENDENTE = new Papel('atendente');
  static readonly CLIENTE = new Papel('cliente');

  private constructor(value: PapelValue) {
    super(value);
  }

  get value(): PapelValue {
    return this.props;
  }

  static fromValue(value: string): Papel {
    const papel = ALL_PAPEIS.find(p => p.props === value);
    if (!papel) {
      throw new Error(`Papel inválido: ${value}`);
    }
    return papel;
  }

  static isDono(papel: Papel): boolean {
    return papel.props === 'dono';
  }

  static isGerente(papel: Papel): boolean {
    return papel.props === 'gerente';
  }

  static isAtendente(papel: Papel): boolean {
    return papel.props === 'atendente';
  }

  static isCliente(papel: Papel): boolean {
    return papel.props === 'cliente';
  }

  equals(other: ValueObjectClass<PapelValue>): boolean {
    if (!(other instanceof Papel)) return false;
    return this.props === other.props;
  }

  toString(): string {
    return this.props;
  }
}

const ALL_PAPEIS: Papel[] = [
  Papel.DONO,
  Papel.GERENTE,
  Papel.ATENDENTE,
  Papel.CLIENTE,
];
