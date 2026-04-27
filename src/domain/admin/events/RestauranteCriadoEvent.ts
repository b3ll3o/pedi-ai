import { DomainEvent } from '@/domain/shared';

export interface RestauranteCriadoEventProps {
  restauranteId: string;
  nome: string;
  proprietarioId: string;
}

export class RestauranteCriadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'RestauranteCriado';

  constructor(readonly props: RestauranteCriadoEventProps) {
    this.occurredOn = new Date();
  }
}
