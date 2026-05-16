import { UseCase } from '@/application/shared/types/UseCase';
import {
  IPedidoRepository,
  ICarrinhoRepository,
  PedidoAggregate,
  Pedido,
  PedidoProps,
  PedidoCriadoEvent,
} from '@/domain/pedido';
import { EventDispatcher } from '@/domain/shared';

export interface CriarPedidoInput {
  clienteId?: string;
  mesaId?: string;
}

export interface CriarPedidoOutput {
  pedido: Pedido;
}

export class CriarPedidoUseCase implements UseCase<CriarPedidoInput, CriarPedidoOutput> {
  constructor(
    private pedidoRepo: IPedidoRepository,
    private carrinhoRepo: ICarrinhoRepository,
    private eventDispatcher: EventDispatcher
  ) {}

  async execute(input: CriarPedidoInput): Promise<CriarPedidoOutput> {
    // 1. Obter carrinho do ICarrinhoRepository
    const carrinho = await this.carrinhoRepo.get();
    if (!carrinho) {
      throw new Error('Carrinho não encontrado');
    }

    if (carrinho.isEmpty) {
      throw new Error('Não é possível criar pedido com carrinho vazio');
    }

    // 2. Criar PedidoAggregate a partir do carrinho
    const pedidoId = crypto.randomUUID();
    const taxaServico = 0; // Taxa de serviço pode vir de configuração
    const pedidoEntity = carrinho.toPedido(pedidoId, taxaServico);

    // Construir PedidoProps usando os getters públicos
    const pedidoProps: PedidoProps = {
      id: pedidoEntity.id,
      clienteId: input.clienteId ?? pedidoEntity.clienteId,
      mesaId: input.mesaId ?? pedidoEntity.mesaId,
      restauranteId: pedidoEntity.restauranteId,
      status: pedidoEntity.status,
      itens: [...pedidoEntity.itens],
      subtotal: pedidoEntity.subtotal,
      tax: pedidoEntity.tax,
      total: pedidoEntity.total,
      createdAt: pedidoEntity.createdAt,
      updatedAt: pedidoEntity.updatedAt,
    };

    const pedidoAggregate = PedidoAggregate.reconstruir(pedidoProps);

    // 3. Persistir via IPedidoRepository
    const pedidoCriado = await this.pedidoRepo.create(pedidoAggregate.pedidoEntity);

    // 4. Disparar PedidoCriadoEvent
    const evento = new PedidoCriadoEvent(pedidoCriado);
    this.eventDispatcher.dispatch(evento);

    // 5. Limpar carrinho
    await this.carrinhoRepo.clear();

    // 6. Retornar pedido criado
    return { pedido: pedidoCriado };
  }
}
