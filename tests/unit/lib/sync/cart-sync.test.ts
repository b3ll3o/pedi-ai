import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBroadcastChannelManager, CartBroadcast } from '@/lib/broadcast-channel'

const mockPostMessage = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
const mockClose = vi.fn()

const mockBroadcastChannelInstance = {
  postMessage: mockPostMessage,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
  close: mockClose,
  onmessageerror: null,
}

class MockBroadcastChannel {
  constructor() {
    return mockBroadcastChannelInstance
  }
}

vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)

describe('Cart Sync', () => {
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

  it('deve transmitir atualização do carrinho', () => {
    manager.broadcastCartUpdate(mockCartItems)

    expect(mockPostMessage).toHaveBeenCalledTimes(1)
    const sentMessage = mockPostMessage.mock.calls[0][0]
    expect(sentMessage.type).toBe('CART_UPDATE')
    expect(sentMessage.items).toEqual(mockCartItems)
    expect(sentMessage.timestamp).toBeDefined()
    expect(typeof sentMessage.timestamp).toBe('number')
  })

  it('deve receber e aplicar atualização do carrinho de outra aba', () => {
    let receivedItems: CartBroadcast['items'] | null = null
    manager.listenForCartUpdates((items) => {
      receivedItems = items
    })

    const handler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1] as (event: MessageEvent<CartBroadcast>) => void

    expect(handler).toBeDefined()

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

  it('não deve ecoar própria transmissão', () => {
    let callbackCalled = false
    manager.listenForCartUpdates(() => {
      callbackCalled = true
    })

    let broadcastTimestamp = 0
    mockPostMessage.mockImplementation((msg: CartBroadcast) => {
      broadcastTimestamp = msg.timestamp
    })

    manager.broadcastCartUpdate(mockCartItems)

    const handler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1] as (event: MessageEvent<CartBroadcast>) => void

    const ownMessage: MessageEvent<CartBroadcast> = {
      data: {
        type: 'CART_UPDATE',
        items: mockCartItems,
        timestamp: broadcastTimestamp,
      },
    } as unknown as MessageEvent<CartBroadcast>

    handler(ownMessage)

    expect(callbackCalled).toBe(false)
  })
})
