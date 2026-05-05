// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AtualizarRestauranteUseCase } from '@/application/admin/services/AtualizarRestauranteUseCase';
import { AtualizarRestauranteInput } from '@/application/admin/services/AtualizarRestauranteUseCase';
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

describe('AtualizarRestauranteUseCase', () => {
  let useCase: AtualizarRestauranteUseCase;
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
    useCase = new AtualizarRestauranteUseCase(
      mockRestauranteRepo,
      mockUsuarioRestauranteRepo,
      mockEventEmitter
    );
  });

  describe('execute', () => {
    it('deve atualizar restaurante quando usuário é owner', async () => {
      const restauranteExistente = Restaurante.criar({
        nome: 'Nome Antigo',
        cnpj: '12.345.678/0001-90',
        endereco: 'Endereço Antigo',
        ativo: true,
      });

      mockRestauranteRepo.findById.mockResolvedValueOnce(restauranteExistente);
      mockRestauranteRepo.update.mockImplementation(async (r) => r);
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
      );

      const input: AtualizarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'owner-id',
        dados: {
          nome: 'Nome Novo',
          endereco: 'Endereço Novo',
        },
      };

      const resultado = await useCase.execute(input);

      expect(resultado.sucesso).toBe(true);
      expect(resultado.restaurante.nome).toBe('Nome Novo');
      expect(mockEventEmitter).toHaveBeenCalledTimes(1);
    });

    it('deve lançar erro quando restaurante não existe', async () => {
      mockRestauranteRepo.findById.mockResolvedValueOnce(null);

      const input: AtualizarRestauranteInput = {
        restauranteId: 'restaurante-inexistente',
        proprietarioId: 'owner-id',
        dados: { nome: 'Nome Novo' },
      };

      await expect(useCase.execute(input)).rejects.toThrow('Restaurante não encontrado');
    });

    it('deve lançar erro quando usuário não tem permissão', async () => {
      mockRestauranteRepo.findById.mockResolvedValueOnce(
        Restaurante.criar({ nome: 'Restaurante', cnpj: '12.345.678/0001-90', endereco: '', ativo: true })
      );
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(null);

      const input: AtualizarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'usuario-sem-permissao',
        dados: { nome: 'Nome Novo' },
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Você não tem permissão para atualizar este restaurante'
      );
    });

    it('deve lançar erro quando CNPJ tem formato inválido', async () => {
      mockRestauranteRepo.findById.mockResolvedValueOnce(
        Restaurante.criar({ nome: 'Restaurante', cnpj: '12.345.678/0001-90', endereco: '', ativo: true })
      );

      const input: AtualizarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'owner-id',
        dados: { cnpj: 'cnpj-invalido' },
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'CNPJ inválido. O formato deve ser XX.XXX.XXX/XXXX-XX'
      );
    });

    it('deve lançar erro quando tenta alterar CNPJ', async () => {
      mockRestauranteRepo.findById.mockResolvedValueOnce(
        Restaurante.criar({ nome: 'Restaurante', cnpj: '12.345.678/0001-90', endereco: '', ativo: true })
      );
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
      );

      const input: AtualizarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'owner-id',
        dados: { cnpj: '98.765.432/0001-00' },
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'O CNPJ do restaurante não pode ser alterado'
      );
    });

    it('deve lançar erro quando nome tem menos de 2 caracteres', async () => {
      mockRestauranteRepo.findById.mockResolvedValueOnce(
        Restaurante.criar({ nome: 'Restaurante', cnpj: '12.345.678/0001-90', endereco: '', ativo: true })
      );
      mockUsuarioRestauranteRepo.findByUsuarioIdAndRestauranteId.mockResolvedValueOnce(
        UsuarioRestaurante.criar({ usuarioId: 'owner-id', restauranteId: 'restaurante-id', papel: 'dono' })
      );

      const input: AtualizarRestauranteInput = {
        restauranteId: 'restaurante-id',
        proprietarioId: 'owner-id',
        dados: { nome: 'A' },
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'O nome do restaurante deve ter pelo menos 2 caracteres'
      );
    });
  });
});
