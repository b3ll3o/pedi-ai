import { Restaurante } from '../entities/Restaurante';
import { ConfiguracoesRestaurante } from '../value-objects/ConfiguracoesRestaurante';

export interface IRestauranteRepository {
  create(restaurante: Restaurante, configuracoes: ConfiguracoesRestaurante): Promise<Restaurante>;
  findById(id: string): Promise<Restaurante | null>;
  findByCNPJ(cnpj: string): Promise<Restaurante | null>;
  update(restaurante: Restaurante, configuracoes: ConfiguracoesRestaurante): Promise<Restaurante>;
  delete(id: string): Promise<void>;
  findAtivo(): Promise<Restaurante | null>;
}
