import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesvincularUsuarioRestauranteUseCase } from '@/application/admin/services/DesvincularUsuarioRestauranteUseCase';
import { UsuarioRestaurante } from '@/domain/admin/entities/UsuarioRestaurante';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';

// Mock do evento
const mockEventEmitter = vi.fn();

describe('DesvincularUsuarioRestauranteUseCase', () => {
  let useCase: DesvincularUsuarioRestauranteUseCase;
  let mockUsuarioRestauranteRepo: IUsuarioRestauranteRepository;

  beforeEach(() => {
    vi.clearAllMocks();
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
    it('deve desvincular um usuário com sucesso quando o papel não é owner', async () => {
      const vinculo = UsuarioRestaurante.criar({
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'manager',
      });

      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValue(vinculo);
      mockUsuarioRestauranteRepo.delete.mockResolvedValue(undefined);

      const result = await useCase.execute({
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
      });

      expect(result.sucesso).toBe(true);
      expect(mockUsuarioRestauranteRepo.delete).toHaveBeenCalledWith(vinculo.id);
      expect(mockEventEmitter).toHaveBeenCalled();
    });

    it('deve lançar erro quando o vínculo não existe', async () => {
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValue(null);

      await expect(
        useCase.execute({
          usuarioId: 'usuario-1',
          restauranteId: 'restaurante-1',
        })
      ).rejects.toThrow('Vínculo entre usuário e restaurante não encontrado');
    });

    it('deve lançar erro quando tenta remover vínculo de owner', async () => {
      const vinculoOwner = UsuarioRestaurante.criar({
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'owner',
      });

      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValue(vinculoOwner);

      await expect(
        useCase.execute({
          usuarioId: 'usuario-1',
          restauranteId: 'restaurante-1',
        })
      ).rejects.toThrow('Não é possível remover o vínculo de owner de um restaurante');

      expect(mockUsuarioRestauranteRepo.delete).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando tenta remover vínculo de staff', async () => {
      const vinculoStaff = UsuarioRestaurante.criar({
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'staff',
      });

      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValue(vinculoStaff);
      mockUsuarioRestauranteRepo.delete.mockResolvedValue(undefined);

      const result = await useCase.execute({
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
      });

      expect(result.sucesso).toBe(true);
      expect(mockUsuarioRestauranteRepo.delete).toHaveBeenCalledWith(vinculoStaff.id);
    });

    it('deve emitir evento UsuarioDesvinculadoRestauranteEvent após desvincular', async () => {
      const vinculo = UsuarioRestaurante.criar({
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
        papel: 'manager',
      });

      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValue(vinculo);
      mockUsuarioRestauranteRepo.delete.mockResolvedValue(undefined);

      await useCase.execute({
        usuarioId: 'usuario-1',
        restauranteId: 'restaurante-1',
      });

      expect(mockEventEmitter).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'UsuarioDesvinculadoRestaurante',
          props: expect.objectContaining({
            usuarioId: 'usuario-1',
            restauranteId: 'restaurante-1',
          }),
        })
      );
    });
  });
});
