import { Categoria, CategoriaProps } from '../entities/Categoria';

export interface ICategoriaRepository {
  buscarPorId(id: string): Promise<Categoria | null>;
  buscarPorRestaurante(restauranteId: string): Promise<Categoria[]>;
  buscarAtivas(restauranteId: string): Promise<Categoria[]>;
  salvar(categoria: Categoria): Promise<Categoria>;
  salvarMany(categorias: Categoria[]): Promise<Categoria[]>;
  excluir(id: string): Promise<void>;
}
