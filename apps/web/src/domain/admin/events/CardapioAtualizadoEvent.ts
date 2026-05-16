import { DomainEvent } from '@/domain/shared';

export interface CardapioAtualizadoEventProps {
  restauranteId: string;
  categoriaId?: string;
}

export class CardapioAtualizadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'CardapioAtualizado';

  constructor(readonly props: CardapioAtualizadoEventProps) {
    this.occurredOn = new Date();
  }
}
