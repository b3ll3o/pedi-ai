import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CriarPixChargeUseCase } from './CriarPixChargeUseCase';
import { IPagamentoRepository } from '@/domain/pagamento/repositories/IPagamentoRepository';
import { IPedidoRepository } from '@/domain/pedido';
import { IPixAdapter, PixCharge } from './adapters/IPixAdapter';
import { EventDispatcher } from '@/domain/shared';
import { Pagamento } from '@/domain/pagamento/entities/Pagamento';
import { MetodoPagamento } from '@/domain/pagamento/value-objects/MetodoPagamento';
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';
import { Pedido } from '@/domain/pedido/entities/Pedido';

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
      criar: vi.fn(() => ({
        pagamento: {
          id: 'pag-new',
          pedidoId: 'pedido-123',
          metodo: MetodoPagamento.PIX,
          status: StatusPagamento.PENDING,
          valor: Dinheiro.criar(5000),
          createdAt: new Date(),
        },
        adicionarTransacaoCharge: vi.fn(),
        getEventos: vi.fn(() => []),
      })),
    },
    MetodoPagamento: {
      PIX: { toString: () => 'pix' },
      fromValue: vi.fn(() => MetodoPagamento.PIX),
    },
  };
});

describe('CriarPixChargeUseCase', () => {
  let useCase: CriarPixChargeUseCase;
  let mockPixAdapter: IPixAdapter;
  let mockPagamentoRepo: IPagamentoRepository;
  let mockPedidoRepo: IPedidoRepository;
  let mockEventDispatcher: EventDispatcher;

  const mockPixCharge: PixCharge = {
    id: 'pix_charge_123',
    valor: 50.0,
    imagemQrCode: 'data:image/png;base64,abc123',
    codigoPix: '00020126580014br.gov.bcb.pix...',
    expiracao: new Date(Date.now() + 30 * 60 * 1000),
  };

  const mockPedido = {
    id: 'pedido-123',
    clienteId: 'cliente-1',
    mesaId: 'mesa-1',
    restauranteId: 'rest-1',
    status: { toString: () => 'pending_payment' },
    itens: [
      {
        id: 'item-1',
        produtoId: 'prod-1',
        nome: 'X-Burger',
        precoUnitario: { valor: 5000, moeda: 'BRL' },
        quantidade: 1,
        modificadoresSelecionados: [],
        pedirObservacao: '',
      },
    ],
    subtotal: Dinheiro.criar(4500),
    tax: Dinheiro.criar(500),
    total: Dinheiro.criar(5000),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Pedido;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPixAdapter = {
      criarCobranca: vi.fn(async () => mockPixCharge),
      verificarStatus: vi.fn(async () => mockPixCharge),
    };

    mockPagamentoRepo = {
      salvar: vi.fn(async (p: Pagamento) => p),
      buscarPorId: vi.fn(async () => null),
      buscarPorPedidoId: vi.fn(async () => null),
      buscarPorTransacaoId: vi.fn(async () => null),
      listarPorRestauranteId: vi.fn(async () => []),
      listarPorStatus: vi.fn(async () => []),
      excluir: vi.fn(async () => {}),
    };

    mockPedidoRepo = {
      findById: vi.fn(async () => mockPedido),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByClienteId: vi.fn(),
      findByMesaId: vi.fn(),
      findByRestauranteId: vi.fn(),
    };

    mockEventDispatcher = {
      dispatch: mockDispatch,
    } as unknown as EventDispatcher;

    useCase = new CriarPixChargeUseCase(
      mockPixAdapter,
      mockPagamentoRepo,
      mockPedidoRepo,
      mockEventDispatcher
    );
  });

  describe('execute', () => {
    it('deve lançar erro quando pedido não existe', async () => {
      mockPedidoRepo.findById = vi.fn(async () => null);

      await expect(useCase.execute({ pedidoId: 'pedido-inexistente' })).rejects.toThrow(
        'não encontrado'
      );
    });

    it('deve lançar erro quando pagamento já está confirmado', async () => {
      const pagamentoConfirmado = new Pagamento({
        id: 'pag-confirmado',
        pedidoId: 'pedido-123',
        metodo: MetodoPagamento.PIX,
        status: StatusPagamento.CONFIRMED,
        valor: Dinheiro.criar(5000),
        createdAt: new Date(),
        confirmedAt: new Date(),
      });

      mockPagamentoRepo.buscarPorPedidoId = vi.fn(async () => pagamentoConfirmado);

      await expect(useCase.execute({ pedidoId: 'pedido-123' })).rejects.toThrow(
        'Já existe um pagamento confirmado ou cancelado para este pedido'
      );
    });

    it('deve criar PixCharge com sucesso para novo pagamento', async () => {
      mockPagamentoRepo.buscarPorPedidoId = vi.fn(async () => null);

      const result = await useCase.execute({ pedidoId: 'pedido-123' });

      expect(result.id).toBe('pix_charge_123');
      expect(result.valor).toBe(50.0);
      expect(result.codigoPix).toBeTruthy();
      expect(result.imagemQrCode).toBeTruthy();
      expect(mockPixAdapter.criarCobranca).toHaveBeenCalledWith(5000, 'pedido-123');
    });

    it('deve reutilizar PixCharge existente quando pagamento já está pendente', async () => {
      const pagamentoPendente = new Pagamento({
        id: 'pag-pendente',
        pedidoId: 'pedido-123',
        metodo: MetodoPagamento.PIX,
        status: StatusPagamento.PENDING,
        valor: Dinheiro.criar(5000),
        createdAt: new Date(),
      });

      mockPagamentoRepo.buscarPorPedidoId = vi.fn(async () => pagamentoPendente);
      mockPixAdapter.criarCobranca = vi.fn(async () => mockPixCharge);

      const result = await useCase.execute({ pedidoId: 'pedido-123' });

      expect(result.id).toBe('pix_charge_123');
      expect(mockPixAdapter.criarCobranca).toHaveBeenCalledWith(5000, 'pedido-123');
      expect(mockPagamentoRepo.salvar).not.toHaveBeenCalled();
    });

    it('deve persistir pagamento ao criar novo', async () => {
      mockPagamentoRepo.buscarPorPedidoId = vi.fn(async () => null);

      await useCase.execute({ pedidoId: 'pedido-123' });

      expect(mockPagamentoRepo.salvar).toHaveBeenCalled();
    });
  });
});
