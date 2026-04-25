import { UseCase } from '../../shared/types/UseCase';
import { IPagamentoRepository } from '@/domain/pagamento/repositories';
import { IPedidoRepository } from '@/domain/pedido';
import { PagamentoAggregate, MetodoPagamento } from '@/domain/pagamento';
import { Dinheiro } from '@/domain/pedido';
import { EventDispatcher } from '@/domain/shared';
import { IStripeAdapter, StripePaymentIntent } from './adapters/IStripeAdapter';

export interface CriarStripePaymentIntentInput {
  pedidoId: string;
}

export class CriarStripePaymentIntentUseCase implements UseCase<CriarStripePaymentIntentInput, StripePaymentIntent> {
  constructor(
    private stripeAdapter: IStripeAdapter,
    private pagamentoRepo: IPagamentoRepository,
    private pedidoRepo: IPedidoRepository,
    private eventDispatcher: EventDispatcher
  ) {}

  async execute(input: CriarStripePaymentIntentInput): Promise<StripePaymentIntent> {
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

    // Criar PaymentIntent via Stripe
    const valorEmCentavos = pedido.total.valor;
    const paymentIntent = await this.stripeAdapter.criarPaymentIntent(valorEmCentavos, input.pedidoId);

    // Criar ou atualizar pagamento
    if (!pagamentoExistente) {
      const pagamentoAggregate = PagamentoAggregate.criar({
        id: crypto.randomUUID(),
        pedidoId: input.pedidoId,
        metodo: MetodoPagamento.CREDITO,
        valor: Dinheiro.criar(valorEmCentavos),
      });

      // Adicionar transação de charge
      pagamentoAggregate.adicionarTransacaoCharge(paymentIntent.id, {
        clientSecret: paymentIntent.clientSecret,
        status: paymentIntent.status,
      } as Record<string, unknown>);

      // Persistir pagamento
      await this.pagamentoRepo.salvar(pagamentoAggregate.pagamento);
    }

    return paymentIntent;
  }
}
