import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CriarPixChargeUseCase } from '@/application/pagamento/services/CriarPixChargeUseCase'
import type { IPagamentoRepository } from '@/domain/pagamento/repositories/IPagamentoRepository'
import type { IPedidoRepository } from '@/domain/pedido/repositories/IPedidoRepository'
import type { EventDispatcher } from '@/domain/shared'
import type { IPixAdapter, PixCharge } from '@/application/pagamento/services/adapters/IPixAdapter'
import type { Pedido } from '@/domain/pedido/entities/Pedido'
import type { Pagamento } from '@/domain/pagamento/entities/Pagamento'
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro'
import { StatusPagamento } from '@/domain/pagamento/value-objects/StatusPagamento'

describe('CriarPixChargeUseCase', () => {
  let useCase: CriarPixChargeUseCase
  let mockPixAdapter: IPixAdapter
  let mockPagamentoRepo: IPagamentoRepository
  let mockPedidoRepo: IPedidoRepository
  let mockEventDispatcher: EventDispatcher

  const mockPixCharge: PixCharge = {
    id: 'charge-123',
    codigoPix: '00020126580014br.gov.bcb.pix0136mock-pix-code',
    imagemQrCode: 'data:image/png;base64,mock-image',
    expiracao: new Date(Date.now() + 30 * 60 * 1000),
    valor: 5000,
    status: 'pending',
  }

  const criarMockPedido = (overrides?: { id?: string; total?: Dinheiro }) => {
    return {
      id: overrides?.id ?? 'pedido-123',
      props: {
        id: overrides?.id ?? 'pedido-123',
        restauranteId: 'rest-1',
        status: {} as any,
        itens: [],
        subtotal: {} as any,
        tax: {} as any,
        total: overrides?.total ?? Dinheiro.criar(5000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      total: overrides?.total ?? Dinheiro.criar(5000),
    } as unknown as Pedido
  }

  beforeEach(() => {
    mockPixAdapter = {
      criarCobranca: vi.fn().mockResolvedValue(mockPixCharge),
    }

    mockPagamentoRepo = {
      buscarPorPedidoId: vi.fn().mockResolvedValue(null),
      salvar: vi.fn().mockResolvedValue({} as Pagamento),
      buscarPorId: vi.fn(),
      buscarPorTransacaoId: vi.fn(),
    }

    mockPedidoRepo = {
      findById: vi.fn().mockResolvedValue(criarMockPedido()),
    }

    mockEventDispatcher = {
      dispatch: vi.fn(),
      registerHandler: vi.fn(),
      unregisterHandler: vi.fn(),
    }

    useCase = new CriarPixChargeUseCase(
      mockPixAdapter,
      mockPagamentoRepo,
      mockPedidoRepo,
      mockEventDispatcher
    )
  })

  describe('execute', () => {
    it('deve criar cobrança PIX para pedido válido', async () => {
      const result = await useCase.execute({ pedidoId: 'pedido-123' })

      expect(result).toEqual(mockPixCharge)
      expect(mockPedidoRepo.findById).toHaveBeenCalledWith('pedido-123')
    })

    it('deve chamar pixAdapter.criarCobranca com valor correto', async () => {
      const pedido = criarMockPedido({ total: Dinheiro.criar(7500) })
      mockPedidoRepo.findById.mockResolvedValue(pedido)

      await useCase.execute({ pedidoId: 'pedido-123' })

      expect(mockPixAdapter.criarCobranca).toHaveBeenCalledWith(7500, 'pedido-123')
    })

    it('deve lançar erro quando pedido não existe', async () => {
      mockPedidoRepo.findById.mockResolvedValue(null)

      await expect(useCase.execute({ pedidoId: 'nao-existe' }))
        .rejects.toThrow('Pedido nao-existe não encontrado')
    })

    it('deve verificar pagamento existente', async () => {
      await useCase.execute({ pedidoId: 'pedido-123' })

      expect(mockPagamentoRepo.buscarPorPedidoId).toHaveBeenCalledWith('pedido-123')
    })

    it('deve lançar erro quando já existe pagamento confirmado', async () => {
      const pagamentoConfirmado = {
        id: 'pag-123',
        status: StatusPagamento.CONFIRMED,
        isPendente: () => false,
      } as unknown as Pagamento

      mockPagamentoRepo.buscarPorPedidoId.mockResolvedValue(pagamentoConfirmado)

      await expect(useCase.execute({ pedidoId: 'pedido-123' }))
        .rejects.toThrow('Já existe um pagamento confirmado ou cancelado para este pedido')
    })

    it('deve criar novo pagamento quando não existe pendente', async () => {
      mockPagamentoRepo.buscarPorPedidoId.mockResolvedValue(null)

      await useCase.execute({ pedidoId: 'pedido-123' })

      expect(mockPagamentoRepo.salvar).toHaveBeenCalled()
    })
  })
})