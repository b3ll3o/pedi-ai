import { Combo } from '../entities/Combo';

export interface IComboRepository {
  buscarPorId(id: string): Promise<Combo | null>;
  buscarPorRestaurante(restauranteId: string): Promise<Combo[]>;
  buscarAtivos(restauranteId: string): Promise<Combo[]>;
  salvar(combo: Combo): Promise<Combo>;
  excluir(id: string): Promise<void>;
}
