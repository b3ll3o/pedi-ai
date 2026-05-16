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
