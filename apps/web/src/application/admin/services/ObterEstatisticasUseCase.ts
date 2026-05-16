import { UseCase } from '@/application/shared';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';

/**
 * Período para filtrar estatísticas
 */
export type Periodo = 'dia' | 'semana' | 'mes' | 'ano';

/**
 * Input para obter estatísticas
 */
export interface EstatisticasInput {
  restauranteId: string;
  periodo: Periodo;
  dataInicio?: Date;
  dataFim?: Date;
}

/**
 * Estatísticas agregadas do restaurante
 */
export interface Estatisticas {
  restauranteId: string;
  periodo: Periodo;
  dataInicio: Date;
  dataFim: Date;
  totalPedidos: number;
  pedidosPorStatus: Record<string, number>;
  totalFaturamento: Dinheiro;
  ticketMedio: Dinheiro;
  totalPagos: number;
  totalCancelados: number;
  totalReembolsados: number;
}

/**
 * Use Case para agregar estatísticas de pedidos e pagamentos
 */
export class ObterEstatisticasUseCase implements UseCase<EstatisticasInput, Estatisticas> {
  constructor(
    private pedidoRepo: {
      findByRestauranteId(restauranteId: string): Promise<
        {
          id: string;
          status: StatusPedido;
          total: Dinheiro;
          createdAt: Date;
        }[]
      >;
    },
    private pagamentoRepo: {
      listarPorRestauranteId(restauranteId: string): Promise<
        {
          id: string;
          status: StatusPagamento;
          valor: Dinheiro;
        }[]
      >;
    }
  ) {}

  async execute(input: EstatisticasInput): Promise<Estatisticas> {
    // Calcular período
    const { dataInicio, dataFim } = this.calcularPeriodo(
      input.periodo,
      input.dataInicio,
      input.dataFim
    );

    // Buscar pedidos do período
    const todosPedidos = await this.pedidoRepo.findByRestauranteId(input.restauranteId);
    const pedidosPeriodo = todosPedidos.filter(
      (p) => p.createdAt >= dataInicio && p.createdAt <= dataFim
    );

    // Buscar pagamentos do período
    const pagamentos = await this.pagamentoRepo.listarPorRestauranteId(input.restauranteId);

    // Agregar estatísticas de pedidos
    const pedidosPorStatus: Record<string, number> = {};
    let totalFaturamento = Dinheiro.ZERO;
    let totalPagos = 0;
    let totalCancelados = 0;

    for (const pedido of pedidosPeriodo) {
      // Contar por status
      const statusKey = pedido.status.toString();
      pedidosPorStatus[statusKey] = (pedidosPorStatus[statusKey] || 0) + 1;

      // Contar pagos e cancelados
      if (pedido.status.equals(StatusPedido.PAID) || pedido.status.equals(StatusPedido.DELIVERED)) {
        totalFaturamento = totalFaturamento.somar(pedido.total);
        totalPagos++;
      } else if (
        pedido.status.equals(StatusPedido.CANCELLED) ||
        pedido.status.equals(StatusPedido.REFUNDED)
      ) {
        totalCancelados++;
      }
    }

    // Calcular pagamentos reembolsados
    let totalReembolsados = 0;
    for (const pagamento of pagamentos) {
      if (pagamento.status.isReembolsado()) {
        totalReembolsados++;
      }
    }

    // Calcular ticket médio
    const ticketMedio =
      totalPagos > 0 ? totalFaturamento.multiplicar(1 / totalPagos) : Dinheiro.ZERO;

    return {
      restauranteId: input.restauranteId,
      periodo: input.periodo,
      dataInicio,
      dataFim,
      totalPedidos: pedidosPeriodo.length,
      pedidosPorStatus,
      totalFaturamento,
      ticketMedio,
      totalPagos,
      totalCancelados,
      totalReembolsados,
    };
  }

  private calcularPeriodo(
    periodo: Periodo,
    dataInicio?: Date,
    dataFim?: Date
  ): { dataInicio: Date; dataFim: Date } {
    const now = new Date();
    const fim = dataFim ?? new Date(now);

    let inicio: Date;
    switch (periodo) {
      case 'dia':
        inicio = dataInicio ?? new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'semana':
        inicio = dataInicio ?? new Date(now.setDate(now.getDate() - 7));
        break;
      case 'mes':
        inicio = dataInicio ?? new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'ano':
        inicio = dataInicio ?? new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        inicio = dataInicio ?? new Date(now.setMonth(now.getMonth() - 1));
    }

    return { dataInicio: inicio, dataFim: fim };
  }
}
