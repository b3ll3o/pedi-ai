import { UseCase } from '@/application/shared';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { RestauranteAtivadoEvent } from '@/domain/admin/events/RestauranteAtivadoEvent';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

/**
 * Input para reativar restaurante
 */
export interface ReativarRestauranteInput {
  restauranteId: string;
  proprietarioId: string;
}

/**
 * Output após reativar restaurante
 */
export interface ReativarRestauranteOutput {
  restaurante: Restaurante;
  sucesso: boolean;
}

/**
 * Use Case para reativar um restaurante desativado.
 * O restaurante volta a aparecer para clientes.
 * Requer que o usuário seja owner do restaurante.
 */
export class ReativarRestauranteUseCase implements UseCase<
  ReativarRestauranteInput,
  ReativarRestauranteOutput
> {
  constructor(
    private restauranteRepo: IRestauranteRepository,
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository,
    private eventEmitter?: (event: RestauranteAtivadoEvent) => void
  ) {}

  async execute(input: ReativarRestauranteInput): Promise<ReativarRestauranteOutput> {
    const { restauranteId, proprietarioId } = input;

    // Buscar restaurante
    const restaurante = await this.restauranteRepo.findById(restauranteId);
    if (!restaurante) {
      throw new Error('Restaurante não encontrado');
    }

    // Validar que restaurante está desativado
    if (restaurante.ativo) {
      throw new Error('Este restaurante já está ativo');
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
        throw new Error('Você não tem permissão para reativar este restaurante');
      }
    } else {
      // Lógica legacy: verificar se existe algum vínculo
      const vinculos = await this.usuarioRestauranteRepo.findByUsuarioId(proprietarioId);
      const vinculoValido = vinculos.some((v) => v.restauranteId === restauranteId && v.eDono());

      if (!vinculoValido) {
        throw new Error('Você não tem permissão para reativar este restaurante');
      }
    }

    // Reativar restaurante
    restaurante.ativar();

    // Persistir alterações
    const { ConfiguracoesRestaurante } =
      await import('@/domain/admin/value-objects/ConfiguracoesRestaurante');
    const configuracoes = ConfiguracoesRestaurante.criarPadrao();

    const restauranteAtivado = await this.restauranteRepo.update(restaurante, configuracoes);

    // Emitir evento
    if (this.eventEmitter) {
      const evento = new RestauranteAtivadoEvent({
        restauranteId: restauranteAtivado.id,
      });
      this.eventEmitter(evento);
    }

    return {
      restaurante: restauranteAtivado,
      sucesso: true,
    };
  }
}
