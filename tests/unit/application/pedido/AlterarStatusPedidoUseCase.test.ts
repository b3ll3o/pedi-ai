import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AlterarStatusPedidoUseCase } from '@/application/pedido/services/AlterarStatusPedidoUseCase'
import type { IPedidoRepository } from '@/domain/pedido/repositories/IPedidoRepository'
import type { EventDispatcher } from '@/domain/shared'
import type { Pedido } from '@/domain/pedido/entities/Pedido'
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido'

describe('AlterarStatusPedidoUseCase', () => {
  let useCase: AlterarStatusPedidoUseCase
  let mockPedidoRepo: IPedidoRepository
  let mockEventDispatcher: EventDispatcher

  const criarMockPedido = (status: StatusPedido) => {
    const pedido = {
      id: 'pedido-123',
      props: {
        id: 'pedido-123',
        restauranteId: 'rest-1',
        status,
        itens: [],
        subtotal: {} as any,
        tax: {} as any,
        total: {} as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      status,
      equals: vi.fn().mockReturnValue(false),
      equalsById: vi.fn().mockReturnValue(true),
      alterarStatus: vi.fn(),
    } as unknown as Pedido & {
      props: { id: string; status: StatusPedido }
      alterarStatus: ReturnType<typeof vi.fn>
    }

    return pedido
  }

  beforeEach(() => {
    mockPedidoRepo = {
      findById: vi.fn(),
      findByClienteId: vi.fn(),
      findByRestauranteId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    mockEventDispatcher = {
      dispatch: vi.fn(),
      registerHandler: vi.fn(),
      unregisterHandler: vi.fn(),
    }

    useCase = new AlterarStatusPedidoUseCase(mockPedidoRepo, mockEventDispatcher)
  })

  describe('transições válidas', () => {
    it('deve alterar de pending_payment para paid', async () => {
      const pedido = criarMockPedido(StatusPedido.PENDING_PAYMENT)
      mockPedidoRepo.findById.mockResolvedValue(pedido)
      mockPedidoRepo.update.mockResolvedValue(pedido)

      const result = await useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'paid' })

      expect(pedido.alterarStatus).toHaveBeenCalledWith(StatusPedido.PAID)
      expect(result.pedido).toBe(pedido)
    })

    it('deve alterar de pending_payment para cancelled', async () => {
      const pedido = criarMockPedido(StatusPedido.PENDING_PAYMENT)
      mockPedidoRepo.findById.mockResolvedValue(pedido)
      mockPedidoRepo.update.mockResolvedValue(pedido)

      await useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'cancelled' })

      expect(pedido.alterarStatus).toHaveBeenCalledWith(StatusPedido.CANCELLED)
    })

    it('deve alterar de paid para received', async () => {
      const pedido = criarMockPedido(StatusPedido.PAID)
      mockPedidoRepo.findById.mockResolvedValue(pedido)
      mockPedidoRepo.update.mockResolvedValue(pedido)

      await useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'received' })

      expect(pedido.alterarStatus).toHaveBeenCalledWith(StatusPedido.RECEIVED)
    })

    it('deve alterar de paid para cancelled', async () => {
      const pedido = criarMockPedido(StatusPedido.PAID)
      mockPedidoRepo.findById.mockResolvedValue(pedido)
      mockPedidoRepo.update.mockResolvedValue(pedido)

      await useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'cancelled' })

      expect(pedido.alterarStatus).toHaveBeenCalledWith(StatusPedido.CANCELLED)
    })

    it('deve alterar de paid para refunded', async () => {
      const pedido = criarMockPedido(StatusPedido.PAID)
      mockPedidoRepo.findById.mockResolvedValue(pedido)
      mockPedidoRepo.update.mockResolvedValue(pedido)

      await useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'refunded' })

      expect(pedido.alterarStatus).toHaveBeenCalledWith(StatusPedido.REFUNDED)
    })

    it('deve alterar de received para preparing', async () => {
      const pedido = criarMockPedido(StatusPedido.RECEIVED)
      mockPedidoRepo.findById.mockResolvedValue(pedido)
      mockPedidoRepo.update.mockResolvedValue(pedido)

      await useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'preparing' })

      expect(pedido.alterarStatus).toHaveBeenCalledWith(StatusPedido.PREPARING)
    })

    it('deve alterar de preparing para ready', async () => {
      const pedido = criarMockPedido(StatusPedido.PREPARING)
      mockPedidoRepo.findById.mockResolvedValue(pedido)
      mockPedidoRepo.update.mockResolvedValue(pedido)

      await useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'ready' })

      expect(pedido.alterarStatus).toHaveBeenCalledWith(StatusPedido.READY)
    })

    it('deve alterar de ready para delivered', async () => {
      const pedido = criarMockPedido(StatusPedido.READY)
      mockPedidoRepo.findById.mockResolvedValue(pedido)
      mockPedidoRepo.update.mockResolvedValue(pedido)

      await useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'delivered' })

      expect(pedido.alterarStatus).toHaveBeenCalledWith(StatusPedido.DELIVERED)
    })

    it('deve alterar de delivered para refunded', async () => {
      const pedido = criarMockPedido(StatusPedido.DELIVERED)
      mockPedidoRepo.findById.mockResolvedValue(pedido)
      mockPedidoRepo.update.mockResolvedValue(pedido)

      await useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'refunded' })

      expect(pedido.alterarStatus).toHaveBeenCalledWith(StatusPedido.REFUNDED)
    })
  })

  describe('transições inválidas', () => {
    it('não deve permitir transição de pending_payment para preparing', async () => {
      const pedido = criarMockPedido(StatusPedido.PENDING_PAYMENT)
      mockPedidoRepo.findById.mockResolvedValue(pedido)

      await expect(
        useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'preparing' })
      ).rejects.toThrow(/Transição de status/)
    })

    it('não deve permitir transição de pending_payment para received', async () => {
      const pedido = criarMockPedido(StatusPedido.PENDING_PAYMENT)
      mockPedidoRepo.findById.mockResolvedValue(pedido)

      await expect(
        useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'received' })
      ).rejects.toThrow(/Transição de status/)
    })

    it('não deve permitir transição de received para paid', async () => {
      const pedido = criarMockPedido(StatusPedido.RECEIVED)
      mockPedidoRepo.findById.mockResolvedValue(pedido)

      await expect(
        useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'paid' })
      ).rejects.toThrow(/Transição de status/)
    })

    it('não deve permitir transição de preparing para received', async () => {
      const pedido = criarMockPedido(StatusPedido.PREPARING)
      mockPedidoRepo.findById.mockResolvedValue(pedido)

      await expect(
        useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'received' })
      ).rejects.toThrow(/Transição de status/)
    })

    it('não deve permitir transição de ready para preparing', async () => {
      const pedido = criarMockPedido(StatusPedido.READY)
      mockPedidoRepo.findById.mockResolvedValue(pedido)

      await expect(
        useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'preparing' })
      ).rejects.toThrow(/Transição de status/)
    })

    it('não deve permitir transição de cancelled para qualquer outro status', async () => {
      const pedido = criarMockPedido(StatusPedido.CANCELLED)
      mockPedidoRepo.findById.mockResolvedValue(pedido)

      await expect(
        useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'paid' })
      ).rejects.toThrow(/Transição de status/)
    })

    it('não deve permitir transição de refunded para qualquer outro status', async () => {
      const pedido = criarMockPedido(StatusPedido.REFUNDED)
      mockPedidoRepo.findById.mockResolvedValue(pedido)

      await expect(
        useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'paid' })
      ).rejects.toThrow(/Transição de status/)
    })

    it('não deve permitir transição de rejected para qualquer outro status', async () => {
      const pedido = criarMockPedido(StatusPedido.REJECTED)
      mockPedidoRepo.findById.mockResolvedValue(pedido)

      await expect(
        useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'pending_payment' })
      ).rejects.toThrow(/Transição de status/)
    })
  })

  describe('erros', () => {
    it('deve lançar erro quando pedido não existe', async () => {
      mockPedidoRepo.findById.mockResolvedValue(null)

      await expect(
        useCase.execute({ pedidoId: 'nao-existe', novoStatus: 'paid' })
      ).rejects.toThrow('Pedido nao-existe não encontrado')

      expect(mockPedidoRepo.update).not.toHaveBeenCalled()
      expect(mockEventDispatcher.dispatch).not.toHaveBeenCalled()
    })

    it('deve lançar erro para status inválido', async () => {
      const pedido = criarMockPedido(StatusPedido.PENDING_PAYMENT)
      mockPedidoRepo.findById.mockResolvedValue(pedido)

      await expect(
        useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'status_invalido' as any })
      ).rejects.toThrow(/StatusPedido inválido/)
    })
  })

  describe('eventos', () => {
    it('deve disparar evento após alteração de status', async () => {
      const pedido = criarMockPedido(StatusPedido.PENDING_PAYMENT)
      mockPedidoRepo.findById.mockResolvedValue(pedido)
      mockPedidoRepo.update.mockResolvedValue(pedido)

      await useCase.execute({ pedidoId: 'pedido-123', novoStatus: 'paid' })

      expect(mockEventDispatcher.dispatch).toHaveBeenCalledTimes(1)
    })
  })
})