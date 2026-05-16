import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CriarRestauranteUseCase } from '@/application/admin/services/CriarRestauranteUseCase';
import { CriarRestauranteInput } from '@/application/admin/services/CriarRestauranteUseCase';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { UsuarioRestauranteProps } from '@/domain/admin/entities/UsuarioRestaurante';
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

describe('CriarRestauranteUseCase', () => {
  let useCase: CriarRestauranteUseCase;
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
      findByUsuarioId: vi.fn().mockResolvedValue([]),
      findByRestauranteId: vi.fn(),
      findByUsuarioIdAndRestauranteId: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    useCase = new CriarRestauranteUseCase(
      mockRestauranteRepo,
      mockUsuarioRestauranteRepo,
      mockEventEmitter
    );
  });

  describe('execute', () => {
    it('deve criar restaurante com vínculo owner quando multi-restaurant está ativo', async () => {
      const input: CriarRestauranteInput = {
        nome: 'Novo Restaurante',
        cnpj: '12.345.678/0001-90',
        endereco: 'Rua Teste, 123',
        telefone: '11999999999',
        ownerId: 'owner-novo-id',
      };

      mockRestauranteRepo.findByCNPJ.mockResolvedValue(null);
      mockRestauranteRepo.create.mockImplementation(async (restaurante: Restaurante, _config) => {
        return restaurante;
      });
      mockUsuarioRestauranteRepo.save.mockResolvedValue(undefined);

      const resultado = await useCase.execute(input);

      expect(resultado.restaurante).toBeDefined();
      expect(resultado.restaurante.nome).toBe('Novo Restaurante');
      expect(resultado.vinculo.papel).toBe('dono');
      expect(resultado.vinculo.usuarioId).toBe('owner-novo-id');
      expect(mockRestauranteRepo.create).toHaveBeenCalledTimes(1);
      expect(mockUsuarioRestauranteRepo.save).toHaveBeenCalledTimes(1);
      expect(mockEventEmitter).toHaveBeenCalledTimes(1);
    });

    it('deve lançar erro quando nome tem menos de 2 caracteres', async () => {
      const input: CriarRestauranteInput = {
        nome: 'A',
        cnpj: '12.345.678/0001-90',
        ownerId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'O nome do restaurante deve ter pelo menos 2 caracteres'
      );
    });

    it('deve lançar erro quando CNPJ tem formato inválido', async () => {
      const input: CriarRestauranteInput = {
        nome: 'Restaurante Teste',
        cnpj: '12345678000190',
        ownerId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'CNPJ inválido. O formato deve ser XX.XXX.XXX/XXXX-XX'
      );
    });

    it('deve lançar erro quando CNPJ já está cadastrado', async () => {
      const restauranteExistente = Restaurante.criar({
        nome: 'Restaurante Existente',
        cnpj: '12.345.678/0001-90',
        endereco: 'Rua Existente, 456',
        telefone: null,
        logoUrl: null,
        ativo: true,
      });

      mockRestauranteRepo.findByCNPJ.mockResolvedValue(restauranteExistente);

      const input: CriarRestauranteInput = {
        nome: 'Novo Restaurante',
        cnpj: '12.345.678/0001-90',
        ownerId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Já existe um restaurante cadastrado com este CNPJ'
      );
      expect(mockRestauranteRepo.create).not.toHaveBeenCalled();
      expect(mockUsuarioRestauranteRepo.save).not.toHaveBeenCalled();
    });

    it('deve lançar erro quando owner já tem restaurante e multi-restaurant desativado', async () => {
      mockIsMultiRestaurantEnabled.mockReturnValue(false);
      mockUsuarioRestauranteRepo.findByUsuarioId.mockResolvedValue([
        { id: 'vinculo-legacy', usuarioId: 'owner-id', restauranteId: 'rest-legacy', papel: 'dono', criadoEm: new Date() } as unknown as UsuarioRestauranteProps,
      ]);

      const input: CriarRestauranteInput = {
        nome: 'Novo Restaurante',
        cnpj: '12.345.678/0001-90',
        ownerId: 'owner-id',
      };

      await expect(useCase.execute(input)).rejects.toThrow(
        'Não é permitido criar novos restaurantes enquanto a funcionalidade multi-restaurante estiver desativada'
      );
    });

    it('deve criar vínculo de owner com o usuário proprietario', async () => {
      const input: CriarRestauranteInput = {
        nome: 'Restaurante do Owner',
        cnpj: '98.765.432/0001-10',
        endereco: 'Endereço do Owner',
        ownerId: 'usuario-owner',
      };

      mockRestauranteRepo.findByCNPJ.mockResolvedValue(null);
      mockRestauranteRepo.create.mockImplementation(async (restaurante: Restaurante, _config) => {
        return restaurante;
      });
      mockUsuarioRestauranteRepo.save.mockResolvedValue(undefined);

      const resultado = await useCase.execute(input);

      expect(resultado.vinculo).toBeDefined();
      expect(resultado.vinculo.usuarioId).toBe('usuario-owner');
      expect(resultado.vinculo.papel).toBe('dono');
    });

    it('deve emitir evento RestauranteCriadoEvent após criar', async () => {
      const input: CriarRestauranteInput = {
        nome: 'Restaurante com Evento',
        cnpj: '11.222.333/0001-44',
        endereco: 'Endereço com Evento',
        ownerId: 'usuario-1',
      };

      mockRestauranteRepo.findByCNPJ.mockResolvedValue(null);
      mockRestauranteRepo.create.mockImplementation(async (restaurante: Restaurante, _config) => {
        return restaurante;
      });
      mockUsuarioRestauranteRepo.save.mockResolvedValue(undefined);

      await useCase.execute(input);

      expect(mockEventEmitter).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'RestauranteCriado',
          props: expect.objectContaining({
            nome: 'Restaurante com Evento',
            proprietarioId: 'usuario-1',
          }),
        })
      );
    });

    it('deve criar restaurante com ativo=true por padrão', async () => {
      const input: CriarRestauranteInput = {
        nome: 'Restaurante Ativo',
        cnpj: '55.666.777/0001-88',
        endereco: 'Endereço Ativo',
        ownerId: 'usuario-1',
      };

      mockRestauranteRepo.findByCNPJ.mockResolvedValue(null);
      mockRestauranteRepo.create.mockImplementation(async (restaurante: Restaurante, _config) => {
        return restaurante;
      });
      mockUsuarioRestauranteRepo.save.mockResolvedValue(undefined);

      const resultado = await useCase.execute(input);

      expect(resultado.restaurante.ativo).toBe(true);
    });
  });
});
