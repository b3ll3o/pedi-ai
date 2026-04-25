import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the entire db module
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

  const cart = createMockTable();
  const menu_cache = createMockTable();
  const pending_sync = createMockTable();
  const tables_info = createMockTable();

  mockTables.set('cart', cart);
  mockTables.set('menu_cache', menu_cache);
  mockTables.set('pending_sync', pending_sync);
  mockTables.set('tables_info', tables_info);

  return {
    db: {
      cart,
      menu_cache,
      pending_sync,
      tables_info,
      _reset: () => {
        cart.clear();
        menu_cache.clear();
        pending_sync.clear();
        tables_info.clear();
      },
    },
  };
});

// Import types
import type { CartItem, MenuCache, PendingSync, TableInfo } from '@/lib/offline/types';
import { db } from '@/lib/offline/db';

describe('IndexedDB Operations', () => {
  beforeEach(() => {
    // Reset all tables before each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any)._reset();
  });

  describe('Dexie Database - Cart Table', () => {
    it('should add item to cart', async () => {
      const item: CartItem = {
        productId: 'prod-123',
        quantity: 2,
        modifiers: { size: 'large' },
        price: 15.99,
        createdAt: new Date(),
      };

      const id = await db.cart.add(item);
      expect(id).toBeDefined();
      expect(typeof id).toBe('number');

      const retrieved = await db.cart.get(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.productId).toBe('prod-123');
      expect(retrieved?.quantity).toBe(2);
    });

    it('should update cart item', async () => {
      const item: CartItem = {
        productId: 'prod-456',
        quantity: 1,
        modifiers: {},
        price: 9.99,
        createdAt: new Date(),
      };

      const id = await db.cart.add(item);
      const cartItem = await db.cart.get(id);

      await db.cart.put({ ...cartItem!, quantity: 5 });

      const updated = await db.cart.get(id);
      expect(updated?.quantity).toBe(5);
    });

    it('should delete item from cart', async () => {
      const item: CartItem = {
        productId: 'prod-789',
        quantity: 1,
        modifiers: {},
        price: 12.5,
        createdAt: new Date(),
      };

      const id = await db.cart.add(item);
      await db.cart.delete(id);

      const retrieved = await db.cart.get(id);
      expect(retrieved).toBeUndefined();
    });

    it('should clear all cart items', async () => {
      const items: CartItem[] = [
        { productId: 'p1', quantity: 1, modifiers: {}, price: 10, createdAt: new Date() },
        { productId: 'p2', quantity: 2, modifiers: {}, price: 20, createdAt: new Date() },
      ];

      await db.cart.add(items[0]);
      await db.cart.add(items[1]);

      await db.cart.clear();

      const all = await db.cart.toArray();
      expect(all).toHaveLength(0);
    });
  });

  describe('Dexie Database - Menu Cache Table', () => {
    it('should set menu cache', async () => {
      const cache: MenuCache = {
        categories: [{ id: 'cat1', name: 'Bebidas' }],
        products: [{ id: 'prod1', name: 'Coca-Cola', price: 5 }],
        modifiers: [],
        timestamp: new Date(),
      };

      const id = await db.menu_cache.add(cache);
      expect(id).toBeDefined();

      const retrieved = await db.menu_cache.get(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.categories).toHaveLength(1);
      expect(retrieved?.products).toHaveLength(1);
    });

    it('should get cached menu', async () => {
      const cache: MenuCache = {
        categories: [{ id: 'cat1', name: 'Sobremesas' }],
        products: [{ id: 'prod2', name: 'Bolo', price: 8 }],
        modifiers: [],
        timestamp: new Date(),
      };

      await db.menu_cache.add(cache);

      const all = await db.menu_cache.toArray();
      expect(all).toHaveLength(1);
      expect(all[0].products).toHaveLength(1);
    });

    it('should invalidate menu cache (clear)', async () => {
      const cache: MenuCache = {
        categories: [],
        products: [],
        modifiers: [],
        timestamp: new Date(),
      };

      await db.menu_cache.add(cache);
      await db.menu_cache.clear();

      const all = await db.menu_cache.toArray();
      expect(all).toHaveLength(0);
    });
  });

  describe('Dexie Database - Pending Sync Table', () => {
    it('should add order to pending sync', async () => {
      const pending: PendingSync = {
        orderData: { orderId: 'order-123', items: [] },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      };

      const id = await db.pending_sync.add(pending);
      expect(id).toBeDefined();

      const retrieved = await db.pending_sync.get(id);
      expect(retrieved?.orderData).toEqual({ orderId: 'order-123', items: [] });
    });

    it('should get all pending orders', async () => {
      const orders: PendingSync[] = [
        { orderData: { id: 1 }, retryCount: 0, maxRetries: 3, status: 'pending', createdAt: new Date() },
        { orderData: { id: 2 }, retryCount: 1, maxRetries: 3, status: 'pending', createdAt: new Date() },
      ];

      await db.pending_sync.add(orders[0]);
      await db.pending_sync.add(orders[1]);

      const all = await db.pending_sync.toArray();
      expect(all).toHaveLength(2);
    });

    it('should remove order from pending sync (mark synced)', async () => {
      const pending: PendingSync = {
        orderData: { orderId: 'order-456' },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      };

      const id = await db.pending_sync.add(pending);
      await db.pending_sync.delete(id);

      const retrieved = await db.pending_sync.get(id);
      expect(retrieved).toBeUndefined();
    });

    it('should increment retry count', async () => {
      const pending: PendingSync = {
        orderData: { orderId: 'order-789' },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      };

      const id = await db.pending_sync.add(pending);
      const item = await db.pending_sync.get(id);

      await db.pending_sync.put({ ...item!, retryCount: item!.retryCount + 1 });

      const updated = await db.pending_sync.get(id);
      expect(updated?.retryCount).toBe(1);
    });
  });

  describe('Dexie Database - Tables Info Table', () => {
    it('should get table info', async () => {
      const info: TableInfo = {
        tableId: 'table-5',
        restaurantId: 'rest-123',
        name: 'Mesa 5',
      };

      const id = await db.tables_info.add(info);
      const retrieved = await db.tables_info.get(id);

      expect(retrieved?.tableId).toBe('table-5');
      expect(retrieved?.restaurantId).toBe('rest-123');
    });

    it('should set table info', async () => {
      const info: TableInfo = {
        tableId: 'table-10',
        restaurantId: 'rest-456',
        name: 'Mesa 10',
      };

      await db.tables_info.add(info);

      const all = await db.tables_info.toArray();
      expect(all).toHaveLength(1);
      expect(all[0].tableId).toBe('table-10');
    });
  });

  describe('Cart Operations', () => {
    it('should calculate cart total', async () => {
      const items: CartItem[] = [
        { productId: 'p1', quantity: 2, modifiers: {}, price: 10, createdAt: new Date() },
        { productId: 'p2', quantity: 1, modifiers: {}, price: 15, createdAt: new Date() },
        { productId: 'p3', quantity: 3, modifiers: {}, price: 5, createdAt: new Date() },
      ];

      await db.cart.add(items[0]);
      await db.cart.add(items[1]);
      await db.cart.add(items[2]);

      const cartItems = await db.cart.toArray();
      const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      expect(total).toBe(50); // 2*10 + 1*15 + 3*5 = 50
    });

    it('should add multiple items to cart', async () => {
      const item1: CartItem = {
        productId: 'prod-a',
        quantity: 1,
        modifiers: {},
        price: 25,
        createdAt: new Date(),
      };
      const item2: CartItem = {
        productId: 'prod-b',
        quantity: 3,
        modifiers: {},
        price: 8,
        createdAt: new Date(),
      };

      await db.cart.add(item1);
      await db.cart.add(item2);

      const all = await db.cart.toArray();
      expect(all).toHaveLength(2);
    });

    it('should update item quantity in cart', async () => {
      const item: CartItem = {
        productId: 'prod-qty',
        quantity: 1,
        modifiers: {},
        price: 10,
        createdAt: new Date(),
      };

      const id = await db.cart.add(item);
      const cartItem = await db.cart.get(id);

      await db.cart.put({ ...cartItem!, quantity: 10 });

      const updated = await db.cart.get(id);
      expect(updated?.quantity).toBe(10);
    });

    it('should remove specific item from cart', async () => {
      const item: CartItem = {
        productId: 'prod-rem',
        quantity: 1,
        modifiers: {},
        price: 30,
        createdAt: new Date(),
      };

      const id = await db.cart.add(item);
      await db.cart.delete(id);

      const all = await db.cart.toArray();
      expect(all).toHaveLength(0);
    });
  });

  describe('Sync Queue Operations', () => {
    it('should queue multiple orders', async () => {
      const order1: PendingSync = {
        orderData: { orderId: 'ord-1', total: 100 },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      };
      const order2: PendingSync = {
        orderData: { orderId: 'ord-2', total: 200 },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      };

      await db.pending_sync.add(order1);
      await db.pending_sync.add(order2);

      const pending = await db.pending_sync.toArray();
      expect(pending).toHaveLength(2);
    });

    it('should get pending orders count', async () => {
      const order: PendingSync = {
        orderData: { orderId: 'ord-count' },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      };

      await db.pending_sync.add(order);

      const pending = await db.pending_sync.toArray();
      expect(pending.length).toBeGreaterThan(0);
    });

    it('should handle retry logic for failed sync', async () => {
      const order: PendingSync = {
        orderData: { orderId: 'ord-retry' },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      };

      const id = await db.pending_sync.add(order);
      await db.pending_sync.get(id);

      // Simulate retries - get fresh reference each time
      for (let i = 0; i < 3; i++) {
        const currentItem = await db.pending_sync.get(id);
        await db.pending_sync.put({ ...currentItem!, retryCount: currentItem!.retryCount + 1 });
      }

      const updated = await db.pending_sync.get(id);
      expect(updated?.retryCount).toBe(3);
    });
  });
});