import { DomainEvent } from '@/domain/shared';

export interface UsuarioDesvinculadoRestauranteEventProps {
  usuarioId: string;
  restauranteId: string;
}

export class UsuarioDesvinculadoRestauranteEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'UsuarioDesvinculadoRestaurante';

  constructor(readonly props: UsuarioDesvinculadoRestauranteEventProps) {
    this.occurredOn = new Date();
  }
}
