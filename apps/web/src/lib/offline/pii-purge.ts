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
 *
 * **Por que importamos o `PediDatabase` da camada de infrastructure?**
 * Existem duas classes `PediDatabase` no projeto, ambas com `name = 'pedi'`:
 *  - `apps/web/src/lib/offline/db.ts`        (v2, 4 stores: cart, menu_cache, pending_sync, tables_info)
 *  - `apps/web/src/infrastructure/persistence/database.ts` (v6, 16 stores incluindo
 *    pedidos, carrinhos, usuarios, sessoes, pagamentos, user_restaurants etc.)
 *
 * O spec LGPD exige que TODAS as stores com PII sejam purgadas no logout. A
 * função `purgeAllUserData` itera defensivamente sobre a lista canônica de
 * stores PII usando `db[name]` (em vez de `db.pedidos` etc.) e pula
 * silenciosamente stores ausentes — assim a função continua funcionando se um
 * dos dois bancos for importado em um ambiente onde o outro não foi.
 *
 * `purgeStalePii` continua usando o DB de `lib/offline/db` porque o índice
 * `timestamp` (usado para a retenção de 7 dias) só está declarado lá para
 * `pending_sync` e `tables_info`.
 */

import { db as cartDb } from './db';
import { db as fullDb } from '@/infrastructure/persistence/database';

export const MAX_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/**
 * Stores canônicas que contêm PII. Itera sobre ambas as instâncias do
 * PediDatabase (lib/offline + infrastructure/persistence) usando lookup
 * dinâmico `db[name]` — se a store não existir naquela instância, é pulada
 * silenciosamente (com warning).
 */
export const PII_STORE_NAMES = [
  // lib/offline/db (v2)
  'cart',
  'pending_sync',
  // infrastructure/persistence/database (v6)
  'usuarios',
  'sessoes',
  'pedidos',
  'carrinhos',
  'pagamentos',
  'transacoes',
  'user_restaurants',
  'configuracoes_restaurante',
] as const;

export type PiiStoreName = (typeof PII_STORE_NAMES)[number];

export interface PiiPurgeResult {
  cart: number;
  pendingSync: number;
  pedidos: number;
  carrinhos: number;
  usuarios: number;
  sessoes: number;
  pagamentos: number;
  transacoes: number;
  userRestaurants: number;
  configuracoes: number;
  menuCache: number;
  tablesInfo: number;
  total: number;
}

const EMPTY_RESULT: PiiPurgeResult = {
  cart: 0,
  pendingSync: 0,
  pedidos: 0,
  carrinhos: 0,
  usuarios: 0,
  sessoes: 0,
  pagamentos: 0,
  transacoes: 0,
  userRestaurants: 0,
  configuracoes: 0,
  menuCache: 0,
  tablesInfo: 0,
  total: 0,
};

/**
 * Verifica se estamos em um ambiente com IndexedDB (browser). Funções de
 * purga são no-ops server-side (sem banco para limpar).
 */
function isBrowser(): boolean {
  return typeof indexedDB !== 'undefined' && typeof window !== 'undefined';
}

/**
 * Resolve uma tabela por nome de forma defensiva. Se a store não existir
 * na instância, retorna `null` (sem throw). Usada para tolerar a coexistência
 * das duas definições de `PediDatabase` (Dexie sem index signature na classe).
 */
function getTable(db: unknown, name: string) {
  if (!db || typeof db !== 'object') return null;
  const candidate = (db as Record<string, unknown>)[name];
  if (candidate && typeof candidate === 'object' && 'clear' in candidate) {
    return candidate as { count: () => Promise<number>; clear: () => Promise<unknown> };
  }
  return null;
}

/**
 * Remove pedidos pendentes e itens de carrinho com mais de `MAX_RETENTION_MS`.
 * Retorna contagem por tabela para telemetria.
 */
export async function purgeStalePii(now: Date = new Date()): Promise<PiiPurgeResult> {
  if (!isBrowser()) return { ...EMPTY_RESULT };

  const cutoff = now.getTime() - MAX_RETENTION_MS;
  const result: PiiPurgeResult = { ...EMPTY_RESULT };

  // Cart: limpar entries antigas (mais de 24h é razoável para carrinho offline)
  const cartCutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const staleCart = await cartDb.cart.where('createdAt').below(new Date(cartCutoff)).primaryKeys();
  if (staleCart.length > 0) {
    await cartDb.cart.bulkDelete(staleCart);
    result.cart = staleCart.length;
  }

  // Pending sync: remover após sucesso ou falha definitiva (7 dias).
  const staleSync = await cartDb.pending_sync
    .where('createdAt')
    .below(new Date(cutoff))
    .primaryKeys();
  if (staleSync.length > 0) {
    await cartDb.pending_sync.bulkDelete(staleSync);
    result.pendingSync = staleSync.length;
  }

  // Menu cache: dados de produto não são PII, mas reduzimos retenção para 24h.
  // (Produtos mudam; manter cache antigo pode confundir o usuário.)
  const staleMenu = await cartDb.menu_cache
    .where('timestamp')
    .below(new Date(cartCutoff))
    .primaryKeys();
  if (staleMenu.length > 0) {
    await cartDb.menu_cache.bulkDelete(staleMenu);
    result.menuCache = staleMenu.length;
  }

  // Tables info: não é PII, mas limpamos após 7 dias. Linhas SEM timestamp
  // (campo opcional, registrado antes da migração) são preservadas — não
  // sabemos a idade e apagar tudo seria um data-loss.
  const staleTables = await cartDb.tables_info
    .where('timestamp')
    .below(new Date(cutoff))
    .primaryKeys();
  if (staleTables.length > 0) {
    await cartDb.tables_info.bulkDelete(staleTables);
    result.tablesInfo = staleTables.length;
  }

  result.total = result.cart + result.pendingSync + result.menuCache + result.tablesInfo;
  return result;
}

/**
 * Limpa TODOS os dados pessoais. Usar em logout / troca de conta.
 * Cache de menu (menu_cache) é preservado (é público).
 *
 * Stores PII iteradas defensivamente em ambas as instâncias do PediDatabase:
 *  - `lib/offline/db` (v2): cart, pending_sync
 *  - `infrastructure/persistence/database` (v6): usuarios, sessoes, pedidos,
 *    carrinhos, pagamentos, transacoes, user_restaurants,
 *    configuracoes_restaurante
 *
 * Stores SEM PII preservadas: menu_cache, tables_info, restaurantes, mesas,
 * categorias, itens_cardapio, modificadores_grupo, modificadores_valor, combos.
 */
export async function purgeAllUserData(): Promise<PiiPurgeResult> {
  if (!isBrowser()) return { ...EMPTY_RESULT };

  // Map: store name -> { db, count } para contagem prévia.
  const targets: Array<{
    name: string;
    table: { count: () => Promise<number>; clear: () => Promise<unknown> };
  }> = [];

  for (const name of PII_STORE_NAMES) {
    // Tenta na instância de infrastructure (v6) primeiro — tem mais stores.
    let table = getTable(fullDb, name);
    let source = 'full';
    if (!table) {
      // Fallback para lib/offline (v2) para cart/pending_sync.
      table = getTable(cartDb, name);
      source = 'cart';
    }
    if (table) {
      targets.push({ name, table });
    } else {
      // Store ausente em ambas as instâncias — loga warning (defensivo).
      if (typeof console !== 'undefined') {
        console.warn(
          `[purgeAllUserData] Store PII "${name}" não encontrada em nenhum DB (source=${source})`
        );
      }
    }
  }

  // Conta ANTES de limpar (Dexie.clear() retorna undefined).
  const counts = await Promise.all(
    targets.map(async ({ name, table }) => ({ name, count: await table.count() }))
  );

  await Promise.all(targets.map(({ table }) => table.clear()));

  // Mapeamento de store-name → chave do `PiiPurgeResult`. Declarado fora
  // do laço para manter complexidade ciclomática dentro do limiar (15).
  const STORE_TO_RESULT_KEY: Record<string, keyof Omit<PiiPurgeResult, 'total'>> = {
    cart: 'cart',
    pending_sync: 'pendingSync',
    usuarios: 'usuarios',
    sessoes: 'sessoes',
    pedidos: 'pedidos',
    carrinhos: 'carrinhos',
    pagamentos: 'pagamentos',
    transacoes: 'transacoes',
    user_restaurants: 'userRestaurants',
    configuracoes_restaurante: 'configuracoes',
  };

  const result: PiiPurgeResult = { ...EMPTY_RESULT };
  for (const { name, count } of counts) {
    const key = STORE_TO_RESULT_KEY[name];
    if (key) {
      (result as Record<string, number>)[key] = count;
    }
  }
  result.total =
    result.cart +
    result.pendingSync +
    result.usuarios +
    result.sessoes +
    result.pedidos +
    result.carrinhos +
    result.pagamentos +
    result.transacoes +
    result.userRestaurants +
    result.configuracoes;
  return result;
}
