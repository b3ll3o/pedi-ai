import { DomainEvent } from '@/domain/shared';
import { Categoria } from '../entities/Categoria';
import { ItemCardapio } from '../entities/ItemCardapio';
import { Combo } from '../entities/Combo';

export type TipoAlteracao = 'categoria_criada' | 'categoria_atualizada' | 'categoria_removida' |
  'item_criado' | 'item_atualizado' | 'item_removido' |
  'combo_criado' | 'combo_atualizado' | 'combo_removido';

export interface CardapioAtualizadoEventPayload {
  tipoAlteracao: TipoAlteracao;
  restauranteId: string;
  entidadeId: string;
  entidade?: Categoria | ItemCardapio | Combo;
}

export class CardapioAtualizadoEvent implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventType = 'CardapioAtualizadoEvent';

  constructor(
    public readonly payload: CardapioAtualizadoEventPayload,
    occurredOn?: Date
  ) {
    this.occurredOn = occurredOn ?? new Date();
  }
}
