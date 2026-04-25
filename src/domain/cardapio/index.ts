// Entities
export { Categoria } from './entities/Categoria';
export type { CategoriaProps } from './entities/Categoria';

export { ItemCardapio } from './entities/ItemCardapio';
export type { ItemCardapioProps } from './entities/ItemCardapio';

export { Combo } from './entities/Combo';
export type { ComboProps, ComboItemProps } from './entities/Combo';

export { ModificadorValor } from './entities/ModificadorValor';
export type { ModificadorValorProps } from './entities/ModificadorValor';

export { ModificadorGrupo } from './entities/ModificadorGrupo';
export type { ModificadorGrupoProps } from './entities/ModificadorGrupo';

// Value Objects
export { TipoItemCardapio } from './value-objects/TipoItemCardapio';
export type { TipoItemCardapioValue } from './value-objects/TipoItemCardapio';

export { LabelDietetico } from './value-objects/LabelDietetico';
export type { LabelDieteticoValue } from './value-objects/LabelDietetico';

// Aggregates
export { ModificadorGrupoAggregate } from './aggregates/ModificadorGrupoAggregate';

export { ComboAggregate } from './aggregates/ComboAggregate';
export type { CalculoDescontoCombo } from './aggregates/ComboAggregate';

// Events
export { CardapioAtualizadoEvent } from './events/CardapioAtualizadoEvent';
export type { CardapioAtualizadoEventPayload, TipoAlteracao } from './events/CardapioAtualizadoEvent';

// Repositories
export type { ICategoriaRepository } from './repositories/ICategoriaRepository';
export type { IItemCardapioRepository } from './repositories/IItemCardapioRepository';
export type { IModificadorGrupoRepository } from './repositories/IModificadorGrupoRepository';
