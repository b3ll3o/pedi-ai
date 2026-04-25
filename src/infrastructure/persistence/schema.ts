import Dexie, { type Table } from 'dexie';
import type { CartItem, MenuCache, PendingSync, TableInfo } from '@/lib/offline/types';

export interface DDPersistenceSchema {
  cart: Table<CartItem>;
  menu_cache: Table<MenuCache>;
  pending_sync: Table<PendingSync>;
  tables_info: Table<TableInfo>;
}

export const dbSchema = {
  version: 1,
  stores: {
    cart: '++id, productId, createdAt',
    menu_cache: '++id, timestamp',
    pending_sync: '++id, status, createdAt',
    tables_info: '++id, tableId, restaurantId',
  },
};
