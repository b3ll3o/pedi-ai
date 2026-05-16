import { UseCase } from '@/application/shared';
import { Pedido } from '@/domain/pedido/entities/Pedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';

/**
 * Filtros para buscar pedidos
 */
export interface FiltrosPedido {
  restauranteId: string;
  status?: string;
  clienteId?: string;
  mesaId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  limite?: number;
  offset?: number;
}

/**
 * Input para gerenciar pedidos admin
 */
export interface GerenciarPedidosAdminInput {
  filtros: FiltrosPedido;
}

/**
 * Output com lista de pedidos
 */
export interface GerenciarPedidosAdminOutput {
  pedidos: Pedido[];
  total: number;
  filtros: FiltrosPedido;
}

/**
 * Use Case para gerenciar pedidos (visualizar, alterar status)
 */
export class GerenciarPedidosAdminUseCase implements UseCase<
  GerenciarPedidosAdminInput,
  GerenciarPedidosAdminOutput
> {
  constructor(
    private pedidoRepo: {
      findByRestauranteId(restauranteId: string): Promise<Pedido[]>;
      findById(id: string): Promise<Pedido | null>;
      update(pedido: Pedido): Promise<Pedido>;
    }
  ) {}

  async execute(input: GerenciarPedidosAdminInput): Promise<GerenciarPedidosAdminOutput> {
    const { filtros } = input;

    // Buscar todos os pedidos do restaurante
    let pedidos = await this.pedidoRepo.findByRestauranteId(filtros.restauranteId);

    // Aplicar filtros
    if (filtros.status) {
      const status = StatusPedido.fromValue(filtros.status);
      pedidos = pedidos.filter((p) => p.status.equals(status));
    }

    if (filtros.clienteId) {
      pedidos = pedidos.filter((p) => p.clienteId === filtros.clienteId);
    }

    if (filtros.mesaId) {
      pedidos = pedidos.filter((p) => p.mesaId === filtros.mesaId);
    }

    if (filtros.dataInicio) {
      pedidos = pedidos.filter((p) => p.createdAt >= filtros.dataInicio!);
    }

    if (filtros.dataFim) {
      pedidos = pedidos.filter((p) => p.createdAt <= filtros.dataFim!);
    }

    const total = pedidos.length;

    // Aplicar paginação
    const offset = filtros.offset ?? 0;
    const limite = filtros.limite ?? 50;
    pedidos = pedidos.slice(offset, offset + limite);

    return {
      pedidos,
      total,
      filtros,
    };
  }

  /**
   * Alterar status de um pedido (método auxiliar)
   */
  async alterarStatus(pedidoId: string, novoStatus: StatusPedido): Promise<Pedido> {
    const pedido = await this.pedidoRepo.findById(pedidoId);
    if (!pedido) {
      throw new Error('Pedido não encontrado');
    }

    pedido.alterarStatus(novoStatus);
    return this.pedidoRepo.update(pedido);
  }
}
