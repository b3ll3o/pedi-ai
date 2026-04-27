import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObterCardapioCompletoUseCase } from '@/application/admin/services/ObterCardapioCompletoUseCase';
import { ObterCardapioCompletoInput } from '@/application/admin/services/ObterCardapioCompletoUseCase';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { CategoriaProps } from '@/domain/cardapio/entities/Categoria';
import { ItemCardapioProps } from '@/domain/cardapio/entities/ItemCardapio';
import { ModificadorGrupoProps } from '@/domain/cardapio/entities/ModificadorGrupo';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';
import { ICategoriaRepository } from '@/domain/cardapio/repositories/ICategoriaRepository';
import { IItemCardapioRepository } from '@/domain/cardapio/repositories/IItemCardapioRepository';
import { IModificadorGrupoRepository } from '@/domain/cardapio/repositories/IModificadorGrupoRepository';

// Mock da feature flag
vi.mock('@/lib/feature-flags', () => ({
  isMultiRestaurantEnabled: vi.fn(),
}));

import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

const mockIsMultiRestaurantEnabled = isMultiRestaurantEnabled as ReturnType<typeof vi.fn>;

describe('ObterCardapioCompletoUseCase', () => {
  let useCase: ObterCardapioCompletoUseCase;
  let mockCategoriaRepo: ICategoriaRepository;
  let mockProdutoRepo: IItemCardapioRepository;
  let mockModificadorRepo: IModificadorGrupoRepository;
  let mockUsuarioRestauranteRepo: IUsuarioRestauranteRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMultiRestaurantEnabled.mockReturnValue(true);
    mockCategoriaRepo = {
      buscarAtivas: vi.fn(),
    } as unknown as ICategoriaRepository;
    mockProdutoRepo = {
      buscarPorRestaurante: vi.fn(),
    } as unknown as IItemCardapioRepository;
    mockModificadorRepo = {
      buscarPorRestaurante: vi.fn(),
    } as unknown as IModificadorGrupoRepository;
    mockUsuarioRestauranteRepo = {
      findByUsuarioId: vi.fn(),
      findByRestauranteId: vi.fn(),
      findByUsuarioIdAndRestauranteId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    useCase = new ObterCardapioCompletoUseCase(
      mockCategoriaRepo,
      mockProdutoRepo,
      mockModificadorRepo,
      mockUsuarioRestauranteRepo
    );
  });

  describe('execute', () => {
    it('deve obter cardápio completo quando usuário tem acesso', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
      );
      mockCategoriaRepo.buscarAtivas.mockResolvedValueOnce([
        { id: 'cat-1', nome: 'Bebidas', descricao: '', ordem: 1, ativa: true, restauranteId: 'restaurante-id', criadoEm: new Date(), atualizadoEm: new Date() } as unknown as CategoriaProps,
      ]);
      mockProdutoRepo.buscarPorRestaurante.mockResolvedValueOnce([
        { id: 'prod-1', nome: 'Coca-Cola', descricao: '', preco: 5.9, imagemUrl: null, ativo: true, categoriaId: 'cat-1', restauranteId: 'restaurante-id', criadoEm: new Date(), atualizadoEm: new Date() } as unknown as ItemCardapioProps,
      ]);
      mockModificadorRepo.buscarPorRestaurante.mockResolvedValueOnce([
        { id: 'mod-1', nome: 'Tamanho', restauranteId: 'restaurante-id', min: 0, max: 1, obrigatorio: false, valores: [], criadoEm: new Date(), atualizadoEm: new Date() } as unknown as ModificadorGrupoProps,
      ]);

      const input: ObterCardapioCompletoInput = {
        restauranteId: 'restaurante-id',
        solicitanteId: 'owner-id',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.cardapio.categorias).toHaveLength(1);
      expect(resultado.cardapio.produtos).toHaveLength(1);
      expect(resultado.cardapio.modificadores).toHaveLength(1);
    });

    it('deve lançar erro quando solicitante não tem acesso', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(null);

      const input: ObterCardapioCompletoInput = {
        restauranteId: 'restaurante-id',
        solicitanteId: 'usuario-sem-acesso',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Solicitante não tem acesso a este restaurante'
      );
    });

    it('deve permitir acesso quando multi-restaurant desativado', async () => {
      mockIsMultiRestaurantEnabled.mockReturnValue(false);

      mockCategoriaRepo.buscarAtivas.mockResolvedValueOnce([]);
      mockProdutoRepo.buscarPorRestaurante.mockResolvedValueOnce([]);
      mockModificadorRepo.buscarPorRestaurante.mockResolvedValueOnce([]);

      const input: ObterCardapioCompletoInput = {
        restauranteId: 'restaurante-id',
        solicitanteId: 'usuario-qualquer',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.cardapio.categorias).toHaveLength(0);
    });

    it('deve buscar todos os dados do cardápio', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
      );
      mockCategoriaRepo.buscarAtivas.mockResolvedValueOnce([]);
      mockProdutoRepo.buscarPorRestaurante.mockResolvedValueOnce([]);
      mockModificadorRepo.buscarPorRestaurante.mockResolvedValueOnce([]);

      const input: ObterCardapioCompletoInput = {
        restauranteId: 'restaurante-id',
        solicitanteId: 'owner-id',
      };

      await useCase.execute(input);

      expect(mockCategoriaRepo.buscarAtivas).toHaveBeenCalledWith('restaurante-id');
      expect(mockProdutoRepo.buscarPorRestaurante).toHaveBeenCalledWith('restaurante-id');
      expect(mockModificadorRepo.buscarPorRestaurante).toHaveBeenCalledWith('restaurante-id');
    });
  });
});
