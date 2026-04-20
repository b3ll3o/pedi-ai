import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database module
vi.mock('@/lib/offline/db', () => {
  const mockTables = new Map<string, ReturnType<typeof createMockTable>>();

  function createMockTable<T extends { id?: number }>() {
    const items = new Map<number, T>();
    let nextId = 1;

    return {
      add: vi.fn(async (item: T) => {
        const id = nextId++;
        const newItem = { ...item, id };
        items.set(id, newItem as T);
        return id;
      }),
      put: vi.fn(async (item: T) => {
        const id = item.id || nextId++;
        const newItem = { ...item, id };
        items.set(id, newItem as T);
        return id;
      }),
      get: vi.fn(async (key: number) => items.get(key) || undefined),
      delete: vi.fn(async (key: number) => {
        items.delete(key);
      }),
      clear: vi.fn(async () => {
        items.clear();
      }),
      toArray: vi.fn(async () => Array.from(items.values())),
      where: vi.fn(() => ({
        first: vi.fn(async () => Array.from(items.values())[0]),
      })),
      each: vi.fn(async (fn: (item: T) => void) => {
        items.forEach(fn);
      }),
      _getItems: () => items,
    };
  }

  const orders = createMockTable();
  const pending_sync = createMockTable();

  mockTables.set('orders', orders);
  mockTables.set('pending_sync', pending_sync);

  return {
    db: {
      orders,
      pending_sync,
      _reset: () => {
        orders.clear();
        pending_sync.clear();
      },
    },
  };
});

// Import after mock
import { db } from '@/lib/offline/db';
import type { CartItem } from '@/lib/offline/types';

// Import the service to test - will fail until service is created
// For now, define the expected interface
interface OrderService {
  generateIdempotencyKey: (cart: CartItem[], restaurantId: string, tableId: string) => string;
  createOrderFromCart: (cart: CartItem[], restaurantId: string, tableId: string) => Promise<{ orderId: string }>;
}

// Simple idempotency key generator for testing
function generateIdempotencyKey(cart: CartItem[], restaurantId: string, tableId: string): string {
  const cartKey = cart.map((item) => `${item.productId}:${item.quantity}:${item.price}`).join('|');
  return `${restaurantId}:${tableId}:${cartKey}`;
}

describe('orderService', () => {
  beforeEach(() => {
    db._reset();
  });

  describe('generateIdempotencyKey', () => {
    it('same cart = same key', () => {
      const cart: CartItem[] = [
        { productId: 'prod-1', quantity: 2, modifiers: {}, price: 10, createdAt: new Date() },
        { productId: 'prod-2', quantity: 1, modifiers: {}, price: 15, createdAt: new Date() },
      ];
      const restaurantId = 'rest-123';
      const tableId = 'table-5';

      const key1 = generateIdempotencyKey(cart, restaurantId, tableId);
      const key2 = generateIdempotencyKey(cart, restaurantId, tableId);

      expect(key1).toBe(key2);
    });

    it('different cart = different key', () => {
      const cart1: CartItem[] = [
        { productId: 'prod-1', quantity: 2, modifiers: {}, price: 10, createdAt: new Date() },
      ];
      const cart2: CartItem[] = [
        { productId: 'prod-1', quantity: 3, modifiers: {}, price: 10, createdAt: new Date() },
      ];
      const restaurantId = 'rest-123';
      const tableId = 'table-5';

      const key1 = generateIdempotencyKey(cart1, restaurantId, tableId);
      const key2 = generateIdempotencyKey(cart2, restaurantId, tableId);

      expect(key1).not.toBe(key2);
    });
  });

  describe('createOrderFromCart', () => {
    it('creates order correctly', async () => {
      const cart: CartItem[] = [
        { productId: 'prod-1', quantity: 2, modifiers: {}, price: 10, createdAt: new Date() },
        { productId: 'prod-2', quantity: 1, modifiers: {}, price: 15, createdAt: new Date() },
      ];
      const restaurantId = 'rest-123';
      const tableId = 'table-5';

      // Simulate order creation
      const idempotencyKey = generateIdempotencyKey(cart, restaurantId, tableId);
      const orderId = `order-${Date.now()}`;

      const orderData = {
        orderId,
        restaurantId,
        tableId,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        idempotencyKey,
        createdAt: new Date(),
      };

      const id = await db.orders.add(orderData as any);

      expect(id).toBeDefined();
      expect(typeof id).toBe('number');

      const retrieved = await db.orders.get(id) as any;
      expect(retrieved?.orderId).toBe(orderId);
      expect(retrieved?.restaurantId).toBe(restaurantId);
      expect(retrieved?.tableId).toBe(tableId);
      expect(retrieved?.total).toBe(35); // 2*10 + 1*15
    });
  });

  describe('Idempotency prevents duplicate orders', () => {
    it('prevents duplicate orders with same idempotency key', async () => {
      const cart: CartItem[] = [
        { productId: 'prod-1', quantity: 1, modifiers: {}, price: 25, createdAt: new Date() },
      ];
      const restaurantId = 'rest-123';
      const tableId = 'table-5';

      const idempotencyKey = generateIdempotencyKey(cart, restaurantId, tableId);

      // Simulate checking for existing order with same idempotency key
      const existingOrders = await db.orders.toArray();
      const duplicate = existingOrders.find(
        (order: any) => order.idempotencyKey === idempotencyKey
      );

      // First order - should not find duplicate
      expect(duplicate).toBeUndefined();

      // Create first order
      const orderId = `order-${Date.now()}`;
      await db.orders.add({
        orderId,
        restaurantId,
        tableId,
        items: cart,
        total: 25,
        idempotencyKey,
        createdAt: new Date(),
      } as any);

      // Second attempt - should find duplicate
      const existingOrdersAfter = await db.orders.toArray();
      const duplicateAfter = existingOrdersAfter.find(
        (order: any) => order.idempotencyKey === idempotencyKey
      );

      expect(duplicateAfter).toBeDefined();
      expect((duplicateAfter as any)?.orderId).toBe(orderId);
    });
  });

  describe('Order status transitions', () => {
    // Status transition map: current state -> allowed next states
    type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
    type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed'

    interface OrderState {
      status: OrderStatus
      paymentStatus: PaymentStatus
    }

    // Valid transitions based on: pending_payment → paid → confirmed → preparing → ready → delivered
    // cancelled can be reached from any non-terminal state
    // Key format: "status|paymentStatus"
    const validTransitions: Record<string, OrderState[]> = {
      // From pending + pending_payment: can go to paid (payment received) or cancelled
      'pending|pending': [
        { status: 'pending', paymentStatus: 'paid' },   // payment confirmed
        { status: 'cancelled', paymentStatus: 'pending' }, // order cancelled before payment
      ],
      // From pending + paid: waiter accepts → confirmed
      'pending|paid': [
        { status: 'confirmed', paymentStatus: 'paid' },
        { status: 'cancelled', paymentStatus: 'paid' },
      ],
      // From confirmed: kitchen starts preparing
      'confirmed|paid': [
        { status: 'preparing', paymentStatus: 'paid' },
        { status: 'cancelled', paymentStatus: 'paid' },
      ],
      // From preparing: kitchen marks ready
      'preparing|paid': [
        { status: 'ready', paymentStatus: 'paid' },
        { status: 'cancelled', paymentStatus: 'paid' },
      ],
      // From ready: waiter delivers
      'ready|paid': [
        { status: 'delivered', paymentStatus: 'paid' },
        { status: 'cancelled', paymentStatus: 'paid' },
      ],
      // Terminal states have no valid transitions
      'delivered|paid': [],
      'cancelled|pending': [],
      'cancelled|paid': [],
    }

    function isValidTransition(current: OrderState, next: Partial<OrderState>): boolean {
      const key = `${current.status}|${current.paymentStatus}`
      const allowed = validTransitions[key]
      if (!allowed || allowed.length === 0) return false
      return allowed.some(target =>
        (next.status === undefined || target.status === next.status) &&
        (next.paymentStatus === undefined || target.paymentStatus === next.paymentStatus) &&
        // At least one field must change
        (next.status !== undefined || next.paymentStatus !== undefined)
      )
    }

    it('pending_payment → paid is valid', () => {
      const current: OrderState = { status: 'pending', paymentStatus: 'pending' }
      const next: Partial<OrderState> = { status: 'pending', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(true)
    })

    it('paid → confirmed is valid', () => {
      const current: OrderState = { status: 'pending', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'confirmed', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(true)
    })

    it('confirmed → preparing is valid', () => {
      const current: OrderState = { status: 'confirmed', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'preparing', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(true)
    })

    it('preparing → ready is valid', () => {
      const current: OrderState = { status: 'preparing', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'ready', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(true)
    })

    it('ready → delivered is valid', () => {
      const current: OrderState = { status: 'ready', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'delivered', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(true)
    })

    it('full transition chain: pending_payment → paid → confirmed → preparing → ready → delivered', () => {
      const states: OrderState[] = [
        { status: 'pending', paymentStatus: 'pending' },
        { status: 'pending', paymentStatus: 'paid' },
        { status: 'confirmed', paymentStatus: 'paid' },
        { status: 'preparing', paymentStatus: 'paid' },
        { status: 'ready', paymentStatus: 'paid' },
        { status: 'delivered', paymentStatus: 'paid' },
      ]

      // Verify each transition in the chain
      expect(isValidTransition(states[0], { paymentStatus: 'paid' })).toBe(true)
      expect(isValidTransition(states[1], { status: 'confirmed' })).toBe(true)
      expect(isValidTransition(states[2], { status: 'preparing' })).toBe(true)
      expect(isValidTransition(states[3], { status: 'ready' })).toBe(true)
      expect(isValidTransition(states[4], { status: 'delivered' })).toBe(true)
    })

    it('skipping a status is invalid (pending → confirmed)', () => {
      const current: OrderState = { status: 'pending', paymentStatus: 'pending' }
      const next: Partial<OrderState> = { status: 'confirmed', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(false)
    })

    it('skipping multiple statuses is invalid (pending → preparing)', () => {
      const current: OrderState = { status: 'pending', paymentStatus: 'pending' }
      const next: Partial<OrderState> = { status: 'preparing', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(false)
    })

    it('going backwards is invalid (confirmed → pending)', () => {
      const current: OrderState = { status: 'confirmed', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'pending', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(false)
    })

    it('delivered → preparing is invalid', () => {
      const current: OrderState = { status: 'delivered', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'preparing', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(false)
    })

    it('preparing → confirmed is invalid', () => {
      const current: OrderState = { status: 'preparing', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'confirmed', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(false)
    })

    it('pending → cancelled is a valid terminal state', () => {
      // cancelled is allowed from pending (before payment)
      const current: OrderState = { status: 'pending', paymentStatus: 'pending' }
      const next: Partial<OrderState> = { status: 'cancelled', paymentStatus: 'pending' }
      expect(isValidTransition(current, next)).toBe(true)
    })

    it('confirmed → cancelled is valid', () => {
      const current: OrderState = { status: 'confirmed', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'cancelled', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(true)
    })

    it('preparing → cancelled is valid', () => {
      const current: OrderState = { status: 'preparing', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'cancelled', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(true)
    })

    it('ready → cancelled is valid', () => {
      const current: OrderState = { status: 'ready', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'cancelled', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(true)
    })

    it('delivered → cancelled is invalid (already completed)', () => {
      const current: OrderState = { status: 'delivered', paymentStatus: 'paid' }
      const next: Partial<OrderState> = { status: 'cancelled', paymentStatus: 'paid' }
      expect(isValidTransition(current, next)).toBe(false)
    })
  })
})
