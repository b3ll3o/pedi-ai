import { UseCase } from '@/application/shared';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { UsuarioVinculadoRestauranteEvent } from '@/domain/admin/events/UsuarioVinculadoRestauranteEvent';

/**
 * Input para vincular usuário a restaurante
 */
export interface VincularUsuarioRestauranteInput {
  restauranteId: string;
  usuarioId: string;
  papel: 'gerente' | 'atendente';
  solicitanteId: string;
}

/**
 * Output após vincular usuário
 */
export interface VincularUsuarioRestauranteOutput {
  vinculo: UsuarioRestaurante;
  sucesso: boolean;
}

/**
 * Use Case para vincular um usuário a um restaurante com um papel
 *
 * Regras:
 * - O vínculo 'dono' não pode ser criado via este use case (é criado automaticamente)
 * - Apenas owner ou manager do restaurante podem vincular novos membros
 * - O usuário não pode ter vínculo existente com o restaurante
 */
export class VincularUsuarioRestauranteUseCase implements UseCase<
  VincularUsuarioRestauranteInput,
  VincularUsuarioRestauranteOutput
> {
  constructor(
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository,
    private eventEmitter?: (event: UsuarioVinculadoRestauranteEvent) => void
  ) {}

  async execute(input: VincularUsuarioRestauranteInput): Promise<VincularUsuarioRestauranteOutput> {
    // Verificar feature flag
    if (!isMultiRestaurantEnabled()) {
      throw new Error('Funcionalidade de multi-restaurantes não está habilitada');
    }

    // Verificar se o solicitante tem permissão (owner ou manager)
    const vinculoSolicitante = await this.usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
      input.solicitanteId,
      input.restauranteId
    );

    if (!vinculoSolicitante) {
      throw new Error('Você não tem permissão para gerenciar membros deste restaurante');
    }

    if (!vinculoSolicitante.eDono() && !vinculoSolicitante.eGerente()) {
      throw new Error('Apenas o owner ou manager pode vincular novos membros ao restaurante');
    }

    // Verificar se já existe vínculo
    const vinculoExistente = await this.usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
      input.usuarioId,
      input.restauranteId
    );

    if (vinculoExistente) {
      throw new Error('Usuário já está vinculado a este restaurante');
    }

    // Criar novo vínculo
    const vinculo = UsuarioRestaurante.criar({
      usuarioId: input.usuarioId,
      restauranteId: input.restauranteId,
      papel: input.papel,
    });

    await this.usuarioRestauranteRepo.save(vinculo);

    // Emitir evento
    if (this.eventEmitter) {
      this.eventEmitter(
        new UsuarioVinculadoRestauranteEvent({
          usuarioId: input.usuarioId,
          restauranteId: input.restauranteId,
          papel: input.papel,
        })
      );
    }

    return {
      vinculo,
      sucesso: true,
    };
  }
}
