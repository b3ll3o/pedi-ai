import { UseCase } from '@/application/shared';
import { ModificadorGrupo } from '@/domain/cardapio/entities/ModificadorGrupo';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';

/**
 * Input para atualizar grupo de modificadores
 */
export interface AtualizarGrupoModificadorInput {
  id: string;
  nome: string;
  obrigatorio: boolean;
  minSelecoes: number;
  maxSelecoes: number;
}

/**
 * Output após atualizar grupo de modificadores
 */
export interface AtualizarGrupoModificadorOutput {
  grupo: ModificadorGrupo;
}

/**
 * Use Case para atualizar um grupo de modificadores existente
 */
export class AtualizarGrupoModificadorUseCase implements UseCase<
  AtualizarGrupoModificadorInput,
  AtualizarGrupoModificadorOutput
> {
  constructor(private grupoRepo: IModificadorGrupoRepository) {}

  async execute(input: AtualizarGrupoModificadorInput): Promise<AtualizarGrupoModificadorOutput> {
    // Validar nome (não pode ser vazio)
    if (!input.nome || input.nome.trim().length === 0) {
      throw new Error('Nome é obrigatório');
    }

    // Buscar grupo existente
    const grupoExistente = await this.grupoRepo.buscarPorId(input.id);
    if (!grupoExistente) {
      throw new Error('Grupo de modificador não encontrado');
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

    // Validar que maxSelecoes não excede quantidade de valores ativos
    if (input.maxSelecoes > grupoExistente.valoresAtivos.length) {
      throw new Error('maxSelecoes não pode exceder a quantidade de valores ativos');
    }

    // Atualizar propriedades
    grupoExistente.atualizarNome(input.nome.trim());
    grupoExistente.atualizarObrigatoriedade(input.obrigatorio);
    grupoExistente.atualizarSelecoes(input.minSelecoes, input.maxSelecoes);

    // Persistir grupo atualizado
    const grupoAtualizado = await this.grupoRepo.salvar(grupoExistente);

    return {
      grupo: grupoAtualizado,
    };
  }
}
