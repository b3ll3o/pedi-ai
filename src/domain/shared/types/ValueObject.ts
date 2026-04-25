export interface ValueObject<T> {
  equals(other: ValueObject<T>): boolean;
}

export abstract class ValueObjectClass<T> {
  constructor(protected readonly props: T) {}

  equals(other: ValueObjectClass<T>): boolean {
    if (other === null || other === undefined) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
