import { DomainEvent } from '@/domain/shared';
import { Pagamento } from '../entities/Pagamento';

export class ReembolsoConfirmadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'ReembolsoConfirmadoEvent';

  constructor(
    public readonly pagamento: Pagamento,
    public readonly valorReembolsado: number,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
