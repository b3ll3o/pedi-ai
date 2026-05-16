import { DomainEvent } from '@/domain/shared';
import { Pagamento } from '../entities/Pagamento';

export class ReembolsoIniciadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'ReembolsoIniciadoEvent';

  constructor(
    public readonly pagamento: Pagamento,
    public readonly valorReembolso: number,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
