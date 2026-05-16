import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessarWebhookUseCase, IWebhookSignatureValidator } from './ProcessarWebhookUseCase';
import { IPagamentoRepository } from '@/domain/pagamento/repositories/IPagamentoRepository';
import { ITransacaoRepository } from '@/domain/pagamento/repositories/ITransacaoRepository';
import { PagamentoAggregate } from '@/domain/pagamento';
import { EventDispatcher } from '@/domain/shared';
import { Pagamento } from '@/domain/pagamento/entities/Pagamento';
import { Transacao } from '@/domain/pagamento/entities/Transacao';
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

// Mock do EventDispatcher
const mockDispatch = vi.fn();
vi.mock('@/domain/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/shared')>();
  return {
    ...actual,
    EventDispatcher: {
      getInstance: vi.fn(() => ({
        dispatch: mockDispatch,
      })),
    },
  };
});

// Mock do PagamentoAggregate
vi.mock('@/domain/pagamento', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/pagamento')>();
  return {
    ...actual,
    PagamentoAggregate: {
      reconstituir: vi.fn(),
    },
  };
});

describe('ProcessarWebhookUseCase', () => {
  let useCase: ProcessarWebhookUseCase;
  let mockPagamentoRepo: IPagamentoRepository;
  let mockTransacaoRepo: ITransacaoRepository;
  let mockEventDispatcher: EventDispatcher;
  let mockSignatureValidator: IWebhookSignatureValidator;

  const mockPagamento = new Pagamento({
    id: 'pag-123',
    pedidoId: 'pedido-456',
    metodo: MetodoPagamento.PIX,
    status: StatusPagamento.PENDING,
    valor: Dinheiro.criar(5000),
    createdAt: new Date(),
  });

  const mockTransacao = new Transacao({
    id: 'transacao-789',
    pagamentoId: 'pag-123',
    tipo: 'charge',
    providerId: 'mp-charge-001',
    status: 'pending',
    payload: { qrCode: 'test-qr' },
    createdAt: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockPagamentoRepo = {
      salvar: vi.fn(async (p: Pagamento) => p),
      buscarPorId: vi.fn(async () => null),
      buscarPorPedidoId: vi.fn(async () => null),
      buscarPorTransacaoId: vi.fn(async () => mockPagamento),
      listarPorRestauranteId: vi.fn(async () => []),
      listarPorStatus: vi.fn(async () => []),
      excluir: vi.fn(async () => {}),
    };

    mockTransacaoRepo = {
      salvar: vi.fn(async (t: Transacao) => t),
      buscarPorId: vi.fn(async () => null),
      buscarPorPagamentoId: vi.fn(async () => [mockTransacao]),
      buscarPorProviderId: vi.fn(async () => null),
      listarPorStatus: vi.fn(async () => []),
      excluir: vi.fn(async () => {}),
    };

    mockEventDispatcher = {
      dispatch: mockDispatch,
    } as unknown as EventDispatcher;

    mockSignatureValidator = {
      validar: vi.fn(() => true),
    };

    // Setup mock for reconstituir
    const mockAggregate = {
      pagamento: mockPagamento,
      transacoes: [mockTransacao],
      adicionarTransacaoWebhook: vi.fn(),
      processarSucessoTransacao: vi.fn(),
      getEventos: vi.fn(() => []),
    };

    (PagamentoAggregate.reconstituir as ReturnType<typeof vi.fn>).mockReturnValue(mockAggregate);

    useCase = new ProcessarWebhookUseCase(
      mockPagamentoRepo,
      mockTransacaoRepo,
      mockEventDispatcher,
      mockSignatureValidator
    );
  });

  describe('execute', () => {
    it('deve rejeitar provider não suportado', async () => {
      const result = await useCase.execute({
        provider: 'stripe' as 'pix',
        payload: {},
        signature: 'any',
      });

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('não suportado');
    });

    it('deve rejeitar assinatura inválida', async () => {
      mockSignatureValidator.validar = vi.fn(() => false);

      const result = await useCase.execute({
        provider: 'pix',
        payload: { id: 'evt-123', evento: 'PAGAMENTO', pix: { transacaoId: 'transacao-789' } },
        signature: 'invalid-signature',
      });

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('Assinatura');
    });

    it('deve retornar erro para payload sem id ou tipo', async () => {
      const result = await useCase.execute({
        provider: 'pix',
        payload: { foo: 'bar' },
        signature: 'any',
      });

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('inválido');
    });

    it('deve retornar sucesso idempotente para evento já processado', async () => {
      mockTransacaoRepo.buscarPorProviderId = vi.fn(async () => mockTransacao);

      const result = await useCase.execute({
        provider: 'pix',
        payload: { id: 'evt-existing', evento: 'PAGAMENTO', pix: { transacaoId: 'transacao-789' } },
        signature: 'any',
      });

      expect(result.sucesso).toBe(true);
      expect(result.mensagem).toContain('já processado');
    });

    it('deve processar webhook PAGAMENTO com sucesso', async () => {
      mockTransacaoRepo.buscarPorProviderId = vi.fn(async () => null);
      mockPagamentoRepo.buscarPorTransacaoId = vi.fn(async () => mockPagamento);
      mockPagamentoRepo.salvar = vi.fn(async (p: Pagamento) => p);

      const result = await useCase.execute({
        provider: 'pix',
        payload: {
          id: 'evt-new',
          evento: 'PAGAMENTO',
          pix: { transacaoId: 'mp-charge-001' },
        },
        signature: 'any',
      });

      expect(result.sucesso).toBe(true);
      expect(result.mensagem).toContain('confirmado');
      expect(mockPagamentoRepo.salvar).toHaveBeenCalled();
    });

    it('deve retornar erro quando pagamento não é encontrado', async () => {
      mockTransacaoRepo.buscarPorProviderId = vi.fn(async () => null);
      mockPagamentoRepo.buscarPorTransacaoId = vi.fn(async () => null);

      const result = await useCase.execute({
        provider: 'pix',
        payload: {
          id: 'evt-new',
          evento: 'PAGAMENTO',
          pix: { transacaoId: 'unknown-charge' },
        },
        signature: 'any',
      });

      expect(result.sucesso).toBe(false);
      expect(result.mensagem).toContain('não encontrado');
    });

    it('deve processar evento não-PAGAMENTO como sucesso sem ação', async () => {
      mockTransacaoRepo.buscarPorProviderId = vi.fn(async () => null);

      const result = await useCase.execute({
        provider: 'pix',
        payload: {
          id: 'evt-other',
          evento: 'OTHER_EVENT',
          pix: {},
        },
        signature: 'any',
      });

      expect(result.sucesso).toBe(true);
      expect(result.mensagem).toContain('OTHER_EVENT');
    });
  });
});
