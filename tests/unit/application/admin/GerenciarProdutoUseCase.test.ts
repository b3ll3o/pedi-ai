import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GerenciarProdutoUseCase } from '@/application/admin/services/GerenciarProdutoUseCase';
import type { ProdutoInput } from '@/application/admin/services/GerenciarProdutoUseCase';
import { ItemCardapio } from '@/domain/cardapio/entities/ItemCardapio';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { TipoItemCardapio } from '@/domain/cardapio/value-objects/TipoItemCardapio';

// Mock da feature flag
vi.mock('@/lib/feature-flags', () => ({
  isMultiRestaurantEnabled: vi.fn(),
}));

import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

const mockIsMultiRestaurantEnabled = isMultiRestaurantEnabled as ReturnType<typeof vi.fn>;

// Mock do repositório de produtos
const mockProdutoRepoBuscarPorId = vi.fn();
const mockProdutoRepoBuscarPorCategoria = vi.fn();
const mockProdutoRepoSalvar = vi.fn();
const mockProdutoRepoExcluir = vi.fn();

const mockProdutoRepo = {
  buscarPorId: mockProdutoRepoBuscarPorId,
  buscarPorCategoria: mockProdutoRepoBuscarPorCategoria,
  salvar: mockProdutoRepoSalvar,
  excluir: mockProdutoRepoExcluir,
};

// Mock do repositório de categorias
const mockCategoriaRepoBuscarPorId = vi.fn();

const mockCategoriaRepo = {
  buscarPorId: mockCategoriaRepoBuscarPorId,
};

// Mock do repositório de vínculo usuário-restaurante
const mockUsuarioRestauranteRepoFindByUsuarioIdAndRestauranteId = vi.fn();

const mockUsuarioRestauranteRepo = {
  findByUsuarioIdAndRestauranteId: mockUsuarioRestauranteRepoFindByUsuarioIdAndRestauranteId,
};

describe('GerenciarProdutoUseCase', () => {
  let useCase: GerenciarProdutoUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMultiRestaurantEnabled.mockReturnValue(false);
    useCase = new GerenciarProdutoUseCase(mockProdutoRepo, mockCategoriaRepo, mockUsuarioRestauranteRepo);
  });

  describe('execute', () => {
    describe('ação: criar', () => {
      it('deve criar produto com sucesso', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'criar',
          categoriaId: 'categoria-123',
          nome: 'Pizza Margherita',
          descricao: 'Pizza tradicional italiana',
          preco: 4500, // R$ 45,00 em centavos
          restauranteId: 'restaurante-123',
        };

        mockCategoriaRepoBuscarPorId.mockResolvedValue({ id: 'categoria-123', restauranteId: 'restaurante-123' });
        mockProdutoRepoSalvar.mockImplementation(async (produto: ItemCardapio) => produto);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(resultado.produto).toBeDefined();
        expect(resultado.produto!.nome).toBe('Pizza Margherita');
        expect(resultado.produto!.preco.valor).toBe(4500);
        expect(mockProdutoRepoSalvar).toHaveBeenCalled();
      });

      it('deve lançar erro quando nome não é fornecido', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'criar',
          categoriaId: 'categoria-123',
          preco: 4500,
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Nome é obrigatório para criar produto');
      });

      it('deve lançar erro quando preço não é fornecido', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'criar',
          categoriaId: 'categoria-123',
          nome: 'Pizza',
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Preço é obrigatório e deve ser positivo');
      });

      it('deve lançar erro quando preço é negativo', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'criar',
          categoriaId: 'categoria-123',
          nome: 'Pizza',
          preco: -100,
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Preço é obrigatório e deve ser positivo');
      });

      it('deve lançar erro quando categoria não existe', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'criar',
          categoriaId: 'categoria-inexistente',
          nome: 'Pizza',
          preco: 4500,
        };

        mockCategoriaRepoBuscarPorId.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Categoria não encontrada');
      });

      it('deve criar produto do tipo combo quando especificado', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'criar',
          categoriaId: 'categoria-123',
          nome: 'Combo Executivo',
          preco: 3500,
          tipo: 'combo',
        };

        mockCategoriaRepoBuscarPorId.mockResolvedValue({ id: 'categoria-123' });
        mockProdutoRepoSalvar.mockImplementation(async (produto: ItemCardapio) => produto);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(resultado.produto!.tipo).toEqual(TipoItemCardapio.COMBO);
      });

      it('deve criar produto ativo por padrão', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'criar',
          categoriaId: 'categoria-123',
          nome: 'Bebida',
          preco: 500,
        };

        mockCategoriaRepoBuscarPorId.mockResolvedValue({ id: 'categoria-123' });
        mockProdutoRepoSalvar.mockImplementation(async (produto: ItemCardapio) => produto);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.produto!.ativo).toBe(true);
      });
    });

    describe('ação: atualizar', () => {
      it('deve atualizar produto com sucesso', async () => {
        // Arrange
        const produtoExistente = ItemCardapio.criar({
          categoriaId: 'categoria-123',
          nome: 'Nome Antigo',
          descricao: null,
          preco: Dinheiro.criar(3000),
          imagemUrl: null,
          tipo: TipoItemCardapio.PRODUTO,
          labelsDieteticos: [],
          ativo: true,
        });

        const input: ProdutoInput = {
          acao: 'atualizar',
          id: produtoExistente.id,
          nome: 'Nome Novo',
        };

        mockProdutoRepoBuscarPorId.mockResolvedValue(produtoExistente);
        mockProdutoRepoSalvar.mockImplementation(async (produto: ItemCardapio) => produto);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(resultado.produto!.nome).toBe('Nome Novo');
      });

      it('deve lançar erro quando ID não é fornecido', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'atualizar',
          nome: 'Nome Novo',
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('ID é obrigatório para atualizar produto');
      });

      it('deve lançar erro quando produto não existe', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'atualizar',
          id: 'produto-inexistente',
          nome: 'Nome Novo',
        };

        mockProdutoRepoBuscarPorId.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Produto não encontrado');
      });

      it('deve atualizar preço quando fornecido', async () => {
        // Arrange
        const produtoExistente = ItemCardapio.criar({
          categoriaId: 'categoria-123',
          nome: 'Produto',
          descricao: null,
          preco: Dinheiro.criar(3000),
          imagemUrl: null,
          tipo: TipoItemCardapio.PRODUTO,
          labelsDieteticos: [],
          ativo: true,
        });

        const input: ProdutoInput = {
          acao: 'atualizar',
          id: produtoExistente.id,
          preco: 5000,
        };

        mockProdutoRepoBuscarPorId.mockResolvedValue(produtoExistente);
        mockProdutoRepoSalvar.mockImplementation(async (produto: ItemCardapio) => produto);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.produto!.preco.valor).toBe(5000);
      });
    });

    describe('ação: excluir', () => {
      it('deve excluir produto com sucesso', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'excluir',
          id: 'produto-123',
        };

        mockProdutoRepoExcluir.mockResolvedValue(undefined);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(mockProdutoRepoExcluir).toHaveBeenCalledWith('produto-123');
      });

      it('deve lançar erro quando ID não é fornecido', async () => {
        // Arrange
        const input: ProdutoInput = {
          acao: 'excluir',
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('ID é obrigatório para excluir produto');
      });
    });

    describe('ação: ativar', () => {
      it('deve ativar produto com sucesso', async () => {
        // Arrange
        const produtoDesativado = ItemCardapio.criar({
          categoriaId: 'categoria-123',
          nome: 'Produto',
          descricao: null,
          preco: Dinheiro.criar(3000),
          imagemUrl: null,
          tipo: TipoItemCardapio.PRODUTO,
          labelsDieteticos: [],
          ativo: false,
        });

        const input: ProdutoInput = {
          acao: 'ativar',
          id: produtoDesativado.id,
        };

        mockProdutoRepoBuscarPorId.mockResolvedValue(produtoDesativado);
        mockProdutoRepoSalvar.mockImplementation(async (produto: ItemCardapio) => produto);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(resultado.produto!.ativo).toBe(true);
      });
    });

    describe('ação: desativar', () => {
      it('deve desativar produto com sucesso', async () => {
        // Arrange
        const produtoAtivado = ItemCardapio.criar({
          categoriaId: 'categoria-123',
          nome: 'Produto',
          descricao: null,
          preco: Dinheiro.criar(3000),
          imagemUrl: null,
          tipo: TipoItemCardapio.PRODUTO,
          labelsDieteticos: [],
          ativo: true,
        });

        const input: ProdutoInput = {
          acao: 'desativar',
          id: produtoAtivado.id,
        };

        mockProdutoRepoBuscarPorId.mockResolvedValue(produtoAtivado);
        mockProdutoRepoSalvar.mockImplementation(async (produto: ItemCardapio) => produto);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(resultado.produto!.ativo).toBe(false);
      });
    });

    describe('ação desconhecida', () => {
      it('deve lançar erro para ação desconhecida', async () => {
        // Arrange
        const input = {
          acao: 'acao-desconhecida' as any,
          categoriaId: 'categoria-123',
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Ação desconhecida: acao-desconhecida');
      });
    });

    describe('acesso multi-restaurant', () => {
      it('deve validar acesso quando multi-restaurant está ativo', async () => {
        // Arrange
        mockIsMultiRestaurantEnabled.mockReturnValue(true);
        useCase = new GerenciarProdutoUseCase(mockProdutoRepo, mockCategoriaRepo, mockUsuarioRestauranteRepo);

        const input: ProdutoInput = {
          acao: 'criar',
          categoriaId: 'categoria-123',
          nome: 'Produto',
          preco: 3000,
          restauranteId: 'restaurante-123',
          usuarioId: 'user-123',
        };

        mockUsuarioRestauranteRepoFindByUsuarioIdAndRestauranteId.mockResolvedValue({
          id: 'vinculo-1',
          papel: 'gerente' as const,
        });
        mockCategoriaRepoBuscarPorId.mockResolvedValue({ id: 'categoria-123' });
        mockProdutoRepoSalvar.mockImplementation(async (produto: ItemCardapio) => produto);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
      });

      it('deve lançar erro quando usuário não tem vínculo com restaurante', async () => {
        // Arrange
        mockIsMultiRestaurantEnabled.mockReturnValue(true);
        useCase = new GerenciarProdutoUseCase(mockProdutoRepo, mockCategoriaRepo, mockUsuarioRestauranteRepo);

        const input: ProdutoInput = {
          acao: 'criar',
          categoriaId: 'categoria-123',
          nome: 'Produto',
          preco: 3000,
          restauranteId: 'restaurante-123',
          usuarioId: 'user-sem-vinculo',
        };

        mockUsuarioRestauranteRepoFindByUsuarioIdAndRestauranteId.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Usuário não tem vínculo com este restaurante');
      });

      it('deve lançar erro quando usuarioId e restauranteId não fornecidos em multi-restaurant', async () => {
        // Arrange
        mockIsMultiRestaurantEnabled.mockReturnValue(true);
        useCase = new GerenciarProdutoUseCase(mockProdutoRepo, mockCategoriaRepo, mockUsuarioRestauranteRepo);

        const input: ProdutoInput = {
          acao: 'criar',
          categoriaId: 'categoria-123',
          nome: 'Produto',
          preco: 3000,
          // restauranteId e usuarioId ausentes
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          'usuarioId e restauranteId são obrigatórios para operações de produto quando multi-restaurant está ativo'
        );
      });
    });
  });
});
