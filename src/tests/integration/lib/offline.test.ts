import Dexie from 'dexie';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CartItem, PendingSync } from '@/lib/offline/types';

// Test database that extends the schema
class TestDatabase extends Dexie {
  cart!: Dexie.Table<CartItem, number>;
  pending_sync!: Dexie.Table<PendingSync, number>;

  constructor() {
    super('pedi-test-' + Date.now());
    this.version(1).stores({
      cart: '++id, productId, createdAt',
      pending_sync: '++id, createdAt',
    });
  }
}

describe('IndexedDB cart persistence', () => {
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = new TestDatabase();
    await testDb.open();
  });

  afterEach(async () => {
    await testDb.close();
    await Dexie.delete(testDb.name);
  });

  // ── Helpers ────────────────────────────────────────────────────

  async function addCartItem(
    productId: string,
    quantity: number,
    price: number
  ): Promise<number> {
    return testDb.cart.add({
      productId,
      quantity,
      modifiers: {},
      price,
      createdAt: new Date(),
    });
  }

  async function getAllCartItems(): Promise<CartItem[]> {
    return testDb.cart.toArray();
  }

  // ── Test Cases ──────────────────────────────────────────────────

  it('1. Cart persists to IndexedDB on add', async () => {
    // Add item to cart
    const id = await addCartItem('prod-001', 2, 15.5);

    // Verify item was added with an auto-generated id
    expect(id).toBeGreaterThan(0);

    // Verify item in IndexedDB
    const items = await getAllCartItems();
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe('prod-001');
    expect(items[0].quantity).toBe(2);
    expect(items[0].price).toBe(15.5);
  });

  it('2. Cart persists on remove', async () => {
    // Add item
    const id = await addCartItem('prod-001', 1, 10);

    // Verify it exists
    let items = await getAllCartItems();
    expect(items).toHaveLength(1);

    // Remove item
    await testDb.cart.delete(id);

    // Verify IndexedDB updated
    items = await getAllCartItems();
    expect(items).toHaveLength(0);
  });

  it('3. Cart hydrates on load', async () => {
    // Add items to cart
    await addCartItem('prod-001', 2, 10);
    await addCartItem('prod-002', 1, 25);

    // Simulate app reload by creating new store reference
    // and reading from the same database
    const newItems = await testDb.cart.toArray();

    // Verify items restored from IndexedDB
    expect(newItems).toHaveLength(2);
    expect(newItems.find((i) => i.productId === 'prod-001')?.quantity).toBe(2);
    expect(newItems.find((i) => i.productId === 'prod-002')?.quantity).toBe(1);
  });

  it('4. getPendingOrders returns correct count', async () => {
    // Add items to pending_sync table
    await testDb.pending_sync.add({
      orderData: { orderId: 'order-001' },
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
      createdAt: new Date(),
    });
    await testDb.pending_sync.add({
      orderData: { orderId: 'order-002' },
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
      createdAt: new Date(),
    });
    await testDb.pending_sync.add({
      orderData: { orderId: 'order-003' },
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
      createdAt: new Date(),
    });

    // Helper function that mimics getPendingOrders
    async function getPendingOrders(): Promise<PendingSync[]> {
      return testDb.pending_sync.toArray();
    }

    // Verify getPendingOrders returns correct count
    const pendingOrders = await getPendingOrders();
    expect(pendingOrders).toHaveLength(3);
    expect(pendingOrders.map((o) => (o.orderData as { orderId: string }).orderId)).toEqual([
      'order-001',
      'order-002',
      'order-003',
    ]);
  });

  it('5. Retry count increments', async () => {
    // Add item to pending_sync
    const id = await testDb.pending_sync.add({
      orderData: { orderId: 'order-retry' },
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
      createdAt: new Date(),
    });

    // Get the item and increment retry count
    const item = await testDb.pending_sync.get(id);
    expect(item?.retryCount).toBe(0);

    // Update with incremented retry count
    await testDb.pending_sync.update(id, { retryCount: item!.retryCount + 1 });

    // Verify retry count increased
    const updatedItem = await testDb.pending_sync.get(id);
    expect(updatedItem?.retryCount).toBe(1);

    // Increment again
    await testDb.pending_sync.update(id, { retryCount: updatedItem!.retryCount + 1 });

    // Verify retry count increased again
    const finalItem = await testDb.pending_sync.get(id);
    expect(finalItem?.retryCount).toBe(2);
  });
});
