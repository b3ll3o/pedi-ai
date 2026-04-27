import { UseCase } from '@/application/shared';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';

/**
 * Input para listar restaurantes do owner
 */
export interface ListarRestaurantesDoOwnerInput {
  ownerId: string;
}

/**
 * Output com lista de restaurantes
 */
export interface ListarRestaurantesDoOwnerOutput {
  restaurantes: Restaurante[];
  sucesso: boolean;
}

/**
 * Use Case para listar todos os restaurantes de um owner
 * Busca via tabela de junction UsuarioRestaurante
 */
export class ListarRestaurantesDoOwnerUseCase implements UseCase<ListarRestaurantesDoOwnerInput, ListarRestaurantesDoOwnerOutput> {
  constructor(
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository,
    private restauranteRepo: {
      findById(id: string): Promise<Restaurante | null>;
    }
  ) {}

  async execute(input: ListarRestaurantesDoOwnerInput): Promise<ListarRestaurantesDoOwnerOutput> {
    // Buscar todos os vínculos do usuário
    const vinculos = await this.usuarioRestauranteRepo.findByUsuarioId(input.ownerId);

    // Para cada vínculo, buscar o restaurante
    const restaurantes: Restaurante[] = [];

    for (const vinculo of vinculos) {
      const restaurante = await this.restauranteRepo.findById(vinculo.restauranteId);
      if (restaurante) {
        restaurantes.push(restaurante);
      }
    }

    return {
      restaurantes,
      sucesso: true,
    };
  }
}
