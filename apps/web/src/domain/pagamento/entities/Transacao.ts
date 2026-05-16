import { EntityClass } from '@/domain/shared';

export type TipoTransacaoValue = 'charge' | 'refund' | 'webhook' | 'callback';

export interface TransacaoProps {
  id: string;
  pagamentoId: string;
  tipo: TipoTransacaoValue;
  providerId: string;
  status: 'pending' | 'success' | 'failure';
  payload: Record<string, unknown>;
  createdAt: Date;
}

export class Transacao extends EntityClass<TransacaoProps> {
  get pagamentoId(): string {
    return this.props.pagamentoId;
  }

  get tipo(): TipoTransacaoValue {
    return this.props.tipo;
  }

  get providerId(): string {
    return this.props.providerId;
  }

  get status(): 'pending' | 'success' | 'failure' {
    return this.props.status;
  }

  get payload(): Record<string, unknown> {
    return { ...this.props.payload };
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  equals(other: EntityClass<TransacaoProps>): boolean {
    if (!(other instanceof Transacao)) return false;
    return this.id === other.id;
  }

  isPendente(): boolean {
    return this.props.status === 'pending';
  }

  isSucesso(): boolean {
    return this.props.status === 'success';
  }

  isFalha(): boolean {
    return this.props.status === 'failure';
  }

  marcarSucesso(): void {
    Object.assign(this.props, { status: 'success' });
  }

  marcarFalha(): void {
    Object.assign(this.props, { status: 'failure' });
  }

  static criar(props: Omit<TransacaoProps, 'createdAt' | 'status'>): Transacao {
    return new Transacao({
      ...props,
      status: 'pending',
      createdAt: new Date(),
    });
  }
}
