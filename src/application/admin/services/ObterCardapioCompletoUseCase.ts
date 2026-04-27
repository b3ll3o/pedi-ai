import { UseCase } from '@/application/shared';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { ICategoriaRepository } from '@/domain/cardapio/repositories/ICategoriaRepository';
import { IItemCardapioRepository } from '@/domain/cardapio/repositories/IItemCardapioRepository';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';

/**
 * Cardápio completo de um restaurante
 */
export interface CardapioCompleto {
  categorias: Categoria[];
  produtos: ItemCardapio[];
  modificadores: ModificadorGrupo[];
}

/**
 * Input para obter cardápio completo
 */
export interface ObterCardapioCompletoInput {
  restauranteId: string;
}

/**
 * Output com cardápio completo
 */
export interface ObterCardapioCompletoOutput {
  cardapio: CardapioCompleto;
  sucesso: boolean;
}

/**
 * Use Case para obter cardápio completo (categorias + produtos + modificadores)
 * de um restaurante específico
 */
export class ObterCardapioCompletoUseCase implements UseCase<ObterCardapioCompletoInput, ObterCardapioCompletoOutput> {
  constructor(
    private categoriaRepo: ICategoriaRepository,
    private produtoRepo: IItemCardapioRepository,
    private modificadorRepo: IModificadorGrupoRepository
  ) {}

  async execute(input: ObterCardapioCompletoInput): Promise<ObterCardapioCompletoOutput> {
    // Buscar todas as categorias ativas do restaurante
    const categorias = await this.categoriaRepo.buscarAtivas(input.restauranteId);

    // Buscar todos os produtos de cada categoria
    const produtos: ItemCardapio[] = [];
    for (const categoria of categorias) {
      const produtosCategoria = await this.produtoRepo.buscarAtivos(categoria.id);
      produtos.push(...produtosCategoria);
    }

    // Buscar todos os modificadores do restaurante
    const modificadores = await this.modificadorRepo.buscarPorRestaurante(input.restauranteId);

    return {
      cardapio: {
        categorias,
        produtos,
        modificadores,
      },
      sucesso: true,
    };
  }
}
