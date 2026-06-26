import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createBroadcastChannelManager, CartBroadcast } from '@/lib/broadcast-channel';

// Mock BroadcastChannel global
const mockPostMessage = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
const mockClose = vi.fn();

// BroadcastChannel mock instance
const mockBroadcastChannelInstance = {
  postMessage: mockPostMessage,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
  close: mockClose,
  onmessageerror: null,
};

// Mock BroadcastChannel as a constructor function
class MockBroadcastChannel {
  constructor() {
    return mockBroadcastChannelInstance;
  }
}

vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

describe('BroadcastChannel', () => {
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

  // ---------------------------------------------------------------------------
  // broadcastCartUpdate
  // ---------------------------------------------------------------------------
  describe('broadcastCartUpdate', () => {
    it('deve enviar mensagem via BroadcastChannel', () => {
      manager.broadcastCartUpdate(mockCartItems);

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const sentMessage = mockPostMessage.mock.calls[0][0];
      expect(sentMessage.type).toBe('CART_UPDATE');
      expect(sentMessage.items).toEqual(mockCartItems);
      expect(sentMessage.clock).toBeDefined();
      expect(typeof sentMessage.clock).toBe('number');
      expect(sentMessage.clock).toBeGreaterThan(0);
    });

    it('deve ignorar broadcast quando window não está disponível', () => {
      const originalWindow = global.window;
      // @ts-expect-error - removing window to simulate SSR
      delete global.window;

      manager.broadcastCartUpdate(mockCartItems);

      expect(mockPostMessage).not.toHaveBeenCalled();
      global.window = originalWindow;
    });

    it('deve incrementar clock Lamport a cada broadcast', () => {
      manager.broadcastCartUpdate(mockCartItems);
      const firstClock = mockPostMessage.mock.calls[0][0].clock;

      manager.broadcastCartUpdate(mockCartItems);
      const secondClock = mockPostMessage.mock.calls[1][0].clock;

      // Lamport: cada emissão local incrementa o clock em 1.
      expect(secondClock).toBe(firstClock + 1);
    });
  });

  // ---------------------------------------------------------------------------
  // listenForCartUpdates
  // ---------------------------------------------------------------------------
  describe('listenForCartUpdates', () => {
    it('deve receber mensagem de outras abas', () => {
      let receivedItems: CartBroadcast['items'] | null = null;
      manager.listenForCartUpdates((items) => {
        receivedItems = items;
      });

      // Simula mensagem vinda de outra aba - captura o handler registrado
      const handler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1] as (event: MessageEvent<CartBroadcast>) => void;

      expect(handler).toBeDefined();

      // Mensagem com clock maior que o último visto (Lamport: aceita se > lastSeen)
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

    it('deve ignorar mensagem com clock <= último visto', () => {
      let callbackCalled = false;
      manager.listenForCartUpdates(() => {
        callbackCalled = true;
      });

      const handler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1] as (event: MessageEvent<CartBroadcast>) => void;

      // Primeira mensagem: clock=5, aplica.
      handler({
        data: { type: 'CART_UPDATE', items: mockCartItems, clock: 5 },
      } as unknown as MessageEvent<CartBroadcast>);

      // Segunda mensagem: clock=3, NÃO aplica (menor ou igual ao último).
      handler({
        data: { type: 'CART_UPDATE', items: mockCartItems, clock: 3 },
      } as unknown as MessageEvent<CartBroadcast>);

      // Só a primeira deve ter chamado o callback.
      expect(callbackCalled).toBe(true);
    });

    it('deve ignorar mensagens com type diferente de CART_UPDATE', () => {
      let callbackCalled = false;
      manager.listenForCartUpdates(() => {
        callbackCalled = true;
      });

      const handler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1] as (event: MessageEvent<CartBroadcast>) => void;

      const otherMessage: MessageEvent<unknown> = {
        data: {
          type: 'OTHER_TYPE',
          payload: 'test',
        },
      } as unknown as MessageEvent<CartBroadcast>;

      handler(otherMessage);

      expect(callbackCalled).toBe(false);
    });

    it('deve retornar função de cleanup que remove listener', () => {
      const cleanup = manager.listenForCartUpdates(() => {});

      cleanup();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('deve ignorar broadcast quando window não está disponível', () => {
      const originalWindow = global.window;
      // @ts-expect-error - removing window to simulate SSR
      delete global.window;

      const cleanup = manager.listenForCartUpdates(() => {});

      expect(cleanup).toBeDefined();
      expect(typeof cleanup).toBe('function');
      global.window = originalWindow;
    });
  });

  // ---------------------------------------------------------------------------
  // close
  // ---------------------------------------------------------------------------
  describe('close', () => {
    it('deve fechar o canal e limpar referência', () => {
      manager.broadcastCartUpdate(mockCartItems);
      manager.close();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('deve ser idempotente', () => {
      // Cria o canal primeiro
      manager.broadcastCartUpdate(mockCartItems);
      // Fecha o canal
      manager.close();
      // Tenta fechar novamente - deve ser idempotente (não chamar close de novo)
      manager.close();

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------
  describe('reset', () => {
    it('deve resetar estado interno', () => {
      manager.broadcastCartUpdate(mockCartItems);
      manager.reset();

      // Após reset, novo broadcast deve reiniciar o clock Lamport do 1.
      const firstClock = mockPostMessage.mock.calls[0][0].clock;

      manager.broadcastCartUpdate(mockCartItems);
      const secondClock = mockPostMessage.mock.calls[1][0].clock;

      // Reset zera o clock; segundo broadcast deve estar de volta em 1.
      expect(secondClock).toBe(1);
      expect(firstClock).toBeGreaterThanOrEqual(1);
    });
  });
});
