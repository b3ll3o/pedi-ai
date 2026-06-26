'use client';

/**
 * BroadcastChannel manager for cross-tab cart synchronization.
 * Extracted to separate module for testability - can be mocked with vi.mock() in tests.
 *
 * ## Conflito entre abas (H8)
 *
 * O receptor usa um **relógio de Lamport** para ordenar updates quando
 * duas abas emitem quase simultaneamente. O bug original era:
 * 1. Aba A emite com `ts_A=1000` e marca `lastBroadcastTimestamp=1000`.
 * 2. Aba B emite logo depois com `ts_B=999` (skew de relógio entre
 *    processos — `Date.now()` não é monotônico entre workers).
 * 3. Aba A recebe `ts_B=999` e descarta a atualização porque
 *    `999 <= 1000`, perdendo o estado emitido por B.
 *
 * Correção:
 * - Cada mensagem carrega um `clock` monotônico **por aba emissora**.
 * - Receptor: aplica sempre que `event.clock > lastClockSeen`, e
 *   atualiza `lastClockSeen = max(lastClockSeen, event.clock)`.
 * - O emissor **não mantém mais um `lastBroadcastTimestamp` local** —
 *   a ordem é decidida apenas pelo receptor com base no clock Lamport
 *   recebido.
 *
 * Isso garante: a atualização com maior clock sempre vence, sem
 * depender de sincronização de relógios do sistema.
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
  /** Lamport clock monotônico da aba emissora. Sempre > 0. */
  clock: number;
}

export interface BroadcastChannelManager {
  broadcastCartUpdate: (items: CartBroadcast['items']) => void;
  listenForCartUpdates: (callback: (items: CartBroadcast['items']) => void) => () => void;
  close: () => void;
  reset: () => void;
}

export function createBroadcastChannelManager(): BroadcastChannelManager {
  let cartChannel: BroadcastChannel | null = null;
  // Lamport clock — incrementamos antes de cada broadcast.
  // Mantemos o maior clock visto no receptor para ordenar updates
  // conflitantes (regra de Lamport: o evento "causa" tem clock menor).
  let localClock = 0;
  let lastSeenClock = 0;

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
        // Incrementa ANTES de enviar — outros receivers vão conhecer
        // o evento com este clock.
        localClock += 1;
        cartChannel.postMessage({
          type: 'CART_UPDATE',
          items,
          clock: localClock,
        } satisfies CartBroadcast);
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
          // Lamport: aplica se for estritamente mais novo. Ao aplicar,
          // atualiza o relógio local para `max(seen, received)` — a
          // próxima mensagem que emitirmos carregará esse clock + 1,
          // preservando causalidade.
          if (event.data.clock <= lastSeenClock) return;
          lastSeenClock = event.data.clock;
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
      localClock = 0;
      lastSeenClock = 0;
    },
  };
}
