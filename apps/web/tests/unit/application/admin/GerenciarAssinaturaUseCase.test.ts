/**
 * Cobertura: RF-ADM-11 (Gerenciar assinatura)
 * @see .openspec/specs/admin/design.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GerenciarAssinaturaUseCase } from '@/application/admin/services/GerenciarAssinaturaUseCase';
import { Assinatura } from '@/domain/admin/entities/Assinatura';

describe('GerenciarAssinaturaUseCase', () => {
  const criarAssinatura = (restauranteId: string): Assinatura => {
    return Assinatura.criar(restauranteId);
  };

  const mockRepo = {
    buscarPorRestauranteId: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
  };

  const useCase = new GerenciarAssinaturaUseCase(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verificarAcesso', () => {
    it('deve retornar bloqueado true se assinatura não existe', async () => {
      mockRepo.buscarPorRestauranteId.mockResolvedValue(null);

      const result = await useCase.verificarAcesso({ restauranteId: 'rest-1' });

      expect(result.ativo).toBe(false);
      expect(result.status).toBe('expired');
      expect(result.bloqueado).toBe(true);
    });

    it('deve retornar dados da assinatura existente', async () => {
      const assinatura = criarAssinatura('rest-1');
      mockRepo.buscarPorRestauranteId.mockResolvedValue(assinatura);

      const result = await useCase.verificarAcesso({ restauranteId: 'rest-1' });

      expect(result.ativo).toBe(true);
      expect(result.status).toBe('trial');
      expect(result.diasRestantes).toBe(14);
      expect(result.bloqueado).toBe(false);
    });

    it('deve retornar bloqueado para assinatura expirada', async () => {
      const assinatura = criarAssinatura('rest-1');
      assinatura.expirar();
      mockRepo.buscarPorRestauranteId.mockResolvedValue(assinatura);

      const result = await useCase.verificarAcesso({ restauranteId: 'rest-1' });

      expect(result.bloqueado).toBe(true);
    });
  });

  describe('iniciarTrial', () => {
    it('deve criar assinatura com trial de 14 dias', async () => {
      mockRepo.buscarPorRestauranteId.mockResolvedValue(null);
      mockRepo.criar.mockImplementation(async (a) => a);

      const result = await useCase.iniciarTrial({ restauranteId: 'rest-1' });

      expect(mockRepo.criar).toHaveBeenCalled();
      expect(result.restauranteId).toBe('rest-1');
      expect(result.status).toBe('trial');
    });

    it('deve lançar erro se assinatura já existe', async () => {
      mockRepo.buscarPorRestauranteId.mockResolvedValue(criarAssinatura('rest-1'));

      await expect(useCase.iniciarTrial({ restauranteId: 'rest-1' })).rejects.toThrow(
        'Restaurante já possui uma assinatura'
      );
    });

    it('deve criar trial customizado', async () => {
      mockRepo.buscarPorRestauranteId.mockResolvedValue(null);
      mockRepo.criar.mockImplementation(async (a) => a);

      const result = await useCase.iniciarTrial({ restauranteId: 'rest-1', diasTrial: 30 });

      expect(result.diasRestantesTrial).toBe(30);
    });
  });

  describe('ativarAssinatura', () => {
    it('deve ativar assinatura monthly', async () => {
      const assinatura = criarAssinatura('rest-1');
      mockRepo.buscarPorRestauranteId.mockResolvedValue(assinatura);
      mockRepo.atualizar.mockImplementation(async (a) => a);

      const result = await useCase.ativarAssinatura({
        restauranteId: 'rest-1',
        tipoPlano: 'monthly',
      });

      expect(result.status).toBe('active');
    });

    it('deve lançar erro se assinatura não encontrada', async () => {
      mockRepo.buscarPorRestauranteId.mockResolvedValue(null);

      await expect(
        useCase.ativarAssinatura({
          restauranteId: 'rest-1',
          tipoPlano: 'monthly',
        })
      ).rejects.toThrow('Assinatura não encontrada');
    });
  });

  describe('validarOperacao', () => {
    it('deve lançar erro se assinatura bloqueada', async () => {
      mockRepo.buscarPorRestauranteId.mockResolvedValue(null);

      await expect(useCase.validarOperacao('rest-1')).rejects.toThrow(/bloqueada/);
    });

    it('deve passar se assinatura ativa', async () => {
      const assinatura = criarAssinatura('rest-1');
      mockRepo.buscarPorRestauranteId.mockResolvedValue(assinatura);

      await expect(useCase.validarOperacao('rest-1')).resolves.not.toThrow();
    });
  });
});
