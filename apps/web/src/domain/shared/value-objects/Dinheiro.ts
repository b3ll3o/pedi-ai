import { ValueObjectClass } from '@/domain/shared';

export interface DinheiroValue {
  valor: number; // em centavos
  moeda: string;
}

export class Dinheiro extends ValueObjectClass<DinheiroValue> {
  static readonly ZERO = new Dinheiro({ valor: 0, moeda: 'BRL' });
  static readonly BRL = 'BRL';

  private constructor(props: DinheiroValue) {
    super(props);
  }

  get reais(): number {
    return this.props.valor / 100;
  }

  get valor(): number {
    return this.props.valor;
  }

  get moeda(): string {
    return this.props.moeda;
  }

  somar(outro: Dinheiro): Dinheiro {
    if (this.props.moeda !== outro.props.moeda) {
      throw new Error('Não é possível somar moedas diferentes');
    }
    return new Dinheiro({
      valor: this.props.valor + outro.props.valor,
      moeda: this.props.moeda,
    });
  }

  subtrair(outro: Dinheiro): Dinheiro {
    if (this.props.moeda !== outro.props.moeda) {
      throw new Error('Não é possível subtrair moedas diferentes');
    }
    return new Dinheiro({
      valor: this.props.valor - outro.props.valor,
      moeda: this.props.moeda,
    });
  }

  multiplicar(fator: number): Dinheiro {
    return new Dinheiro({
      valor: Math.round(this.props.valor * fator),
      moeda: this.props.moeda,
    });
  }

  equals(other: ValueObjectClass<DinheiroValue>): boolean {
    if (!(other instanceof Dinheiro)) return false;
    return this.props.valor === other.props.valor && this.props.moeda === other.props.moeda;
  }

  static criar(valorEmCentavos: number, moeda: string = 'BRL'): Dinheiro {
    return new Dinheiro({ valor: valorEmCentavos, moeda });
  }

  static criarDeReais(valorEmReais: number, moeda: string = 'BRL'): Dinheiro {
    return new Dinheiro({ valor: Math.round(valorEmReais * 100), moeda });
  }
}
