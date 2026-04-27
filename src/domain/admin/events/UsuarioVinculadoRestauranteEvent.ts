import { DomainEvent } from '@/domain/shared';

export interface UsuarioVinculadoRestauranteEventProps {
  usuarioId: string;
  restauranteId: string;
  papel: 'owner' | 'manager' | 'staff';
}

export class UsuarioVinculadoRestauranteEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'UsuarioVinculadoRestaurante';

  constructor(readonly props: UsuarioVinculadoRestauranteEventProps) {
    this.occurredOn = new Date();
  }
}
