import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FinalizarPedidoUseCase } from '@/application/pedido/services/FinalizarPedidoUseCase'
import type { IPedidoRepository } from '@/domain/pedido/repositories/IPedidoRepository'
import type { EventDispatcher } from '@/domain/shared'
import type { Pedido } from '@/domain/pedido/entities/Pedido'
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido'

describe('FinalizarPedidoUseCase', () => {
  let useCase: FinalizarPedidoUseCase
  let mockPedidoRepo: IPedidoRepository
  let mockEventDispatcher: EventDispatcher
  let mockPedido: Pedido

  const criarMockPedido = (overrides?: {
    id?: string
    status?: StatusPedido
  }) => {
    const props = {
      id: overrides?.id ?? 'pedido-123',
      restauranteId: 'rest-1',
      status: overrides?.status ?? StatusPedido.READY,
      itens: [],
      subtotal: {} as any,
      tax: {} as any,
      total: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const pedido = {
      id: props.id,
      props,
      status: props.status,
      restauranteId: 'rest-1',
      itens: [],
      subtotal: {} as any,
      tax: {} as any,
      total: {} as any,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      equals: vi.fn(),
      alterarStatus: vi.fn(),
    } as unknown as Pedido & {
      props: typeof props
      alterarStatus: ReturnType<typeof vi.fn>
    }

    pedido.equals = vi.fn().mockReturnValue(false)
    pedido.equals.mockImplementation((other: any) => other?.id === pedido.id)

    return pedido
  }

  beforeEach(() => {
    mockPedido = criarMockPedido()

    mockPedidoRepo = {
      findById: vi.fn().mockResolvedValue(mockPedido),
      findByClienteId: vi.fn(),
      findByRestauranteId: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(mockPedido),
      delete: vi.fn(),
    }

    mockEventDispatcher = {
      dispatch: vi.fn(),
      registerHandler: vi.fn(),
      unregisterHandler: vi.fn(),
    }

    useCase = new FinalizarPedidoUseCase(mockPedidoRepo, mockEventDispatcher)
  })

  describe('execute', () => {
    it('deve finalizar pedido com status READY', async () => {
      mockPedidoRepo.findById.mockResolvedValue(mockPedido)
      mockPedidoRepo.update.mockResolvedValue(mockPedido)

      const result = await useCase.execute({ pedidoId: 'pedido-123' })

      expect(mockPedidoRepo.findById).toHaveBeenCalledWith('pedido-123')
      expect(mockPedido.alterarStatus).toHaveBeenCalledWith(StatusPedido.DELIVERED)
      expect(mockPedidoRepo.update).toHaveBeenCalledWith(mockPedido)
      expect(mockEventDispatcher.dispatch).toHaveBeenCalled()
      expect(result).toBe(mockPedido)
    })

    it('deve lançar erro quando pedido não existe', async () => {
      mockPedidoRepo.findById.mockResolvedValue(null)

      await expect(useCase.execute({ pedidoId: 'nao-existe' }))
        .rejects.toThrow('Pedido nao-existe não encontrado')

      expect(mockPedidoRepo.findById).toHaveBeenCalledWith('nao-existe')
      expect(mockPedidoRepo.update).not.toHaveBeenCalled()
      expect(mockEventDispatcher.dispatch).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando status não é READY', async () => {
      const pedidoPendente = criarMockPedido({ status: StatusPedido.PENDING_PAYMENT })
      mockPedidoRepo.findById.mockResolvedValue(pedidoPendente)

      await expect(useCase.execute({ pedidoId: 'pedido-123' }))
        .rejects.toThrow(/Pedido deve estar com status 'ready'/)

      expect(mockPedidoRepo.findById).toHaveBeenCalledWith('pedido-123')
      expect(mockPedidoRepo.update).not.toHaveBeenCalled()
      expect(mockEventDispatcher.dispatch).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando status é PAID', async () => {
      const pedidoPago = criarMockPedido({ status: StatusPedido.PAID })
      mockPedidoRepo.findById.mockResolvedValue(pedidoPago)

      await expect(useCase.execute({ pedidoId: 'pedido-123' }))
        .rejects.toThrow(/Pedido deve estar com status 'ready'/)

      expect(mockPedidoRepo.findById).toHaveBeenCalledWith('pedido-123')
      expect(mockPedidoRepo.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando status é DELIVERED', async () => {
      const pedidoEntregue = criarMockPedido({ status: StatusPedido.DELIVERED })
      mockPedidoRepo.findById.mockResolvedValue(pedidoEntregue)

      await expect(useCase.execute({ pedidoId: 'pedido-123' }))
        .rejects.toThrow(/Pedido deve estar com status 'ready'/)
    })

    it('deve chamar eventDispatcher após finalizar pedido', async () => {
      mockPedidoRepo.findById.mockResolvedValue(mockPedido)
      mockPedidoRepo.update.mockResolvedValue(mockPedido)

      await useCase.execute({ pedidoId: 'pedido-123' })

      expect(mockEventDispatcher.dispatch).toHaveBeenCalledTimes(1)
    })
  })
})