import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GerenciarMesaUseCase, MesaInput } from '@/application/admin/services/GerenciarMesaUseCase';
import { Mesa } from '@/domain/mesa/entities/Mesa';
import { QRCodePayload } from '@/domain/mesa/value-objects/QRCodePayload';

describe('GerenciarMesaUseCase', () => {
  const criarMesa = (id: string, restauranteId: string, label: string, ativo: boolean = true): Mesa => {
    return Mesa.criar({
      id,
      restauranteId,
      label,
      ativo,
      qrCodePayload: QRCodePayload.reconstruir({
        restauranteId,
        mesaId: id,
        assinatura: 'test',
      }),
    });
  };

  const mockQRCodeService = {
    gerarAssinatura: vi.fn().mockReturnValue('signature-test'),
    validarAssinatura: vi.fn().mockReturnValue(true),
  };

  const mockMesaRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByRestauranteId: vi.fn(),
    findByLabel: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new GerenciarMesaUseCase(mockMesaRepo, mockQRCodeService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criar', () => {
    it('deve criar mesa com QR code', async () => {
      mockMesaRepo.findByLabel.mockResolvedValue(null);
      mockMesaRepo.create.mockImplementation(async (mesa) => mesa);

      const result = await useCase.execute({
        acao: 'criar',
        restauranteId: 'rest-1',
        label: 'Mesa 1',
      });

      expect(result.sucesso).toBe(true);
      expect(result.mesa).toBeDefined();
      expect(result.mesa!.label).toBe('Mesa 1');
      expect(mockMesaRepo.create).toHaveBeenCalled();
    });

    it('deve lançar erro se label já existe', async () => {
      mockMesaRepo.findByLabel.mockResolvedValue(criarMesa('existing', 'rest-1', 'Mesa 1'));

      await expect(useCase.execute({
        acao: 'criar',
        restauranteId: 'rest-1',
        label: 'Mesa 1',
      })).rejects.toThrow('Já existe uma mesa com este label');
    });

    it('deve lançar erro se label não fornecido', async () => {
      await expect(useCase.execute({
        acao: 'criar',
        restauranteId: 'rest-1',
      })).rejects.toThrow('Label é obrigatório');
    });
  });

  describe('atualizar', () => {
    it('deve atualizar label da mesa', async () => {
      const mesa = criarMesa('mesa-1', 'rest-1', 'Mesa Antiga');
      mockMesaRepo.findById.mockResolvedValue(mesa);
      mockMesaRepo.findByLabel.mockResolvedValue(null);
      mockMesaRepo.update.mockImplementation(async (m) => m);

      const result = await useCase.execute({
        acao: 'atualizar',
        id: 'mesa-1',
        restauranteId: 'rest-1',
        label: 'Mesa Nova',
      });

      expect(result.sucesso).toBe(true);
      expect(mockMesaRepo.update).toHaveBeenCalled();
    });

    it('deve lançar erro se mesa não encontrada', async () => {
      mockMesaRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute({
        acao: 'atualizar',
        id: 'nao-existe',
        restauranteId: 'rest-1',
      })).rejects.toThrow('Mesa não encontrada');
    });
  });

  describe('excluir', () => {
    it('deve excluir mesa', async () => {
      mockMesaRepo.delete.mockResolvedValue(undefined);

      const result = await useCase.execute({
        acao: 'excluir',
        id: 'mesa-1',
        restauranteId: 'rest-1',
      });

      expect(result.sucesso).toBe(true);
      expect(mockMesaRepo.delete).toHaveBeenCalledWith('mesa-1');
    });

    it('deve lançar erro se id não fornecido', async () => {
      await expect(useCase.execute({
        acao: 'excluir',
        restauranteId: 'rest-1',
      })).rejects.toThrow('ID é obrigatório');
    });
  });

  describe('ativar', () => {
    it('deve ativar mesa', async () => {
      const mesa = criarMesa('mesa-1', 'rest-1', 'Mesa 1', false);
      mockMesaRepo.findById.mockResolvedValue(mesa);
      mockMesaRepo.update.mockImplementation(async (m) => m);

      const result = await useCase.execute({
        acao: 'ativar',
        id: 'mesa-1',
        restauranteId: 'rest-1',
      });

      expect(result.sucesso).toBe(true);
      expect(result.mesa!.ativo).toBe(true);
    });
  });

  describe('desativar', () => {
    it('deve desativar mesa', async () => {
      const mesa = criarMesa('mesa-1', 'rest-1', 'Mesa 1', true);
      mockMesaRepo.findById.mockResolvedValue(mesa);
      mockMesaRepo.update.mockImplementation(async (m) => m);

      const result = await useCase.execute({
        acao: 'desativar',
        id: 'mesa-1',
        restauranteId: 'rest-1',
      });

      expect(result.sucesso).toBe(true);
      expect(result.mesa!.ativo).toBe(false);
    });
  });
});