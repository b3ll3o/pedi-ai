import { UseCase } from '@/application/shared';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { UsuarioDesvinculadoRestauranteEvent } from '@/domain/admin/events/UsuarioDesvinculadoRestauranteEvent';

/**
 * Input para desvincular usuário de restaurante
 */
export interface DesvincularUsuarioRestauranteInput {
  restauranteId: string;
  usuarioId: string;
  solicitanteId: string;
}

/**
 * Output após desvincular usuário
 */
export interface DesvincularUsuarioRestauranteOutput {
  sucesso: boolean;
  mensagem?: string;
}

/**
 * Use Case para desvincular um usuário de um restaurante
 *
 * Regras:
 * - Não permite desvincular o owner do restaurante
 * - Apenas owner ou manager podem realizar esta operação
 */
export class DesvincularUsuarioRestauranteUseCase implements UseCase<
  DesvincularUsuarioRestauranteInput,
  DesvincularUsuarioRestauranteOutput
> {
  constructor(
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository,
    private eventEmitter?: (event: UsuarioDesvinculadoRestauranteEvent) => void
  ) {}

  async execute(
    input: DesvincularUsuarioRestauranteInput
  ): Promise<DesvincularUsuarioRestauranteOutput> {
    // Verificar feature flag
    if (!isMultiRestaurantEnabled()) {
      throw new Error('Funcionalidade de multi-restaurantes não está habilitada');
    }

    // Validar que o solicitante tem permissão (owner ou manager do restaurante)
    const vinculoSolicitante = await this.usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
      input.solicitanteId,
      input.restauranteId
    );

    if (!vinculoSolicitante) {
      throw new Error('Você não tem permissão para gerenciar membros deste restaurante');
    }

    if (!vinculoSolicitante.eDono() && !vinculoSolicitante.eGerente()) {
      throw new Error('Apenas o owner ou manager pode desvincular membros do restaurante');
    }

    // Buscar vínculo do usuário a ser removido
    const vinculo = await this.usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
      input.usuarioId,
      input.restauranteId
    );

    if (!vinculo) {
      throw new Error('Vínculo entre usuário e restaurante não encontrado');
    }

    // Impedir remoção do owner - critical business rule
    if (vinculo.eDono()) {
      throw new Error('Não é possível remover o proprietário do restaurante');
    }

    // Remover vínculo
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

    return {
      sucesso: true,
      mensagem: 'Usuário desvinculado com sucesso',
    };
  }
}
