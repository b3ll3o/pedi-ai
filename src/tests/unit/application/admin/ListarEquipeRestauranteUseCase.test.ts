// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListarEquipeRestauranteUseCase } from '@/application/admin/services/ListarEquipeRestauranteUseCase';
import { ListarEquipeRestauranteInput } from '@/application/admin/services/ListarEquipeRestauranteUseCase';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';

// Mock da feature flag
vi.mock('@/lib/feature-flags', () => ({
  isMultiRestaurantEnabled: vi.fn(),
}));

import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

const mockIsMultiRestaurantEnabled = isMultiRestaurantEnabled as ReturnType<typeof vi.fn>;

describe('ListarEquipeRestauranteUseCase', () => {
  let useCase: ListarEquipeRestauranteUseCase;
  let mockUsuarioRestauranteRepo: IUsuarioRestauranteRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMultiRestaurantEnabled.mockReturnValue(true);
    mockUsuarioRestauranteRepo = {
      findByUsuarioId: vi.fn(),
      findByRestauranteId: vi.fn(),
      findByUsuarioIdAndRestauranteId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    useCase = new ListarEquipeRestauranteUseCase(mockUsuarioRestauranteRepo);
  });

  describe('execute', () => {
    it('deve listar equipe com owner e managers quando solicitante é owner', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
      );
      mockUsuarioRestauranteRepo.findByRestauranteId.mockResolvedValueOnce([
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' }),
        UsuarioRestaurante.criar({ usuarioId: 'manager-1', restauranteId: 'restaurante-id', papel: 'gerente' }),
        UsuarioRestaurante.criar({ usuarioId: 'staff-1', restauranteId: 'restaurante-id', papel: 'atendente' }),
      ]);

      const input: ListarEquipeRestauranteInput = {
        restauranteId: 'restaurante-id',
        solicitanteId: 'owner-id',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.membros).toHaveLength(3);
      expect(resultado.membros.some(m => m.papel === 'dono')).toBe(true);
      expect(resultado.membros.some(m => m.papel === 'gerente')).toBe(true);
      expect(resultado.membros.some(m => m.papel === 'atendente')).toBe(true);
    });

    it('deve listar equipe quando solicitante é manager', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'manager-id', restauranteId: 'restaurante-id', papel: 'gerente' })
      );
      mockUsuarioRestauranteRepo.findByRestauranteId.mockResolvedValueOnce([
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' }),
        UsuarioRestaurante.criar({ usuarioId: 'manager-id', restauranteId: 'restaurante-id', papel: 'gerente' }),
      ]);

      const input: ListarEquipeRestauranteInput = {
        restauranteId: 'restaurante-id',
        solicitanteId: 'manager-id',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.membros).toHaveLength(2);
    });

    it('deve lançar erro quando multi-restaurant desativado', async () => {
      mockIsMultiRestaurantEnabled.mockReturnValue(false);

      const input: ListarEquipeRestauranteInput = {
        restauranteId: 'restaurante-id',
        solicitanteId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Funcionalidade de multi-restaurantes não está habilitada'
      );
    });

    it('deve lançar erro quando solicitante não tem permissão', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(null);

      const input: ListarEquipeRestauranteInput = {
        restauranteId: 'restaurante-id',
        solicitanteId: 'usuario-sem-acesso',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Você não tem permissão para gerenciar membros deste restaurante'
      );
    });

    it('deve lançar erro quando staff tenta listar equipe', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'staff-id', restauranteId: 'restaurante-id', papel: 'atendente' })
      );

      const input: ListarEquipeRestauranteInput = {
        restauranteId: 'restaurante-id',
        solicitanteId: 'staff-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Apenas o owner ou manager pode listar membros da equipe do restaurante'
      );
    });
  });
});
