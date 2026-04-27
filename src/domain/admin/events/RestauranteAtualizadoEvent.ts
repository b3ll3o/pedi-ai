import { DomainEvent } from '@/domain/shared';

export interface RestauranteAtualizadoEventProps {
  restauranteId: string;
  nome: string;
}

export class RestauranteAtualizadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'RestauranteAtualizado';

  constructor(readonly props: RestauranteAtualizadoEventProps) {
    this.occurredOn = new Date();
  }
}
