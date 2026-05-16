import { UseCase } from '@/application/shared';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor';
import { Combo } from '@/domain/cardapio/entities/Combo';
import { ICategoriaRepository } from '@/domain/cardapio/repositories/ICategoriaRepository';
import { IItemCardapioRepository } from '@/domain/cardapio/repositories/IItemCardapioRepository';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

/**
 * Cardápio completo de um restaurante
 */
export interface CardapioCompleto {
  categorias: Categoria[];
  produtos: ItemCardapio[];
  modificadores: ModificadorGrupo[];
  valores: ModificadorValor[];
  combos: Combo[];
}

/**
 * Input para obter cardápio completo
 */
export interface ObterCardapioCompletoInput {
  restauranteId: string;
  solicitanteId: string;
}

/**
 * Output com cardápio completo
 */
export interface ObterCardapioCompletoOutput {
  cardapio: CardapioCompleto;
  sucesso: boolean;
}

/**
 * Interface para validação de acesso a restaurante
 */
interface IUsuarioRestauranteRepository {
  findByUsuarioIdAndRestauranteId(
    usuarioId: string,
    restauranteId: string
  ): Promise<{ id: string; papel: string } | null>;
}

/**
 * Use Case para obter cardápio completo (categorias + produtos + modificadores + valores + combos)
 * de um restaurante específico
 */
export class ObterCardapioCompletoUseCase implements UseCase<
  ObterCardapioCompletoInput,
  ObterCardapioCompletoOutput
> {
  constructor(
    private categoriaRepo: ICategoriaRepository,
    private produtoRepo: IItemCardapioRepository,
    private modificadorRepo: IModificadorGrupoRepository,
    private usuarioRestauranteRepo?: IUsuarioRestauranteRepository
  ) {}

  /**
   * Valida se o solicitante tem acesso ao restaurante
   */
  private async validarAcessoRestaurante(
    solicitanteId: string,
    restauranteId: string
  ): Promise<void> {
    if (!isMultiRestaurantEnabled()) {
      return;
    }

    if (!this.usuarioRestauranteRepo) {
      throw new Error('Repositório de vínculo usuário-restaurante não configurado');
    }

    const vinculo = await this.usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
      solicitanteId,
      restauranteId
    );

    if (!vinculo) {
      throw new Error('Solicitante não tem acesso a este restaurante');
    }
  }

  async execute(input: ObterCardapioCompletoInput): Promise<ObterCardapioCompletoOutput> {
    const { restauranteId, solicitanteId } = input;

    // Validar acesso ao restaurante
    await this.validarAcessoRestaurante(solicitanteId, restauranteId);

    // Buscar categorias ativas do restaurante
    const categorias = await this.categoriaRepo.buscarAtivas(restauranteId);

    // Buscar todos os produtos do restaurante
    const produtos = await this.produtoRepo.buscarPorRestaurante(restauranteId);

    // Buscar modificadores do restaurante (já inclui valores embedded)
    const modificadores = await this.modificadorRepo.buscarPorRestaurante(restauranteId);

    // Extrair valores únicos dos modificadores
    const valoresMap = new Map<string, ModificadorValor>();
    for (const grupo of modificadores) {
      for (const valor of grupo.valores) {
        if (!valoresMap.has(valor.id)) {
          valoresMap.set(valor.id, valor);
        }
      }
    }
    const valores = Array.from(valoresMap.values());

    // TODO: Buscar combos quando IComboRepository estiver implementado
    // Por enquanto, retorna array vazio
    const combos: Combo[] = [];

    return {
      cardapio: {
        categorias,
        produtos,
        modificadores,
        valores,
        combos,
      },
      sucesso: true,
    };
  }
}
