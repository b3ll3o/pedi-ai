import { AggregateRootClass } from '@/domain/shared';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { MetodoPagamento } from '../value-objects/MetodoPagamento';
import { StatusPagamento } from '../value-objects/StatusPagamento';

export interface PagamentoProps {
  id: string;
  pedidoId: string;
  metodo: MetodoPagamento;
  status: StatusPagamento;
  valor: Dinheiro;
  transacaoId?: string;
  webhookId?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

export class Pagamento extends AggregateRootClass<PagamentoProps> {
  get pedidoId(): string {
    return this.props.pedidoId;
  }

  get metodo(): MetodoPagamento {
    return this.props.metodo;
  }

  get status(): StatusPagamento {
    return this.props.status;
  }

  get valor(): Dinheiro {
    return this.props.valor;
  }

  get transacaoId(): string | undefined {
    return this.props.transacaoId;
  }

  get webhookId(): string | undefined {
    return this.props.webhookId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.confirmedAt ?? this.props.createdAt;
  }

  get confirmedAt(): Date | undefined {
    return this.props.confirmedAt;
  }

  equals(other: AggregateRootClass<PagamentoProps>): boolean {
    if (!(other instanceof Pagamento)) return false;
    return this.id === other.id;
  }

  confirmar(transacaoId: string, webhookId?: string): void {
    if (!this.props.status.isPendente()) {
      throw new Error('Pagamento já não está pendente');
    }

    Object.assign(this.props, {
      status: StatusPagamento.CONFIRMED,
      transacaoId,
      webhookId,
      confirmedAt: new Date(),
    });
  }

  falhar(): void {
    if (!this.props.status.isPendente()) {
      throw new Error('Pagamento já não está pendente');
    }

    Object.assign(this.props, {
      status: StatusPagamento.FAILED,
    });
  }

  reembolsar(): void {
    if (!this.props.status.isConfirmado()) {
      throw new Error('Apenas pagamentos confirmados podem ser reembolsados');
    }

    Object.assign(this.props, {
      status: StatusPagamento.REFUNDED,
    });
  }

  cancelar(): void {
    if (!this.props.status.isPendente()) {
      throw new Error('Apenas pagamentos pendentes podem ser cancelados');
    }

    Object.assign(this.props, {
      status: StatusPagamento.CANCELLED,
    });
  }

  static criar(
    props: Omit<PagamentoProps, 'createdAt' | 'status' | 'valor'> & { valor: Dinheiro }
  ): Pagamento {
    return new Pagamento({
      ...props,
      status: StatusPagamento.PENDING,
      createdAt: new Date(),
    });
  }
}
