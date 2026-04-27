import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CriarRestauranteUseCase } from '@/application/admin/services/CriarRestauranteUseCase';
import { Restaurante } from '@/domain/admin/entities/Restaurante';
import { IRestauranteRepository } from '@/domain/admin/repositories/IRestauranteRepository';
import { IUsuarioRestauranteRepository } from '@/domain/admin/repositories/IUsuarioRestauranteRepository';

// Mock do evento
const mockEventEmitter = vi.fn();

describe('CriarRestauranteUseCase', () => {
  let useCase: CriarRestauranteUseCase;
  let mockRestauranteRepo: IRestauranteRepository;
  let mockUsuarioRestauranteRepo: IUsuarioRestauranteRepository;

  beforeEach(() => {
    vi.clearAllMocks();
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
    useCase = new CriarRestauranteUseCase(
      mockRestauranteRepo,
      mockUsuarioRestauranteRepo,
      mockEventEmitter
    );
  });

  describe('execute', () => {
    it('deve criar um restaurante com sucesso', async () => {
      const cnpj = '12.345.678/0001-90';

      mockRestauranteRepo.findByCNPJ.mockResolvedValue(null);
      mockRestauranteRepo.create.mockImplementation(async (restaurante: Restaurante, _config) => {
        return restaurante;
      });
      mockUsuarioRestauranteRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute({
        proprietarioId: 'usuario-1',
        nome: 'Restaurante Teste',
        cnpj,
        endereco: 'Rua Teste, 123',
        telefone: '11999999999',
        logoUrl: null,
      });

      expect(result.sucesso).toBe(true);
      expect(result.restaurante.nome).toBe('Restaurante Teste');
      expect(result.restaurante.cnpj).toBe(cnpj);
      expect(result.vinculoOwner.papel).toBe('owner');
      expect(result.vinculoOwner.usuarioId).toBe('usuario-1');
      expect(mockRestauranteRepo.create).toHaveBeenCalled();
      expect(mockUsuarioRestauranteRepo.save).toHaveBeenCalled();
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

      await expect(
        useCase.execute({
          proprietarioId: 'usuario-1',
          nome: 'Novo Restaurante',
          cnpj: '12.345.678/0001-90',
          endereco: 'Rua Nova, 789',
        })
      ).rejects.toThrow('Já existe um restaurante cadastrado com este CNPJ');

      expect(mockRestauranteRepo.create).not.toHaveBeenCalled();
      expect(mockUsuarioRestauranteRepo.save).not.toHaveBeenCalled();
    });

    it('deve criar vínculo de owner com o usuário proprietario', async () => {
      mockRestauranteRepo.findByCNPJ.mockResolvedValue(null);
      mockRestauranteRepo.create.mockImplementation(async (restaurante: Restaurante, _config) => {
        return restaurante;
      });
      mockUsuarioRestauranteRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute({
        proprietarioId: 'usuario-owner',
        nome: 'Restaurante do Owner',
        cnpj: '98.765.432/0001-10',
        endereco: 'Endereço do Owner',
      });

      expect(result.vinculoOwner).toBeDefined();
      expect(result.vinculoOwner.usuarioId).toBe('usuario-owner');
      expect(result.vinculoOwner.papel).toBe('owner');
      expect(result.restaurante.id).toBe(result.vinculoOwner.restauranteId);
    });

    it('deve emitir evento RestauranteCriadoEvent após criar', async () => {
      mockRestauranteRepo.findByCNPJ.mockResolvedValue(null);
      mockRestauranteRepo.create.mockImplementation(async (restaurante: Restaurante, _config) => {
        return restaurante;
      });
      mockUsuarioRestauranteRepo.save.mockResolvedValue(undefined);

      await useCase.execute({
        proprietarioId: 'usuario-1',
        nome: 'Restaurante com Evento',
        cnpj: '11.222.333/0001-44',
        endereco: 'Endereço com Evento',
      });

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
      mockRestauranteRepo.findByCNPJ.mockResolvedValue(null);
      mockRestauranteRepo.create.mockImplementation(async (restaurante: Restaurante, _config) => {
        return restaurante;
      });
      mockUsuarioRestauranteRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute({
        proprietarioId: 'usuario-1',
        nome: 'Restaurante Ativo',
        cnpj: '55.666.777/0001-88',
        endereco: 'Endereço Ativo',
      });

      expect(result.restaurante.ativo).toBe(true);
    });
  });
});
