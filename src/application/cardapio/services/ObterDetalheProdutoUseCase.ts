import { UseCase } from '@/application/shared/types/UseCase';
import {
  IItemCardapioRepository,
  IModificadorGrupoRepository,
  ItemCardapio,
  ModificadorGrupo,
} from '@/domain/cardapio';

export interface ProdutoDetalhe {
  produto: ItemCardapio;
  modificadores: ModificadorGrupo[];
}

export interface ObterDetalheProdutoInput {
  produtoId: string;
}

export class ObterDetalheProdutoUseCase implements UseCase<ObterDetalheProdutoInput, ProdutoDetalhe> {
  constructor(
    private itemCardapioRepo: IItemCardapioRepository,
    private modificadorGrupoRepo: IModificadorGrupoRepository
  ) {}

  async execute(input: ObterDetalheProdutoInput): Promise<ProdutoDetalhe> {
    // 1. Buscar produto por ID
    const produto = await this.itemCardapioRepo.buscarPorId(input.produtoId);
    if (!produto) {
      throw new Error(`Produto ${input.produtoId} não encontrado`);
    }

    // 2. Buscar modificadores do produto
    const modificadores = await this.modificadorGrupoRepo.buscarPorProduto(input.produtoId);

    // 3. Filtrar apenas modificadores ativos
    const modificadoresAtivos = modificadores.filter((g) => g.valoresAtivos.length > 0);

    return {
      produto,
      modificadores: modificadoresAtivos,
    };
  }
}
