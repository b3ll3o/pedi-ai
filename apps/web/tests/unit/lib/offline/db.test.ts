import { describe, it, expect, beforeEach } from 'vitest';
import { PediDatabase, db } from '@/lib/offline/db';

describe('lib/offline/db', () => {
  describe('PediDatabase', () => {
    it('deve criar instância com nome pedi', () => {
      const database = new PediDatabase();
      expect(database.name).toBe('pedi');
    });

    it('deve ter tabela cart com autoincrement', () => {
      const database = new PediDatabase();
      expect(database.cart).toBeDefined();
    });

    it('deve ter tabela menu_cache com autoincrement', () => {
      const database = new PediDatabase();
      expect(database.menu_cache).toBeDefined();
    });

    it('deve ter tabela pending_sync com autoincrement', () => {
      const database = new PediDatabase();
      expect(database.pending_sync).toBeDefined();
    });

    it('deve ter tabela tables_info com autoincrement', () => {
      const database = new PediDatabase();
      expect(database.tables_info).toBeDefined();
    });

    it('deve exportar instância única db', () => {
      expect(db).toBeDefined();
      expect(db).toBeInstanceOf(PediDatabase);
    });
  });

  describe('cart operations', () => {
    beforeEach(async () => {
      await db.cart.clear();
    });

    it('deve adicionar item ao cart', async () => {
      const id = await db.cart.add({
        productId: 'prod-1',
        quantity: 2,
        modifiers: {},
        price: 25.5,
        createdAt: new Date(),
      });

      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    it('deve buscar todos os itens do cart', async () => {
      await db.cart.add({
        productId: 'prod-1',
        quantity: 1,
        modifiers: {},
        price: 10,
        createdAt: new Date(),
      });
      await db.cart.add({
        productId: 'prod-2',
        quantity: 3,
        modifiers: {},
        price: 15,
        createdAt: new Date(),
      });

      const items = await db.cart.toArray();
      expect(items).toHaveLength(2);
    });

    it('deve deletar item do cart', async () => {
      const id = await db.cart.add({
        productId: 'prod-1',
        quantity: 1,
        modifiers: {},
        price: 10,
        createdAt: new Date(),
      });

      await db.cart.delete(id);
      const items = await db.cart.toArray();
      expect(items).toHaveLength(0);
    });
  });

  describe('menu_cache operations', () => {
    beforeEach(async () => {
      await db.menu_cache.clear();
    });

    it('deve adicionar cache de menu', async () => {
      const id = await db.menu_cache.add({
        restaurantId: 'rest-1',
        categories: [{ id: 'cat-1', name: 'Bebidas' }],
        products: [],
        modifiers: [],
        timestamp: new Date(),
      });

      expect(typeof id).toBe('number');
    });

    it('deve buscar por restaurantId', async () => {
      await db.menu_cache.add({
        restaurantId: 'rest-1',
        categories: [],
        products: [],
        modifiers: [],
        timestamp: new Date(),
      });
      await db.menu_cache.add({
        restaurantId: 'rest-2',
        categories: [],
        products: [],
        modifiers: [],
        timestamp: new Date(),
      });

      const cached = await db.menu_cache
        .where('restaurantId')
        .equals('rest-1')
        .toArray();

      expect(cached).toHaveLength(1);
      expect(cached[0].restaurantId).toBe('rest-1');
    });

    it('deve limpar todo o cache', async () => {
      await db.menu_cache.add({
        restaurantId: 'rest-1',
        categories: [],
        products: [],
        modifiers: [],
        timestamp: new Date(),
      });

      await db.menu_cache.clear();
      const items = await db.menu_cache.toArray();
      expect(items).toHaveLength(0);
    });
  });

  describe('pending_sync operations', () => {
    beforeEach(async () => {
      await db.pending_sync.clear();
    });

    it('deve adicionar item de sync', async () => {
      const id = await db.pending_sync.add({
        restaurantId: 'rest-1',
        orderData: {
          table_id: 'table-1',
          customer_id: 'cust-1',
          items: [],
          idempotency_key: 'key-1',
        },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      });

      expect(typeof id).toBe('number');
    });

    it('deve buscar por status', async () => {
      await db.pending_sync.add({
        restaurantId: 'rest-1',
        orderData: { table_id: null, customer_id: 'c1', items: [], idempotency_key: 'k1' },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      });
      await db.pending_sync.add({
        restaurantId: 'rest-1',
        orderData: { table_id: null, customer_id: 'c2', items: [], idempotency_key: 'k2' },
        retryCount: 0,
        maxRetries: 3,
        status: 'failed',
        createdAt: new Date(),
      });

      const failed = await db.pending_sync.where('status').equals('failed').toArray();
      expect(failed).toHaveLength(1);
      expect(failed[0].status).toBe('failed');
    });

    it('deve fazer update de item', async () => {
      const id = await db.pending_sync.add({
        restaurantId: 'rest-1',
        orderData: { table_id: null, customer_id: 'c1', items: [], idempotency_key: 'k1' },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
        createdAt: new Date(),
      });

      await db.pending_sync.update(id, { status: 'syncing' });

      const updated = await db.pending_sync.get(id);
      expect(updated?.status).toBe('syncing');
    });
  });

  describe('tables_info operations', () => {
    beforeEach(async () => {
      await db.tables_info.clear();
    });

    it('deve adicionar info de mesa', async () => {
      const id = await db.tables_info.add({
        tableId: 'table-1',
        restaurantId: 'rest-1',
        name: 'Mesa 1',
      });

      expect(typeof id).toBe('number');
    });

    it('deve buscar por restaurantId', async () => {
      await db.tables_info.add({
        tableId: 'table-1',
        restaurantId: 'rest-1',
        name: 'Mesa 1',
      });
      await db.tables_info.add({
        tableId: 'table-2',
        restaurantId: 'rest-1',
        name: 'Mesa 2',
      });
      await db.tables_info.add({
        tableId: 'table-3',
        restaurantId: 'rest-2',
        name: 'Mesa 3',
      });

      const tables = await db.tables_info.where('restaurantId').equals('rest-1').toArray();
      expect(tables).toHaveLength(2);
    });
  });
});
