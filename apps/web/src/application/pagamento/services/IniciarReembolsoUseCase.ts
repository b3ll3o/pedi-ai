import { UseCase } from '../../shared/types/UseCase';
import { IPagamentoRepository } from '@/domain/pagamento/repositories';
import { ITransacaoRepository } from '@/domain/pagamento/repositories';
import { PagamentoAggregate, ReembolsoIniciadoEvent } from '@/domain/pagamento';
import { EventDispatcher } from '@/domain/shared';
import { Transacao } from '@/domain/pagamento';

/**
 * Interface para o adapter de reembolso.
 * Será implementada por infrastructure/external em Phase 4.
 */
export interface IRefundAdapter {
  iniciarReembolso(
    transacaoId: string,
    valorEmCentavos: number
  ): Promise<{
    refundId: string;
    status: 'pending' | 'success' | 'failure';
  }>;
}

export interface IniciarReembolsoInput {
  pagamentoId: string;
  valorReembolso?: number; // Se não especificado, reembolsa o valor total
}

export interface Reembolso {
  id: string;
  pagamentoId: string;
  valorReembolsado: number;
  status: 'pending' | 'success' | 'failure';
}

export class IniciarReembolsoUseCase implements UseCase<IniciarReembolsoInput, Reembolso> {
  constructor(
    private pagamentoRepo: IPagamentoRepository,
    private transacaoRepo: ITransacaoRepository,
    private eventDispatcher: EventDispatcher,
    private refundAdapter: IRefundAdapter
  ) {}

  async execute(input: IniciarReembolsoInput): Promise<Reembolso> {
    // Buscar pagamento
    const pagamento = await this.pagamentoRepo.buscarPorId(input.pagamentoId);
    if (!pagamento) {
      throw new Error(`Pagamento ${input.pagamentoId} não encontrado`);
    }

    // Buscar transações para reconstituir aggregate
    const transacoes = await this.transacaoRepo.buscarPorPagamentoId(input.pagamentoId);
    const aggregate = PagamentoAggregate.reconstituir(pagamento, transacoes);

    // Validar elegibilidade para reembolso
    if (!pagamento.status.isConfirmado()) {
      throw new Error('Apenas pagamentos confirmados podem ser reembolsados');
    }

    // Determinar valor do reembolso
    const valorReembolso = input.valorReembolso ?? pagamento.valor.reais;
    const valorReembolsoEmCentavos = Math.round(valorReembolso * 100);

    if (valorReembolsoEmCentavos <= 0) {
      throw new Error('Valor de reembolso deve ser maior que zero');
    }

    if (valorReembolsoEmCentavos > pagamento.valor.valor) {
      throw new Error('Valor de reembolso não pode exceder o valor do pagamento');
    }

    // Obter transação original (charge) para obter o providerId
    const transacaoCharge = transacoes.find((t: Transacao) => t.tipo === 'charge' && t.isSucesso());
    if (!transacaoCharge) {
      throw new Error('Transação de charge não encontrada para este pagamento');
    }

    // Iniciar reembolso via adapter
    const resultadoReembolso = await this.refundAdapter.iniciarReembolso(
      transacaoCharge.providerId,
      valorReembolsoEmCentavos
    );

    // Adicionar transação de reembolso ao aggregate
    aggregate.adicionarTransacaoReembolso(resultadoReembolso.refundId, {
      valorReembolso: valorReembolsoEmCentavos,
      status: resultadoReembolso.status,
    } as Record<string, unknown>);

    // Se o refund foi bem-sucedido imediatamente, processar
    if (resultadoReembolso.status === 'success') {
      aggregate.iniciarReembolso(valorReembolso);
    }

    // Atualizar status do pagamento para reembolsado (se reembolso completo)
    if (valorReembolsoEmCentavos === pagamento.valor.valor) {
      aggregate.iniciarReembolso(valorReembolso);
    }

    // Persistir alterações
    await this.pagamentoRepo.salvar(aggregate.pagamento);

    // Disparar evento de reembolso iniciado
    const evento = new ReembolsoIniciadoEvent(aggregate.pagamento, valorReembolso);
    this.eventDispatcher.dispatch(evento);

    return {
      id: resultadoReembolso.refundId,
      pagamentoId: input.pagamentoId,
      valorReembolsado: valorReembolso,
      status: resultadoReembolso.status,
    };
  }
}
