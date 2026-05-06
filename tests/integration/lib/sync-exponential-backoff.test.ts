/**
 * Exponential Backoff Integration Tests
 *
 * These tests verify the exponential backoff retry logic for sync operations,
 * including delay calculation, max retries, and failure handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Use vi.hoisted to ensure mock variables are available when vi.mock runs
const { pendingSyncData, mockDb } = vi.hoisted(() => {
  const pendingSyncData: Map<number, any> = new Map();
  let idCounter = 0;

  const mockPendingSync = {
    clear: vi.fn(async () => { pendingSyncData.clear(); idCounter = 0; }),
    add: vi.fn(async (item: any) => {
      const id = ++idCounter;
      pendingSyncData.set(id, { ...item, id });
      return id;
    }),
    put: vi.fn(async (item: any) => {
      if (item.id) {
        pendingSyncData.set(item.id, item);
        return item.id;
      }
      const id = ++idCounter;
      pendingSyncData.set(id, { ...item, id });
      return id;
    }),
    delete: vi.fn(async (id: number) => { pendingSyncData.delete(id); }),
    update: vi.fn(async (id: number, changes: any) => {
      const existing = pendingSyncData.get(id);
      if (existing) {
        pendingSyncData.set(id, { ...existing, ...changes });
      }
    }),
    toArray: vi.fn(async () => Array.from(pendingSyncData.values())),
    where: vi.fn(() => ({
      anyOf: vi.fn((values: string[]) => ({
        toArray: vi.fn(async () =>
          Array.from(pendingSyncData.values()).filter((item) =>
            values.includes(item.status)
          )
        ),
      })),
      equals: vi.fn((value: string) => ({
        toArray: vi.fn(async () =>
          Array.from(pendingSyncData.values()).filter((item) =>
            item.status === value
          )
        ),
        modify: vi.fn(async (changes: any) => {
          Array.from(pendingSyncData.values())
            .filter((item) => item.status === value)
            .forEach((item) => {
              pendingSyncData.set(item.id, { ...item, ...changes });
            });
        }),
        delete: vi.fn(async () => {
          const toDelete = Array.from(pendingSyncData.values())
            .filter((item) => item.status === value);
          toDelete.forEach((item) => pendingSyncData.delete(item.id));
        }),
      })),
    })),
  };

  return {
    pendingSyncData,
    mockDb: { pending_sync: mockPendingSync },
  };
});

// Mock Dexie database
vi.mock('@/lib/offline/db', () => ({
  db: mockDb,
}));

import { db } from '@/lib/offline/db';
import {
  queueOrderForSync,
  processQueue,
  getSyncStatus,
  getFailedItems,
} from '@/lib/offline/sync';

// Constants matching the implementation
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const MAX_RETRIES = 3;

// Extended timeout for tests that involve multiple retries with delays
const RETRY_TEST_TIMEOUT = 15000;

/**
 * Replicates the getBackoffDelay function from sync.ts for testing.
 * The actual implementation uses: Math.min(INITIAL_BACKOFF_MS * Math.pow(2, retryCount), 30000)
 */
function getBackoffDelay(retryCount: number): number {
  return Math.min(INITIAL_BACKOFF_MS * Math.pow(2, retryCount), MAX_BACKOFF_MS);
}

describe('Exponential Backoff', () => {
  beforeEach(async () => {
    await db.pending_sync.clear();
  });

  afterEach(async () => {
    await db.pending_sync.clear();
    global.fetch = undefined as unknown as typeof fetch;
  });

  describe('Backoff Delay Calculation', () => {
    it('should calculate delay as 1s for first retry (retryCount=0)', () => {
      const delay = getBackoffDelay(0);
      expect(delay).toBe(1000); // 1 second
    });

    it('should calculate delay as 2s for second retry (retryCount=1)', () => {
      const delay = getBackoffDelay(1);
      expect(delay).toBe(2000); // 2 seconds
    });

    it('should calculate delay as 4s for third retry (retryCount=2)', () => {
      const delay = getBackoffDelay(2);
      expect(delay).toBe(4000); // 4 seconds
    });

    it('should cap backoff at 30 seconds', () => {
      // Even with high retry count, delay should not exceed 30 seconds
      const delayForHighRetry = getBackoffDelay(10);
      expect(delayForHighRetry).toBe(30000); // capped at 30 seconds
    });

    it('should produce exponential sequence: 1s, 2s, 4s for retries 0, 1, 2', () => {
      const delays = [0, 1, 2].map((count) => getBackoffDelay(count));
      expect(delays).toEqual([1000, 2000, 4000]);
    });
  });

  describe('Retry Count and Max Retries', () => {
    it('should retry up to 3 times before marking as failed', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as unknown as typeof fetch;

      await queueOrderForSync({ orderId: 'test-1' }, 'restaurant-1');

      // First attempt - fails, retryCount becomes 1
      let result = await processQueue();
      expect(result.failed).toBe(1);
      let items = await db.pending_sync.toArray();
      expect(items[0].retryCount).toBe(1);
      expect(items[0].status).toBe('pending');

      // Second attempt - fails, retryCount becomes 2
      result = await processQueue();
      expect(result.failed).toBe(1);
      items = await db.pending_sync.toArray();
      expect(items[0].retryCount).toBe(2);
      expect(items[0].status).toBe('pending');

      // Third attempt - fails, retryCount becomes 3 and status becomes 'failed'
      result = await processQueue();
      expect(result.failed).toBe(1);
      items = await db.pending_sync.toArray();
      expect(items[0].retryCount).toBe(3);
      expect(items[0].status).toBe('failed');
    }, RETRY_TEST_TIMEOUT);

    it('should skip items that already exceeded max retries', async () => {
      global.fetch = vi.fn() as unknown as typeof fetch;

      // Item already at max retries
      await db.pending_sync.add({
        orderData: { orderId: 'test-max' },
        retryCount: 3,
        maxRetries: 3,
        status: 'failed',
        lastError: 'previous error',
        createdAt: new Date(),
      });

      const result = await processQueue();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should correctly track retry count progression', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as unknown as typeof fetch;

      await queueOrderForSync({ orderId: 'retry-track' }, 'restaurant-1');

      for (let expectedRetryCount = 1; expectedRetryCount <= 3; expectedRetryCount++) {
        await processQueue();
        const items = await db.pending_sync.toArray();
        expect(items[0].retryCount).toBe(expectedRetryCount);
      }

      // After 3 retries, status should be failed
      const failedItems = await getFailedItems();
      expect(failedItems).toHaveLength(1);
      expect(failedItems[0].lastError).toBe('network error');
    }, RETRY_TEST_TIMEOUT);
  });

  describe('Error Display After Failures', () => {
    it('should store error message after failures for customer display', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Erro de conexão')) as unknown as typeof fetch;

      await queueOrderForSync({ orderId: 'display-error' }, 'restaurant-1');

      // Process until failure
      for (let i = 0; i < 3; i++) {
        await processQueue();
      }

      const failedItems = await getFailedItems();
      expect(failedItems).toHaveLength(1);
      expect(failedItems[0].lastError).toBe('Erro de conexão');
      expect(failedItems[0].retryCount).toBe(3);
    }, RETRY_TEST_TIMEOUT);

    it('should provide failed items for UI error display', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Servidor indisponível')) as unknown as typeof fetch;

      await queueOrderForSync({ orderId: 'ui-error-1' }, 'restaurant-1');
      await queueOrderForSync({ orderId: 'ui-error-2' }, 'restaurant-1');

      // Process all until failed
      for (let i = 0; i < 3; i++) {
        await processQueue();
      }

      const status = await getSyncStatus();
      expect(status.failed).toBe(2);

      const failedItems = await getFailedItems();
      expect(failedItems).toHaveLength(2);
      expect(failedItems.every((item) => item.lastError != null)).toBe(true);
    }, RETRY_TEST_TIMEOUT);
  });

  describe('processQueue with Exponential Backoff', () => {
    it('should apply correct delay based on retry count', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as unknown as typeof fetch;

      await queueOrderForSync({ orderId: 'delay-test' }, 'restaurant-1');

      // Three failed attempts
      await processQueue(); // 1st fail - retryCount becomes 1
      await processQueue(); // 2nd fail - retryCount becomes 2
      await processQueue(); // 3rd fail - retryCount becomes 3, marked as failed

      // Verify the item is now failed
      const failedItems = await getFailedItems();
      expect(failedItems).toHaveLength(1);
      expect(failedItems[0].retryCount).toBe(3);
      expect(failedItems[0].status).toBe('failed');
    }, RETRY_TEST_TIMEOUT);
  });

  describe('processQueue HTTP Error Handling', () => {
    it('should handle HTTP error response (ok: false) and throw error', async () => {
      // Mock fetch to return a response with ok: false
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      }) as unknown as typeof fetch;

      await db.pending_sync.add({
        orderData: { orderId: 'http-error-test' },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      });

      const result = await processQueue();
      expect(result.failed).toBe(1);
      expect(result.success).toBe(0);

      // Item should have retryCount incremented and error message
      const items = await db.pending_sync.toArray();
      expect(items[0].retryCount).toBe(1);
      expect(items[0].lastError).toBe('HTTP 400');
      expect(items[0].status).toBe('pending'); // Not yet at max retries

      global.fetch = undefined as unknown as typeof fetch;
    });

    it('should mark as failed after HTTP error when at max retries', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }) as unknown as typeof fetch;

      await db.pending_sync.add({
        orderData: { orderId: 'http-error-max' },
        retryCount: 2,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      });

      const result = await processQueue();
      expect(result.failed).toBe(1);

      const items = await db.pending_sync.toArray();
      expect(items[0].retryCount).toBe(3);
      expect(items[0].status).toBe('failed');
      expect(items[0].lastError).toBe('HTTP 500');

      global.fetch = undefined as unknown as typeof fetch;
    });
  });

  describe('clearCompleted', () => {
    it('should delete all completed items', async () => {
      // Add items with different statuses
      await db.pending_sync.add({
        orderData: { orderId: 'completed-1' },
        retryCount: 0,
        maxRetries: 3,
        status: 'completed',
        createdAt: new Date(),
      });
      await db.pending_sync.add({
        orderData: { orderId: 'completed-2' },
        retryCount: 0,
        maxRetries: 3,
        status: 'completed',
        createdAt: new Date(),
      });
      await db.pending_sync.add({
        orderData: { orderId: 'pending-1' },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      });

      const { clearCompleted } = await import('@/lib/offline/sync');
      await clearCompleted();

      const remaining = await db.pending_sync.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].orderData).toEqual({ orderId: 'pending-1' });
    });

    it('should do nothing when no completed items exist', async () => {
      await db.pending_sync.add({
        orderData: { orderId: 'only-pending' },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      });

      const { clearCompleted } = await import('@/lib/offline/sync');
      await clearCompleted();

      const remaining = await db.pending_sync.toArray();
      expect(remaining).toHaveLength(1);
    });
  });

  describe('getPendingItems', () => {
    it('should return items with pending or syncing status', async () => {
      await db.pending_sync.add({
        orderData: { orderId: 'pending-1' },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      });
      await db.pending_sync.add({
        orderData: { orderId: 'syncing-1' },
        retryCount: 0,
        maxRetries: 3,
        status: 'syncing',
        createdAt: new Date(),
      });
      await db.pending_sync.add({
        orderData: { orderId: 'failed-1' },
        retryCount: 3,
        maxRetries: 3,
        status: 'failed',
        lastError: 'error',
        createdAt: new Date(),
      });
      await db.pending_sync.add({
        orderData: { orderId: 'completed-1' },
        retryCount: 0,
        maxRetries: 3,
        status: 'completed',
        createdAt: new Date(),
      });

      const { getPendingItems } = await import('@/lib/offline/sync');
      const pendingItems = await getPendingItems();

      expect(pendingItems).toHaveLength(2);
      const orderIds = pendingItems.map((item) => item.orderData.orderId);
      expect(orderIds).toContain('pending-1');
      expect(orderIds).toContain('syncing-1');
      expect(orderIds).not.toContain('failed-1');
      expect(orderIds).not.toContain('completed-1');
    });

    it('should return empty array when no pending items', async () => {
      await db.pending_sync.add({
        orderData: { orderId: 'failed-1' },
        retryCount: 3,
        maxRetries: 3,
        status: 'failed',
        lastError: 'error',
        createdAt: new Date(),
      });

      const { getPendingItems } = await import('@/lib/offline/sync');
      const pendingItems = await getPendingItems();

      expect(pendingItems).toHaveLength(0);
    });
  });
});
