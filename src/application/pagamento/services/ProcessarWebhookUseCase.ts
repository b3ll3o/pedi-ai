import { UseCase } from '../../shared/types/UseCase';
import { IPagamentoRepository } from '@/domain/pagamento/repositories';
import { ITransacaoRepository } from '@/domain/pagamento/repositories';
import { PagamentoAggregate } from '@/domain/pagamento';
import { EventDispatcher } from '@/domain/shared';

export interface WebhookInput {
  provider: 'pix' | 'stripe';
  payload: Record<string, unknown>;
  signature: string;
}

export interface WebhookOutput {
  sucesso: boolean;
  mensagem: string;
  eventoId?: string;
}

/**
 * Interface para validador de assinatura de webhook.
 * Será implementada por infrastructure/external em Phase 4.
 */
export interface IWebhookSignatureValidator {
  validar(provider: 'pix' | 'stripe', payload: string, signature: string): boolean;
}

export class ProcessarWebhookUseCase implements UseCase<WebhookInput, WebhookOutput> {
  constructor(
    private pagamentoRepo: IPagamentoRepository,
    private transacaoRepo: ITransacaoRepository,
    private eventDispatcher: EventDispatcher,
    private signatureValidator: IWebhookSignatureValidator
  ) {}

  async execute(input: WebhookInput): Promise<WebhookOutput> {
    // Validar assinatura
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

    // Processar evento baseado no provider
    if (input.provider === 'pix') {
      return this.processarWebhookPix(input.payload);
    } else if (input.provider === 'stripe') {
      return this.processarWebhookStripe(input.payload);
    }

    return {
      sucesso: false,
      mensagem: `Provider ${input.provider} não suportado`,
    };
  }

  private async processarWebhookPix(payload: Record<string, unknown>): Promise<WebhookOutput> {
    // Extrair informações do webhook Pix
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

    // Verificar se já processamos este evento (idempotência)
    const transacaoExistente = await this.transacaoRepo.buscarPorProviderId(eventoId);
    if (transacaoExistente) {
      return {
        sucesso: true,
        mensagem: 'Evento já processado anteriormente',
        eventoId,
      };
    }

    // Processar baseado no tipo de evento
    if (tipoEvento === 'PAGAMENTO') {
      // Buscar pagamento pelo providerId (transacaoId do Pix)
      const pagamento = await this.pagamentoRepo.buscarPorTransacaoId(transacaoId || '');
      if (!pagamento) {
        return {
          sucesso: false,
          mensagem: `Pagamento não encontrado para transação ${transacaoId}`,
        };
      }

      // Reconstituir aggregate e processar
      const transacoes = await this.transacaoRepo.buscarPorPagamentoId(pagamento.id);
      const aggregate = PagamentoAggregate.reconstituir(pagamento, transacoes);

      // Adicionar transação webhook
      aggregate.adicionarTransacaoWebhook(eventoId, payload);

      // Processar sucesso da transação de charge
      const transacaoCharge = aggregate.transacoes.find(t => t.providerId === transacaoId);
      if (transacaoCharge) {
        aggregate.processarSucessoTransacao(transacaoCharge.id);
      }

      // Salvar alterações
      await this.pagamentoRepo.salvar(aggregate.pagamento);

      // Disparar eventos
      const eventos = aggregate.getEventos();
      eventos.forEach(evento => this.eventDispatcher.dispatch(evento));

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

  private async processarWebhookStripe(payload: Record<string, unknown>): Promise<WebhookOutput> {
    // Extrair informações do webhook Stripe
    const eventoId = payload.id as string;
    const tipoEvento = payload.tipo as string;
    const dados = payload.dados as Record<string, unknown> | undefined;

    if (!eventoId || !tipoEvento) {
      return {
        sucesso: false,
        mensagem: 'Payload de webhook Stripe inválido',
      };
    }

    // Verificar se já processamos este evento (idempotência)
    const transacaoExistente = await this.transacaoRepo.buscarPorProviderId(eventoId);
    if (transacaoExistente) {
      return {
        sucesso: true,
        mensagem: 'Evento já processado anteriormente',
        eventoId,
      };
    }

    // Processar baseado no tipo de evento
    if (tipoEvento === 'payment_intent.succeeded') {
      const paymentIntentId = dados?.id as string | undefined;

      if (!paymentIntentId) {
        return {
          sucesso: false,
          mensagem: 'PaymentIntent ID não encontrado no payload',
        };
      }

      // Buscar pagamento pelo providerId (PaymentIntent ID)
      const pagamento = await this.pagamentoRepo.buscarPorTransacaoId(paymentIntentId);
      if (!pagamento) {
        return {
          sucesso: false,
          mensagem: `Pagamento não encontrado para PaymentIntent ${paymentIntentId}`,
        };
      }

      // Reconstituir aggregate e processar
      const transacoes = await this.transacaoRepo.buscarPorPagamentoId(pagamento.id);
      const aggregate = PagamentoAggregate.reconstituir(pagamento, transacoes);

      // Adicionar transação webhook
      aggregate.adicionarTransacaoWebhook(eventoId, payload);

      // Processar sucesso da transação de charge
      const transacaoCharge = aggregate.transacoes.find(t => t.providerId === paymentIntentId);
      if (transacaoCharge) {
        aggregate.processarSucessoTransacao(transacaoCharge.id);
      }

      // Salvar alterações
      await this.pagamentoRepo.salvar(aggregate.pagamento);

      // Disparar eventos
      const eventos = aggregate.getEventos();
      eventos.forEach(evento => this.eventDispatcher.dispatch(evento));

      return {
        sucesso: true,
        mensagem: 'PaymentIntent confirmado com sucesso',
        eventoId,
      };
    }

    if (tipoEvento === 'payment_intent.payment_failed') {
      const paymentIntentId = dados?.id as string | undefined;

      if (!paymentIntentId) {
        return {
          sucesso: false,
          mensagem: 'PaymentIntent ID não encontrado no payload',
        };
      }

      // Buscar pagamento pelo providerId
      const pagamento = await this.pagamentoRepo.buscarPorTransacaoId(paymentIntentId);
      if (!pagamento) {
        return {
          sucesso: false,
          mensagem: `Pagamento não encontrado para PaymentIntent ${paymentIntentId}`,
        };
      }

      // Reconstituir aggregate e processar
      const transacoes = await this.transacaoRepo.buscarPorPagamentoId(pagamento.id);
      const aggregate = PagamentoAggregate.reconstituir(pagamento, transacoes);

      // Adicionar transação webhook
      aggregate.adicionarTransacaoWebhook(eventoId, payload);

      // Processar falha da transação de charge
      const transacaoCharge = aggregate.transacoes.find(t => t.providerId === paymentIntentId);
      if (transacaoCharge) {
        aggregate.processarFalhaTransacao(transacaoCharge.id);
      }

      // Salvar alterações
      await this.pagamentoRepo.salvar(aggregate.pagamento);

      // Disparar eventos
      const eventos = aggregate.getEventos();
      eventos.forEach(evento => this.eventDispatcher.dispatch(evento));

      return {
        sucesso: true,
        mensagem: 'Pagamento falhou registrado',
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
