import { UseCase } from '@/application/shared';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { RestauranteAtualizadoEvent } from '@/domain/admin/events/RestauranteAtualizadoEvent';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';

/**
 * Input para atualizar restaurante
 */
export interface AtualizarRestauranteInput {
  id: string;
  nome?: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string | null;
  logoUrl?: string | null;
}

/**
 * Output após atualizar restaurante
 */
export interface AtualizarRestauranteOutput {
  restaurante: Restaurante;
  sucesso: boolean;
}

/**
 * Use Case para atualizar dados do restaurante
 */
export class AtualizarRestauranteUseCase implements UseCase<AtualizarRestauranteInput, AtualizarRestauranteOutput> {
  constructor(
    private restauranteRepo: IRestauranteRepository,
    private eventEmitter?: (event: RestauranteAtualizadoEvent) => void
  ) {}

  async execute(input: AtualizarRestauranteInput): Promise<AtualizarRestauranteOutput> {
    const restaurante = await this.restauranteRepo.findById(input.id);
    if (!restaurante) {
      throw new Error('Restaurante não encontrado');
    }

    if (input.nome) {
      restaurante.atualizarNome(input.nome);
    }
    if (input.endereco) {
      restaurante.atualizarEndereco(input.endereco);
    }
    if (input.telefone !== undefined) {
      restaurante.atualizarTelefone(input.telefone);
    }
    if (input.logoUrl !== undefined) {
      restaurante.atualizarLogo(input.logoUrl);
    }

    // Buscar configuracoes existentes para update (mantém as mesmas)
    const configuracoes = ConfiguracoesRestaurante.criarPadrao(); // TODO: buscar configuracoes existentes

    const restauranteAtualizado = await this.restauranteRepo.update(restaurante, configuracoes);

    // Emitir evento
    if (this.eventEmitter) {
      this.eventEmitter(
        new RestauranteAtualizadoEvent({
          restauranteId: restauranteAtualizado.id,
          nome: restauranteAtualizado.nome,
        })
      );
    }

    return {
      restaurante: restauranteAtualizado,
      sucesso: true,
    };
  }
}
