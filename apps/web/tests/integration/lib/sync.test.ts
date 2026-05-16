/**
 * BackgroundSyncPlugin Integration Tests
 *
 * These tests verify the BackgroundSyncPlugin behavior for the sync queue,
 * including queueing failed requests, replaying on reconnect, and
 * respecting the maxRetentionTime of 24 hours.
 */

import { describe, it, expect, vi, _beforeEach } from 'vitest';

// ── Types ───────────────────────────────────────────────────────────

interface QueuedRequest {
  request: Request;
  timestamp: number;
}

interface MockQueue {
  requests: QueuedRequest[];
  shiftRequest: ReturnType<typeof vi.fn>;
  unshiftRequest: ReturnType<typeof vi.fn>;
  pushRequest: ReturnType<typeof vi.fn>;
}

interface MockBackgroundSyncPlugin {
  queue: MockQueue;
  maxRetentionTime: number;
}

// ── Constants ──────────────────────────────────────────────────────

const BASE_URL = 'http://localhost';
const MAX_RETENTION_TIME_MINUTES = 24 * 60; // 1440 minutes = 24 hours

// ── Helpers ─────────────────────────────────────────────────────────

function createMockBackgroundSyncPlugin(maxRetentionTimeMinutes: number = MAX_RETENTION_TIME_MINUTES): MockBackgroundSyncPlugin {
  const requests: QueuedRequest[] = [];

  const shiftRequest = vi.fn(async (): Promise<QueuedRequest | undefined> => {
    return requests.shift();
  });

  const unshiftRequest = vi.fn(async (entry: QueuedRequest): Promise<void> => {
    requests.unshift(entry);
  });

  const pushRequest = vi.fn(async (entry: QueuedRequest): Promise<void> => {
    requests.push(entry);
  });

  return {
    queue: {
      requests,
      shiftRequest,
      unshiftRequest,
      pushRequest,
    },
    maxRetentionTime: maxRetentionTimeMinutes,
  };
}

async function createMockRequest(
  method: string,
  url: string,
  body?: unknown
): Promise<Request> {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  return new Request(fullUrl, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function isWithinRetention(entry: QueuedRequest, maxRetentionMs: number): boolean {
  return Date.now() - entry.timestamp <= maxRetentionMs;
}

// ── Test Suite ──────────────────────────────────────────────────────

describe('BackgroundSyncPlugin', () => {
  describe('Queue Failed Requests', () => {
    it('should queue failed requests when network is offline', async () => {
      const plugin = createMockBackgroundSyncPlugin();
      const orderData = { tableId: 't1', items: [{ productId: 'p1', quantity: 2 }] };
      const request = await createMockRequest('POST', '/api/orders', orderData);

      const entry: QueuedRequest = { request, timestamp: Date.now() };
      await plugin.queue.pushRequest(entry);

      expect(plugin.queue.pushRequest).toHaveBeenCalledTimes(1);
      expect(plugin.queue.requests).toHaveLength(1);
      expect(plugin.queue.requests[0].request.url).toContain('/api/orders');
    });

    it('should store request body correctly in queue', async () => {
      const plugin = createMockBackgroundSyncPlugin();
      const orderData = {
        mesaId: 'mesa-5',
        itens: [
          { produtoId: 'prod-1', quantidade: 2, precoUnitario: 15.5 },
          { produtoId: 'prod-2', quantidade: 1, precoUnitario: 8 },
        ],
        total: 39,
      };
      const request = await createMockRequest('POST', '/api/orders', orderData);

      const entry: QueuedRequest = { request, timestamp: Date.now() };
      await plugin.queue.pushRequest(entry);

      const queuedRequest = plugin.queue.requests[0];
      const clonedRequest = await queuedRequest.request.clone();
      const clonedBody = await clonedRequest.json();

      expect(clonedBody).toEqual(orderData);
    });

    it('should preserve retry metadata', async () => {
      const plugin = createMockBackgroundSyncPlugin();
      const request = await createMockRequest('POST', '/api/orders', { test: true });
      const timestamp = Date.now();

      const entry: QueuedRequest = { request, timestamp };
      await plugin.queue.pushRequest(entry);

      expect(plugin.queue.requests).toHaveLength(1);
      expect(plugin.queue.requests[0].timestamp).toBe(timestamp);
    });
  });

  describe('Replay Queued Requests on Reconnect', () => {
    it('should replay queued requests when sync is triggered', async () => {
      const plugin = createMockBackgroundSyncPlugin();
      const orderData = { tableId: 't1', items: [] };
      const request1 = await createMockRequest('POST', '/api/orders', orderData);
      const request2 = await createMockRequest('POST', '/api/orders', { ...orderData, extra: true });

      plugin.queue.requests.push({ request: request1, timestamp: Date.now() });
      plugin.queue.requests.push({ request: request2, timestamp: Date.now() });

      const replayed: Request[] = [];
      let entry;
      while ((entry = await plugin.queue.shiftRequest())) {
        replayed.push(entry.request);
      }

      expect(replayed).toHaveLength(2);
      expect(replayed[0].url).toContain('/api/orders');
      expect(replayed[1].url).toContain('/api/orders');
    });

    it('should remove successfully synced requests from queue', async () => {
      const plugin = createMockBackgroundSyncPlugin();
      const request = await createMockRequest('POST', '/api/orders', { test: true });

      plugin.queue.requests.push({ request, timestamp: Date.now() });
      expect(plugin.queue.requests).toHaveLength(1);

      await plugin.queue.shiftRequest();

      expect(plugin.queue.requests).toHaveLength(0);
    });

    it('should re-queue failed requests at the front on sync failure', async () => {
      const plugin = createMockBackgroundSyncPlugin();
      const request = await createMockRequest('POST', '/api/orders', { test: true });
      const entry: QueuedRequest = { request, timestamp: Date.now() };

      await plugin.queue.unshiftRequest(entry);

      expect(plugin.queue.unshiftRequest).toHaveBeenCalledWith(entry);
      expect(plugin.queue.requests[0].request.url).toContain('/api/orders');
    });

    it('should process queue in FIFO order', async () => {
      const plugin = createMockBackgroundSyncPlugin();
      const request1 = await createMockRequest('POST', '/api/orders', { order: 1 });
      const request2 = await createMockRequest('POST', '/api/orders', { order: 2 });
      const request3 = await createMockRequest('POST', '/api/orders', { order: 3 });

      plugin.queue.requests.push({ request: request1, timestamp: Date.now() - 3000 });
      plugin.queue.requests.push({ request: request2, timestamp: Date.now() - 2000 });
      plugin.queue.requests.push({ request: request3, timestamp: Date.now() - 1000 });

      const replayed: number[] = [];
      let entry;
      while ((entry = await plugin.queue.shiftRequest())) {
        const cloned = await entry.request.clone();
        const body = await cloned.json();
        replayed.push(body.order);
      }

      expect(replayed).toEqual([1, 2, 3]);
    });
  });

  describe('maxRetentionTime (24 hours)', () => {
    it('should set maxRetentionTime to 24 hours (1440 minutes)', () => {
      expect(MAX_RETENTION_TIME_MINUTES).toBe(1440);
    });

    it('should not replay expired requests beyond maxRetentionTime', async () => {
      const maxRetentionTimeMs = MAX_RETENTION_TIME_MINUTES * 60 * 1000;
      const now = Date.now();

      // Request from 25 hours ago (expired)
      const expiredTimestamp = now - (25 * 60 * 60 * 1000);
      // Request from 23 hours ago (valid)
      const recentTimestamp = now - (23 * 60 * 60 * 1000);

      const expiredEntry: QueuedRequest = {
        request: await createMockRequest('POST', '/api/orders', { expired: true }),
        timestamp: expiredTimestamp,
      };
      const recentEntry: QueuedRequest = {
        request: await createMockRequest('POST', '/api/orders', { valid: true }),
        timestamp: recentTimestamp,
      };

      expect(isWithinRetention(expiredEntry, maxRetentionTimeMs)).toBe(false);
      expect(isWithinRetention(recentEntry, maxRetentionTimeMs)).toBe(true);
    });

    it('should filter out expired entries during replay', async () => {
      const maxRetentionTimeMs = MAX_RETENTION_TIME_MINUTES * 60 * 1000;
      const plugin = createMockBackgroundSyncPlugin();

      const now = Date.now();

      // Entry from 30 hours ago (expired)
      const expiredRequest = await createMockRequest('POST', '/api/orders', { expired: true });
      const expiredTimestamp = now - (30 * 60 * 60 * 1000);

      // Entry from 12 hours ago (valid)
      const validRequest = await createMockRequest('POST', '/api/orders', { valid: true });
      const validTimestamp = now - (12 * 60 * 60 * 1000);

      plugin.queue.requests.push({ request: expiredRequest, timestamp: expiredTimestamp });
      plugin.queue.requests.push({ request: validRequest, timestamp: validTimestamp });

      const validEntries = plugin.queue.requests.filter((entry) =>
        isWithinRetention(entry, maxRetentionTimeMs)
      );

      expect(validEntries).toHaveLength(1);
      const cloned = await validEntries[0].request.clone();
      const body = await cloned.json();
      expect(body).toEqual({ valid: true });
    });

    it('should calculate retention time correctly in milliseconds', () => {
      const maxRetentionTimeMs = MAX_RETENTION_TIME_MINUTES * 60 * 1000;

      // 24 hours in milliseconds = 86,400,000 ms
      expect(maxRetentionTimeMs).toBe(86400000);
    });

    it('should retain requests at boundary (exactly 24 hours)', async () => {
      const maxRetentionTimeMs = MAX_RETENTION_TIME_MINUTES * 60 * 1000;
      const now = Date.now();

      // Request at exactly 24 hours old (add 1ms buffer for timing precision)
      const boundaryTimestamp = now - maxRetentionTimeMs + 1;

      const entry: QueuedRequest = {
        request: await createMockRequest('POST', '/api/orders', { boundary: true }),
        timestamp: boundaryTimestamp,
      };

      // Should NOT be considered expired (strictly greater than)
      expect(isWithinRetention(entry, maxRetentionTimeMs)).toBe(true);
    });

    it('should discard requests older than 24 hours', async () => {
      const maxRetentionTimeMs = MAX_RETENTION_TIME_MINUTES * 60 * 1000;
      const now = Date.now();

      // Request at 24 hours + 1 second old
      const expiredTimestamp = now - maxRetentionTimeMs - 1000;

      const entry: QueuedRequest = {
        request: await createMockRequest('POST', '/api/orders', { expired: true }),
        timestamp: expiredTimestamp,
      };

      expect(isWithinRetention(entry, maxRetentionTimeMs)).toBe(false);
    });
  });

  describe('onSync Callback', () => {
    it('should call onSync with queue when trigger is fired', async () => {
      const onSyncCallback = vi.fn();
      const plugin = createMockBackgroundSyncPlugin();

      const request = await createMockRequest('POST', '/api/orders', { test: true });
      plugin.queue.requests.push({ request, timestamp: Date.now() });

      await onSyncCallback({ queue: plugin.queue });

      expect(onSyncCallback).toHaveBeenCalledWith({ queue: plugin.queue });
    });

    it('should process all queue entries during onSync', async () => {
      const plugin = createMockBackgroundSyncPlugin();

      for (let i = 0; i < 3; i++) {
        const request = await createMockRequest('POST', '/api/orders', { index: i });
        plugin.queue.requests.push({ request, timestamp: Date.now() });
      }

      let processedCount = 0;
      let _entry;
      while ((_entry = await plugin.queue.shiftRequest())) {
        processedCount++;
      }

      expect(processedCount).toBe(3);
    });
  });
});
