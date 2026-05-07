import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBroadcastChannelManager, CartBroadcast } from '@/lib/broadcast-channel'

// Mock BroadcastChannel global
const mockPostMessage = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
const mockClose = vi.fn()

// BroadcastChannel mock instance
const mockBroadcastChannelInstance = {
  postMessage: mockPostMessage,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
  close: mockClose,
  onmessageerror: null,
}

// Mock BroadcastChannel as a constructor function
class MockBroadcastChannel {
  constructor() {
    return mockBroadcastChannelInstance
  }
}

vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)

describe('BroadcastChannel', () => {
  let manager: ReturnType<typeof createBroadcastChannelManager>

  const mockCartItems: CartBroadcast['items'] = [
    {
      id: 'item-1',
      productId: 'prod-1',
      name: 'X-Burger',
      quantity: 2,
      unitPrice: 25.9,
      modifiers: [],
      createdAt: new Date(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    manager = createBroadcastChannelManager()
  })

  afterEach(() => {
    manager.close()
    manager.reset()
  })

  // ---------------------------------------------------------------------------
  // broadcastCartUpdate
  // ---------------------------------------------------------------------------
  describe('broadcastCartUpdate', () => {
    it('deve enviar mensagem via BroadcastChannel', () => {
      manager.broadcastCartUpdate(mockCartItems)

      expect(mockPostMessage).toHaveBeenCalledTimes(1)
      const sentMessage = mockPostMessage.mock.calls[0][0]
      expect(sentMessage.type).toBe('CART_UPDATE')
      expect(sentMessage.items).toEqual(mockCartItems)
      expect(sentMessage.timestamp).toBeDefined()
      expect(typeof sentMessage.timestamp).toBe('number')
    })

    it('deve ignorar broadcast quando window não está disponível', () => {
      const originalWindow = global.window
      // @ts-expect-error - removing window to simulate SSR
      delete global.window

      manager.broadcastCartUpdate(mockCartItems)

      expect(mockPostMessage).not.toHaveBeenCalled()
      global.window = originalWindow
    })

    it('deve definir timestamp crescente', () => {
      vi.useFakeTimers()
      const fixedTime = 1700000000000
      vi.setSystemTime(fixedTime)

      manager.broadcastCartUpdate(mockCartItems)

      const sentMessage = mockPostMessage.mock.calls[0][0]
      expect(sentMessage.timestamp).toBe(fixedTime)

      vi.useRealTimers()
    })
  })

  // ---------------------------------------------------------------------------
  // listenForCartUpdates
  // ---------------------------------------------------------------------------
  describe('listenForCartUpdates', () => {
    it('deve receber mensagem de outras abas', () => {
      let receivedItems: CartBroadcast['items'] | null = null
      manager.listenForCartUpdates((items) => {
        receivedItems = items
      })

      // Simula mensagem vinda de outra aba - captura o handler registrado
      const handler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1] as (event: MessageEvent<CartBroadcast>) => void

      expect(handler).toBeDefined()

      // Mensagem com timestamp maior que o último broadcast
      const externalMessage: MessageEvent<CartBroadcast> = {
        data: {
          type: 'CART_UPDATE',
          items: mockCartItems,
          timestamp: Date.now() + 1000,
        },
      } as unknown as MessageEvent<CartBroadcast>

      handler(externalMessage)

      expect(receivedItems).toEqual(mockCartItems)
    })

    it('deve ignorar própria mensagem (timestamp anti-echo)', () => {
      let callbackCalled = false
      manager.listenForCartUpdates(() => {
        callbackCalled = true
      })

      // Primeiro broadcast define lastBroadcastTimestamp
      const broadcastTimestamp = Date.now()
      manager.broadcastCartUpdate(mockCartItems)

      const handler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1] as (event: MessageEvent<CartBroadcast>) => void

      // Mensagem com timestamp menor que o último broadcast para garantir anti-echo
      const ownMessage: MessageEvent<CartBroadcast> = {
        data: {
          type: 'CART_UPDATE',
          items: mockCartItems,
          timestamp: broadcastTimestamp - 1,
        },
      } as unknown as MessageEvent<CartBroadcast>

      handler(ownMessage)

      expect(callbackCalled).toBe(false)
    })

    it('deve ignorar mensagens com type diferente de CART_UPDATE', () => {
      let callbackCalled = false
      manager.listenForCartUpdates(() => {
        callbackCalled = true
      })

      const handler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1] as (event: MessageEvent<CartBroadcast>) => void

      const otherMessage: MessageEvent<unknown> = {
        data: {
          type: 'OTHER_TYPE',
          payload: 'test',
        },
      } as unknown as MessageEvent<CartBroadcast>

      handler(otherMessage)

      expect(callbackCalled).toBe(false)
    })

    it('deve retornar função de cleanup que remove listener', () => {
      const cleanup = manager.listenForCartUpdates(() => {})

      cleanup()

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      )
    })

    it('deve ignorar broadcast quando window não está disponível', () => {
      const originalWindow = global.window
      // @ts-expect-error - removing window to simulate SSR
      delete global.window

      const cleanup = manager.listenForCartUpdates(() => {})

      expect(cleanup).toBeDefined()
      expect(typeof cleanup).toBe('function')
      global.window = originalWindow
    })
  })

  // ---------------------------------------------------------------------------
  // close
  // ---------------------------------------------------------------------------
  describe('close', () => {
    it('deve fechar o canal e limpar referência', () => {
      manager.broadcastCartUpdate(mockCartItems)
      manager.close()

      expect(mockClose).toHaveBeenCalledTimes(1)
    })

    it('deve ser idempotente', () => {
      // Cria o canal primeiro
      manager.broadcastCartUpdate(mockCartItems)
      // Fecha o canal
      manager.close()
      // Tenta fechar novamente - deve ser idempotente (não chamar close de novo)
      manager.close()

      expect(mockClose).toHaveBeenCalledTimes(1)
    })
  })

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------
  describe('reset', () => {
    it('deve resetar estado interno', () => {
      manager.broadcastCartUpdate(mockCartItems)
      manager.reset()

      // Após reset, novo broadcast deve usar novo timestamp
      const firstTimestamp = mockPostMessage.mock.calls[0][0].timestamp

      manager.broadcastCartUpdate(mockCartItems)
      const secondTimestamp = mockPostMessage.mock.calls[1][0].timestamp

      expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp)
    })
  })
})
