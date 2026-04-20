// Types for IndexedDB tables

export interface CartItem {
  id?: number;
  productId: string;
  quantity: number;
  modifiers: Record<string, unknown>;
  price: number;
  createdAt: Date;
}

export interface MenuCache {
  id?: number;
  categories: unknown[];
  products: unknown[];
  modifiers: unknown[];
  timestamp: Date;
}

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'completed';

export interface PendingSync {
  id?: number;
  orderData: unknown;
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
