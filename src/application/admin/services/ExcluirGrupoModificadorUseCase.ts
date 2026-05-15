import { UseCase } from '@/application/shared';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';

/**
 * Input para excluir grupo de modificadores
 */
export interface ExcluirGrupoModificadorInput {
  id: string;
}

/**
 * Output após excluir grupo de modificadores
 */
export interface ExcluirGrupoModificadorOutput {
  sucesso: boolean;
}

/**
 * Use Case para excluir um grupo de modificadores (soft delete).
 * O grupo deixa de aparecer no cardápio mas permanece em dados históricos de pedidos.
 */
export class ExcluirGrupoModificadorUseCase implements UseCase<ExcluirGrupoModificadorInput, ExcluirGrupoModificadorOutput> {
  constructor(
    private grupoRepo: IModificadorGrupoRepository
  ) {}

  async execute(input: ExcluirGrupoModificadorInput): Promise<ExcluirGrupoModificadorOutput> {
    const { id } = input;

    // Buscar grupo existente
    const grupoExistente = await this.grupoRepo.buscarPorId(id);
    if (!grupoExistente) {
      throw new Error('Grupo de modificador não encontrado');
    }

    // Verificar se já está desativado
    if (!grupoExistente.ativo) {
      throw new Error('Grupo de modificador já está desativado');
    }

    // Soft delete - desativar o grupo (preserva dados para pedidos históricos)
    grupoExistente.desativar();

    // Persistir alterações
    await this.grupoRepo.salvar(grupoExistente);

    return {
      sucesso: true,
    };
  }
}
