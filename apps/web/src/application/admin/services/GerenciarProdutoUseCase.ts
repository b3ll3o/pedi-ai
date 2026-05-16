import { UseCase } from '@/application/shared';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';
import { LabelDietetico } from '@/domain/cardapio/value-objects/LabelDietetico';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

/**
 * Input para gerenciar produto/item do cardápio
 */
export interface ProdutoInput {
  acao: 'criar' | 'atualizar' | 'excluir' | 'ativar' | 'desativar';
  id?: string;
  categoriaId: string;
  restauranteId?: string;
  nome?: string;
  descricao?: string | null;
  preco?: number; // em centavos
  imagemUrl?: string | null;
  tipo?: 'produto' | 'combo';
  labelsDieteticos?: string[];
  /** ID do usuário logado (necessário para validar acesso quando multi-restaurant está ativo) */
  usuarioId?: string;
}

/**
 * Output após gerenciar produto
 */
export interface ProdutoOutput {
  produto?: ItemCardapio;
  sucesso: boolean;
}

/**
 * Use Case para CRUD de produtos/itens do cardápio
 */
export class GerenciarProdutoUseCase implements UseCase<ProdutoInput, ProdutoOutput> {
  constructor(
    private produtoRepo: {
      buscarPorId(id: string): Promise<ItemCardapio | null>;
      buscarPorCategoria(categoriaId: string): Promise<ItemCardapio[]>;
      salvar(item: ItemCardapio): Promise<ItemCardapio>;
      excluir(id: string): Promise<void>;
    },
    private categoriaRepo: {
      buscarPorId(id: string): Promise<{ id: string; restauranteId?: string } | null>;
    },
    private usuarioRestauranteRepo?: {
      findByUsuarioIdAndRestauranteId(
        usuarioId: string,
        restauranteId: string
      ): Promise<{ id: string; papel: 'dono' | 'gerente' | 'atendente' } | null>;
    }
  ) {}

  /**
   * Valida se o usuário tem acesso ao restaurante (quando multi-restaurant está ativo)
   * Apenas usuários com papel 'dono' ou 'gerente' podem gerenciar produtos
   */
  private async validarAcessoRestaurante(
    usuarioId: string | undefined,
    restauranteId: string | undefined
  ): Promise<void> {
    if (!isMultiRestaurantEnabled()) {
      return; // Modo legacy - não valida acesso
    }

    if (!usuarioId || !restauranteId) {
      throw new Error(
        'usuarioId e restauranteId são obrigatórios para operações de produto quando multi-restaurant está ativo'
      );
    }

    if (!this.usuarioRestauranteRepo) {
      throw new Error('Repositório de vínculo usuário-restaurante não configurado');
    }

    const vinculo = await this.usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(
      usuarioId,
      restauranteId
    );
    if (!vinculo) {
      throw new Error('Usuário não tem vínculo com este restaurante');
    }

    if (vinculo.papel !== 'dono' && vinculo.papel !== 'gerente') {
      throw new Error('Apenas proprietários e gerentes podem gerenciar produtos');
    }
  }

  async execute(input: ProdutoInput): Promise<ProdutoOutput> {
    // Validar acesso ao restaurante (quando multi-restaurant está ativo)
    await this.validarAcessoRestaurante(input.usuarioId, input.restauranteId);

    switch (input.acao) {
      case 'criar':
        return this.criar(input);
      case 'atualizar':
        return this.atualizar(input);
      case 'excluir':
        return this.excluir(input);
      case 'ativar':
        return this.ativar(input);
      case 'desativar':
        return this.desativar(input);
      default:
        throw new Error(`Ação desconhecida: ${input.acao}`);
    }
  }

  private async criar(input: ProdutoInput): Promise<ProdutoOutput> {
    if (!input.nome) {
      throw new Error('Nome é obrigatório para criar produto');
    }
    if (input.preco === undefined || input.preco < 0) {
      throw new Error('Preço é obrigatório e deve ser positivo');
    }

    // Validar categoria existe
    const categoria = await this.categoriaRepo.buscarPorId(input.categoriaId);
    if (!categoria) {
      throw new Error('Categoria não encontrada');
    }

    const labels = (input.labelsDieteticos ?? []).map((l) => LabelDietetico.fromValue(l));

    const produto = ItemCardapio.criar({
      categoriaId: input.categoriaId,
      nome: input.nome,
      descricao: input.descricao ?? null,
      preco: Dinheiro.criar(input.preco),
      imagemUrl: input.imagemUrl ?? null,
      tipo: input.tipo ? TipoItemCardapio.fromValue(input.tipo) : TipoItemCardapio.PRODUTO,
      labelsDieteticos: labels,
      ativo: true,
    });

    const produtoPersistido = await this.produtoRepo.salvar(produto);

    return { produto: produtoPersistido, sucesso: true };
  }

  private async atualizar(input: ProdutoInput): Promise<ProdutoOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para atualizar produto');
    }

    const produto = await this.produtoRepo.buscarPorId(input.id);
    if (!produto) {
      throw new Error('Produto não encontrado');
    }

    if (input.nome) {
      produto.atualizarNome(input.nome);
    }
    if (input.descricao !== undefined) {
      produto.atualizarDescricao(input.descricao);
    }
    if (input.preco !== undefined) {
      produto.atualizarPreco(Dinheiro.criar(input.preco));
    }
    if (input.imagemUrl !== undefined) {
      produto.atualizarImagem(input.imagemUrl);
    }
    if (input.tipo) {
      produto.atualizarTipo(TipoItemCardapio.fromValue(input.tipo));
    }
    if (input.labelsDieteticos) {
      produto.atualizarLabels(input.labelsDieteticos.map((l) => LabelDietetico.fromValue(l)));
    }

    const produtoAtualizado = await this.produtoRepo.salvar(produto);

    return { produto: produtoAtualizado, sucesso: true };
  }

  private async excluir(input: ProdutoInput): Promise<ProdutoOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para excluir produto');
    }

    await this.produtoRepo.excluir(input.id);

    return { sucesso: true };
  }

  private async ativar(input: ProdutoInput): Promise<ProdutoOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para ativar produto');
    }

    const produto = await this.produtoRepo.buscarPorId(input.id);
    if (!produto) {
      throw new Error('Produto não encontrado');
    }

    produto.ativar();
    const produtoAtualizado = await this.produtoRepo.salvar(produto);

    return { produto: produtoAtualizado, sucesso: true };
  }

  private async desativar(input: ProdutoInput): Promise<ProdutoOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para desativar produto');
    }

    const produto = await this.produtoRepo.buscarPorId(input.id);
    if (!produto) {
      throw new Error('Produto não encontrado');
    }

    produto.desativar();
    const produtoAtualizado = await this.produtoRepo.salvar(produto);

    return { produto: produtoAtualizado, sucesso: true };
  }
}
