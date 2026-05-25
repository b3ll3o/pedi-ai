import { ValueObjectClass } from '@/domain/shared';

export type StatusPedidoValue =
  | 'pending_payment'
  | 'paid'
  | 'received'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'payment_failed';

type StatusValue = StatusPedidoValue;

const TRANSICOES_VALIDAS: Record<StatusValue, StatusValue[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['received', 'refunded'],
  received: ['preparing', 'rejected', 'cancelled'],
  preparing: ['ready'],
  ready: ['delivered'],
  delivered: [],
  rejected: [],
  cancelled: [],
  refunded: [],
  payment_failed: ['pending_payment'],
};

export class StatusPedido extends ValueObjectClass<StatusPedidoValue> {
  static readonly PENDING_PAYMENT = new StatusPedido('pending_payment');
  static readonly PAID = new StatusPedido('paid');
  static readonly RECEIVED = new StatusPedido('received');
  static readonly PREPARING = new StatusPedido('preparing');
  static readonly READY = new StatusPedido('ready');
  static readonly DELIVERED = new StatusPedido('delivered');
  static readonly REJECTED = new StatusPedido('rejected');
  static readonly CANCELLED = new StatusPedido('cancelled');
  static readonly REFUNDED = new StatusPedido('refunded');
  static readonly PAYMENT_FAILED = new StatusPedido('payment_failed');

  private constructor(value: StatusPedidoValue) {
    super(value);
  }

  static fromValue(value: string): StatusPedido {
    const status = ALL_STATUSES.find((s) => s.props === value);
    if (!status) {
      throw new Error(`StatusPedido inválido: ${value}`);
    }
    return status;
  }

  equals(other: ValueObjectClass<StatusPedidoValue>): boolean {
    if (!(other instanceof StatusPedido)) return false;
    return this.props === other.props;
  }

  toString(): string {
    return this.props;
  }

  transicoesPermitidas(): StatusPedidoValue[] {
    const statusValue = this.props as StatusValue;
    return TRANSICOES_VALIDAS[statusValue] || [];
  }

  isFinal(): boolean {
    return this.transicoesPermitidas().length === 0;
  }
}

const ALL_STATUSES: StatusPedido[] = [
  StatusPedido.PENDING_PAYMENT,
  StatusPedido.PAID,
  StatusPedido.RECEIVED,
  StatusPedido.PREPARING,
  StatusPedido.READY,
  StatusPedido.DELIVERED,
  StatusPedido.REJECTED,
  StatusPedido.CANCELLED,
  StatusPedido.REFUNDED,
  StatusPedido.PAYMENT_FAILED,
];
