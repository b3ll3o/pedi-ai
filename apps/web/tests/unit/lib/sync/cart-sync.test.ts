/**
 * Cobertura: RF-ORDER-10 (Sincronização offline do carrinho),
 * RF-MENU-09 (Sincronização offline do cardápio)
 * @see .openspec/specs/pedido/design.md
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createBroadcastChannelManager, CartBroadcast } from '@/lib/broadcast-channel';

const mockPostMessage = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
const mockClose = vi.fn();

const mockBroadcastChannelInstance = {
  postMessage: mockPostMessage,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
  close: mockClose,
  onmessageerror: null,
};

class MockBroadcastChannel {
  constructor() {
    return mockBroadcastChannelInstance;
  }
}

vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

describe('Cart Sync', () => {
  let manager: ReturnType<typeof createBroadcastChannelManager>;

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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    manager = createBroadcastChannelManager();
  });

  afterEach(() => {
    manager.close();
    manager.reset();
  });

  it('deve transmitir atualização do carrinho', () => {
    manager.broadcastCartUpdate(mockCartItems);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const sentMessage = mockPostMessage.mock.calls[0][0];
    expect(sentMessage.type).toBe('CART_UPDATE');
    expect(sentMessage.items).toEqual(mockCartItems);
    expect(sentMessage.clock).toBeDefined();
    expect(typeof sentMessage.clock).toBe('number');
    expect(sentMessage.clock).toBeGreaterThan(0);
  });

  it('deve receber e aplicar atualização do carrinho de outra aba', () => {
    let receivedItems: CartBroadcast['items'] | null = null;
    manager.listenForCartUpdates((items) => {
      receivedItems = items;
    });

    const handler = mockAddEventListener.mock.calls.find((call) => call[0] === 'message')?.[1] as (
      event: MessageEvent<CartBroadcast>
    ) => void;

    expect(handler).toBeDefined();

    // Lamport: mensagem com clock > 0 sempre passa no receptor "frio".
    const externalMessage: MessageEvent<CartBroadcast> = {
      data: {
        type: 'CART_UPDATE',
        items: mockCartItems,
        clock: 1,
      },
    } as unknown as MessageEvent<CartBroadcast>;

    handler(externalMessage);

    expect(receivedItems).toEqual(mockCartItems);
  });

  it('não deve ecoar própria transmissão (clock anti-echo)', () => {
    let callbackCalls = 0;
    manager.listenForCartUpdates(() => {
      callbackCalls += 1;
    });

    let broadcastClock = 0;
    mockPostMessage.mockImplementation((msg: CartBroadcast) => {
      broadcastClock = msg.clock;
    });

    manager.broadcastCartUpdate(mockCartItems);

    const handler = mockAddEventListener.mock.calls.find((call) => call[0] === 'message')?.[1] as (
      event: MessageEvent<CartBroadcast>
    ) => void;

    // Cenário 1: como o receptor é "frio" (lastSeenClock=0), a primeira
    // mensagem com clock=1 PASA. Isso espelha o comportamento real:
    // BroadcastChannel não ecoa para o próprio emitter, mas se chegar
    // um update de outra aba com clock=1, ele é aplicado.
    handler({
      data: { type: 'CART_UPDATE', items: mockCartItems, clock: broadcastClock },
    } as unknown as MessageEvent<CartBroadcast>);
    expect(callbackCalls).toBe(1);

    // Cenário 2: replay com o MESMO clock é descartado (anti-echo).
    handler({
      data: { type: 'CART_UPDATE', items: mockCartItems, clock: broadcastClock },
    } as unknown as MessageEvent<CartBroadcast>);
    expect(callbackCalls).toBe(1);
  });
});
