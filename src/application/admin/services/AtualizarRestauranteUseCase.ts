import { UseCase } from '@/application/shared';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { RestauranteAtualizadoEvent } from '@/domain/admin/events/RestauranteAtualizadoEvent';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

/**
 * Input para atualizar restaurante
 */
export interface AtualizarRestauranteInput {
  restauranteId: string;
  proprietarioId: string;
  dados: {
    nome?: string;
    cnpj?: string;
    endereco?: string;
    telefone?: string;
    logoUrl?: string;
  };
}

/**
 * Output após atualizar restaurante
 */
export interface AtualizarRestauranteOutput {
  restaurante: Restaurante;
  sucesso: boolean;
}

/**
 * Valida formato do CNPJ (XX.XXX.XXX/XXXX-XX)
 */
function validarCNPJ(cnpj: string): boolean {
  const regex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
  return regex.test(cnpj);
}

/**
 * Use Case para atualizar dados do restaurante.
 * Requer que o usuário seja owner do restaurante.
 */
export class AtualizarRestauranteUseCase implements UseCase<AtualizarRestauranteInput, AtualizarRestauranteOutput> {
  constructor(
    private restauranteRepo: IRestauranteRepository,
    private usuarioRestauranteRepo: IUsuarioRestauranteRepository,
    private eventEmitter?: (event: RestauranteAtualizadoEvent) => void
  ) {}

  async execute(input: AtualizarRestauranteInput): Promise<AtualizarRestauranteOutput> {
    const { restauranteId, proprietarioId, dados } = input;

    // Buscar restaurante
    const restaurante = await this.restauranteRepo.findById(restauranteId);
    if (!restaurante) {
      throw new Error('Restaurante não encontrado');
    }

    // Validar CNPJ se fornecido
    if (dados.cnpj !== undefined && dados.cnpj !== null) {
      if (!validarCNPJ(dados.cnpj)) {
        throw new Error('CNPJ inválido. O formato deve ser XX.XXX.XXX/XXXX-XX');
      }

      // Verificar se CNPJ já está em uso por outro restaurante
      const existente = await this.restauranteRepo.findByCNPJ(dados.cnpj);
      if (existente && existente.id !== restauranteId) {
        throw new Error('Já existe um restaurante cadastrado com este CNPJ');
      }
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
        throw new Error('Você não tem permissão para atualizar este restaurante');
      }
    } else {
      // Lógica legacy: verificar se existe algum vínculo
      const vinculos = await this.usuarioRestauranteRepo.findByUsuarioId(proprietarioId);
      const vinculoValido = vinculos.some(
        v => v.restauranteId === restauranteId && v.eDono()
      );

      if (!vinculoValido) {
        throw new Error('Você não tem permissão para atualizar este restaurante');
      }
    }

    // Atualizar dados do restaurante
    if (dados.nome !== undefined && dados.nome !== null) {
      if (dados.nome.trim().length < 2) {
        throw new Error('O nome do restaurante deve ter pelo menos 2 caracteres');
      }
      restaurante.atualizarNome(dados.nome.trim());
    }

    if (dados.endereco !== undefined && dados.endereco !== null) {
      restaurante.atualizarEndereco(dados.endereco.trim());
    }

    if (dados.telefone !== undefined) {
      restaurante.atualizarTelefone(dados.telefone?.trim() ?? null);
    }

    if (dados.logoUrl !== undefined) {
      restaurante.atualizarLogo(dados.logoUrl?.trim() ?? null);
    }

    // Validar CNPJ se fornecido (CNPJ não pode ser alterado após criação)
    if (dados.cnpj !== undefined && dados.cnpj !== null) {
      if (dados.cnpj !== restaurante.cnpj) {
        throw new Error('O CNPJ do restaurante não pode ser alterado');
      }
    }

    // Persistir alterações (não temos o config, usar padrão - TODO: buscar config existente)
    const { ConfiguracoesRestaurante } = await import('@/domain/admin/value-objects/ConfiguracoesRestaurante');
    const configuracoes = ConfiguracoesRestaurante.criarPadrao();

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
