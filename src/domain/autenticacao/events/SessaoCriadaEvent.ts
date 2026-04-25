import { DomainEvent } from '@/domain/shared';
import { Sessao } from '../entities/Sessao';

export class SessaoCriadaEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'SessaoCriadaEvent';

  constructor(
    public readonly sessao: Sessao,
    public readonly usuarioId: string,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
