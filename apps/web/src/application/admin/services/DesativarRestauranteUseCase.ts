import { UseCase } from '@/application/shared';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { RestauranteDesativadoEvent } from '@/domain/admin/events/RestauranteDesativadoEvent';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

/**
 * Input para desativar restaurante
 */
export interface DesativarRestauranteInput {
  restauranteId: string;
  proprietarioId: string;
}

/**
 * Output após desativar restaurante
 */
export interface DesativarRestauranteOutput {
  restaurante: Restaurante;
  sucesso: boolean;
}

/**
 * Use Case para desativar um restaurante (soft delete).
 * O restaurante deixa de aparecer para clientes mas permanece em dados históricos.
 * Requer que o usuário seja owner do restaurante.
 */
export class DesativarRestauranteUseCase implements UseCase<
  DesativarRestauranteInput,
  DesativarRestauranteOutput
> {
  constructor(
    private restauranteRepo: IRestauranteRepository,
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository,
    private eventEmitter?: (event: RestauranteDesativadoEvent) => void
  ) {}

  async execute(input: DesativarRestauranteInput): Promise<DesativarRestauranteOutput> {
    const { restauranteId, proprietarioId } = input;

    // Buscar restaurante
    const restaurante = await this.restauranteRepo.findById(restauranteId);
    if (!restaurante) {
      throw new Error('Restaurante não encontrado');
    }

    // Validar que restaurante não está já desativado
    if (!restaurante.ativo) {
      throw new Error('Este restaurante já está desativado');
    }

    // Validar propriedade do restaurante
    const multiRestaurantAtivo = isMultiRestaurantEnabled();

    if (multiRestaurantAtivo) {
      // Verificar via relação N:N
      const vinculo = await this.usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
        proprietarioId,
        restauranteId
      );

      if (!vinculo || !vinculo.eDono()) {
        throw new Error('Você não tem permissão para desativar este restaurante');
      }
    } else {
      // Lógica legacy: verificar se existe algum vínculo
      const vinculos = await this.usuarioRestauranteRepo.findByUsuarioId(proprietarioId);
      const vinculoValido = vinculos.some((v) => v.restauranteId === restauranteId && v.eDono());

      if (!vinculoValido) {
        throw new Error('Você não tem permissão para desativar este restaurante');
      }
    }

    // Desativar restaurante
    restaurante.desativar();

    // Persistir alterações
    const { ConfiguracoesRestaurante } =
      await import('@/domain/admin/value-objects/ConfiguracoesRestaurante');
    const configuracoes = ConfiguracoesRestaurante.criarPadrao();

    const restauranteDesativado = await this.restauranteRepo.update(restaurante, configuracoes);

    // Emitir evento
    if (this.eventEmitter) {
      const evento = new RestauranteDesativadoEvent({
        restauranteId: restauranteDesativado.id,
      });
      this.eventEmitter(evento);
    }

    return {
      restaurante: restauranteDesativado,
      sucesso: true,
    };
  }
}
