import { UseCase } from '@/application/shared';
import { Categoria } from '@/domain/cardapio/entities/Categoria';
import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

/**
 * Input para gerenciar categoria
 */
export interface CategoriaInput {
  acao: 'criar' | 'atualizar' | 'excluir' | 'ativar' | 'desativar';
  id?: string;
  restauranteId: string;
  nome?: string;
  descricao?: string | null;
  imagemUrl?: string | null;
  ordemExibicao?: number;
  /** ID do usuário logado (necessário para validar acesso quando multi-restaurant está ativo) */
  usuarioId?: string;
}

/**
 * Output após gerenciar categoria
 */
export interface CategoriaOutput {
  categoria?: Categoria;
  sucesso: boolean;
}

/**
 * Use Case para CRUD de categorias do cardápio
 */
export class GerenciarCategoriaUseCase implements UseCase<CategoriaInput, CategoriaOutput> {
  constructor(
    private categoriaRepo: {
      buscarPorId(id: string): Promise<Categoria | null>;
      buscarPorRestaurante(restauranteId: string): Promise<Categoria[]>;
      salvar(categoria: Categoria): Promise<Categoria>;
      excluir(id: string): Promise<void>;
    },
    private usuarioRestauranteRepo?: {
      findByUsuarioIdAndRestauranteId(usuarioId: string, restauranteId: string): Promise<{ id: string } | null>;
    }
  ) {}

  /**
   * Valida se o usuário tem acesso ao restaurante (quando multi-restaurant está ativo)
   */
  private async validarAcessoRestaurante(usuarioId: string | undefined, restauranteId: string): Promise<void> {
    if (!isMultiRestaurantEnabled()) {
      return; // Modo legacy - não valida acesso
    }

    if (!usuarioId) {
      throw new Error('usuarioId é obrigatório para operações de categoria quando multi-restaurant está ativo');
    }

    if (!this.usuarioRestauranteRepo) {
      throw new Error('Repositório de vínculo usuário-restaurante não configurado');
    }

    const vinculo = await this.usuarioRestauranteRepo.findByUsuarioIdAndRestauranteId(usuarioId, restauranteId);
    if (!vinculo) {
      throw new Error('Usuário não tem acesso a este restaurante');
    }
  }

  async execute(input: CategoriaInput): Promise<CategoriaOutput> {
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

  private async criar(input: CategoriaInput): Promise<CategoriaOutput> {
    if (!input.nome) {
      throw new Error('Nome é obrigatório para criar categoria');
    }

    // Buscar próxima ordem de exibição
    const categorias = await this.categoriaRepo.buscarPorRestaurante(input.restauranteId);
    const proximaOrdem = input.ordemExibicao ?? categorias.length;

    const categoria = Categoria.criar({
      restauranteId: input.restauranteId,
      nome: input.nome,
      descricao: input.descricao ?? null,
      imagemUrl: input.imagemUrl ?? null,
      ordemExibicao: proximaOrdem,
      ativo: true,
    });

    const categoriaPersistida = await this.categoriaRepo.salvar(categoria);

    return { categoria: categoriaPersistida, sucesso: true };
  }

  private async atualizar(input: CategoriaInput): Promise<CategoriaOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para atualizar categoria');
    }

    const categoria = await this.categoriaRepo.buscarPorId(input.id);
    if (!categoria) {
      throw new Error('Categoria não encontrada');
    }

    if (input.nome) {
      categoria.atualizarNome(input.nome);
    }
    if (input.descricao !== undefined) {
      categoria.atualizarDescricao(input.descricao);
    }
    if (input.ordemExibicao !== undefined) {
      categoria.atualizarOrdem(input.ordemExibicao);
    }

    const categoriaAtualizada = await this.categoriaRepo.salvar(categoria);

    return { categoria: categoriaAtualizada, sucesso: true };
  }

  private async excluir(input: CategoriaInput): Promise<CategoriaOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para excluir categoria');
    }

    await this.categoriaRepo.excluir(input.id);

    return { sucesso: true };
  }

  private async ativar(input: CategoriaInput): Promise<CategoriaOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para ativar categoria');
    }

    const categoria = await this.categoriaRepo.buscarPorId(input.id);
    if (!categoria) {
      throw new Error('Categoria não encontrada');
    }

    categoria.ativar();
    const categoriaAtualizada = await this.categoriaRepo.salvar(categoria);

    return { categoria: categoriaAtualizada, sucesso: true };
  }

  private async desativar(input: CategoriaInput): Promise<CategoriaOutput> {
    if (!input.id) {
      throw new Error('ID é obrigatório para desativar categoria');
    }

    const categoria = await this.categoriaRepo.buscarPorId(input.id);
    if (!categoria) {
      throw new Error('Categoria não encontrada');
    }

    categoria.desativar();
    const categoriaAtualizada = await this.categoriaRepo.salvar(categoria);

    return { categoria: categoriaAtualizada, sucesso: true };
  }
}
