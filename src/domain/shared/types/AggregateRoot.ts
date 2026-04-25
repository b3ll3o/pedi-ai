import { EntityClass } from './Entity';

export interface AggregateRoot<T> extends EntityClass<T> {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export abstract class AggregateRootClass<T> extends EntityClass<T> {
  abstract readonly createdAt: Date;
  abstract readonly updatedAt: Date;
}
