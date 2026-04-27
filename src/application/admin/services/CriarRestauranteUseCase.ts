import { UseCase } from '@/application/shared';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { RestauranteCriadoEvent } from '@/domain/admin/events/RestauranteCriadoEvent';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';

/**
 * Input para criar restaurante
 */
export interface CriarRestauranteInput {
  proprietarioId: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone?: string | null;
  logoUrl?: string | null;
}

/**
 * Output após criar restaurante
 */
export interface CriarRestauranteOutput {
  restaurante: Restaurante;
  vinculoOwner: UsuarioRestaurante;
  sucesso: boolean;
}

/**
 * Use Case para criar um novo restaurante
 * Cria o restaurante E já vincule o owner via UsuarioRestaurante
 */
export class CriarRestauranteUseCase implements UseCase<CriarRestauranteInput, CriarRestauranteOutput> {
  constructor(
    private restauranteRepo: IRestauranteRepository,
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository,
    private eventEmitter?: (event: RestauranteCriadoEvent) => void
  ) {}

  async execute(input: CriarRestauranteInput): Promise<CriarRestauranteOutput> {
    // Verificar se CNPJ já existe
    const existente = await this.restauranteRepo.findByCNPJ(input.cnpj);
    if (existente) {
      throw new Error('Já existe um restaurante cadastrado com este CNPJ');
    }

    // Criar restaurante
    const restaurante = Restaurante.criar({
      nome: input.nome,
      cnpj: input.cnpj,
      endereco: input.endereco,
      telefone: input.telefone ?? null,
      logoUrl: input.logoUrl ?? null,
      ativo: true,
    });

    // Criar configuração padrão
    const configuracoes = ConfiguracoesRestaurante.criarPadrao();

    // Persistir restaurante
    const restaurantePersistido = await this.restauranteRepo.create(restaurante, configuracoes);

    // Criar vínculo de owner
    const vinculoOwner = UsuarioRestaurante.criar({
      usuarioId: input.proprietarioId,
      restauranteId: restaurantePersistido.id,
      papel: 'owner',
    });

    await this.usuarioRestauranteRepo.save(vinculoOwner);

    // Emitir evento
    if (this.eventEmitter) {
      this.eventEmitter(
        new RestauranteCriadoEvent({
          restauranteId: restaurantePersistido.id,
          nome: restaurantePersistido.nome,
          proprietarioId: input.proprietarioId,
        })
      );
    }

    return {
      restaurante: restaurantePersistido,
      vinculoOwner,
      sucesso: true,
    };
  }
}
