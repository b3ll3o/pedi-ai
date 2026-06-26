import Dexie, { type Table } from 'dexie';

import type { CartItem, MenuCache, PendingSync, TableInfo } from './types';

export class PediDatabase extends Dexie {
  cart!: Table<CartItem>;
  menu_cache!: Table<MenuCache>;
  pending_sync!: Table<PendingSync>;
  tables_info!: Table<TableInfo>;

  constructor() {
    super('pedi');
    // v1: schema original (campos parciais do carrinho).
    this.version(1).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp, restaurantId',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
    });
    // v2: carrinho passa a persistir name/unitPrice/notes/combo fields.
    // O índice permanece o mesmo (não mudamos campos indexados); Dexie
    // só precisa da declaração `stores` para validar upgrade.
    this.version(2).stores({
      cart: '++id, productId, createdAt',
      menu_cache: '++id, timestamp, restaurantId',
      pending_sync: '++id, status, createdAt',
      tables_info: '++id, tableId, restaurantId',
    });
  }
}

export const CART_SCHEMA_VERSION = 2;

export const db = new PediDatabase();
