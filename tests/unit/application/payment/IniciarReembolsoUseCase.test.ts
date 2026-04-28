import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IniciarReembolsoUseCase, IRefundAdapter } from '@/application/pagamento/services/IniciarReembolsoUseCase';
import { IPagamentoRepository } from '@/domain/pagamento/repositories';
import { ITransacaoRepository } from '@/domain/pagamento/repositories';
import { EventDispatcher } from '@/domain/shared';
import { Pagamento } from '@/domain/pagamento/entities/Pagamento';
import { Transacao } from '@/domain/pagamento/entities/Transacao';
import { Dinheiro } from '@/domain/pedido/value-objects/Dinheiro';
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';

// Mock do adapter de reembolso
const mockRefundAdapter: IRefundAdapter = {
  iniciarReembolso: vi.fn(),
};

// Mock do repositório de pagamentos
const mockPagamentoRepo: IPagamentoRepository = {
  salvar: vi.fn(),
  buscarPorId: vi.fn(),
  buscarPorPedidoId: vi.fn(),
  buscarPorTransacaoId: vi.fn(),
  listarPorRestauranteId: vi.fn(),
  listarPorStatus: vi.fn(),
  excluir: vi.fn(),
};

// Mock do repositório de transações
const mockTransacaoRepo: ITransacaoRepository = {
  salvar: vi.fn(),
  buscarPorId: vi.fn(),
  buscarPorPagamentoId: vi.fn(),
  buscarPorProviderId: vi.fn(),
  listarPorStatus: vi.fn(),
  excluir: vi.fn(),
};

// Mock do EventDispatcher
const mockEventDispatcher: EventDispatcher = {
  dispatch: vi.fn(),
  register: vi.fn(),
  clear: vi.fn(),
};

describe('IniciarReembolsoUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const criarPagamentoConfirmado = (id: string, valorEmCentavos: number): Pagamento => {
    const pagamento = Pagamento.criar({
      id,
      pedidoId: `pedido-${id}`,
      metodo: MetodoPagamento.CREDITO,
      valor: Dinheiro.criar(valorEmCentavos),
    });
    // Pagamento criado com status PENDING, mas o UseCase verifica via repository
    // Ent�o precisamos criar um pagamento j� com status CONFIRMED via props
    Object.defineProperty(pagamento.props, 'status', {
      value: StatusPagamento.CONFIRMED,
      writable: true,
    });
    Object.defineProperty(pagamento.props, 'confirmedAt', {
      value: new Date(),
      writable: true,
    });
    return pagamento;
  };

  const criarTransacaoChargeSucesso = (pagamentoId: string, providerId: string): Transacao => {
    const transacao = Transacao.criar({
      id: `transacao-${providerId}`,
      pagamentoId,
      tipo: 'charge',
      providerId,
      payload: {},
    });
    transacao.marcarSucesso();
    return transacao;
  };

  describe('execute', () => {
    describe('sucesso no reembolso', () => {
      it('deve iniciar reembolso para pedido pago', async () => {
        // Arrange
        const pagamentoId = 'pagamento-reembolso-123';
        const valorEmCentavos = 5000;
        const pagamento = criarPagamentoConfirmado(pagamentoId, valorEmCentavos);
        const transacaoCharge = criarTransacaoChargeSucesso(pagamentoId, 'pi_test_charge_123');

        mockPagamentoRepo.buscarPorId.mockResolvedValue(pagamento);
        mockTransacaoRepo.buscarPorPagamentoId.mockResolvedValue([transacaoCharge]);
        mockRefundAdapter.iniciarReembolso.mockResolvedValue({
          refundId: 're_test_123',
          status: 'pending' as const, // Usa pending para evitar double call do iniciarReembolso
        });
        mockPagamentoRepo.salvar.mockImplementation(async (aggregate) => {
          return aggregate.pagamento;
        });

        const useCase = new IniciarReembolsoUseCase(
          mockPagamentoRepo,
          mockTransacaoRepo,
          mockEventDispatcher,
          mockRefundAdapter
        );

        const input = { pagamentoId };

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.id).toBe('re_test_123');
        expect(result.pagamentoId).toBe(pagamentoId);
        expect(result.status).toBe('pending');
        expect(mockRefundAdapter.iniciarReembolso).toHaveBeenCalledWith('pi_test_charge_123', valorEmCentavos);
        expect(mockPagamentoRepo.salvar).toHaveBeenCalled();
        expect(mockEventDispatcher.dispatch).toHaveBeenCalled();
      });

      it('deve chamar API de reembolso do provider de pagamento', async () => {
        // Arrange
        const pagamentoId = 'pagamento-api-456';
        const valorEmCentavos = 10000;
        const providerId = 'pi_test_provider_456';
        const pagamento = criarPagamentoConfirmado(pagamentoId, valorEmCentavos);
        const transacaoCharge = criarTransacaoChargeSucesso(pagamentoId, providerId);

        mockPagamentoRepo.buscarPorId.mockResolvedValue(pagamento);
        mockTransacaoRepo.buscarPorPagamentoId.mockResolvedValue([transacaoCharge]);
        mockRefundAdapter.iniciarReembolso.mockResolvedValue({
          refundId: 're_api_456',
          status: 'pending' as const,
        });
        mockPagamentoRepo.salvar.mockImplementation(async (aggregate) => aggregate.pagamento);

        const useCase = new IniciarReembolsoUseCase(
          mockPagamentoRepo,
          mockTransacaoRepo,
          mockEventDispatcher,
          mockRefundAdapter
        );

        const input = { pagamentoId };

        // Act
        await useCase.execute(input);

        // Assert
        expect(mockRefundAdapter.iniciarReembolso).toHaveBeenCalledTimes(1);
        expect(mockRefundAdapter.iniciarReembolso).toHaveBeenCalledWith(providerId, valorEmCentavos);
      });

      it('deve reembolsar valor parcial quando valorReembolso é especificado', async () => {
        // Arrange
        const pagamentoId = 'pagamento-parcial-123';
        const valorTotalEmCentavos = 10000;
        const valorReembolsoEmReais = 50.00; // 5000 centavos
        const pagamento = criarPagamentoConfirmado(pagamentoId, valorTotalEmCentavos);
        const transacaoCharge = criarTransacaoChargeSucesso(pagamentoId, 'pi_test_parcial');

        mockPagamentoRepo.buscarPorId.mockResolvedValue(pagamento);
        mockTransacaoRepo.buscarPorPagamentoId.mockResolvedValue([transacaoCharge]);
        mockRefundAdapter.iniciarReembolso.mockResolvedValue({
          refundId: 're_parcial_123',
          status: 'success' as const,
        });
        mockPagamentoRepo.salvar.mockImplementation(async (aggregate) => aggregate.pagamento);

        const useCase = new IniciarReembolsoUseCase(
          mockPagamentoRepo,
          mockTransacaoRepo,
          mockEventDispatcher,
          mockRefundAdapter
        );

        const input = { pagamentoId, valorReembolso: valorReembolsoEmReais };

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.valorReembolsado).toBe(valorReembolsoEmReais);
        expect(mockRefundAdapter.iniciarReembolso).toHaveBeenCalledWith('pi_test_parcial', 5000);
      });
    });

    describe('erros de validação', () => {
      it('deve lançar erro para pedido não pago', async () => {
        // Arrange
        const pagamentoId = 'pagamento-nao-pago';
        const pagamento = Pagamento.criar({
          id: pagamentoId,
          pedidoId: 'pedido-nao-pago',
          metodo: MetodoPagamento.PIX,
          valor: Dinheiro.criar(3500),
        });
        // Pagamento permanece com status PENDING (não confirmado)

        mockPagamentoRepo.buscarPorId.mockResolvedValue(pagamento);
        mockTransacaoRepo.buscarPorPagamentoId.mockResolvedValue([]);

        const useCase = new IniciarReembolsoUseCase(
          mockPagamentoRepo,
          mockTransacaoRepo,
          mockEventDispatcher,
          mockRefundAdapter
        );

        const input = { pagamentoId };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Apenas pagamentos confirmados podem ser reembolsados');
      });

      it('deve lançar erro quando pagamento não é encontrado', async () => {
        // Arrange
        const pagamentoId = 'pagamento-inexistente';

        mockPagamentoRepo.buscarPorId.mockResolvedValue(null);

        const useCase = new IniciarReembolsoUseCase(
          mockPagamentoRepo,
          mockTransacaoRepo,
          mockEventDispatcher,
          mockRefundAdapter
        );

        const input = { pagamentoId };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow(`Pagamento ${pagamentoId} não encontrado`);
      });

      it('deve lançar erro quando transação de charge não é encontrada', async () => {
        // Arrange
        const pagamentoId = 'pagamento-sem-charge';
        const pagamento = criarPagamentoConfirmado(pagamentoId, 5000);

        mockPagamentoRepo.buscarPorId.mockResolvedValue(pagamento);
        mockTransacaoRepo.buscarPorPagamentoId.mockResolvedValue([]); // Sem transações de charge

        const useCase = new IniciarReembolsoUseCase(
          mockPagamentoRepo,
          mockTransacaoRepo,
          mockEventDispatcher,
          mockRefundAdapter
        );

        const input = { pagamentoId };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Transação de charge não encontrada para este pagamento');
      });

      it('deve lançar erro quando valor de reembolso é zero', async () => {
        // Arrange
        const pagamentoId = 'pagamento-reembolso-zero';
        const pagamento = criarPagamentoConfirmado(pagamentoId, 5000);
        const transacaoCharge = criarTransacaoChargeSucesso(pagamentoId, 'pi_test_zero');

        mockPagamentoRepo.buscarPorId.mockResolvedValue(pagamento);
        mockTransacaoRepo.buscarPorPagamentoId.mockResolvedValue([transacaoCharge]);

        const useCase = new IniciarReembolsoUseCase(
          mockPagamentoRepo,
          mockTransacaoRepo,
          mockEventDispatcher,
          mockRefundAdapter
        );

        const input = { pagamentoId, valorReembolso: 0 };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Valor de reembolso deve ser maior que zero');
      });

      it('deve lançar erro quando valor de reembolso excede valor do pagamento', async () => {
        // Arrange
        const pagamentoId = 'pagamento-reembolso-excedente';
        const pagamento = criarPagamentoConfirmado(pagamentoId, 5000);
        const transacaoCharge = criarTransacaoChargeSucesso(pagamentoId, 'pi_test_excedente');

        mockPagamentoRepo.buscarPorId.mockResolvedValue(pagamento);
        mockTransacaoRepo.buscarPorPagamentoId.mockResolvedValue([transacaoCharge]);

        const useCase = new IniciarReembolsoUseCase(
          mockPagamentoRepo,
          mockTransacaoRepo,
          mockEventDispatcher,
          mockRefundAdapter
        );

        const input = { pagamentoId, valorReembolso: 100.00 }; // 100 reais = 10000 centavos > 5000 centavos

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Valor de reembolso não pode exceder o valor do pagamento');
      });
    });

    describe('erros do provider', () => {
      it('deve tratar erros do provider de pagamento', async () => {
        // Arrange
        const pagamentoId = 'pagamento-erro-provider';
        const pagamento = criarPagamentoConfirmado(pagamentoId, 5000);
        const transacaoCharge = criarTransacaoChargeSucesso(pagamentoId, 'pi_test_erro');

        mockPagamentoRepo.buscarPorId.mockResolvedValue(pagamento);
        mockTransacaoRepo.buscarPorPagamentoId.mockResolvedValue([transacaoCharge]);
        mockRefundAdapter.iniciarReembolso.mockRejectedValue(new Error('Erro de comunicação com Stripe'));

        const useCase = new IniciarReembolsoUseCase(
          mockPagamentoRepo,
          mockTransacaoRepo,
          mockEventDispatcher,
          mockRefundAdapter
        );

        const input = { pagamentoId };

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Erro de comunicação com Stripe');
      });

      it('deve retornar status failure quando provider retorna falha', async () => {
        // Arrange
        const pagamentoId = 'pagamento-falha-provider';
        const pagamento = criarPagamentoConfirmado(pagamentoId, 5000);
        const transacaoCharge = criarTransacaoChargeSucesso(pagamentoId, 'pi_test_falha');

        mockPagamentoRepo.buscarPorId.mockResolvedValue(pagamento);
        mockTransacaoRepo.buscarPorPagamentoId.mockResolvedValue([transacaoCharge]);
        mockRefundAdapter.iniciarReembolso.mockResolvedValue({
          refundId: 're_falha_123',
          status: 'failure' as const,
        });
        mockPagamentoRepo.salvar.mockImplementation(async (aggregate) => aggregate.pagamento);

        const useCase = new IniciarReembolsoUseCase(
          mockPagamentoRepo,
          mockTransacaoRepo,
          mockEventDispatcher,
          mockRefundAdapter
        );

        const input = { pagamentoId };

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.status).toBe('failure');
      });
    });
  });
});
