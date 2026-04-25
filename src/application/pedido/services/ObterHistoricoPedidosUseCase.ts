import { UseCase } from '@/application/shared/types/UseCase';
import { IPedidoRepository, Pedido } from '@/domain/pedido';

export interface ObterHistoricoPedidosInput {
  clienteId: string;
}

export class ObterHistoricoPedidosUseCase implements UseCase<ObterHistoricoPedidosInput, Pedido[]> {
  constructor(private pedidoRepo: IPedidoRepository) {}

  async execute(input: ObterHistoricoPedidosInput): Promise<Pedido[]> {
    // 1. Buscar pedidos por clienteId
    const pedidos = await this.pedidoRepo.findByClienteId(input.clienteId);

    // 2. Ordenar por data de criação (mais recentes primeiro)
    return pedidos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
