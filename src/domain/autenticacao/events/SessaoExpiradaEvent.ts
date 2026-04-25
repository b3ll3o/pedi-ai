import { DomainEvent } from '@/domain/shared';

export class SessaoExpiradaEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'SessaoExpiradaEvent';

  constructor(
    public readonly sessaoId: string,
    public readonly usuarioId: string,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
