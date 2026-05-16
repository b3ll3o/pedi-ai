export interface Entity<T> {
  readonly id: string;
  equals(other: Entity<T>): boolean;
}

export abstract class EntityClass<T> {
  constructor(protected readonly props: T) {}

  get id(): string {
    return (this.props as { id: string }).id;
  }

  equals(other: EntityClass<T>): boolean {
    if (other === null || other === undefined) return false;
    return this.id === other.id;
  }
}
