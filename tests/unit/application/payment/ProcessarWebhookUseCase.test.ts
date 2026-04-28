import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessarWebhookUseCase, IWebhookSignatureValidator } from '@/application/pagamento/services/ProcessarWebhookUseCase';
import { IPagamentoRepository } from '@/domain/pagamento/repositories';
import { ITransacaoRepository } from '@/domain/pagamento/repositories';
import { EventDispatcher } from '@/domain/shared';
import { Pagamento } from '@/domain/pagamento/entities/Pagamento';
import { Transacao } from '@/domain/pagamento/entities/Transacao';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';

// Mock da interface IWebhookSignatureValidator
const mockSignatureValidator = {
  validar: vi.fn(),
};

// Mock do repositório de pagamentos
const mockPagamentoRepo = {
  salvar: vi.fn(),
  buscarPorId: vi.fn(),
  buscarPorPedidoId: vi.fn(),
  buscarPorTransacaoId: vi.fn(),
  listarPorRestauranteId: vi.fn(),
  listarPorStatus: vi.fn(),
  excluir: vi.fn(),
};

// Mock do repositório de transações
const mockTransacaoRepo = {
  salvar: vi.fn(),
  buscarPorId: vi.fn(),
  buscarPorPagamentoId: vi.fn(),
  buscarPorProviderId: vi.fn(),
  listarPorStatus: vi.fn(),
  excluir: vi.fn(),
};

// Mock do EventDispatcher
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
        // Arrange
        mockSignatureValidator.validar.mockReturnValue(false);

        const useCase = new ProcessarWebhookUseCase(
          mockPagamentoRepo as unknown as IPagamentoRepository,
          mockTransacaoRepo as unknown as ITransacaoRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          mockSignatureValidator as unknown as IWebhookSignatureValidator
        );

        const input = {
          provider: 'stripe' as const,
          payload: { id: 'evt_123', tipo: 'payment_intent.succeeded' },
          signature: 'invalid_signature',
        };

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.sucesso).toBe(false);
        expect(result.mensagem).toBe('Assinatura de webhook inválida');
        expect(mockSignatureValidator.validar).toHaveBeenCalledWith(
          'stripe',
          JSON.stringify(input.payload),
          'invalid_signature'
        );
      });

      it('deve aceitar webhook com assinatura válida', async () => {
        // Arrange
        mockSignatureValidator.validar.mockReturnValue(true);
        mockTransacaoRepo.buscarPorProviderId.mockResolvedValue(null);

        const useCase = new ProcessarWebhookUseCase(
          mockPagamentoRepo as unknown as IPagamentoRepository,
          mockTransacaoRepo as unknown as ITransacaoRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          mockSignatureValidator as unknown as IWebhookSignatureValidator
        );

        const input = {
          provider: 'stripe' as const,
          payload: { id: 'evt_456', tipo: 'outro_evento' },
          signature: 'valid_signature',
        };

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.sucesso).toBe(true);
      });
    });

    describe('idempotência', () => {
      it('deve ignorar webhooks duplicados (já processados)', async () => {
        // Arrange
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

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.sucesso).toBe(true);
        expect(result.mensagem).toBe('Evento já processado anteriormente');
        expect(result.eventoId).toBe('evt_duplicate');
        expect(mockPagamentoRepo.salvar).not.toHaveBeenCalled();
      });
    });

    describe('provider não suportado', () => {
      it('deve retornar erro para provider desconhecido', async () => {
        // Arrange
        mockSignatureValidator.validar.mockReturnValue(true);

        const useCase = new ProcessarWebhookUseCase(
          mockPagamentoRepo as unknown as IPagamentoRepository,
          mockTransacaoRepo as unknown as ITransacaoRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          mockSignatureValidator as unknown as IWebhookSignatureValidator
        );

        const input = {
          provider: 'mercadopago' as unknown as 'pix' | 'stripe',
          payload: { id: 'evt_123' },
          signature: 'valid_signature',
        };

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.sucesso).toBe(false);
        expect(result.mensagem).toContain('não suportado');
      });
    });
  });

  describe('webhook Stripe', () => {
    describe('payment_intent.succeeded', () => {
      it('deve confirmar pagamento ao receber evento de sucesso do Stripe', async () => {
        // Arrange
        mockSignatureValidator.validar.mockReturnValue(true);
        mockTransacaoRepo.buscarPorProviderId.mockResolvedValue(null);

        const pagamentoProps = {
          id: 'pagamento-123',
          pedidoId: 'pedido-456',
          metodo: MetodoPagamento.CREDITO,
          status: StatusPagamento.PENDING,
          valor: Dinheiro.criar(5000),
          createdAt: new Date(),
        };
        const pagamento = Pagamento.criar(pagamentoProps);
        mockPagamentoRepo.buscarPorTransacaoId.mockResolvedValue(pagamento);

        const transacaoCharge = Transacao.criar({
          id: 'transacao-789',
          pagamentoId: 'pagamento-123',
          tipo: 'charge',
          providerId: 'pi_test_123',
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
          provider: 'stripe' as const,
          payload: {
            id: 'evt_stripe_success',
            tipo: 'payment_intent.succeeded',
            dados: {
              id: 'pi_test_123',
            },
          },
          signature: 'valid_signature',
        };

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.sucesso).toBe(true);
        expect(result.mensagem).toBe('PaymentIntent confirmado com sucesso');
        expect(result.eventoId).toBe('evt_stripe_success');
        expect(mockPagamentoRepo.salvar).toHaveBeenCalled();
        expect(mockEventDispatcher.dispatch).toHaveBeenCalled();
      });

      it('deve falhar quando PaymentIntent não é encontrado', async () => {
        // Arrange
        mockSignatureValidator.validar.mockReturnValue(true);
        mockTransacaoRepo.buscarPorProviderId.mockResolvedValue(null);
        mockPagamentoRepo.buscarPorTransacaoId.mockResolvedValue(null);

        const useCase = new ProcessarWebhookUseCase(
          mockPagamentoRepo as unknown as IPagamentoRepository,
          mockTransacaoRepo as unknown as ITransacaoRepository,
          mockEventDispatcher as unknown as EventDispatcher,
          mockSignatureValidator as unknown as IWebhookSignatureValidator
        );

        const input = {
          provider: 'stripe' as const,
          payload: {
            id: 'evt_stripe_notfound',
            tipo: 'payment_intent.succeeded',
            dados: {
              id: 'pi_unknown',
            },
          },
          signature: 'valid_signature',
        };

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.sucesso).toBe(false);
        expect(result.mensagem).toContain('não encontrado');
      });
    });

    describe('payment_intent.payment_failed', () => {
      it('deve registrar falha ao receber evento de falha do Stripe', async () => {
        // Arrange
        mockSignatureValidator.validar.mockReturnValue(true);
        mockTransacaoRepo.buscarPorProviderId.mockResolvedValue(null);

        const pagamentoProps = {
          id: 'pagamento-fail-123',
          pedidoId: 'pedido-fail-456',
          metodo: MetodoPagamento.CREDITO,
          status: StatusPagamento.PENDING,
          valor: Dinheiro.criar(5000),
          createdAt: new Date(),
        };
        const pagamento = Pagamento.criar(pagamentoProps);
        mockPagamentoRepo.buscarPorTransacaoId.mockResolvedValue(pagamento);

        const transacaoCharge = Transacao.criar({
          id: 'transacao-fail-789',
          pagamentoId: 'pagamento-fail-123',
          tipo: 'charge',
          providerId: 'pi_test_fail',
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
          provider: 'stripe' as const,
          payload: {
            id: 'evt_stripe_failed',
            tipo: 'payment_intent.payment_failed',
            dados: {
              id: 'pi_test_fail',
            },
          },
          signature: 'valid_signature',
        };

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.sucesso).toBe(true);
        expect(result.mensagem).toBe('Pagamento falhou registrado');
        expect(result.eventoId).toBe('evt_stripe_failed');
        expect(mockPagamentoRepo.salvar).toHaveBeenCalled();
        expect(mockEventDispatcher.dispatch).toHaveBeenCalled();
      });
    });
  });

  describe('webhook Pix', () => {
    it('deve confirmar pagamento Pix ao receber evento PAGAMENTO', async () => {
      // Arrange
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

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.sucesso).toBe(true);
      expect(result.mensagem).toBe('Pagamento Pix confirmado com sucesso');
      expect(result.eventoId).toBe('evt_pix_success');
      expect(mockPagamentoRepo.salvar).toHaveBeenCalled();
      expect(mockEventDispatcher.dispatch).toHaveBeenCalled();
    });

    it('deve falhar quando payload Pix é inválido (sem evento ou id)', async () => {
      // Arrange
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
          // falta evento
        },
        signature: 'valid_signature',
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toBe('Payload de webhook Pix inválido');
    });
  });
});
