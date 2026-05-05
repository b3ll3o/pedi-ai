// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesativarRestauranteUseCase } from '@/application/admin/services/DesativarRestauranteUseCase';
import { DesativarRestauranteInput } from '@/application/admin/services/DesativarRestauranteUseCase';
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

// Mock do evento
const mockEventEmitter = vi.fn();

describe('DesativarRestauranteUseCase', () => {
  let useCase: DesativarRestauranteUseCase;
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
    useCase = new DesativarRestauranteUseCase(
      mockRestauranteRepo,
      mockUsuarioRestauranteRepo,
      mockEventEmitter
    );
  });

  describe('execute', () => {
    it('deve desativar restaurante quando usuário é owner', async () => {
      const restauranteAtivo = Restaurante.criar({
        nome: 'Restaurante',
        cnpj: '12.345.678/0001-90',
        endereco: '',
        ativo: true,
      });

      mockRestauranteRepo.findById.mockResolvedValueOnce(restauranteAtivo);
      mockRestauranteRepo.update.mockImplementation(async (r) => r);
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
      );

      const input: DesativarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'owner-id',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.restaurante.ativo).toBe(false);
      expect(mockEventEmitter).toHaveBeenCalledTimes(1);
    });

    it('deve lançar erro quando restaurante não existe', async () => {
      mockRestauranteRepo.findById.mockResolvedValueOnce(null);

      const input: DesativarRestauranteInput = {
        restauranteId: 'restaurante-inexistente',
        proprietarioId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Restaurante não encontrado');
    });

    it('deve lançar erro quando restaurante já está desativado', async () => {
      const restauranteDesativado = Restaurante.criar({
        nome: 'Restaurante',
        cnpj: '12.345.678/0001-90',
        endereco: '',
        ativo: false,
      });

      mockRestauranteRepo.findById.mockResolvedValueOnce(restauranteDesativado);

      const input: DesativarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Este restaurante já está desativado');
    });

    it('deve lançar erro quando usuário não é owner', async () => {
      const restauranteAtivo = Restaurante.criar({
        nome: 'Restaurante',
        cnpj: '12.345.678/0001-90',
        endereco: '',
        ativo: true,
      });

      mockRestauranteRepo.findById.mockResolvedValueOnce(restauranteAtivo);
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'staff-id', restauranteId: 'restaurante-id', papel: 'atendente' })
      );

      const input: DesativarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'staff-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Você não tem permissão para desativar este restaurante'
      );
    });

    it('deve lançar erro quando usuário é manager (não pode desativar)', async () => {
      const restauranteAtivo = Restaurante.criar({
        nome: 'Restaurante',
        cnpj: '12.345.678/0001-90',
        endereco: '',
        ativo: true,
      });

      mockRestauranteRepo.findById.mockResolvedValueOnce(restauranteAtivo);
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'manager-id', restauranteId: 'restaurante-id', papel: 'gerente' })
      );

      const input: DesativarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'manager-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Você não tem permissão para desativar este restaurante'
      );
    });
  });
});
