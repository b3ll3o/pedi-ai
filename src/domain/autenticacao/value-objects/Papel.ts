import { ValueObjectClass } from '@/domain/shared';

export type PapelValue = 'owner' | 'manager' | 'staff' | 'cliente';

export class Papel extends ValueObjectClass<PapelValue> {
  static readonly OWNER = new Papel('owner');
  static readonly MANAGER = new Papel('manager');
  static readonly STAFF = new Papel('staff');
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

  static isOwner(papel: Papel): boolean {
    return papel.props === 'owner';
  }

  static isManager(papel: Papel): boolean {
    return papel.props === 'manager';
  }

  static isStaff(papel: Papel): boolean {
    return papel.props === 'staff';
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
  Papel.OWNER,
  Papel.MANAGER,
  Papel.STAFF,
  Papel.CLIENTE,
];
