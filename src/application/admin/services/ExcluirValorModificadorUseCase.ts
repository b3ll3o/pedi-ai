import { UseCase } from '@/application/shared';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';

/**
 * Input para excluir valor de modificador
 */
export interface ExcluirValorModificadorInput {
  grupoId: string;
  valorId: string;
}

/**
 * Output após excluir valor de modificador
 */
export interface ExcluirValorModificadorOutput {
  sucesso: boolean;
}

/**
 * Use Case para excluir um valor de modificador (soft delete).
 * O valor deixa de aparecer no cardápio mas permanece em dados históricos de pedidos.
 */
export class ExcluirValorModificadorUseCase implements UseCase<ExcluirValorModificadorInput, ExcluirValorModificadorOutput> {
  constructor(
    private grupoRepo: IModificadorGrupoRepository
  ) {}

  async execute(input: ExcluirValorModificadorInput): Promise<ExcluirValorModificadorOutput> {
    const { grupoId, valorId } = input;

    // Buscar grupo existente
    const grupoExistente = await this.grupoRepo.buscarPorId(grupoId);
    if (!grupoExistente) {
      throw new Error('Grupo de modificador não encontrado');
    }

    // Buscar valor dentro do grupo
    const valor = grupoExistente.getValor(valorId);
    if (!valor) {
      throw new Error('Valor de modificador não encontrado');
    }

    // Soft delete - desativar o valor (preserva dados para pedidos históricos)
    valor.desativar();

    // Persistir alterações
    await this.grupoRepo.salvar(grupoExistente);

    return {
      sucesso: true,
    };
  }
}
