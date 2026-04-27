import { UseCase } from '@/application/shared';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { UsuarioVinculadoRestauranteEvent } from '@/domain/admin/events/UsuarioVinculadoRestauranteEvent';
import { PapelRestaurante } from '@/domain/admin/value-objects/PapelRestaurante';

/**
 * Input para vincular usuário a restaurante
 */
export interface VincularUsuarioRestauranteInput {
  usuarioId: string;
  restauranteId: string;
  papel: PapelRestaurante;
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
 */
export class VincularUsuarioRestauranteUseCase implements UseCase<VincularUsuarioRestauranteInput, VincularUsuarioRestauranteOutput> {
  constructor(
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository,
    private eventEmitter?: (event: UsuarioVinculadoRestauranteEvent) => void
  ) {}

  async execute(input: VincularUsuarioRestauranteInput): Promise<VincularUsuarioRestauranteOutput> {
    // Verificar se já existe vínculo
    const existente = await this.usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
      input.usuarioId,
      input.restauranteId
    );

    if (existente) {
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
