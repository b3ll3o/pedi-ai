import { Restaurante, RestauranteProps } from '../entities/Restaurante';
import { ConfiguracoesRestaurante } from '../value-objects/ConfiguracoesRestaurante';

export interface RestauranteAggregateProps {
  restaurante: RestauranteProps;
  configuracoes: ConfiguracoesRestaurante;
}

export class RestauranteAggregate {
  private restaurante: Restaurante;
  private configuracoes: ConfiguracoesRestaurante;

  constructor(restaurante: Restaurante, configuracoes: ConfiguracoesRestaurante) {
    this.restaurante = restaurante;
    this.configuracoes = configuracoes;
    this.validarInvariantes();
  }

  private validarInvariantes(): void {
    if (!this.restaurante.nome || this.restaurante.nome.trim().length === 0) {
      throw new Error('Nome do restaurante é obrigatório');
    }

    if (!this.validarCNPJ(this.restaurante.cnpj)) {
      throw new Error('CNPJ inválido');
    }

    if (this.configuracoes.tempoPreparoMinutos < 0) {
      throw new Error('Tempo de preparo não pode ser negativo');
    }

    if (this.configuracoes.taxaEntrega < 0) {
      throw new Error('Taxa de entrega não pode ser negativa');
    }

    if (this.configuracoes.valorMinimoPedido < 0) {
      throw new Error('Valor mínimo do pedido não pode ser negativo');
    }
  }

  private validarCNPJ(cnpj: string): boolean {
    const cnpjNumerico = cnpj.replace(/[^\d]/g, '');
    if (cnpjNumerico.length !== 14) return false;

    // Validação básica de dígitos verificadores
    let soma = 0;
    let peso = 2;
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(cnpjNumerico[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);

    soma = 0;
    peso = 2;
    for (let i = 12; i >= 0; i--) {
      soma += parseInt(cnpjNumerico[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);

    return (
      parseInt(cnpjNumerico[12]) === digito1 &&
      parseInt(cnpjNumerico[13]) === digito2
    );
  }

  get id(): string {
    return this.restaurante.id;
  }

  get restauranteEntity(): Restaurante {
    return this.restaurante;
  }

  get configuracoesValueObject(): ConfiguracoesRestaurante {
    return this.configuracoes;
  }

  get nome(): string {
    return this.restaurante.nome;
  }

  get cnpj(): string {
    return this.restaurante.cnpj;
  }

  atualizarConfiguracoes(novasConfiguracoes: ConfiguracoesRestaurante): void {
    this.configuracoes = novasConfiguracoes;
    this.validarInvariantes();
  }

  static criar(props: Omit<RestauranteProps, 'id' | 'criadoEm' | 'atualizadoEm'>): RestauranteAggregate {
    const restaurante = Restaurante.criar(props);
    const configuracoes = ConfiguracoesRestaurante.criarPadrao();
    return new RestauranteAggregate(restaurante, configuracoes);
  }

  static reconstruir(props: RestauranteAggregateProps): RestauranteAggregate {
    const restaurante = Restaurante.reconstruir(props.restaurante);
    return new RestauranteAggregate(restaurante, props.configuracoes);
  }
}
