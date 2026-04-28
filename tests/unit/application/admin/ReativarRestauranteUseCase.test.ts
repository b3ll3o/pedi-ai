import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReativarRestauranteUseCase } from '@/application/admin/services/ReativarRestauranteUseCase';
import { ReativarRestauranteInput } from '@/application/admin/services/ReativarRestauranteUseCase';
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

describe('ReativarRestauranteUseCase', () => {
  let useCase: ReativarRestauranteUseCase;
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
    useCase = new ReativarRestauranteUseCase(
      mockRestauranteRepo,
      mockUsuarioRestauranteRepo,
      mockEventEmitter
    );
  });

  describe('execute', () => {
    it('deve reativar restaurante quando usuário é owner', async () => {
      const restauranteDesativado = Restaurante.criar({
        nome: 'Restaurante',
        cnpj: '12.345.678/0001-90',
        endereco: '',
        ativo: false,
      });

      mockRestauranteRepo.findById.mockResolvedValueOnce(restauranteDesativado);
      mockRestauranteRepo.update.mockImplementation(async (r) => r);
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
      );

      const input: ReativarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'owner-id',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.restaurante.ativo).toBe(true);
      expect(mockEventEmitter).toHaveBeenCalledTimes(1);
    });

    it('deve retornar restaurante reativado', async () => {
      const restauranteDesativado = Restaurante.criar({
        nome: 'Restaurante',
        cnpj: '12.345.678/0001-90',
        endereco: 'Endereço Teste',
        ativo: false,
      });

      mockRestauranteRepo.findById.mockResolvedValueOnce(restauranteDesativado);
      mockRestauranteRepo.update.mockImplementation(async (r) => r);
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
      );

      const input: ReativarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'owner-id',
      };

      const resultado = await useCase.execute(input);

      expect(resultado.restaurante.nome).toBe('Restaurante');
      expect(resultado.restaurante.cnpj).toBe('12.345.678/0001-90');
      expect(resultado.restaurante.ativo).toBe(true);
    });

    it('deve lançar erro quando restaurante não existe', async () => {
      mockRestauranteRepo.findById.mockResolvedValueOnce(null);

      const input: ReativarRestauranteInput = {
        restauranteId: 'restaurante-inexistente',
        proprietarioId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Restaurante não encontrado');
    });

    it('deve lançar erro quando restaurante já está ativo', async () => {
      const restauranteAtivo = Restaurante.criar({
        nome: 'Restaurante',
        cnpj: '12.345.678/0001-90',
        endereco: '',
        ativo: true,
      });

      mockRestauranteRepo.findById.mockResolvedValueOnce(restauranteAtivo);

      const input: ReativarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Este restaurante já está ativo');
    });

    it('deve lançar erro quando usuário não é owner', async () => {
      const restauranteDesativado = Restaurante.criar({
        nome: 'Restaurante',
        cnpj: '12.345.678/0001-90',
        endereco: '',
        ativo: false,
      });

      mockRestauranteRepo.findById.mockResolvedValueOnce(restauranteDesativado);
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'staff-id', restauranteId: 'restaurante-id', papel: 'atendente' })
      );

      const input: ReativarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'staff-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Você não tem permissão para reativar este restaurante'
      );
    });

    it('deve lançar erro quando usuário é manager (não pode reativar)', async () => {
      const restauranteDesativado = Restaurante.criar({
        nome: 'Restaurante',
        cnpj: '12.345.678/0001-90',
        endereco: '',
        ativo: false,
      });

      mockRestauranteRepo.findById.mockResolvedValueOnce(restauranteDesativado);
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'manager-id', restauranteId: 'restaurante-id', papel: 'gerente' })
      );

      const input: ReativarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'manager-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Você não tem permissão para reativar este restaurante'
      );
    });
  });
});
