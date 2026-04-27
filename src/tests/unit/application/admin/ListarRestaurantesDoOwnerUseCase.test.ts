import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListarRestaurantesDoOwnerUseCase } from '@/application/admin/services/ListarRestaurantesDoOwnerUseCase';
import { ListarRestaurantesDoOwnerInput } from '@/application/admin/services/ListarRestaurantesDoOwnerUseCase';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';

// Mock da feature flag
vi.mock('@/lib/feature-flags', () => ({
  isMultiRestaurantEnabled: vi.fn(),
}));

import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

const mockIsMultiRestaurantEnabled = isMultiRestaurantEnabled as ReturnType<typeof vi.fn>;

describe('ListarRestaurantesDoOwnerUseCase', () => {
  let useCase: ListarRestaurantesDoOwnerUseCase;
  let mockRestauranteRepo: IRestauranteRepository;
  let mockUsuarioRestauranteRepo: IUsuarioRestauranteRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMultiRestaurantEnabled.mockReturnValue(true);
    mockRestauranteRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByCNPJ: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAtivo: vi.fn(),
    };
    mockUsuarioRestauranteRepo = {
      findByUsuarioId: vi.fn(),
      findByRestauranteId: vi.fn(),
      findByUsuarioIdAndRestauranteId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    useCase = new ListarRestaurantesDoOwnerUseCase(mockRestauranteRepo, mockUsuarioRestauranteRepo);
  });

  describe('execute', () => {
    it('deve listar restaurantes do owner via junction table quando multi-restaurant ativo', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioId.mockResolvedValueOnce([
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'rest-1', papel: 'owner' }),
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'rest-2', papel: 'owner' }),
      ]);
      mockRestauranteRepo.findById
        .mockResolvedValueOnce(Restaurante.criar({ nome: 'Restaurante 1', cnpj: '11.111.111/0001-11', endereco: '', ativo: true }))
        .mockResolvedValueOnce(Restaurante.criar({ nome: 'Restaurante 2', cnpj: '22.222.222/0001-22', endereco: '', ativo: true }));

      const input: ListarRestaurantesDoOwnerInput = { ownerId: 'owner-id' };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.restaurantes).toHaveLength(2);
      expect(resultado.restaurantes[0].papel).toBe('owner');
      expect(resultado.restaurantes[1].papel).toBe('owner');
    });

    it('deve retornar array vazio quando owner não tem restaurantes', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioId.mockResolvedValueOnce([]);

      const input: ListarRestaurantesDoOwnerInput = { ownerId: 'owner-sem-restaurantes' };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.restaurantes).toHaveLength(0);
    });

    it('deve usar lógica legacy quando multi-restaurant desativado', async () => {
      mockIsMultiRestaurantEnabled.mockReturnValue(false);
      mockRestauranteRepo.findAtivo.mockResolvedValueOnce(
        Restaurante.criar({ nome: 'Restaurante Legacy', cnpj: '33.333.333/0001-33', endereco: '', ativo: true })
      );

      const input: ListarRestaurantesDoOwnerInput = { ownerId: 'owner-id' };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.restaurantes).toHaveLength(1);
      expect(resultado.restaurantes[0].restaurante.nome).toBe('Restaurante Legacy');
      expect(resultado.restaurantes[0].papel).toBe('owner');
    });

    it('deve buscar restaurante mesmo quando vínculo existe mas restaurante foi removido', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioId.mockResolvedValueOnce([
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'rest-deletado', papel: 'owner' }),
      ]);
      mockRestauranteRepo.findById.mockResolvedValueOnce(null);

      const input: ListarRestaurantesDoOwnerInput = { ownerId: 'owner-id' };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.restaurantes).toHaveLength(0);
    });
  });
});
