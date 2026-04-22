'use client';

/**
 * BroadcastChannel manager for cross-tab cart synchronization.
 * Extracted to separate module for testability - can be mocked with vi.mock() in tests.
 */

const CART_CHANNEL_NAME = 'pedi-ai-cart';

export interface CartBroadcast {
  type: 'CART_UPDATE';
  items: Array<{
    id: string;
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    modifiers: Array<{
      group_id: string;
      group_name: string;
      modifier_id: string;
      name: string;
      price_adjustment: number;
    }>;
    notes?: string;
    comboId?: string;
    bundlePrice?: number;
    comboItems?: Array<{ productId: string; quantity: number }>;
    createdAt: Date;
  }>;
  timestamp: number;
}

export interface BroadcastChannelManager {
  broadcastCartUpdate: (items: CartBroadcast['items']) => void;
  listenForCartUpdates: (callback: (items: CartBroadcast['items']) => void) => () => void;
  close: () => void;
  reset: () => void;
}

export function createBroadcastChannelManager(): BroadcastChannelManager {
  let cartChannel: BroadcastChannel | null = null;
  let lastBroadcastTimestamp = 0;

  return {
    broadcastCartUpdate: (items): void => {
      if (typeof window === 'undefined') return;

      try {
        if (!cartChannel) {
          cartChannel = new BroadcastChannel(CART_CHANNEL_NAME);
          cartChannel.onmessageerror = () => {
            console.warn('[cartStore] BroadcastChannel message error');
          };
        }
        const timestamp = Date.now();
        lastBroadcastTimestamp = timestamp;
        cartChannel.postMessage({ type: 'CART_UPDATE', items, timestamp } satisfies CartBroadcast);
      } catch (error) {
        console.warn('[cartStore] Failed to broadcast cart update:', error);
      }
    },

    listenForCartUpdates: (callback): (() => void) => {
      if (typeof window === 'undefined') return () => {};

      try {
        if (!cartChannel) {
          cartChannel = new BroadcastChannel(CART_CHANNEL_NAME);
          cartChannel.onmessageerror = () => {
            console.warn('[cartStore] BroadcastChannel message error');
          };
        }

        const handler = (event: MessageEvent<CartBroadcast>) => {
          if (event.data.type !== 'CART_UPDATE') return;
          // Ignore broadcasts from self (compare timestamp to avoid echo)
          if (event.data.timestamp <= lastBroadcastTimestamp) return;
          callback(event.data.items);
        };

        cartChannel.addEventListener('message', handler);

        return () => {
          cartChannel?.removeEventListener('message', handler);
        };
      } catch (error) {
        console.warn('[cartStore] Failed to listen for cart updates:', error);
        return () => {};
      }
    },

    close: (): void => {
      if (cartChannel) {
        cartChannel.close();
        cartChannel = null;
      }
    },

    reset: (): void => {
      cartChannel = null;
      lastBroadcastTimestamp = 0;
    },
  };
}
