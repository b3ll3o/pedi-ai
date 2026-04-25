import { AggregateRootClass } from '@/domain/shared';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';
import { Pagamento, PagamentoProps } from '../entities/Pagamento';
import { Transacao, TransacaoProps } from '../entities/Transacao';
import { StatusPagamento } from '../value-objects/StatusPagamento';
import { MetodoPagamento } from '../value-objects/MetodoPagamento';
import { PagamentoConfirmadoEvent } from '../events/PagamentoConfirmadoEvent';
import { PagamentoFalhouEvent } from '../events/PagamentoFalhouEvent';
import { ReembolsoIniciadoEvent } from '../events/ReembolsoIniciadoEvent';
import { ReembolsoConfirmadoEvent } from '../events/ReembolsoConfirmadoEvent';

export interface PagamentoAggregateProps {
  pagamento: Pagamento;
  transacoes: Transacao[];
}

export class PagamentoAggregate extends AggregateRootClass<PagamentoAggregateProps> {
  private constructor(props: PagamentoAggregateProps) {
    super(props);
  }

  get pagamento(): Pagamento {
    return this.props.pagamento;
  }

  get transacoes(): Transacao[] {
    return [...this.props.transacoes];
  }

  get id(): string {
    return this.props.pagamento.id;
  }

  get createdAt(): Date {
    return this.props.pagamento.createdAt;
  }

  get updatedAt(): Date {
    return this.props.pagamento.confirmedAt ?? this.props.pagamento.createdAt;
  }

  equals(other: AggregateRootClass<PagamentoAggregateProps>): boolean {
    if (!(other instanceof PagamentoAggregate)) return false;
    return this.id === other.id;
  }

  /**
   * Invariantes (business rules encapsuladas no aggregate):
   * 1. Pagamento pendente pode receber transação de charge
   * 2. Pagamento confirmado pode receber transação de refund
   * 3. Transações de charge bem-sucedidas confirmam o pagamento
   * 4. Transações de refund bem-sucedidas reembolsam o pagamento
   */

  adicionarTransacaoCharge(providerId: string, payload: Record<string, unknown>): Transacao {
    if (!this.props.pagamento.status.isPendente()) {
      throw new Error('Não é possível adicionar transação de charge a pagamento não pendente');
    }

    const transacao = Transacao.criar({
      id: crypto.randomUUID(),
      pagamentoId: this.props.pagamento.id,
      tipo: 'charge',
      providerId,
      payload,
    });

    this.props.transacoes.push(transacao);
    return transacao;
  }

  adicionarTransacaoWebhook(providerId: string, payload: Record<string, unknown>): Transacao {
    const transacao = Transacao.criar({
      id: crypto.randomUUID(),
      pagamentoId: this.props.pagamento.id,
      tipo: 'webhook',
      providerId,
      payload,
    });

    this.props.transacoes.push(transacao);
    return transacao;
  }

  adicionarTransacaoReembolso(providerId: string, payload: Record<string, unknown>): Transacao {
    if (!this.props.pagamento.status.isConfirmado()) {
      throw new Error('Apenas pagamentos confirmados podem receber reembolso');
    }

    const transacao = Transacao.criar({
      id: crypto.randomUUID(),
      pagamentoId: this.props.pagamento.id,
      tipo: 'refund',
      providerId,
      payload,
    });

    this.props.transacoes.push(transacao);
    return transacao;
  }

  processarSucessoTransacao(transacaoId: string): void {
    const transacao = this.props.transacoes.find(t => t.id === transacaoId);
    if (!transacao) {
      throw new Error(`Transação ${transacaoId} não encontrada`);
    }

    if (transacao.isPendente()) {
      transacao.marcarSucesso();
    }

    if (transacao.tipo === 'charge' && this.props.pagamento.status.isPendente()) {
      this.props.pagamento.confirmar(transacao.providerId, (transacao.payload.webhookId as string) || undefined);
    }
  }

  processarFalhaTransacao(transacaoId: string): void {
    const transacao = this.props.transacoes.find(t => t.id === transacaoId);
    if (!transacao) {
      throw new Error(`Transação ${transacaoId} não encontrada`);
    }

    if (transacao.isPendente()) {
      transacao.marcarFalha();
    }

    if (transacao.tipo === 'charge' && this.props.pagamento.status.isPendente()) {
      this.props.pagamento.falhar();
    }
  }

  /**
   * Confirma o pagamento (chamado quando transação de charge é confirmada)
   */
  confirmarPagamento(transacaoId: string): void {
    const transacao = this.props.transacoes.find(t => t.id === transacaoId);
    if (!transacao) {
      throw new Error(`Transação ${transacaoId} não encontrada`);
    }

    if (!transacao.isSucesso()) {
      throw new Error('Apenas transações bem-sucedidas podem confirmar pagamento');
    }

    this.props.pagamento.confirmar(transacao.providerId, (transacao.payload.webhookId as string) || undefined);
  }

  /**
   * Inicia o reembolso do pagamento
   */
  iniciarReembolso(valorReembolso: number): void {
    if (!this.props.pagamento.status.isConfirmado()) {
      throw new Error('Apenas pagamentos confirmados podem ser reembolsados');
    }

    const valorEmCentavos = Math.round(valorReembolso * 100);
    if (valorEmCentavos > this.props.pagamento.valor.valor) {
      throw new Error('Valor de reembolso não pode exceder o valor do pagamento');
    }

    this.props.pagamento.reembolsar();
  }

  /**
   * Cancela o pagamento pendente
   */
  cancelarPagamento(): void {
    if (!this.props.pagamento.status.isPendente()) {
      throw new Error('Apenas pagamentos pendentes podem ser cancelados');
    }

    this.props.pagamento.cancelar();
  }

  /**
   * Retorna os eventos de domínio gerados pelas operações
   */
  getEventos(): Array<PagamentoConfirmadoEvent | PagamentoFalhouEvent | ReembolsoIniciadoEvent | ReembolsoConfirmadoEvent> {
    const eventos: Array<PagamentoConfirmadoEvent | PagamentoFalhouEvent | ReembolsoIniciadoEvent | ReembolsoConfirmadoEvent> = [];

    if (this.props.pagamento.status.isConfirmado()) {
      eventos.push(new PagamentoConfirmadoEvent(this.props.pagamento));
    }

    if (this.props.pagamento.status.isFalhou()) {
      eventos.push(new PagamentoFalhouEvent(this.props.pagamento));
    }

    if (this.props.pagamento.status.isReembolsado()) {
      eventos.push(new ReembolsoConfirmadoEvent(this.props.pagamento, this.props.pagamento.valor.valor / 100));
    }

    return eventos;
  }

  static criar(props: Omit<PagamentoProps, 'createdAt' | 'status' | 'valor'> & { valor: Dinheiro }): PagamentoAggregate {
    const pagamento = Pagamento.criar(props);

    const aggregate = new PagamentoAggregate({
      pagamento,
      transacoes: [],
    });

    return aggregate;
  }

  static reconstituir(pagamento: Pagamento, transacoes: Transacao[]): PagamentoAggregate {
    return new PagamentoAggregate({
      pagamento,
      transacoes: [...transacoes],
    });
  }
}
