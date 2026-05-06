import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../../lib/offline/db';
import {
  queueOrderForSync,
  processQueue,
  retryFailed,
  getSyncStatus,
  getFailedItems,
} from '../../../lib/offline/sync';

describe('sync queue', () => {
  beforeEach(async () => {
    await db.pending_sync.clear();
  });

  afterEach(async () => {
    await db.pending_sync.clear();
  });

  describe('queueOrderForSync', () => {
    it('adds order to pending_sync table', async () => {
      const orderData = { tableId: 't1', items: [{ productId: 'p1', quantity: 2 }] };
      const id = await queueOrderForSync(orderData);
      expect(typeof id).toBe('number');

      const entries = await db.pending_sync.toArray();
      expect(entries).toHaveLength(1);
      expect(entries[0].orderData).toEqual(orderData);
      expect(entries[0].status).toBe('pending');
      expect(entries[0].retryCount).toBe(0);
      expect(entries[0].maxRetries).toBe(3);
    });
  });

  describe('getSyncStatus', () => {
    it('returns correct counts', async () => {
      await db.pending_sync.add({ orderData: {}, retryCount: 0, maxRetries: 3, status: 'pending', createdAt: new Date() });
      await db.pending_sync.add({ orderData: {}, retryCount: 0, maxRetries: 3, status: 'syncing', createdAt: new Date() });
      await db.pending_sync.add({ orderData: {}, retryCount: 3, maxRetries: 3, status: 'failed', lastError: 'err', createdAt: new Date() });

      const status = await getSyncStatus();
      expect(status.pending).toBe(1);
      expect(status.syncing).toBe(1);
      expect(status.failed).toBe(1);
    });
  });

  describe('retryFailed', () => {
    it('resets failed items to pending', async () => {
      await db.pending_sync.add({ orderData: {}, retryCount: 3, maxRetries: 3, status: 'failed', lastError: 'err', createdAt: new Date() });
      await retryFailed();

      const items = await db.pending_sync.toArray();
      expect(items[0].status).toBe('pending');
      expect(items[0].retryCount).toBe(0);
    });
  });

  describe('getFailedItems', () => {
    it('returns only failed items', async () => {
      await db.pending_sync.add({ orderData: {}, retryCount: 0, maxRetries: 3, status: 'pending', createdAt: new Date() });
      await db.pending_sync.add({ orderData: {}, retryCount: 3, maxRetries: 3, status: 'failed', lastError: 'err', createdAt: new Date() });

      const failed = await getFailedItems();
      expect(failed).toHaveLength(1);
      expect(failed[0].status).toBe('failed');
    });
  });

  describe('processQueue', () => {
    it('removes successfully synced orders', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

      await db.pending_sync.add({ orderData: { test: true }, retryCount: 0, maxRetries: 3, status: 'pending', createdAt: new Date() });

      const result = await processQueue();
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);

      const remaining = await db.pending_sync.toArray();
      expect(remaining).toHaveLength(0);

      global.fetch = undefined as unknown as typeof fetch;
    });

    it('increments retry count on failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as unknown as typeof fetch;

      await db.pending_sync.add({ orderData: { test: true }, retryCount: 0, maxRetries: 3, status: 'pending', createdAt: new Date() });

      const result = await processQueue();
      expect(result.failed).toBe(1);

      const items = await db.pending_sync.toArray();
      expect(items[0].retryCount).toBe(1);
      expect(items[0].status).toBe('pending');

      global.fetch = undefined as unknown as typeof fetch;
    });

    it('marks as failed after max retries', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as unknown as typeof fetch;

      // Manually set to pending with 2 retries already
      await db.pending_sync.add({ orderData: { test: true }, retryCount: 2, maxRetries: 3, status: 'pending', createdAt: new Date() });

      const result = await processQueue();
      expect(result.failed).toBe(1);

      const items = await db.pending_sync.toArray();
      expect(items[0].retryCount).toBe(3);
      expect(items[0].status).toBe('failed');

      global.fetch = undefined as unknown as typeof fetch;
    });

    it('skips already failed items that exceeded max retries', async () => {
      global.fetch = vi.fn() as unknown as typeof fetch;

      await db.pending_sync.add({ orderData: { test: true }, retryCount: 3, maxRetries: 3, status: 'failed', lastError: 'err', createdAt: new Date() });

      const result = await processQueue();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();

      global.fetch = undefined as unknown as typeof fetch;
    });
  });
});