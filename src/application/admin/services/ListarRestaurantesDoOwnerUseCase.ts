import { UseCase } from '@/application/shared';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

/**
 * Papéis possíveis de um usuário em um restaurante
 */
export type PapelRestaurante = 'owner' | 'manager' | 'staff';

/**
 * Input para listar restaurantes do owner
 */
export interface ListarRestaurantesDoOwnerInput {
  ownerId: string;
}

/**
 * Output com lista de restaurantes e seus papéis
 */
export interface ListarRestaurantesDoOwnerOutput {
  restaurantes: Array<{
    restaurante: Restaurante;
    papel: PapelRestaurante;
  }>;
  sucesso: boolean;
}

/**
 * Interface estendida que inclui findByUsuarioId disponível na implementação
 */
interface IRestauranteRepositoryComFindByUsuarioId extends IRestauranteRepository {
  findByUsuarioId(usuarioId: string): Promise<Restaurante[]>;
}

/**
 * Use Case para listar todos os restaurantes de um owner
 * - ENABLE_MULTI_RESTAURANT=true: busca via junction table UsuarioRestaurante
 * - ENABLE_MULTI_RESTAURANT=false: busca restaurante ativo (lógica legacy)
 */
export class ListarRestaurantesDoOwnerUseCase
  implements UseCase<ListarRestaurantesDoOwnerInput, ListarRestaurantesDoOwnerOutput>
{
  constructor(
    private restauranteRepo: IRestauranteRepositoryComFindByUsuarioId,
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository
  ) {}

  async execute(input: ListarRestaurantesDoOwnerInput): Promise<ListarRestaurantesDoOwnerOutput> {
    const multiRestaurantAtivo = isMultiRestaurantEnabled();

    if (!multiRestaurantAtivo) {
      // Lógica legacy: buscar restaurante ativo único
      const restaurante = await this.restauranteRepo.findAtivo();

      if (!restaurante) {
        return { restaurantes: [], sucesso: true };
      }

      return {
        restaurantes: [{ restaurante, papel: 'owner' as PapelRestaurante }],
        sucesso: true,
      };
    }

    // Lógica multi-restaurant: buscar via junction table
    // Primeiro busca todos os vínculos do usuário
    const vinculos = await this.usuarioRestauranteRepo.findByUsuarioId(input.ownerId);

    // Para cada vínculo, buscar o restaurante correspondente
    const resultados: Array<{ restaurante: Restaurante; papel: PapelRestaurante }> = [];

    for (const vinculo of vinculos) {
      const restaurante = await this.restauranteRepo.findById(vinculo.restauranteId);
      if (restaurante) {
        resultados.push({
          restaurante,
          papel: vinculo.papel as PapelRestaurante,
        });
      }
    }

    return { restaurantes: resultados, sucesso: true };
  }
}
