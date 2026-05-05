// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesvincularUsuarioRestauranteUseCase } from '@/application/admin/services/DesvincularUsuarioRestauranteUseCase';
import { DesvincularUsuarioRestauranteInput } from '@/application/admin/services/DesvincularUsuarioRestauranteUseCase';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';

// Mock da feature flag
vi.mock('@/lib/feature-flags', () => ({
  isMultiRestaurantEnabled: vi.fn(),
}));

import { isMultiRestaurantEnabled } from '@/lib/feature-flags';

const mockIsMultiRestaurantEnabled = isMultiRestaurantEnabled as ReturnType<typeof vi.fn>;

// Mock do evento
const mockEventEmitter = vi.fn();

describe('DesvincularUsuarioRestauranteUseCase', () => {
  let useCase: DesvincularUsuarioRestauranteUseCase;
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
    useCase = new DesvincularUsuarioRestauranteUseCase(
      mockUsuarioRestauranteRepo,
      mockEventEmitter
    );
  });

  describe('execute', () => {
    it('deve desvincular staff quando solicitante é owner', async () => {
      // Mock do vínculo do solicitante (owner)
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({
            usuarioId: 'owner-id',
            restauranteId: 'restaurante-id',
            papel: 'dono',
          })
        )
        // Mock do vínculo do usuário a ser removido (staff)
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({
            usuarioId: 'staff-id',
            restauranteId: 'restaurante-id',
            papel: 'atendente',
          })
        );

      const input: DesvincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'staff-id',
        solicitanteId: 'owner-id',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(mockUsuarioRestauranteRepo.delete).toHaveBeenCalled();
      expect(mockEventEmitter).toHaveBeenCalledTimes(1);
    });

    it('deve desvincular manager quando solicitante é owner', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({
            usuarioId: 'owner-id',
            restauranteId: 'restaurante-id',
            papel: 'dono',
          })
        )
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({
            usuarioId: 'manager-id',
            restauranteId: 'restaurante-id',
            papel: 'gerente',
          })
        );

      const input: DesvincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'manager-id',
        solicitanteId: 'owner-id',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(mockUsuarioRestauranteRepo.delete).toHaveBeenCalled();
    });

    it('deve lançar erro CRÍTICO ao tentar desvincular owner', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({
            usuarioId: 'owner-id',
            restauranteId: 'restaurante-id',
            papel: 'dono',
          })
        )
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({
            usuarioId: 'outro-owner-id',
            restauranteId: 'restaurante-id',
            papel: 'dono',
          })
        );

      const input: DesvincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'outro-owner-id',
        solicitanteId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Não é possível remover o proprietário do restaurante'
      );
      expect(mockUsuarioRestauranteRepo.delete).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando multi-restaurant desativado', async () => {
      mockIsMultiRestaurantEnabled.mockReturnValue(false);

      const input: DesvincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'staff-id',
        solicitanteId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Funcionalidade de multi-restaurantes não está habilitada'
      );
    });

    it('deve lançar erro quando solicitante não tem permissão', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(null);

      const input: DesvincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'staff-id',
        solicitanteId: 'usuario-sem-acesso',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Você não tem permissão para gerenciar membros deste restaurante'
      );
    });

    it('deve lançar erro quando staff tenta desvincular', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({
          usuarioId: 'staff-id',
          restauranteId: 'restaurante-id',
          papel: 'atendente',
        })
      );

      const input: DesvincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'outro-staff-id',
        solicitanteId: 'staff-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Apenas o owner ou manager pode desvincular membros do restaurante'
      );
    });

    it('deve lançar erro quando vínculo não existe', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({
            usuarioId: 'owner-id',
            restauranteId: 'restaurante-id',
            papel: 'dono',
          })
        )
        .mockResolvedValueOnce(null);

      const input: DesvincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'usuario-sem-vinculo',
        solicitanteId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Vínculo entre usuário e restaurante não encontrado'
      );
    });
  });
});
