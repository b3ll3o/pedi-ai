import { db } from './db';
import type { PendingSync, SyncStatus } from './types';

const INITIAL_BACKOFF_MS = 1000;
const MAX_RETRIES = 3;

function getBackoffDelay(retryCount: number): number {
  return Math.min(INITIAL_BACKOFF_MS * Math.pow(2, retryCount), 30000);
}

export async function queueOrderForSync(orderData: unknown): Promise<number> {
  const entry: PendingSync = {
    orderData,
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    status: 'pending',
    createdAt: new Date(),
  };
  return db.pending_sync.add(entry);
}

export async function processQueue(): Promise<{ success: number; failed: number }> {
  const pending = await db.pending_sync
    .where('status')
    .anyOf(['pending', 'failed'] as SyncStatus[])
    .toArray();

  let success = 0;
  let failed = 0;

  for (const item of pending) {
    if (item.status === 'failed' && item.retryCount >= item.maxRetries) {
      continue;
    }

    await db.pending_sync.update(item.id!, { status: 'syncing' });

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.orderData),
      });

      if (response.ok) {
        await db.pending_sync.delete(item.id!);
        success++;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      const delay = getBackoffDelay(item.retryCount);
      await new Promise((resolve) => setTimeout(resolve, delay));

      const updated: Partial<PendingSync> = {
        retryCount: item.retryCount + 1,
        lastError: err instanceof Error ? err.message : String(err),
        status: item.retryCount + 1 >= item.maxRetries ? 'failed' : 'pending',
      };
      await db.pending_sync.update(item.id!, updated);
      failed++;
    }
  }

  return { success, failed };
}

export async function retryFailed(maxRetries = MAX_RETRIES): Promise<void> {
  await db.pending_sync
    .where('status')
    .equals('failed')
    .modify({ status: 'pending', retryCount: 0, maxRetries });
}

export async function getSyncStatus(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  completed: number;
}> {
  const all = await db.pending_sync.toArray();
  return {
    pending: all.filter((i) => i.status === 'pending').length,
    syncing: all.filter((i) => i.status === 'syncing').length,
    failed: all.filter((i) => i.status === 'failed').length,
    completed: all.filter((i) => i.status === 'completed').length,
  };
}

export async function clearCompleted(): Promise<void> {
  await db.pending_sync.where('status').equals('completed').delete();
}

export async function getFailedItems(): Promise<PendingSync[]> {
  return db.pending_sync.where('status').equals('failed').toArray();
}

export async function getPendingItems(): Promise<PendingSync[]> {
  return db.pending_sync
    .where('status')
    .anyOf(['pending', 'syncing'] as SyncStatus[])
    .toArray();
}