import { UseCase } from '@/application/shared';
import { ModificadorValor } from '@/domain/cardapio/entities/ModificadorValor';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';

/**
 * Input para criar valor de modificador
 */
export interface CriarValorModificadorInput {
  grupoId: string;
  nome: string;
  ajustePreco: number; // em centavos
  ativo?: boolean;
}

/**
 * Output após criar valor de modificador
 */
export interface CriarValorModificadorOutput {
  valor: ModificadorValor;
}

/**
 * Use Case para criar um novo valor de modificador em um grupo existente
 */
export class CriarValorModificadorUseCase implements UseCase<CriarValorModificadorInput, CriarValorModificadorOutput> {
  constructor(
    private grupoRepo: IModificadorGrupoRepository
  ) {}

  async execute(input: CriarValorModificadorInput): Promise<CriarValorModificadorOutput> {
    // Validar nome (não pode ser vazio)
    if (!input.nome || input.nome.trim().length === 0) {
      throw new Error('Nome é obrigatório');
    }

    // Buscar grupo de modificador
    const grupo = await this.grupoRepo.buscarPorId(input.grupoId);
    if (!grupo) {
      throw new Error('Grupo de modificador não encontrado');
    }

    // Criar valor de modificador
    const valor = ModificadorValor.criar({
      modificadorGrupoId: input.grupoId,
      restauranteId: grupo.restauranteId,
      nome: input.nome.trim(),
      ajustePreco: Dinheiro.criar(input.ajustePreco),
      ativo: input.ativo ?? true,
    });

    // Adicionar valor ao grupo
    grupo.adicionarValor(valor);

    // Persistir grupo com o novo valor
    await this.grupoRepo.salvar(grupo);

    return {
      valor,
    };
  }
}
