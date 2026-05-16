import { ValueObjectClass } from '@/domain/shared';

export interface ConfiguracoesRestauranteProps {
  permitePedidoOnline: boolean;
  permiteReserva: boolean;
  tempoPreparoMinutos: number;
  taxaEntrega: number;
  valorMinimoPedido: number;
  modoOperacao: 'delivery' | 'retirada' | 'ambos' | 'local';
  horariosFuncionamento: HorarioFuncionamento[];
}

export interface HorarioFuncionamento {
  diaSemana: number; // 0 = domingo, 6 = sábado
  horaAbertura: string; // HH:mm
  horaFechamento: string; // HH:mm
  fechado: boolean;
}

export class ConfiguracoesRestaurante extends ValueObjectClass<ConfiguracoesRestauranteProps> {
  get permitePedidoOnline(): boolean {
    return this.props.permitePedidoOnline;
  }

  get permiteReserva(): boolean {
    return this.props.permiteReserva;
  }

  get tempoPreparoMinutos(): number {
    return this.props.tempoPreparoMinutos;
  }

  get taxaEntrega(): number {
    return this.props.taxaEntrega;
  }

  get valorMinimoPedido(): number {
    return this.props.valorMinimoPedido;
  }

  get modoOperacao(): ConfiguracoesRestauranteProps['modoOperacao'] {
    return this.props.modoOperacao;
  }

  get horariosFuncionamento(): HorarioFuncionamento[] {
    return [...this.props.horariosFuncionamento];
  }

  equals(other: ValueObjectClass<ConfiguracoesRestauranteProps>): boolean {
    if (!(other instanceof ConfiguracoesRestaurante)) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  estaAberto(diaSemana: number, hora: string): boolean {
    if (!this.permitePedidoOnline && !this.permiteReserva) {
      return false;
    }

    const horario = this.props.horariosFuncionamento.find((h) => h.diaSemana === diaSemana);
    if (!horario || horario.fechado) {
      return false;
    }

    return hora >= horario.horaAbertura && hora <= horario.horaFechamento;
  }

  static criarPadrao(): ConfiguracoesRestaurante {
    return new ConfiguracoesRestaurante({
      permitePedidoOnline: true,
      permiteReserva: false,
      tempoPreparoMinutos: 30,
      taxaEntrega: 0,
      valorMinimoPedido: 0,
      modoOperacao: 'local',
      horariosFuncionamento: [
        { diaSemana: 0, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
        { diaSemana: 1, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
        { diaSemana: 2, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
        { diaSemana: 3, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
        { diaSemana: 4, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
        { diaSemana: 5, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
        { diaSemana: 6, horaAbertura: '08:00', horaFechamento: '22:00', fechado: false },
      ],
    });
  }
}
