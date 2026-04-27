import { UseCase } from '@/application/shared';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';

/**
 * Input para listar equipe do restaurante
 */
export interface ListarEquipeRestauranteInput {
  restauranteId: string;
  solicitanteId: string;
}

/**
 * Membro da equipe com detalhes
 */
export interface MembroEquipe {
  usuarioId: string;
  papel: 'dono' | 'gerente' | 'atendente';
  vinculadoEm: Date;
}

/**
 * Output com lista de membros da equipe
 */
export interface ListarEquipeRestauranteOutput {
  membros: MembroEquipe[];
  sucesso: boolean;
}

/**
 * Use Case para listar todos os membros da equipe de um restaurante
 *
 * Regras:
 * - Apenas owner ou manager podem listar a equipe do restaurante
 */
export class ListarEquipeRestauranteUseCase implements UseCase<ListarEquipeRestauranteInput, ListarEquipeRestauranteOutput> {
  constructor(
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository
  ) {}

  async execute(input: ListarEquipeRestauranteInput): Promise<ListarEquipeRestauranteOutput> {
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
      throw new Error('Apenas o owner ou manager pode listar membros da equipe do restaurante');
    }

    // Buscar membros do restaurante
    const vinculos = await this.usuarioRestauranteRepo.findByRestauranteId(input.restauranteId);

    const membros: MembroEquipe[] = vinculos.map(v => ({
      usuarioId: v.usuarioId,
      papel: v.papel,
      vinculadoEm: v.criadoEm,
    }));

    return {
      membros,
      sucesso: true,
    };
  }
}
