'use client';

import { useEffect, useState } from 'react';
import { getSyncStatus, getFailedItems, retryFailed, getPendingItems } from '@/lib/offline/sync';
import type { PendingSync } from '@/lib/offline/types';

interface SyncStatusData {
  pending: number;
  syncing: number;
  failed: number;
  completed: number;
}

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [failedItems, setFailedItems] = useState<PendingSync[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingSync[]>([]);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const s = await getSyncStatus();
        const failed = await getFailedItems();
        const pending = await getPendingItems();
        if (mounted) {
          setStatus(s);
          setFailedItems(failed);
          setPendingItems(pending);
        }
      } catch {
        // ignore
      }
    }

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  async function handleRetry() {
    setRetrying(true);
    try {
      await retryFailed();
      const s = await getSyncStatus();
      const failed = await getFailedItems();
      const pending = await getPendingItems();
      setStatus(s);
      setFailedItems(failed);
      setPendingItems(pending);
    } finally {
      setRetrying(false);
    }
  }

  if (!status) return null;

  const totalPending = status.pending + status.syncing;
  const hasFailures = status.failed > 0;
  const hasQueue = pendingItems.length > 0 || totalPending > 0;

  return (
    <div className='sync-status' data-testid='offline-sync-status'>
      {hasQueue && (
        <div className='sync-queue' data-testid='offline-queue'>
          {pendingItems.map((item) => (
            <div
              key={item.id}
              className='queued-order'
              data-testid={`offline-queued-order-${item.id}`}
            >
              Pedido pendente
            </div>
          ))}
          {totalPending > 0 && (
            <span className='sync-pending'>
              Sincronizando ({totalPending})
            </span>
          )}
        </div>
      )}
      {status.syncing > 0 && <span className='sync-spinner'>⟳</span>}
      {hasFailures && (
        <>
          <span className='sync-failed'>{status.failed} falha(s)</span>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className='sync-retry-btn'
          >
            {retrying ? 'Reintentando...' : 'Tentar novamente'}
          </button>
        </>
      )}
      <style jsx>{`
        .sync-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }
        .sync-queue {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .queued-order {
          font-size: 11px;
          color: #666;
          padding: 2px 4px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .sync-pending { color: #666; }
        .sync-spinner { color: #999; animation: spin 1s linear infinite; }
        .sync-failed { color: #e00; }
        .sync-retry-btn {
          font-size: 11px;
          padding: 2px 8px;
          background: #fee;
          border: 1px solid #f99;
          border-radius: 4px;
          cursor: pointer;
        }
        .sync-retry-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}