import { DomainEvent } from '@/domain/shared';
import { Mesa } from '../entities/Mesa';

export class MesaCriadaEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'MesaCriadaEvent';

  constructor(
    public readonly mesa: Mesa,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
