import { UseCase } from '@/application/shared';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { RestauranteDesativadoEvent } from '@/domain/admin/events/RestauranteDesativadoEvent';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';

/**
 * Input para desativar restaurante
 */
export interface DesativarRestauranteInput {
  id: string;
}

/**
 * Output após desativar restaurante
 */
export interface DesativarRestauranteOutput {
  sucesso: boolean;
}

/**
 * Use Case para desativar (soft delete) um restaurante
 */
export class DesativarRestauranteUseCase implements UseCase<DesativarRestauranteInput, DesativarRestauranteOutput> {
  constructor(
    private restauranteRepo: IRestauranteRepository,
    private eventEmitter?: (event: RestauranteDesativadoEvent) => void
  ) {}

  async execute(input: DesativarRestauranteInput): Promise<DesativarRestauranteOutput> {
    const restaurante = await this.restauranteRepo.findById(input.id);
    if (!restaurante) {
      throw new Error('Restaurante não encontrado');
    }

    restaurante.desativar();

    // Buscar configuracoes existentes
    const configuracoes = ConfiguracoesRestaurante.criarPadrao(); // TODO: buscar configuracoes existentes

    await this.restauranteRepo.update(restaurante, configuracoes);

    // Emitir evento
    if (this.eventEmitter) {
      this.eventEmitter(
        new RestauranteDesativadoEvent({
          restauranteId: restaurante.id,
        })
      );
    }

    return { sucesso: true };
  }
}
