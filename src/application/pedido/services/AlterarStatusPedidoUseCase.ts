import { UseCase } from '@/application/shared/types/UseCase';
import {
  IPedidoRepository,
  Pedido,
  StatusPedido,
  PedidoStatusAlteradoEvent,
} from '@/domain/pedido';
import { EventDispatcher } from '@/domain/shared';
import { StatusPedidoValue } from '@/domain/pedido';

export interface AlterarStatusPedidoInput {
  pedidoId: string;
  novoStatus: StatusPedidoValue;
}

export interface AlterarStatusPedidoOutput {
  pedido: Pedido;
}

// Transições válidas de status
const TRANSIÇÕES_VÁLIDAS: Record<StatusPedidoValue, StatusPedidoValue[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['received', 'cancelled', 'refunded'],
  received: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  rejected: [],
  cancelled: [],
  refunded: [],
};

export class AlterarStatusPedidoUseCase implements UseCase<AlterarStatusPedidoInput, AlterarStatusPedidoOutput> {
  constructor(
    private pedidoRepo: IPedidoRepository,
    private eventDispatcher: EventDispatcher
  ) {}

  async execute(input: AlterarStatusPedidoInput): Promise<AlterarStatusPedidoOutput> {
    // 1. Buscar pedido existente
    const pedido = await this.pedidoRepo.findById(input.pedidoId);
    if (!pedido) {
      throw new Error(`Pedido ${input.pedidoId} não encontrado`);
    }

    // 2. Validar transição de status
    const statusAtual = pedido.status;
    const novoStatus = StatusPedido.fromValue(input.novoStatus);

    const transicoesPermitidas = TRANSIÇÕES_VÁLIDAS[statusAtual.toString() as StatusPedidoValue];
    if (!transicoesPermitidas.includes(novoStatus.toString() as StatusPedidoValue)) {
      throw new Error(
        `Transição de status ${statusAtual.toString()} para ${novoStatus.toString()} não é permitida`
      );
    }

    // 3. Atualizar status
    const statusAnterior = pedido.status;
    pedido.alterarStatus(novoStatus);

    // 4. Persistir via repo
    const pedidoAtualizado = await this.pedidoRepo.update(pedido);

    // 5. Disparar evento
    const evento = new PedidoStatusAlteradoEvent(pedidoAtualizado, statusAnterior, novoStatus);
    this.eventDispatcher.dispatch(evento);

    // 6. Retornar pedido atualizado
    return { pedido: pedidoAtualizado };
  }
}
