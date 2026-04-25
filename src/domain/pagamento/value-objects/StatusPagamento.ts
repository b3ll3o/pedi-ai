import { ValueObjectClass } from '@/domain/shared';

export type StatusPagamentoValue = 'pending' | 'confirmed' | 'failed' | 'refunded' | 'cancelled';

export class StatusPagamento extends ValueObjectClass<StatusPagamentoValue> {
  static readonly PENDING = new StatusPagamento('pending');
  static readonly CONFIRMED = new StatusPagamento('confirmed');
  static readonly FAILED = new StatusPagamento('failed');
  static readonly REFUNDED = new StatusPagamento('refunded');
  static readonly CANCELLED = new StatusPagamento('cancelled');

  private constructor(value: StatusPagamentoValue) {
    super(value);
  }

  static fromValue(value: string): StatusPagamento {
    const status = ALL_STATUS.find(s => s.props === value);
    if (!status) {
      throw new Error(`StatusPagamento inválido: ${value}`);
    }
    return status;
  }

  equals(other: ValueObjectClass<StatusPagamentoValue>): boolean {
    if (!(other instanceof StatusPagamento)) return false;
    return this.props === other.props;
  }

  toString(): string {
    return this.props;
  }

  isFinal(): boolean {
    return this.props === 'confirmed' || this.props === 'failed' || this.props === 'refunded' || this.props === 'cancelled';
  }

  isPendente(): boolean {
    return this.props === 'pending';
  }

  isConfirmado(): boolean {
    return this.props === 'confirmed';
  }

  isFalhou(): boolean {
    return this.props === 'failed';
  }

  isReembolsado(): boolean {
    return this.props === 'refunded';
  }

  isCancelado(): boolean {
    return this.props === 'cancelled';
  }
}

const ALL_STATUS: StatusPagamento[] = [
  StatusPagamento.PENDING,
  StatusPagamento.CONFIRMED,
  StatusPagamento.FAILED,
  StatusPagamento.REFUNDED,
  StatusPagamento.CANCELLED,
];
