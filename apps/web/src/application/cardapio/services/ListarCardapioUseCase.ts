import { UseCase } from '@/application/shared/types/UseCase';
import {
  ICategoriaRepository,
  IItemCardapioRepository,
  Categoria,
  ItemCardapio,
} from '@/domain/cardapio';

export interface CardapioCompleto {
  categorias: CategoriaComItens[];
}

export interface CategoriaComItens {
  categoria: Categoria;
  itens: ItemCardapio[];
}

export interface ListarCardapioInput {
  restauranteId: string;
}

export class ListarCardapioUseCase implements UseCase<ListarCardapioInput, CardapioCompleto> {
  constructor(
    private categoriaRepo: ICategoriaRepository,
    private itemCardapioRepo: IItemCardapioRepository
  ) {}

  async execute(input: ListarCardapioInput): Promise<CardapioCompleto> {
    // 1. Buscar categorias ativas do restaurante
    const categorias = await this.categoriaRepo.buscarAtivas(input.restauranteId);

    // 2. Para cada categoria, buscar itens ativos
    const categoriasComItens: CategoriaComItens[] = await Promise.all(
      categorias.map(async (categoria) => {
        const itens = await this.itemCardapioRepo.buscarAtivos(categoria.id);
        return {
          categoria,
          itens,
        };
      })
    );

    // 3. Ordenar categorias por ordemExibicao e itens por nome
    categoriasComItens.sort((a, b) => a.categoria.ordemExibicao - b.categoria.ordemExibicao);
    for (const cat of categoriasComItens) {
      cat.itens.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    return { categorias: categoriasComItens };
  }
}
