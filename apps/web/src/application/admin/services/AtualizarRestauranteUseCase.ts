import { UseCase } from '@/application/shared';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { RestauranteAtualizadoEvent } from '@/domain/admin/events/RestauranteAtualizadoEvent';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
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

/** Lança erro se CNPJ já estiver em uso por outro restaurante */
async function validarCNPJUnico(
  cnpj: string,
  restauranteId: string,
  restauranteRepo: IRestauranteRepository
): Promise<void> {
  const existente = await restauranteRepo.findByCNPJ(cnpj);
  if (existente && existente.id !== restauranteId) {
    throw new Error('Já existe um restaurante cadastrado com este CNPJ');
  }
}

/** Valida que o usuário é dono do restaurante (multi-restaurant ou legacy) */
async function validarDonoDoRestaurante(
  proprietarioId: string,
  restauranteId: string,
  usuarioRestauranteRepo: IUsuarioRestauranteRepository
): Promise<void> {
  const multiRestaurantAtivo = isMultiRestaurantEnabled();

  if (multiRestaurantAtivo) {
    const vinculo = await usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
      proprietarioId,
      restauranteId
    );
    if (!vinculo || !vinculo.eDono()) {
      throw new Error('Você não tem permissão para atualizar este restaurante');
    }
    return;
  }

  // Lógica legacy: verificar se existe algum vínculo
  const vinculos = await usuarioRestauranteRepo.findByUsuarioId(proprietarioId);
  const vinculoValido = vinculos.some((v) => v.restauranteId === restauranteId && v.eDono());
  if (!vinculoValido) {
    throw new Error('Você não tem permissão para atualizar este restaurante');
  }
}

/** Aplica atualizações de campos no restaurante */
function aplicarAtualizacoes(
  restaurante: Restaurante,
  dados: AtualizarRestauranteInput['dados']
): void {
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
}

/**
 * Use Case para atualizar dados do restaurante.
 * Requer que o usuário seja owner do restaurante.
 */
export class AtualizarRestauranteUseCase implements UseCase<
  AtualizarRestauranteInput,
  AtualizarRestauranteOutput
> {
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
      await validarCNPJUnico(dados.cnpj, restauranteId, this.restauranteRepo);
    }

    // Validar propriedade do restaurante
    await validarDonoDoRestaurante(proprietarioId, restauranteId, this.usuarioRestauranteRepo);

    // Atualizar dados do restaurante
    aplicarAtualizacoes(restaurante, dados);

    // Validar que CNPJ não foi alterado
    if (dados.cnpj !== undefined && dados.cnpj !== null) {
      if (dados.cnpj !== restaurante.cnpj) {
        throw new Error('O CNPJ do restaurante não pode ser alterado');
      }
    }

    // Persistir alterações
    const { ConfiguracoesRestaurante } =
      await import('@/domain/admin/value-objects/ConfiguracoesRestaurante');
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
