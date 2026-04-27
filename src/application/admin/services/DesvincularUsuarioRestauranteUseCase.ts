import { UseCase } from '@/application/shared';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { UsuarioDesvinculadoRestauranteEvent } from '@/domain/admin/events/UsuarioDesvinculadoRestauranteEvent';

/**
 * Input para desvincular usuário de restaurante
 */
export interface DesvincularUsuarioRestauranteInput {
  usuarioId: string;
  restauranteId: string;
}

/**
 * Output após desvincular usuário
 */
export interface DesvincularUsuarioRestauranteOutput {
  sucesso: boolean;
}

/**
 * Use Case para desvincular um usuário de um restaurante
 * IMPORANTE: Não permite remover vínculo de owner
 */
export class DesvincularUsuarioRestauranteUseCase implements UseCase<DesvincularUsuarioRestauranteInput, DesvincularUsuarioRestauranteOutput> {
  constructor(
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository,
    private eventEmitter?: (event: UsuarioDesvinculadoRestauranteEvent) => void
  ) {}

  async execute(input: DesvincularUsuarioRestauranteInput): Promise<DesvincularUsuarioRestauranteOutput> {
    const vinculo = await this.usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
      input.usuarioId,
      input.restauranteId
    );

    if (!vinculo) {
      throw new Error('Vínculo entre usuário e restaurante não encontrado');
    }

    // Impedir remoção do owner
    if (vinculo.papel === 'owner') {
      throw new Error('Não é possível remover o vínculo de owner de um restaurante');
    }

    await this.usuarioRestauranteRepo.delete(vinculo.id);

    // Emitir evento
    if (this.eventEmitter) {
      this.eventEmitter(
        new UsuarioDesvinculadoRestauranteEvent({
          usuarioId: input.usuarioId,
          restauranteId: input.restauranteId,
        })
      );
    }

    return { sucesso: true };
  }
}
