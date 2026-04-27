import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VincularUsuarioRestauranteUseCase } from '@/application/admin/services/VincularUsuarioRestauranteUseCase';
import { VincularUsuarioRestauranteInput } from '@/application/admin/services/VincularUsuarioRestauranteUseCase';
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

describe('VincularUsuarioRestauranteUseCase', () => {
  let useCase: VincularUsuarioRestauranteUseCase;
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
    useCase = new VincularUsuarioRestauranteUseCase(
      mockUsuarioRestauranteRepo,
      mockEventEmitter
    );
  });

  describe('execute', () => {
    it('deve vincular usuário manager quando solicitante é owner', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
        )
        .mockResolvedValueOnce(null);

      const input: VincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'novo-manager-id',
        papel: 'gerente',
        solicitanteId: 'owner-id',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.vinculo.papel).toBe('gerente');
      expect(resultado.vinculo.usuarioId).toBe('novo-manager-id');
      expect(mockEventEmitter).toHaveBeenCalledTimes(1);
    });

    it('deve vincular usuário staff quando solicitante é manager', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({ usuarioId: 'manager-id', restauranteId: 'restaurante-id', papel: 'gerente' })
        )
        .mockResolvedValueOnce(null);

      const input: VincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'novo-staff-id',
        papel: 'atendente',
        solicitanteId: 'manager-id',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.vinculo.papel).toBe('atendente');
    });

    it('deve lançar erro quando multi-restaurant desativado', async () => {
      mockIsMultiRestaurantEnabled.mockReturnValue(false);

      const input: VincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'novo-usuario-id',
        papel: 'atendente',
        solicitanteId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Funcionalidade de multi-restaurantes não está habilitada'
      );
    });

    it('deve lançar erro quando solicitante não tem permissão', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(null);

      const input: VincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'novo-usuario-id',
        papel: 'atendente',
        solicitanteId: 'usuario-sem-acesso',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Você não tem permissão para gerenciar membros deste restaurante'
      );
    });

    it('deve lançar erro quando solicitante é staff', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'staff-id', restauranteId: 'restaurante-id', papel: 'atendente' })
      );

      const input: VincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'outro-usuario-id',
        papel: 'atendente',
        solicitanteId: 'staff-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Apenas o owner ou manager pode vincular novos membros ao restaurante'
      );
    });

    it('deve lançar erro quando usuário já está vinculado', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
        )
        .mockResolvedValueOnce(
          UsuarioRestaurante.criar({ usuarioId: 'ja-vinculado-id', restauranteId: 'restaurante-id', papel: 'atendente' })
        );

      const input: VincularUsuarioRestauranteInput = {
        restauranteId: 'restaurante-id',
        usuarioId: 'ja-vinculado-id',
        papel: 'gerente',
        solicitanteId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Usuário já está vinculado a este restaurante'
      );
    });
  });
});
