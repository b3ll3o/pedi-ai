import { UseCase } from '@/application/shared';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

/**
 * Input para criar grupo de modificadores
 */
export interface CriarGrupoModificadorInput {
  restauranteId: string;
  nome: string;
  obrigatorio: boolean;
  minSelecoes: number;
  maxSelecoes: number;
  valores: Array<{
    nome: string;
    ajustePreco: number; // em centavos
  }>;
}

/**
 * Output após criar grupo de modificadores
 */
export interface CriarGrupoModificadorOutput {
  grupo: ModificadorGrupo;
}

/**
 * Use Case para criar um novo grupo de modificadores
 */
export class CriarGrupoModificadorUseCase implements UseCase<
  CriarGrupoModificadorInput,
  CriarGrupoModificadorOutput
> {
  constructor(
    private grupoRepo: IModificadorGrupoRepository,
    private restauranteRepo: IRestauranteRepository
  ) {}

  async execute(input: CriarGrupoModificadorInput): Promise<CriarGrupoModificadorOutput> {
    // Validar nome (não pode ser vazio)
    if (!input.nome || input.nome.trim().length === 0) {
      throw new Error('Nome é obrigatório');
    }

    // Validar restaurante existe
    const restaurante = await this.restauranteRepo.findById(input.restauranteId);
    if (!restaurante) {
      throw new Error('Restaurante não encontrado');
    }

    // Validar configuração de selections
    if (input.minSelecoes < 0) {
      throw new Error('minSelecoes não pode ser negativo');
    }

    if (input.maxSelecoes < input.minSelecoes) {
      throw new Error('maxSelecoes não pode ser menor que minSelecoes');
    }

    // Se obrigatório, minSelecoes deve ser pelo menos 1
    if (input.obrigatorio && input.minSelecoes < 1) {
      throw new Error('Grupo obrigatório deve ter minSelecoes >= 1');
    }

    // Criar grupo de modificador (gera ID automaticamente)
    const grupo = ModificadorGrupo.criar({
      restauranteId: input.restauranteId,
      nome: input.nome.trim(),
      obrigatorio: input.obrigatorio,
      minSelecoes: input.minSelecoes,
      maxSelecoes: input.maxSelecoes,
      valores: [], // valores serão adicionados após
      ativo: true,
    });

    // Criar valores de modificador com o ID do grupo
    const valoresModificador = input.valores.map((v) =>
      ModificadorValor.criar({
        modificadorGrupoId: grupo.id,
        restauranteId: input.restauranteId,
        nome: v.nome,
        ajustePreco: Dinheiro.criar(v.ajustePreco),
        ativo: true,
      })
    );

    // Adicionar valores ao grupo
    for (const valor of valoresModificador) {
      grupo.adicionarValor(valor);
    }

    // Validar que maxSelecoes não excede quantidade de valores
    if (input.maxSelecoes > grupo.valoresAtivos.length) {
      throw new Error('maxSelecoes não pode exceder a quantidade de valores ativos');
    }

    // Persistir grupo
    const grupoPersistido = await this.grupoRepo.salvar(grupo);

    return {
      grupo: grupoPersistido,
    };
  }
}
