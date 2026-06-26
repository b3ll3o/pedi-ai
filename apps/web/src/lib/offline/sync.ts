import { db } from './db';
import type { OrderData, PendingSync, SyncStatus } from './types';

const INITIAL_BACKOFF_MS = 1000;
const MAX_RETRIES = 3;

/**
 * Mutex singleton — `processQueue` é invocado em 2 entry-points
 * (`OfflineIndicator` no evento `online` e `StoreProvider` no startup)
 * sem coordenação. Sem este guard, dois processamentos concorrentes
 * leem o mesmo item `pending`, marcam-no `syncing` em paralelo, e
 * disparam dois `POST /api/orders` com o mesmo payload → pedido + PIX
 * duplicados. O mutex garante serialização: chamadas concorrentes
 * resolvem para a mesma Promise.
 */
let processingPromise: Promise<{ success: number; failed: number }> | null = null;

function getBackoffDelay(retryCount: number): number {
  return Math.min(INITIAL_BACKOFF_MS * Math.pow(2, retryCount), 30000);
}

export async function queueOrderForSync(
  orderData: OrderData,
  restaurantId: string
): Promise<number> {
  const entry: PendingSync = {
    restaurantId,
    orderData,
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    status: 'pending',
    createdAt: new Date(),
  };
  return db.pending_sync.add(entry);
}

/**
 * Reseta itens órfãos em `syncing` para `pending`.
 *
 * Por que importa: se o cliente fechar a aba/CRASH durante o `await fetch`,
 * o item fica travado em `syncing` para sempre (nenhum `processQueue`
 * subsequente o veria, pois a query filtra apenas `pending|failed`).
 * No startup, promovemos `syncing → pending` para permitir retry.
 */
async function recoverOrphanSyncingItems(): Promise<number> {
  const orphans = await db.pending_sync.where('status').equals('syncing').toArray();
  if (orphans.length === 0) return 0;

  await Promise.all(
    orphans.map((item) =>
      item.id !== undefined
        ? db.pending_sync.update(item.id, { status: 'pending' })
        : Promise.resolve()
    )
  );
  return orphans.length;
}

async function processQueueInternal(): Promise<{ success: number; failed: number }> {
  // Defesa em profundidade: cobre crash/aborta durante fetch anterior.
  const recovered = await recoverOrphanSyncingItems();
  if (recovered > 0 && typeof console !== 'undefined') {
    console.warn(`[sync] recovered ${recovered} orphaned "syncing" item(s) from previous session`);
  }

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

    // Re-claim atômico: só processa se ninguém mais já está.
    // (Mutex singleton acima já serializa, mas este check defende contra
    // race em cenários onde duas instâncias do app rodam no mesmo
    // browser — por exemplo, múltiplas abas.)
    const claimed = await db.pending_sync.update(item.id!, { status: 'syncing' });
    if (claimed === 0) continue;

    try {
      // `Idempotency-Key` permite ao backend deduplicar retries —
      // se a resposta anterior chegou mas a confirmação da deleção
      // local falhou, o servidor vê a mesma chave e devolve o pedido
      // existente em vez de criar outro.
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(item.orderData.idempotency_key
            ? { 'Idempotency-Key': item.orderData.idempotency_key }
            : {}),
        },
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

/**
 * Deduplica invocações concorrentes. Se uma chamada estiver em voo,
 * a próxima retorna a MESMA Promise — sem iniciar novo trabalho.
 */
export function processQueue(): Promise<{ success: number; failed: number }> {
  if (processingPromise) {
    return processingPromise;
  }
  processingPromise = processQueueInternal()
    .catch((err) => {
      // Resetamos o mutex antes de re-throw para que o próximo
      // `processQueue` possa tentar de novo. Erro aqui é geralmente
      // bug nosso, mas não queremos bloquear sync permanentemente.
      processingPromise = null;
      throw err;
    })
    .finally(() => {
      processingPromise = null;
    });
  return processingPromise;
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
