import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessarWebhookUseCase, IWebhookSignatureValidator } from '@/application/pagamento/services/ProcessarWebhookUseCase';
import { IPagamentoRepository } from '@/domain/pagamento/repositories';
import { ITransacaoRepository } from '@/domain/pagamento/repositories';
import { EventDispatcher } from '@/domain/shared';
import { Pagamento } from '@/domain/pagamento/entities/Pagamento';
import { Transacao } from '@/domain/pagamento/entities/Transacao';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';

const mockSignatureValidator = {
  validar: vi.fn(),
};

const mockPagamentoRepo = {
  salvar: vi.fn(),
  buscarPorId: vi.fn(),
  buscarPorPedidoId: vi.fn(),
  buscarPorTransacaoId: vi.fn(),
  listarPorRestauranteId: vi.fn(),
  listarPorStatus: vi.fn(),
  excluir: vi.fn(),
};

const mockTransacaoRepo = {
  salvar: vi.fn(),
  buscarPorId: vi.fn(),
  buscarPorPagamentoId: vi.fn(),
  buscarPorProviderId: vi.fn(),
  listarPorStatus: vi.fn(),
  excluir: vi.fn(),
};

const mockEventDispatcher = {
  dispatch: vi.fn(),
  register: vi.fn(),
  clear: vi.fn(),
};

describe('ProcessarWebhookUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    describe('validação de assinatura', () => {
      it('deve rejeitar webhook com assinatura inválida', async () => {
        mockSignatureValidator.validar.mockReturnValue(false);

        const useCase = new ProcessarWebhookUseCase(
          mockPagamentoRepo as unknown as IPagamentoRepository,
          mockTransacaoRepo as unknown as ITransacaoRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          mockSignatureValidator as unknown as IWebhookSignatureValidator
        );

        const input = {
          provider: 'pix' as const,
          payload: { id: 'evt_123', evento: 'PAGAMENTO' },
          signature: 'invalid_signature',
        };

        const result = await useCase.execute(input);

        expect(result.sucesso).toBe(false);
        expect(result.mensagem).toBe('Assinatura de webhook inválida');
        expect(mockSignatureValidator.validar).toHaveBeenCalledWith(
          'pix',
          JSON.stringify(input.payload),
          'invalid_signature'
        );
      });

      it('deve aceitar webhook com assinatura válida', async () => {
        mockSignatureValidator.validar.mockReturnValue(true);
        mockTransacaoRepo.buscarPorProviderId.mockResolvedValue(null);

        const useCase = new ProcessarWebhookUseCase(
          mockPagamentoRepo as unknown as IPagamentoRepository,
          mockTransacaoRepo as unknown as ITransacaoRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          mockSignatureValidator as unknown as IWebhookSignatureValidator
        );

        const input = {
          provider: 'pix' as const,
          payload: { id: 'evt_456', evento: 'OUTRO_EVENTO' },
          signature: 'valid_signature',
        };

        const result = await useCase.execute(input);

        expect(result.sucesso).toBe(true);
      });
    });

    describe('idempotência', () => {
      it('deve ignorar webhooks duplicados (já processados)', async () => {
        mockSignatureValidator.validar.mockReturnValue(true);
        mockTransacaoRepo.buscarPorProviderId.mockResolvedValue({ id: 'transacao_existente' });

        const useCase = new ProcessarWebhookUseCase(
          mockPagamentoRepo as unknown as IPagamentoRepository,
          mockTransacaoRepo as unknown as ITransacaoRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          mockSignatureValidator as unknown as IWebhookSignatureValidator
        );

        const input = {
          provider: 'pix' as const,
          payload: { id: 'evt_duplicate', evento: 'PAGAMENTO' },
          signature: 'valid_signature',
        };

        const result = await useCase.execute(input);

        expect(result.sucesso).toBe(true);
        expect(result.mensagem).toBe('Evento já processado anteriormente');
        expect(result.eventoId).toBe('evt_duplicate');
        expect(mockPagamentoRepo.salvar).not.toHaveBeenCalled();
      });
    });

    describe('provider não suportado', () => {
      it('deve retornar erro para provider desconhecido', async () => {
        mockSignatureValidator.validar.mockReturnValue(true);

        const useCase = new ProcessarWebhookUseCase(
          mockPagamentoRepo as unknown as IPagamentoRepository,
          mockTransacaoRepo as unknown as ITransacaoRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          mockSignatureValidator as unknown as IWebhookSignatureValidator
        );

        const input = {
          provider: 'mercadopago' as unknown as 'pix',
          payload: { id: 'evt_123' },
          signature: 'valid_signature',
        };

        const result = await useCase.execute(input);

        expect(result.sucesso).toBe(false);
        expect(result.mensagem).toContain('não suportado');
      });
    });
  });

  describe('webhook Pix', () => {
    it('deve confirmar pagamento Pix ao receber evento PAGAMENTO', async () => {
      mockSignatureValidator.validar.mockReturnValue(true);
      mockTransacaoRepo.buscarPorProviderId.mockResolvedValue(null);

      const pagamentoProps = {
        id: 'pagamento-pix-123',
        pedidoId: 'pedido-456',
        metodo: MetodoPagamento.PIX,
        status: StatusPagamento.PENDING,
        valor: Dinheiro.criar(3500),
        createdAt: new Date(),
      };
      const pagamento = Pagamento.criar(pagamentoProps);
      mockPagamentoRepo.buscarPorTransacaoId.mockResolvedValue(pagamento);

      const transacaoCharge = Transacao.criar({
        id: 'transacao-pix-789',
        pagamentoId: 'pagamento-pix-123',
        tipo: 'charge',
        providerId: 'pix_transacao_123',
        payload: {},
      });
      mockTransacaoRepo.buscarPorPagamentoId.mockResolvedValue([transacaoCharge]);
      mockPagamentoRepo.salvar.mockImplementation(async (aggregate) => {
        return aggregate.pagamento;
      });

      const useCase = new ProcessarWebhookUseCase(
        mockPagamentoRepo as unknown as IPagamentoRepository,
        mockTransacaoRepo as unknown as ITransacaoRepository,
        mockEventDispatcher as unknown as EventDispatcher,
        mockSignatureValidator as unknown as IWebhookSignatureValidator
      );

      const input = {
        provider: 'pix' as const,
        payload: {
          id: 'evt_pix_success',
          evento: 'PAGAMENTO',
          pix: {
            transacaoId: 'pix_transacao_123',
          },
        },
        signature: 'valid_signature',
      };

      const result = await useCase.execute(input);

      expect(result.sucesso).toBe(true);
      expect(result.mensagem).toBe('Pagamento Pix confirmado com sucesso');
      expect(result.eventoId).toBe('evt_pix_success');
      expect(mockPagamentoRepo.salvar).toHaveBeenCalled();
      expect(mockEventDispatcher.dispatch).toHaveBeenCalled();
    });

    it('deve falhar quando payload Pix é inválido (sem evento ou id)', async () => {
      mockSignatureValidator.validar.mockReturnValue(true);
      mockTransacaoRepo.buscarPorProviderId.mockResolvedValue(null);

      const useCase = new ProcessarWebhookUseCase(
        mockPagamentoRepo as unknown as IPagamentoRepository,
        mockTransacaoRepo as unknown as ITransacaoRepository,
        mockEventDispatcher as unknown as EventDispatcher,
        mockSignatureValidator as unknown as IWebhookSignatureValidator
      );

      const input = {
        provider: 'pix' as const,
        payload: {
          id: 'evt_pix_invalid',
        },
        signature: 'valid_signature',
      };

      const result = await useCase.execute(input);

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toBe('Payload de webhook Pix inválido');
    });
  });
});
