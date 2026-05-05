// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GerenciarCategoriaUseCase } from '@/application/admin/services/GerenciarCategoriaUseCase';
import type { CategoriaInput } from '@/application/admin/services/GerenciarCategoriaUseCase';
import { Categoria } from '@/domain/cardapio/entities/Categoria';

// Mock da feature flag
vi.mock('@/lib/feature-flags', () => ({
  isMultiRestaurantEnabled: vi.fn(),
}));

import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

const mockIsMultiRestaurantEnabled = isMultiRestaurantEnabled as ReturnType<typeof vi.fn>;

// Mock do repositório de categorias
const mockCategoriaRepoBuscarPorId = vi.fn();
const mockCategoriaRepoBuscarPorRestaurante = vi.fn();
const mockCategoriaRepoSalvar = vi.fn();
const mockCategoriaRepoExcluir = vi.fn();

const mockCategoriaRepo = {
  buscarPorId: mockCategoriaRepoBuscarPorId,
  buscarPorRestaurante: mockCategoriaRepoBuscarPorRestaurante,
  salvar: mockCategoriaRepoSalvar,
  excluir: mockCategoriaRepoExcluir,
};

// Mock do repositório de vínculo usuário-restaurante
const mockUsuarioRestauranteRepoFindByUsuarioIdAndRestauranteId = vi.fn();

const mockUsuarioRestauranteRepo = {
  findByUsuarioIdAndRestauranteId: mockUsuarioRestauranteRepoFindByUsuarioIdAndRestauranteId,
};

describe('GerenciarCategoriaUseCase', () => {
  let useCase: GerenciarCategoriaUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMultiRestaurantEnabled.mockReturnValue(false);
    useCase = new GerenciarCategoriaUseCase(mockCategoriaRepo, mockUsuarioRestauranteRepo);
  });

  describe('execute', () => {
    describe('ação: criar', () => {
      it('deve criar categoria com sucesso', async () => {
        // Arrange
        const input: CategoriaInput = {
          acao: 'criar',
          restauranteId: 'restaurante-123',
          nome: 'Bebidas',
          descricao: 'Bebidas em geral',
        };

        mockCategoriaRepoBuscarPorRestaurante.mockResolvedValue([]);
        mockCategoriaRepoSalvar.mockImplementation(async (categoria: Categoria) => categoria);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(resultado.categoria).toBeDefined();
        expect(resultado.categoria!.nome).toBe('Bebidas');
        expect(mockCategoriaRepoSalvar).toHaveBeenCalled();
      });

      it('deve lançar erro quando nome não é fornecido', async () => {
        // Arrange
        const input: CategoriaInput = {
          acao: 'criar',
          restauranteId: 'restaurante-123',
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Nome é obrigatório para criar categoria');
      });

      it('deve usar próxima ordem de exibição quando não fornecida', async () => {
        // Arrange
        const input: CategoriaInput = {
          acao: 'criar',
          restauranteId: 'restaurante-123',
          nome: 'Sobremesas',
        };

        mockCategoriaRepoBuscarPorRestaurante.mockResolvedValue([
          Categoria.criar({ restauranteId: 'restaurante-123', nome: 'Pratos', descricao: null, imagemUrl: null, ordemExibicao: 0, ativo: true }),
          Categoria.criar({ restauranteId: 'restaurante-123', nome: 'Bebidas', descricao: null, imagemUrl: null, ordemExibicao: 1, ativo: true }),
        ]);
        mockCategoriaRepoSalvar.mockImplementation(async (categoria: Categoria) => categoria);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.categoria!.ordemExibicao).toBe(2);
      });

      it('deve criar categoria ativa por padrão', async () => {
        // Arrange
        const input: CategoriaInput = {
          acao: 'criar',
          restauranteId: 'restaurante-123',
          nome: 'Entradas',
        };

        mockCategoriaRepoBuscarPorRestaurante.mockResolvedValue([]);
        mockCategoriaRepoSalvar.mockImplementation(async (categoria: Categoria) => categoria);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.categoria!.ativo).toBe(true);
      });
    });

    describe('ação: atualizar', () => {
      it('deve atualizar categoria com sucesso', async () => {
        // Arrange
        const categoriaExistente = Categoria.criar({
          restauranteId: 'restaurante-123',
          nome: 'Antigo Nome',
          descricao: null,
          imagemUrl: null,
          ordemExibicao: 0,
          ativo: true,
        });

        const input: CategoriaInput = {
          acao: 'atualizar',
          id: categoriaExistente.id,
          nome: 'Novo Nome',
        };

        mockCategoriaRepoBuscarPorId.mockResolvedValue(categoriaExistente);
        mockCategoriaRepoSalvar.mockImplementation(async (categoria: Categoria) => categoria);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(resultado.categoria!.nome).toBe('Novo Nome');
      });

      it('deve lançar erro quando ID não é fornecido', async () => {
        // Arrange
        const input: CategoriaInput = {
          acao: 'atualizar',
          restauranteId: 'restaurante-123',
          nome: 'Novo Nome',
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('ID é obrigatório para atualizar categoria');
      });

      it('deve lançar erro quando categoria não existe', async () => {
        // Arrange
        const input: CategoriaInput = {
          acao: 'atualizar',
          id: 'categoria-inexistente',
          nome: 'Novo Nome',
        };

        mockCategoriaRepoBuscarPorId.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Categoria não encontrada');
      });

      it('deve atualizar apenas nome quando fornecido', async () => {
        // Arrange
        const categoriaExistente = Categoria.criar({
          restauranteId: 'restaurante-123',
          nome: 'Nome Original',
          descricao: 'Descricao Original',
          imagemUrl: null,
          ordemExibicao: 0,
          ativo: true,
        });

        const input: CategoriaInput = {
          acao: 'atualizar',
          id: categoriaExistente.id,
          nome: 'Nome Atualizado',
        };

        mockCategoriaRepoBuscarPorId.mockResolvedValue(categoriaExistente);
        mockCategoriaRepoSalvar.mockImplementation(async (categoria: Categoria) => categoria);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.categoria!.nome).toBe('Nome Atualizado');
        expect(resultado.categoria!.descricao).toBe('Descricao Original');
      });
    });

    describe('ação: excluir', () => {
      it('deve excluir categoria com sucesso', async () => {
        // Arrange
        const input: CategoriaInput = {
          acao: 'excluir',
          id: 'categoria-123',
        };

        mockCategoriaRepoExcluir.mockResolvedValue(undefined);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(mockCategoriaRepoExcluir).toHaveBeenCalledWith('categoria-123');
      });

      it('deve lançar erro quando ID não é fornecido', async () => {
        // Arrange
        const input: CategoriaInput = {
          acao: 'excluir',
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('ID é obrigatório para excluir categoria');
      });
    });

    describe('ação: ativar', () => {
      it('deve ativar categoria com sucesso', async () => {
        // Arrange
        const categoriaDesativada = Categoria.criar({
          restauranteId: 'restaurante-123',
          nome: 'Categoria',
          descricao: null,
          imagemUrl: null,
          ordemExibicao: 0,
          ativo: false,
        });

        const input: CategoriaInput = {
          acao: 'ativar',
          id: categoriaDesativada.id,
        };

        mockCategoriaRepoBuscarPorId.mockResolvedValue(categoriaDesativada);
        mockCategoriaRepoSalvar.mockImplementation(async (categoria: Categoria) => categoria);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(resultado.categoria!.ativo).toBe(true);
      });

      it('deve lançar erro quando categoria não existe', async () => {
        // Arrange
        const input: CategoriaInput = {
          acao: 'ativar',
          id: 'categoria-inexistente',
        };

        mockCategoriaRepoBuscarPorId.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Categoria não encontrada');
      });
    });

    describe('ação: desativar', () => {
      it('deve desativar categoria com sucesso', async () => {
        // Arrange
        const categoriaAtivada = Categoria.criar({
          restauranteId: 'restaurante-123',
          nome: 'Categoria',
          descricao: null,
          imagemUrl: null,
          ordemExibicao: 0,
          ativo: true,
        });

        const input: CategoriaInput = {
          acao: 'desativar',
          id: categoriaAtivada.id,
        };

        mockCategoriaRepoBuscarPorId.mockResolvedValue(categoriaAtivada);
        mockCategoriaRepoSalvar.mockImplementation(async (categoria: Categoria) => categoria);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(resultado.categoria!.ativo).toBe(false);
      });
    });

    describe('ação desconhecida', () => {
      it('deve lançar erro para ação desconhecida', async () => {
        // Arrange
        const input = {
          acao: 'acao-desconhecida' as any,
          restauranteId: 'restaurante-123',
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Ação desconhecida: acao-desconhecida');
      });
    });

    describe('acesso multi-restaurant', () => {
      it('deve validar acesso quando multi-restaurant está ativo', async () => {
        // Arrange
        mockIsMultiRestaurantEnabled.mockReturnValue(true);
        useCase = new GerenciarCategoriaUseCase(mockCategoriaRepo, mockUsuarioRestauranteRepo);

        const input: CategoriaInput = {
          acao: 'criar',
          restauranteId: 'restaurante-123',
          nome: 'Bebidas',
          usuarioId: 'user-123',
        };

        mockUsuarioRestauranteRepoFindByUsuarioIdAndRestauranteId.mockResolvedValue({
          id: 'vinculo-1',
          papel: 'dono' as const,
        });
        mockCategoriaRepoBuscarPorRestaurante.mockResolvedValue([]);
        mockCategoriaRepoSalvar.mockImplementation(async (categoria: Categoria) => categoria);

        // Act
        const resultado = await useCase.execute(input);

        // Assert
        expect(resultado.sucesso).toBe(true);
        expect(mockUsuarioRestauranteRepoFindByUsuarioIdAndRestauranteId).toHaveBeenCalledWith('user-123', 'restaurante-123');
      });

      it('deve lançar erro quando usuário não tem vínculo com restaurante', async () => {
        // Arrange
        mockIsMultiRestaurantEnabled.mockReturnValue(true);
        useCase = new GerenciarCategoriaUseCase(mockCategoriaRepo, mockUsuarioRestauranteRepo);

        const input: CategoriaInput = {
          acao: 'criar',
          restauranteId: 'restaurante-123',
          nome: 'Bebidas',
          usuarioId: 'user-sem-vinculo',
        };

        mockUsuarioRestauranteRepoFindByUsuarioIdAndRestauranteId.mockResolvedValue(null);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Usuário não tem vínculo com este restaurante');
      });

      it('deve lançar erro quando usuário não tem permissão (papel atendente)', async () => {
        // Arrange
        mockIsMultiRestaurantEnabled.mockReturnValue(true);
        useCase = new GerenciarCategoriaUseCase(mockCategoriaRepo, mockUsuarioRestauranteRepo);

        const input: CategoriaInput = {
          acao: 'criar',
          restauranteId: 'restaurante-123',
          nome: 'Bebidas',
          usuarioId: 'user-atendente',
        };

        mockUsuarioRestauranteRepoFindByUsuarioIdAndRestauranteId.mockResolvedValue({
          id: 'vinculo-1',
          papel: 'atendente' as const,
        });

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          'Apenas proprietários e gerentes podem gerenciar categorias'
        );
      });

      it('deve lançar erro quando usuarioId não fornecido em modo multi-restaurant', async () => {
        // Arrange
        mockIsMultiRestaurantEnabled.mockReturnValue(true);
        useCase = new GerenciarCategoriaUseCase(mockCategoriaRepo, mockUsuarioRestauranteRepo);

        const input: CategoriaInput = {
          acao: 'criar',
          restauranteId: 'restaurante-123',
          nome: 'Bebidas',
          // usuarioId ausente
        };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(
          'usuarioId é obrigatório para operações de categoria quando multi-restaurant está ativo'
        );
      });
    });
  });
});
