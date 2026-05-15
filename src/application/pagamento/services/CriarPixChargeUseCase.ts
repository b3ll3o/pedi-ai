import { UseCase } from '../../shared/types/UseCase';
import { IPagamentoRepository } from '@/domain/pagamento/repositories';
import { IPedidoRepository } from '@/domain/pedido';
import { PagamentoAggregate, MetodoPagamento } from '@/domain/pagamento';
import { Dinheiro } from '@/domain/shared';
import { EventDispatcher } from '@/domain/shared';
import { IPixAdapter, PixCharge } from './adapters/IPixAdapter';

export interface CriarPixChargeInput {
  pedidoId: string;
}

export class CriarPixChargeUseCase implements UseCase<CriarPixChargeInput, PixCharge> {
  constructor(
    private pixAdapter: IPixAdapter,
    private pagamentoRepo: IPagamentoRepository,
    private pedidoRepo: IPedidoRepository,
    private eventDispatcher: EventDispatcher
  ) {}

  async execute(input: CriarPixChargeInput): Promise<PixCharge> {
    // Buscar pedido
    const pedido = await this.pedidoRepo.findById(input.pedidoId);
    if (!pedido) {
      throw new Error(`Pedido ${input.pedidoId} não encontrado`);
    }

    // Verificar se já existe pagamento pendente para este pedido
    const pagamentoExistente = await this.pagamentoRepo.buscarPorPedidoId(input.pedidoId);
    if (pagamentoExistente && !pagamentoExistente.status.isPendente()) {
      throw new Error(`Já existe um pagamento confirmado ou cancelado para este pedido`);
    }

    // Se já existe pagamento pendente, criar nova cobrança (o手机上展示QR需要charge)
    const valorEmCentavos = pedido.total.valor;
    const pixCharge = await this.pixAdapter.criarCobranca(valorEmCentavos, input.pedidoId);

    if (!pagamentoExistente) {
      const pagamentoAggregate = PagamentoAggregate.criar({
        id: crypto.randomUUID(),
        pedidoId: input.pedidoId,
        metodo: MetodoPagamento.PIX,
        valor: Dinheiro.criar(valorEmCentavos),
      });

      pagamentoAggregate.adicionarTransacaoCharge(pixCharge.id, {
        qrCode: pixCharge.codigoPix,
        imagemQrCode: pixCharge.imagemQrCode,
        expiracao: pixCharge.expiracao.toISOString(),
      } as Record<string, unknown>);

      await this.pagamentoRepo.salvar(pagamentoAggregate.pagamento);
    }

    return pixCharge;
  }
}
