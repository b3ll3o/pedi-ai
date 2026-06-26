// Types for IndexedDB tables

export interface OrderItemModifier {
  name: string;
  price: number;
}

export interface OrderItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  modifiers?: OrderItemModifier[];
  notes?: string;
}

export interface OrderData {
  table_id: string | null;
  customer_id: string;
  customer_phone?: string;
  customer_name?: string;
  restaurant_id?: string;
  items: OrderItemInput[];
  payment_method?: 'pix' | 'card';
  idempotency_key: string;
}

/**
 * Schema persistido do carrinho no IndexedDB.
 *
 * Histórico de versões:
 * - v1 (original): só `{ productId, quantity, modifiers, price, createdAt }`.
 *   Hidratação perdia `name`, `unitPrice`, `notes`, combo fields → linhas
 *   vazias após reload.
 * - v2: campos de display + combo adicionados. A coluna `schemaVersion` é
 *   usada para detectar linhas legadas e descartá-las (LGPD-friendly: sem
 *   carrinho órfão com PII solta).
 *
 * Por que armazenar `name`/`unitPrice`/etc aqui e não re-buscar do menu
 * cache? Porque o menu cache pode estar desatualizado ou vazio (offline
 * primeira visita); manter um snapshot do estado no momento do add é a
 * única forma de garantir renderização correta do carrinho durante
 * recargas offline.
 */
export interface CartItem {
  id?: number;
  productId: string;
  quantity: number;
  modifiers: Record<string, unknown>;
  price: number;
  name?: string;
  unitPrice?: number;
  notes?: string;
  comboId?: string;
  bundlePrice?: number;
  comboItems?: { productId: string; quantity: number }[];
  schemaVersion?: number;
  createdAt: Date;
}

export interface MenuCache {
  id?: number;
  restaurantId: string;
  categories: unknown[];
  products: unknown[];
  modifiers: unknown[];
  timestamp: Date;
}

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'completed';

export interface PendingSync {
  id?: number;
  restaurantId: string;
  orderData: OrderData;
  retryCount: number;
  maxRetries: number;
  status: SyncStatus;
  lastError?: string;
  createdAt: Date;
}

export interface TableInfo {
  id?: number;
  tableId: string;
  restaurantId: string;
  name: string;
}
