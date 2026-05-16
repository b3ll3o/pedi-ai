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
