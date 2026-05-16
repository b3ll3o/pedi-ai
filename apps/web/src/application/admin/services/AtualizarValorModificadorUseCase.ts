import { UseCase } from '@/application/shared';
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

/**
 * Input para atualizar valor de modificador
 */
export interface AtualizarValorModificadorInput {
  grupoId: string;
  valorId: string;
  nome?: string;
  ajustePreco?: number; // em centavos
  ativo?: boolean;
}

/**
 * Output após atualizar valor de modificador
 */
export interface AtualizarValorModificadorOutput {
  valor: ModificadorValor;
}

/**
 * Use Case para atualizar um valor de modificador existente
 */
export class AtualizarValorModificadorUseCase implements UseCase<
  AtualizarValorModificadorInput,
  AtualizarValorModificadorOutput
> {
  constructor(private grupoRepo: IModificadorGrupoRepository) {}

  async execute(input: AtualizarValorModificadorInput): Promise<AtualizarValorModificadorOutput> {
    // Buscar grupo de modificador
    const grupo = await this.grupoRepo.buscarPorId(input.grupoId);
    if (!grupo) {
      throw new Error('Grupo de modificador não encontrado');
    }

    // Buscar valor dentro do grupo
    const valor = grupo.getValor(input.valorId);
    if (!valor) {
      throw new Error('Valor de modificador não encontrado');
    }

    // Atualizar nome se fornecido
    if (input.nome !== undefined) {
      if (!input.nome || input.nome.trim().length === 0) {
        throw new Error('Nome é obrigatório');
      }
      valor.atualizarNome(input.nome.trim());
    }

    // Atualizar ajuste de preço se fornecido
    if (input.ajustePreco !== undefined) {
      valor.atualizarAjustePreco(Dinheiro.criar(input.ajustePreco));
    }

    // Atualizar status ativo se fornecido
    if (input.ativo !== undefined) {
      if (input.ativo) {
        valor.ativar();
      } else {
        valor.desativar();
      }
    }

    // Persistir grupo com o valor atualizado
    await this.grupoRepo.salvar(grupo);

    return {
      valor,
    };
  }
}
