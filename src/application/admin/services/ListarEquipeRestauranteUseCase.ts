import { UseCase } from '@/application/shared';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';

/**
 * Input para listar equipe do restaurante
 */
export interface ListarEquipeRestauranteInput {
  restauranteId: string;
}

/**
 * Membro da equipe com detalhes
 */
export interface MembroEquipe {
  id: string;
  usuarioId: string;
  papel: 'owner' | 'manager' | 'staff';
  criadoEm: Date;
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
 */
export class ListarEquipeRestauranteUseCase implements UseCase<ListarEquipeRestauranteInput, ListarEquipeRestauranteOutput> {
  constructor(
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository
  ) {}

  async execute(input: ListarEquipeRestauranteInput): Promise<ListarEquipeRestauranteOutput> {
    const vinculos = await this.usuarioRestauranteRepo.findByRestauranteId(input.restauranteId);

    const membros: MembroEquipe[] = vinculos.map(v => ({
      id: v.id,
      usuarioId: v.usuarioId,
      papel: v.papel,
      criadoEm: v.criadoEm,
    }));

    return {
      membros,
      sucesso: true,
    };
  }
}
