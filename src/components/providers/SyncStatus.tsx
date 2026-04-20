'use client';

import { useEffect, useState } from 'react';
import { getSyncStatus, getFailedItems, retryFailed } from '@/lib/offline/sync';

interface SyncStatusData {
  pending: number;
  syncing: number;
  failed: number;
  completed: number;
}

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [failedItems, setFailedItems] = useState<unknown[]>([]);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const s = await getSyncStatus();
        const failed = await getFailedItems();
        if (mounted) {
          setStatus(s);
          setFailedItems(failed);
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
      setStatus(s);
      setFailedItems(failed);
    } finally {
      setRetrying(false);
    }
  }

  if (!status) return null;

  const totalPending = status.pending + status.syncing;
  const hasFailures = status.failed > 0;

  return (
    <div className='sync-status'>
      {totalPending > 0 && (
        <span className='sync-pending'>
          Sincronizando ({totalPending})
        </span>
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