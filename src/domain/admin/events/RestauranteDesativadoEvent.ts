import { DomainEvent } from '@/domain/shared';

export interface RestauranteDesativadoEventProps {
  restauranteId: string;
}

export class RestauranteDesativadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'RestauranteDesativado';

  constructor(readonly props: RestauranteDesativadoEventProps) {
    this.occurredOn = new Date();
  }
}
