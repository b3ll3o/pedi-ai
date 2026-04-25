import { UseCase } from '@/application/shared/types/UseCase';
import { ICategoriaRepository, Categoria } from '@/domain/cardapio';

export interface ListarCategoriasInput {
  restauranteId: string;
}

export class ListarCategoriasUseCase implements UseCase<ListarCategoriasInput, Categoria[]> {
  constructor(private categoriaRepo: ICategoriaRepository) {}

  async execute(input: ListarCategoriasInput): Promise<Categoria[]> {
    // 1. Buscar categorias ativas do restaurante
    const categorias = await this.categoriaRepo.buscarAtivas(input.restauranteId);

    // 2. Ordenar por ordemExibicao
    return categorias.sort((a, b) => a.ordemExibicao - b.ordemExibicao);
  }
}
