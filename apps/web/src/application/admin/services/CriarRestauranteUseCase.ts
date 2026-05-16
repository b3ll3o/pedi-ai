import { UseCase } from '@/application/shared';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { RestauranteCriadoEvent } from '@/domain/admin/events/RestauranteCriadoEvent';
import { ConfiguracoesRestaurante } from '@/domain/admin/value-objects/ConfiguracoesRestaurante';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

/**
 * Input para criar restaurante
 */
export interface CriarRestauranteInput {
  nome: string;
  cnpj: string;
  endereco?: string;
  telefone?: string;
  logoUrl?: string;
  ownerId: string;
}

/**
 * Output após criar restaurante
 */
export interface CriarRestauranteOutput {
  restaurante: Restaurante;
  vinculo: UsuarioRestaurante;
}

/**
 * Valida formato do CNPJ (XX.XXX.XXX/XXXX-XX)
 */
function validarCNPJ(cnpj: string): boolean {
  const regex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
  return regex.test(cnpj);
}

/**
 * Use Case para criar um novo restaurante
 * Cria o restaurante E já vincule o owner via UsuarioRestaurante
 */
export class CriarRestauranteUseCase implements UseCase<
  CriarRestauranteInput,
  CriarRestauranteOutput
> {
  constructor(
    private restauranteRepo: IRestauranteRepository,
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository,
    private eventEmitter?: (event: RestauranteCriadoEvent) => void
  ) {}

  async execute(input: CriarRestauranteInput): Promise<CriarRestauranteOutput> {
    // Validar nome (mínimo 2 caracteres)
    if (!input.nome || input.nome.trim().length < 2) {
      throw new Error('O nome do restaurante deve ter pelo menos 2 caracteres');
    }

    // Validar CNPJ (formato XX.XXX.XXX/XXXX-XX)
    if (!validarCNPJ(input.cnpj)) {
      throw new Error('CNPJ inválido. O formato deve ser XX.XXX.XXX/XXXX-XX');
    }

    // Verificar se feature flag multi-restaurant está habilitada
    const multiRestaurantAtivo = isMultiRestaurantEnabled();

    // Se feature flag desabilitada, verificar se owner já tem restaurante legacy
    if (!multiRestaurantAtivo) {
      const restaurantesDoOwner = await this.usuarioRestauranteRepo.findByUsuarioId(input.ownerId);
      if (restaurantesDoOwner.length > 0) {
        throw new Error(
          'Não é permitido criar novos restaurantes enquanto a funcionalidade multi-restaurante estiver desativada'
        );
      }
    }

    // Verificar se CNPJ já existe
    const existente = await this.restauranteRepo.findByCNPJ(input.cnpj);
    if (existente) {
      throw new Error('Já existe um restaurante cadastrado com este CNPJ');
    }

    // Criar restaurante
    const restaurante = Restaurante.criar({
      nome: input.nome.trim(),
      cnpj: input.cnpj,
      endereco: input.endereco?.trim() ?? '',
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
      usuarioId: input.ownerId,
      restauranteId: restaurantePersistido.id,
      papel: 'dono',
    });

    await this.usuarioRestauranteRepo.save(vinculoOwner);

    // Emitir evento
    if (this.eventEmitter) {
      this.eventEmitter(
        new RestauranteCriadoEvent({
          restauranteId: restaurantePersistido.id,
          nome: restaurantePersistido.nome,
          proprietarioId: input.ownerId,
        })
      );
    }

    return {
      restaurante: restaurantePersistido,
      vinculo: vinculoOwner,
    };
  }
}
