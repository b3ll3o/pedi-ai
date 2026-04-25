import { DomainEvent } from '@/domain/shared';
import { Mesa } from '../entities/Mesa';

export class MesaDesativadaEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'MesaDesativadaEvent';

  constructor(
    public readonly mesa: Mesa,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
