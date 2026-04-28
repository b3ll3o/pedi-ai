import { DomainEvent } from '@/domain/shared';

export interface RestauranteAtivadoEventProps {
  restauranteId: string;
}

export class RestauranteAtivadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'RestauranteAtivado';

  constructor(readonly props: RestauranteAtivadoEventProps) {
    this.occurredOn = new Date();
  }
}
