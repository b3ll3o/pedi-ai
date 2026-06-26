/**
 * Política de retenção e purga de dados pessoais (LGPD) no IndexedDB.
 *
 * O `PediDatabase` armazena dados do carrinho e pedidos pendentes localmente
 * para suportar o modo offline-first. Alguns desses dados constituem PII:
 *   - `customerName`, `customerPhone`, `customerEmail` em PendingSync.orderData
 *   - IDs de mesa e restaurante (não são PII puro, mas identificadores indiretos)
 *
 * O navegador é uma fronteira de confiança fraca (qualquer script de página
 * com mesmo origin pode ler). Esta função deve ser invocada em:
 *   1. Logout / troca de conta (limpa tudo).
 *   2. Pedidos completados (após sync, dados podem ser descartados).
 *   3. Limpeza periódica de pedidos antigos (> 7 dias) — ver MAX_RETENTION_MS.
 *
 * **Por que não encriptar?** Encryption-at-rest no IndexedDB adiciona atrito
 * operacional sem ganho real de privacidade (a chave teria que viver no mesmo
 * navegador). O controle de fato é a purga explícita + retenção curta.
 */

import { db } from './db';

export const MAX_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface PiiPurgeResult {
  cart: number;
  pendingSync: number;
  menuCache: number;
  tablesInfo: number;
  total: number;
}

/**
 * Remove pedidos pendentes e itens de carrinho com mais de `MAX_RETENTION_MS`.
 * Retorna contagem por tabela para telemetria.
 */
export async function purgeStalePii(now: Date = new Date()): Promise<PiiPurgeResult> {
  const cutoff = now.getTime() - MAX_RETENTION_MS;
  const result: PiiPurgeResult = {
    cart: 0,
    pendingSync: 0,
    menuCache: 0,
    tablesInfo: 0,
    total: 0,
  };

  // Cart: limpar entries antigas (mais de 24h é razoável para carrinho offline)
  const cartCutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const staleCart = await db.cart.where('createdAt').below(new Date(cartCutoff)).primaryKeys();
  if (staleCart.length > 0) {
    await db.cart.bulkDelete(staleCart);
    result.cart = staleCart.length;
  }

  // Pending sync: remover após sucesso ou falha definitiva (7 dias).
  const staleSync = await db.pending_sync.where('createdAt').below(new Date(cutoff)).primaryKeys();
  if (staleSync.length > 0) {
    await db.pending_sync.bulkDelete(staleSync);
    result.pendingSync = staleSync.length;
  }

  // Menu cache: dados de produto não são PII, mas reduzimos retenção para 24h.
  // (Produtos mudam; manter cache antigo pode confundir o usuário.)
  const staleMenu = await db.menu_cache
    .where('timestamp')
    .below(new Date(cartCutoff))
    .primaryKeys();
  if (staleMenu.length > 0) {
    await db.menu_cache.bulkDelete(staleMenu);
    result.menuCache = staleMenu.length;
  }

  // Tables info: não é PII, mas limpamos após 7 dias. Schema v2 adicionou
  // índice `timestamp`. Linhas SEM timestamp (campo opcional, registrado antes
  // da migração) são preservadas — não sabemos a idade e apagar tudo seria
  // um data-loss como na v1.
  const staleTables = await db.tables_info.where('timestamp').below(new Date(cutoff)).primaryKeys();
  if (staleTables.length > 0) {
    await db.tables_info.bulkDelete(staleTables);
    result.tablesInfo = staleTables.length;
  }

  result.total = result.cart + result.pendingSync + result.menuCache + result.tablesInfo;
  return result;
}

/**
 * Limpa TODOS os dados pessoais. Usar em logout / troca de conta.
 * Cache de menu é preservado (é público).
 */
export async function purgeAllUserData(): Promise<PiiPurgeResult> {
  // `Dexie.clear()` retorna `undefined` (não boolean). Para reportar uma
  // contagem precisa, contamos ANTES de limpar.
  const cartCount = await db.cart.count();
  const pendingSyncCount = await db.pending_sync.count();
  const tablesInfoCount = await db.tables_info.count();

  await db.cart.clear();
  await db.pending_sync.clear();
  await db.tables_info.clear();

  const result: PiiPurgeResult = {
    cart: cartCount,
    pendingSync: pendingSyncCount,
    menuCache: 0,
    tablesInfo: tablesInfoCount,
    total: 0,
  };
  result.total = result.cart + result.pendingSync + result.tablesInfo;
  return result;
}
