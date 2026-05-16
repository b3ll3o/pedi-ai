import { CarrinhoAggregate } from '../aggregates/CarrinhoAggregate';

export interface ICarrinhoRepository {
  get(): Promise<CarrinhoAggregate | null>;
  save(carrinho: CarrinhoAggregate): Promise<void>;
  clear(): Promise<void>;
}
