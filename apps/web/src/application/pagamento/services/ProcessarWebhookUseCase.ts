import { UseCase } from '../../shared/types/UseCase';
import { IPagamentoRepository } from '@/domain/pagamento/repositories';
import { ITransacaoRepository } from '@/domain/pagamento/repositories';
import { PagamentoAggregate } from '@/domain/pagamento';
import { EventDispatcher } from '@/domain/shared';

export interface WebhookInput {
  provider: 'pix';
  payload: Record<string, unknown>;
  signature: string;
}

export interface WebhookOutput {
  sucesso: boolean;
  mensagem: string;
  eventoId?: string;
}

export interface IWebhookSignatureValidator {
  validar(provider: 'pix', payload: string, signature: string): boolean;
}

export class ProcessarWebhookUseCase implements UseCase<WebhookInput, WebhookOutput> {
  constructor(
    private pagamentoRepo: IPagamentoRepository,
    private transacaoRepo: ITransacaoRepository,
    private eventDispatcher: EventDispatcher,
    private signatureValidator: IWebhookSignatureValidator
  ) {}

  async execute(input: WebhookInput): Promise<WebhookOutput> {
    if (input.provider !== 'pix') {
      return {
        sucesso: false,
        mensagem: `Provider ${input.provider} não suportado`,
      };
    }

    const payloadString = JSON.stringify(input.payload);
    const assinaturaValida = this.signatureValidator.validar(
      input.provider,
      payloadString,
      input.signature
    );

    if (!assinaturaValida) {
      return {
        sucesso: false,
        mensagem: 'Assinatura de webhook inválida',
      };
    }

    return this.processarWebhookPix(input.payload);
  }

  private async processarWebhookPix(payload: Record<string, unknown>): Promise<WebhookOutput> {
    const eventoId = payload.id as string;
    const tipoEvento = payload.evento as string;
    const pixData = payload.pix as { transacaoId?: string } | undefined;
    const transacaoId = pixData?.transacaoId;

    if (!eventoId || !tipoEvento) {
      return {
        sucesso: false,
        mensagem: 'Payload de webhook Pix inválido',
      };
    }

    const transacaoExistente = await this.transacaoRepo.buscarPorProviderId(eventoId);
    if (transacaoExistente) {
      return {
        sucesso: true,
        mensagem: 'Evento já processado anteriormente',
        eventoId,
      };
    }

    if (tipoEvento === 'PAGAMENTO') {
      const pagamento = await this.pagamentoRepo.buscarPorTransacaoId(transacaoId || '');
      if (!pagamento) {
        return {
          sucesso: false,
          mensagem: `Pagamento não encontrado para transação ${transacaoId}`,
        };
      }

      const transacoes = await this.transacaoRepo.buscarPorPagamentoId(pagamento.id);
      const aggregate = PagamentoAggregate.reconstituir(pagamento, transacoes);

      aggregate.adicionarTransacaoWebhook(eventoId, payload);

      const transacaoCharge = aggregate.transacoes.find((t) => t.providerId === transacaoId);
      if (transacaoCharge) {
        aggregate.processarSucessoTransacao(transacaoCharge.id);
      }

      await this.pagamentoRepo.salvar(aggregate.pagamento);

      const eventos = aggregate.getEventos();
      eventos.forEach((evento) => this.eventDispatcher.dispatch(evento));

      return {
        sucesso: true,
        mensagem: 'Pagamento Pix confirmado com sucesso',
        eventoId,
      };
    }

    return {
      sucesso: true,
      mensagem: `Evento ${tipoEvento} processado`,
      eventoId,
    };
  }
}
