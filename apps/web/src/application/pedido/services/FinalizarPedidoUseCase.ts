import { UseCase } from '@/application/shared/types/UseCase';
import {
  IPedidoRepository,
  Pedido,
  StatusPedido,
  PedidoStatusAlteradoEvent,
} from '@/domain/pedido';
import { EventDispatcher } from '@/domain/shared';

export interface FinalizarPedidoInput {
  pedidoId: string;
}

export class FinalizarPedidoUseCase implements UseCase<FinalizarPedidoInput, Pedido> {
  constructor(
    private pedidoRepo: IPedidoRepository,
    private eventDispatcher: EventDispatcher
  ) {}

  async execute(input: FinalizarPedidoInput): Promise<Pedido> {
    // 1. Buscar pedido existente
    const pedido = await this.pedidoRepo.findById(input.pedidoId);
    if (!pedido) {
      throw new Error(`Pedido ${input.pedidoId} não encontrado`);
    }

    // 2. Validar que o pedido está pronto para finalização
    // Apenas pedidos com status 'ready' podem ser finalizados (entregues)
    if (!pedido.status.equals(StatusPedido.READY)) {
      throw new Error(
        `Pedido deve estar com status 'ready' para ser finalizado, mas está '${pedido.status.toString()}'`
      );
    }

    // 3. Alterar status para delivered
    const statusAnterior = pedido.status;
    pedido.alterarStatus(StatusPedido.DELIVERED);

    // 4. Persistir via repo
    const pedidoFinalizado = await this.pedidoRepo.update(pedido);

    // 5. Disparar evento
    const evento = new PedidoStatusAlteradoEvent(
      pedidoFinalizado,
      statusAnterior,
      StatusPedido.DELIVERED
    );
    this.eventDispatcher.dispatch(evento);

    // 6. Retornar pedido finalizado
    return pedidoFinalizado;
  }
}
