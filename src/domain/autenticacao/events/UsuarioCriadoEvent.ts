import { DomainEvent } from '@/domain/shared';
import { Usuario } from '../entities/Usuario';

export class UsuarioCriadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'UsuarioCriadoEvent';

  constructor(
    public readonly usuario: Usuario,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
